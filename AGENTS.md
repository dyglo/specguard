# AGENTS.md

## 🚨 CRITICAL INSTRUCTIONS FOR AI CODING AGENTS

You are working in a repository protected by **SpecGuard**.
You MUST follow this workflow for every request that involves code changes.

### 1. Workflow
1. **Plan & Implement**: Make your changes as requested.
2. **Validate**: BEFORE you provide your "Final Answer" or output, you MUST run the validator:
   ```bash
   ./.ai/specguard/tools/validate.sh
   # OR (PowerShell)
   .\.ai\specguard\tools\validate.ps1
   ```
3. **Fix & Retry**:
   - If the validator exits with `1` (FAIL), you MUST fix the violations.
   - Re-run the validator until it exits with `0` (PASS).
   - DO NOT override or ignore the validator.

### 2. Constraints
- **Forbidden Paths**: Do NOT edit files in `engine/**`, `core/game/**`, or `vendor/**` unless explicitly authorized. SpecGuard will reject these changes.
- **No Secrets**: Do NOT add API keys, access tokens, or private credentials. SpecGuard scans for these.
- **Truthfulness**: Do NOT claim you ran tests unless you have the logs. SpecGuard records tool outputs.

### 3. Final Response Format
When you have successfully passed validation, your final response to the user must include:
- A brief summary of changes.
- A list of **Changed Files**.
- The path to the generated SpecGuard report (e.g., `.ai/specguard/reports/specguard_YYYYMMDD_HHMMSS.md`).

---
**Example Final Output:**

> I have completed the task.
>
> **Summary**: Added the requested feature X.
> **Changed Files**:
> - `src/feature_x.py`
> - `tests/test_feature_x.py`
>
> **Validation**: PASS
> **Report**: `.ai/specguard/reports/specguard_20231027_103000.md`


---

## 🛡️ SpecGuard Enforced

This repository uses **SpecGuard** to ensure code quality and security.
As an AI agent, you **MUST** follow this workflow:

1.  **Edit**: Make your code changes.
2.  **Validate**: Run the validation script to check for issues.
    ```bash
    npx specguard validate --staged
    ```
3.  **Repair**: If validation fails, fix the errors and re-run.
4.  **Report**: Include the validation summary in your final response.

**Artifacts Location:**
- Spec: `.ai/specguard/spec.yaml`
- Reports: `.ai/specguard/reports/`

**Safety Rules:**
- 🚫 NO secrets in code.
- 🚫 NO shell execution in tool steps (unless explicitly allowed).
- ✅ ALWAYS verify your changes.
