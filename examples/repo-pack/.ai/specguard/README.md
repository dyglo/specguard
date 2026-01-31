# SpecGuard

Repo-local validation engine for safe and reliable code agents.

## 📂 Structure

- `specguard.py`: The core validation logic.
- `spec.yaml`: Configuration rules (forbidden globs, secrets, tools).
- `tools/validate.sh`: Entry point script.
- `reports/`: Generated report artifacts.

## 🚀 Usage

Run the validator from the repository root:

```bash
./.ai/specguard/tools/validate.sh
```

## ⚙️ Configuration

Edit `.ai/specguard/spec.yaml` to configure checks.

### Forbidden Globs
Add patterns to `forbidden_globs` to prevent modification of sensitive directories.

### Secret Patterns
Add regex patterns to `secret_patterns` to scan for credentials.

### Tools
Add commands to `tools` list to run local checks (linting, tests, etc).
Set `optional: true` if failure should only warn.

## 🧪 Self-Test

Verify SpecGuard is working correctly:

1. **Force FAIL (Forbidden File)**:
   - Create a file `engine/test_violation.txt`.
   - Run: `./.ai/specguard/tools/validate.sh` (or `validate.ps1`)
   - Expected: `❌ Validation FAILED` with forbidden file violation.

2. **Force FAIL (Secret)**:
   - Add a file `secret_test.py` with content `api_key = "12345678901234567890"`.
   - Run validator.
   - Expected: `❌ Validation FAILED` with secret detected.

3. **Force PASS**:
   - Revert changes.
   - Run validator.
   - Expected: `✅ Validation PASSED`.

## 💻 Commands

- **Bash**: `./.ai/specguard/tools/validate.sh`
- **PowerShell**: `.\.ai\specguard\tools\validate.ps1`
- **Python**: `python .ai/specguard/specguard.py validate --spec .ai/specguard/spec.yaml --repo-root . --report-dir .ai/specguard/reports`

