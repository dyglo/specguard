#!/usr/bin/env python3
"""
SpecGuard Validator Runtime
repo-local enforcement engine for code agents.
"""

import sys
import os
import json
import subprocess
import glob
import re
import datetime
import argparse
import fnmatch
from pathlib import Path
from typing import List, Dict, Any, Optional

try:
    import yaml
except ImportError:
    print("Error: PyYAML is missing. Install it with: pip install pyyaml")
    sys.exit(1)

# --- Utilities ---
def run_command(cmd: str, cwd: Path) -> Dict[str, Any]:
    """Runs a shell command and returns execution details."""
    start_time = datetime.datetime.now()
    try:
        # Use shell=True for complex commands (like "pnpm lint")
        result = subprocess.run(
            cmd,
            shell=True,
            cwd=cwd,
            capture_output=True,
            text=True
        )
        duration = (datetime.datetime.now() - start_time).total_seconds()
        return {
            "command": cmd,
            "exit_code": result.returncode,
            "stdout": result.stdout.strip(),
            "stderr": result.stderr.strip(),
            "duration": duration
        }
    except Exception as e:
        return {
            "command": cmd,
            "exit_code": -1,
            "stdout": "",
            "stderr": str(e),
            "duration": 0.0
        }

def get_changed_files(cwd: Path) -> List[str]:
    """Deterministically computes changed files."""
    # Try HEAD first (works if there are commits)
    cmd = run_command("git diff --name-only HEAD", cwd)
    
    if cmd["exit_code"] == 0:
        files = [f for f in cmd["stdout"].split('\n') if f.strip()]
        return files
    else:
        # Fallback: No HEAD (initial commit)
        # We need both staged (--cached) and unstaged changes
        files = set()
        
        # Staged
        cmd_cached = run_command("git diff --name-only --cached", cwd)
        if cmd_cached["exit_code"] == 0:
             files.update([f for f in cmd_cached["stdout"].split('\n') if f.strip()])
        
        # Unstaged
        cmd_unstaged = run_command("git diff --name-only", cwd)
        if cmd_unstaged["exit_code"] == 0:
             files.update([f for f in cmd_unstaged["stdout"].split('\n') if f.strip()])
             
        return list(files)

def load_spec(spec_path: Path) -> Dict[str, Any]:
    if not spec_path.exists():
        print(f"Error: Spec file not found at {spec_path}")
        sys.exit(1)
    
    with open(spec_path, 'r', encoding='utf-8') as f:
        try:
            return yaml.safe_load(f)
        except yaml.YAMLError as e:
            print(f"Error parsing YAML: {e}")
            sys.exit(1)

def validate(spec: Dict[str, Any], changed_files: List[str], repo_root: Path) -> Dict[str, Any]:
    violations = []
    
    # 1. Deterministic: Forbidden Globs
    forbidden_globs = spec.get("repo", {}).get("forbidden_globs", [])
    for f in changed_files:
        for pattern in forbidden_globs:
            # Check for match using fnmatch (shell component matching)
            # We match against the file path relative to repo root
            if fnmatch.fnmatch(f, pattern) or fnmatch.fnmatch(f, f"**/{pattern}"):
                 violations.append({
                     "type": "forbidden_file",
                     "file": f,
                     "details": f"Matches forbidden pattern: {pattern}"
                 })

    # 2. Deterministic: Secret Scanning
    secret_patterns = spec.get("deterministic_rules", {}).get("secret_patterns", [])
    for f_path in changed_files:
        full_path = repo_root / f_path
        if not full_path.exists() or not full_path.is_file():
            continue # Skip deleted files or directories
        
        try:
            content = full_path.read_text(encoding='utf-8', errors='ignore')
            for check in secret_patterns:
                name = check.get("name", "Unknown Secret")
                pattern = check.get("regex", "")
                if not pattern: continue
                
                if re.search(pattern, content):
                    violations.append({
                        "type": "secret_detected",
                        "file": f_path,
                        "details": f"Potential {name} detected"
                    })
        except Exception as e:
            # In case of binary files or permission issues, skip silently or log warning
            pass

    # 3. Tool Checks
    tool_results = []
    tool_steps = spec.get("tool_verified", {}).get("steps", [])
    
    for tool in tool_steps:
        print(f"Run tool: {tool['name']}...")
        res = run_command(tool["command"], cwd=repo_root)
        res["name"] = tool["name"]
        res["optional"] = tool.get("optional", False)
        tool_results.append(res)
        
        if res["exit_code"] != 0:
            msg = f"Tool '{tool['name']}' failed with exit code {res['exit_code']}"
            if not res["optional"]:
                violations.append({
                    "type": "tool_failure",
                    "file": "N/A",
                    "details": msg
                })
            print(f"  FAILED (Optional: {res['optional']})")
        else:
            print(f"  PASS")

    # 4. Truthfulness / Output Contract
    # If forbid_unverified_tool_claims is true, report should contain tool_steps even if empty (it does).
    # This is handled by default since we include tool_results in output.

    status = "FAIL" if violations else "PASS"
    return {
        "status": status,
        "spec_id": spec.get("spec_id", "unknown"),
        "spec_version": spec.get("version", "unknown"),
        "timestamp": datetime.datetime.now().isoformat(),
        "changed_files": changed_files,
        "violations": violations,
        "tool_results": tool_results
    }

