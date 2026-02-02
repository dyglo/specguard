# Quickstart

Get SpecGuard running in your repository in under 2 minutes.

## 1. Initialize

Run the following command in your repository root:

```bash
# Bash / Zsh / PowerShell
npx specguard@latest init
```

### What happens?
- Creates `.ai/specguard/spec.yaml` (your configuration).
- Creates `.ai/specguard/reports/` (where validation results go).
- Generates/Updates `AGENTS.md` (instructions for code agents).
- Generates helper scripts in `.ai/specguard/tools/`.
- Updates `.gitignore` to ensure reports are not committed.

## 2. Validate

Run your first validation:

```bash
npx specguard@latest validate
```

For agent repair loops, use the repair JSON format:

```bash
npx specguard@latest validate --format repair-json
```

SpecGuard will check for:
- Forbidden file patterns (e.g., secrets, large binaries).
- Run any tool-verified steps defined in your spec (e.g., `npm run lint`).

## 3. Review the Report

Check the generated Markdown report for a human-readable (and agent-friendly) summary:

```bash
# Example path
cat .ai/specguard/reports/specguard_latest.md
```

The report includes an **Agent Summary** block at the top, designed for quick parsing by AI agents.

## What to Commit?

✅ **Commit these:**
- `.ai/specguard/spec.yaml`
- `AGENTS.md`
- `.ai/specguard/tools/validate.sh` / `validate.ps1`

❌ **Ignore these (SpecGuard does this for you):**
- `.ai/specguard/reports/**`

## Platform Support

SpecGuard is tested on **Windows (PowerShell)** and **macOS/Linux (Bash/Zsh)**. 
- All commands use safe execution (no shell by default).
- Repository paths are handled cross-platform correctly.
