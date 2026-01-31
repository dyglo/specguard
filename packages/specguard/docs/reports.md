# Reports

SpecGuard generates detailed reports in `.ai/specguard/reports/` for every validation run.

## Directory Structure

```text
.ai/specguard/reports/
├── specguard_2024-01-01_abcd1234.json  # Full machine-readable data
├── specguard_2024-01-01_abcd1234.md    # Human/Agent friendly summary
└── logs/
    └── abcd1234/                       # Logs for this specific run
        ├── Lint_Check.log
        └── Security_Scan.log
```

## Markdown Report

The Markdown report is optimized for **Agent Repair Loops**.

### 🤖 Agent Summary
A concise block at the top containing:
- **Result**: PASS/FAIL.
- **Changes**: Number of files checked.
- **Top Violations**: Short list of why the check failed.
- **Tools**: A table showing status (`RAN`, `SKIPPED`, `FAILED`) and exit codes.
- **Next Action**: A hint on what to do next (e.g., "Fix violations and re-run").

## JSON Report Fields

| Field | Description |
| --- | --- |
| `report_version` | Currently `"0.1"`. |
| `run_id` | Unique UUID for the validation run. |
| `timestamp` | ISO timestamp of the run. |
| `status` | `"PASS"` or `"FAIL"`. |
| `tool_steps` | Array of results for each tool. |
| `tool_steps[].status` | `"RAN"`, `"SKIPPED"`, or `"FAILED"`. |
| `tool_steps[].output_tail` | The last 1000 characters of the tool's stderr (redacted). |
| `tool_steps[].log_path` | Relative path to the full log file. |
| `violations` | List of deterministic rule violations (glob/secret). |

## Integration

### CI Artifacts
In GitHub Actions, you should upload the reports directory as an artifact to help debug failed runs:

```yaml
- name: Upload SpecGuard Reports
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: specguard-reports
    path: .ai/specguard/reports/
```

### Agent Workflow
We recommend that agents check the Markdown report automatically after a validation run to understand exactly what needs fixing.