def generate_reports(report_data: Dict[str, Any], report_dir: Path) -> List[Path]:
    report_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # 1. JSON Report
    json_path = report_dir / f"specguard_{ts}.json"
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(report_data, f, indent=2)
    
    # 2. Markdown Summary
    md_path = report_dir / f"specguard_{ts}.md"
    with open(md_path, 'w', encoding='utf-8') as f:
        f.write(f"# SpecGuard Report\n\n")
        f.write(f"**Status**: {report_data['status']}\n")
        f.write(f"**Spec ID**: {report_data.get('spec_id')}\n")
        f.write(f"**Date**: {report_data['timestamp']}\n")
        f.write(f"**Changes**: {len(report_data['changed_files'])} files\n\n")
        
        if report_data['violations']:
            f.write("## ❌ Violations\n")
            for v in report_data['violations']:
                f.write(f"- **{v['type']}**: {v.get('file', 'N/A')} - {v['details']}\n")
        else:
            f.write("## ✅ No Violations Found\n")

        f.write("\n## Tool Execution\n")
        if not report_data['tool_results']:
             f.write("No tools configured.\n")
        
        for t in report_data['tool_results']:
            icon = "✅" if t['exit_code'] == 0 else "⚠️" if t['optional'] else "❌"
            f.write(f"### {icon} {t['name']}\n")
            f.write(f"- Command: `{t['command']}`\n")
            f.write(f"- Exit Code: {t['exit_code']}\n")
            if t['stderr']:
                # Limit stderr output in md
                f.write(f"```\n{t['stderr'][-2000:]}\n```\n")
    
    print(f"\nReports generated:\n  JSON: {json_path}\n  MD:   {md_path}")
    return [json_path, md_path]

def main():
    parser = argparse.ArgumentParser(description="SpecGuard Validator")
    subparsers = parser.add_subparsers(dest="command")
    
    validate_parser = subparsers.add_parser("validate", help="Run validation")
    validate_parser.add_argument("--spec", type=str, required=True, help="Path to spec.yaml")
    validate_parser.add_argument("--repo-root", type=str, required=True, help="Path to repo root")
    validate_parser.add_argument("--report-dir", type=str, required=True, help="Path to report output dir")
    
    args = parser.parse_args()

    # Default to validate if no command provided (backward compatibility / ease of use)
    if not args.command:
         # Backward compatibility implicit run
         # Expecting to be run from repo root if no args
         if os.path.exists(".ai/specguard/spec.yaml"):
             args.command = "validate"
             args.spec = ".ai/specguard/spec.yaml"
             args.repo_root = "."
             args.report_dir = ".ai/specguard/reports"
         else:
             parser.print_help()
             sys.exit(1)

    if args.command == "validate":
        repo_root = Path(args.repo_root).resolve()
        spec_path = Path(args.spec).resolve()
        report_dir = Path(args.report_dir).resolve()

        print(f"🛡️  SpecGuard: Running validation...")
        print(f"   Spec: {spec_path}\n   Repo: {repo_root}")

        spec = load_spec(spec_path)
        changed_files = get_changed_files(repo_root)
        
        print(f"   Detected {len(changed_files)} changed files.")
        
        report_data = validate(spec, changed_files, repo_root)
        
        # Add report paths to JSON
        paths = generate_reports(report_data, report_dir)
        report_data["report_paths"] = [str(p) for p in paths]
        # Re-save json with paths
        with open(paths[0], 'w', encoding='utf-8') as f:
            json.dump(report_data, f, indent=2)

        if report_data["status"] == "FAIL":
            print("\n❌ Validation FAILED")
            sys.exit(1)
        else:
            print("\n✅ Validation PASSED")
            sys.exit(0)

if __name__ == "__main__":
    main()
