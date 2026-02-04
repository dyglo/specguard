# PROJECT_PLAN — Silicon-Loop (Repo-Local Spec Enforcement Engine)

## Purpose
Silicon-Loop is a repo-local “Skills++” enforcement engine that improves code-agent reliability by combining:
- **Repo instructions** (AGENTS.md) that shape agent behavior
- **Spec pack** (.ai/silicon-loop/spec.yaml) that defines enforceable constraints
- **Validator runtime** (Silicon-Loop CLI) that deterministically validates changes and tool checks
- **Evidence artifacts** (.ai/silicon-loop/reports/*) used for auditability and CI gating

Non-goals:
- No API proxies.
- No key management.
- No new standalone product CLI—only repo-local scripts.

---

## Architecture Overview

### Inputs
- Repo state + `git diff`
- Spec pack: `.ai/specguard/spec.yaml`
- Optional tool commands (lint/tests/typecheck/build)

### Outputs
- Machine report: `.ai/specguard/reports/specguard_<timestamp>.json`
- Human summary: `.ai/specguard/reports/specguard_<timestamp>.md`
- Exit code: 0 (PASS) / 1 (FAIL)

### Enforcement Types
1. **Deterministic**
   - Forbidden path globs (e.g., engine/**)
   - Secret scanning patterns in changed files
2. **Tool-verified**
   - Run configured local commands, capture exit codes & logs

Optional future extension:
- Bounded semantic “judge” checks (kept out of MVP).

---

## Repo File Map (MVP)

- `AGENTS.md`
  - Agent contract: “validate before finalizing”
  - Forbidden paths and truthfulness constraints
- `.ai/specguard/spec.yaml`
  - Spec ID/version
  - Forbidden globs
  - Deterministic rules (pattern scan)
  - Tool-verified steps (optional commands)
- `.ai/specguard/specguard.py`
  - Validator runtime (Python)
  - Report generation
  - Exit code semantics
- `.ai/specguard/tools/validate.sh`
  - One-liner runner the agent executes
- `.ai/specguard/README.md`
  - Quickstart + how to extend spec
- `.ai/specguard/reports/`
  - Generated artifacts (keep empty dir with `.gitkeep` if needed)

---

## Milestones

### M0 — Repo Scaffold (Done when created)
**Deliverables**
- All MVP files exist at correct paths
- validate.sh is executable

**Acceptance**
- `ls` matches the file map
- No missing placeholders

---

### M1 — Deterministic Validation
**Deliverables**
- Parse spec.yaml
- Compute changed files via git diff
- Enforce forbidden_globs
- Secret scanning across changed files

**Acceptance**
- Editing `engine/**` triggers FAIL with clear violation evidence
- Adding a matching secret pattern triggers FAIL

---

### M2 — Tool-Verified Checks + Evidence
**Deliverables**
- Run tool steps listed in spec.yaml (optional steps allowed)
- Capture exit codes + output tail
- Generate timestamped JSON/MD reports

**Acceptance**
- Reports are written to `.ai/specguard/reports/`
- FAIL on non-optional tool step failure
- PASS when only optional steps fail (if configured optional)

---

### M3 — Agent Contract (AGENTS.md)
**Deliverables**
- Clear workflow that requires validation before final output
- Final response format

**Acceptance**
- A code agent following AGENTS.md will naturally:
  - run validate.sh
  - fix failures
  - include report path + changed files list in final response

---

## Definition of Done (MVP)
- `./.ai/specguard/tools/validate.sh` produces PASS/FAIL deterministically
- JSON + Markdown reports written every run
- Exit codes correct
- Minimal dependencies documented (PyYAML if used)
- AGENTS.md instructions are unambiguous and enforce validation behavior

---

## Quickstart

### Dependencies
- Python 3.10+
- If YAML parsing uses PyYAML:
  ```bash
  pip install pyyaml
  ```

### Run validation

```bash
chmod +x ./.ai/specguard/tools/validate.sh
./.ai/specguard/tools/validate.sh
```

### Typical usage for agents

* Make changes
* Run validate.sh
* Fix until PASS
* Provide final output with report path + changed files list

---

## Troubleshooting

* If `git diff --name-only HEAD` fails (no HEAD yet), SpecGuard falls back to `git diff --name-only`.
* If pnpm commands fail due to missing pnpm, mark steps `optional: true` or adjust commands.
* If reports folder doesn’t exist, validator must create it.

---

## Extensions (Post-MVP)

* Rule plugins (pathspec, AST-based import checking, license checks)
* CI integration (GitHub Action + pre-commit hook)
* Optional bounded judge checks (rubric-based) with strict inputs and JSON verdicts
