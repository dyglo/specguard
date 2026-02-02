# Spec Reference

The `.ai/specguard/spec.yaml` file is the central configuration for your repository's safety policies.

## Root Fields

- `spec_id`: (string) Unique identifier for this spec.
- `version`: (string) Your spec's version.
- `spec_version`: (string) The version of the SpecGuard schema (current: `0.1`).

## `repo`

Configuration for repository-wide static checks.

- `forbidden_globs`: (array of strings) List of file patterns that should never be modified or committed.
  - Example: `[".env", "certs/*.pem", "dist/**"]`

## `deterministic_rules`

Non-tool-based checks that run quickly on every validation.

- `secret_patterns`: (array of objects) Define regex patterns to detect (and redact) secrets.
  - `name`: Human-readable name (e.g., "AWS Key").
  - `regex`: The regex pattern to match.

## `tool_verified`

The core of SpecGuard. Define external tools to run during validation.

### `steps`
Each step supports:
- `name`: (string) Human-readable name.
- `command`: (string) The command to run.
- `optional`: (boolean) If true, a failure in this step won't fail the overall validation (default: `false`).
- `skip_if_missing`: (boolean) If true, skips the step if the command (e.g., npm script) is missing (default: `true` for optional, `false` for required).
- `allow_shell`: (boolean) Enable shell execution (default: `false`).
- `timeout_seconds`: (number) Kill the process after this time (default: `300`).
- `cwd`: (string) Working directory relative to repo root.
- `env_allowlist`: (array of strings) Env vars to pass through.
- `env`: (object) Key-value overrides for environment variables.

## Example `spec.yaml`

```yaml
spec_id: "core-safety"
version: "1.0.0"

repo:
  forbidden_globs:
    - "node_modules/**"
    - ".env*"

deterministic_rules:
  secret_patterns:
    - name: "Generic API Key"
      regex: "key-[a-zA-Z0-9]{32}"

tool_verified:
  steps:
    - name: "Lint Check"
      command: "npm run lint"
      optional: true
      skip_if_missing: true
    - name: "Security Scan"
      command: "npm run audit"
      timeout_seconds: 600
```

## Diff Modes

When running `validate`, you can control which files are checked:
- `--diff-mode working`: (Default) Checks all uncommitted changes in the workspace.
- `--diff-mode staged`: Checks only files currently staged for commit.
- `--diff-mode range --base <ref> [--head <ref>]`: Checks changes between two git refs.
