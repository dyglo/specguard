# AGENTS.md — SpecGuard Contract

This repository uses **SpecGuard** to enforce repo rules and verify tooling results.
Treat SpecGuard as a **hard gate**: do not finalize work until it passes.

## Required workflow
1. Make changes in small steps.
2. Run SpecGuard validation **before** presenting a final answer or opening a PR:
   - PowerShell (Windows):
     ```powershell
     npx specguard@latest validate
     ```
   - Bash (macOS/Linux/Git Bash):
     ```bash
     npx specguard@latest validate
     ```
3. If validation FAILS: fix violations and re-run until PASS.

## Output requirements (final response / PR description)
Include:
- **Summary** (2–5 lines)
- **Changed files** (exact paths)
- **SpecGuard status**: PASS/FAIL
- **Report paths**:
  - Markdown report path
  - JSON report path
- If tools were executed: mention which ones, based only on the report logs.

## Repo safety rules (non-negotiable)
- Do not commit secrets (API keys, tokens, private keys). If detected, remove immediately and rotate if necessary.
- Follow the spec in `.ai/specguard/spec.yaml` exactly.
- Do not claim tests/lint/typecheck ran unless the SpecGuard report shows they ran.

## Notes
- SpecGuard configuration lives in: `.ai/specguard/spec.yaml`
- Reports are written to: `.ai/specguard/reports/`
