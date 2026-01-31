# Security

SpecGuard is designed to be a secure bridge between autonomous agents and your codebase. 

## No-Shell Execution (Default)

By default, SpecGuard executes all tool steps using `spawn` without a shell.
- **Why?**: Shell execution (`shell: true`) is prone to command injection and behaves inconsistently across platforms.
- **Behavior**: Command strings are parsed into an executable and a list of arguments. Redirects (`>`), pipes (`|`), and logical operators (`&&`) will **not** work unless shell is enabled.

### Opt-in Shell Support
If you absolutely require shell features:
```yaml
- name: "Complex Script"
  command: "ls | grep test"
  allow_shell: true # Use with caution
```
> [!WARNING]
> Enabling `allow_shell` increases the risk of command injection if the command string is constructed from untrusted input.

## Environment Isolation

Tools run in an isolated environment. Only allowlisted environment variables are passed to the child process.

**Default Allowlist:**
- `PATH`, `HOME`, `USERPROFILE`, `TEMP`, `TMP`, `NODE_ENV`, `CI`, `npm_config_user_agent`

### Customizing Environment
You can extend the allowlist or provide specific overrides per step:
```yaml
- name: "Test with Key"
  command: "npm test"
  env_allowlist: ["PATH", "VITE_API_KEY"]
  env:
    DEBUG: "true"
```

## Secret Redaction

To prevent sensitive data from leaking into logs or reports, SpecGuard implements automated redaction.
- **Parsing**: All `stdout` and `stderr` from tools is scanned.
- **Redaction**: Any matches against `secret_patterns` defined in `spec.yaml` are replaced with `***REDACTED***`.
- **Scope**: Redaction applies to the raw log files and the `output_tail` included in the JSON report.

## Threat Model

- **Untrusted Specs**: SpecGuard assumes the `spec.yaml` in the repository is trusted. If an attacker can modify your spec, they can change what tools run.
- **Untrusted PRs**: When running in CI on Pull Requests, SpecGuard's role is to catch violations *before* they are merged. It does not replace a full security audit but provides a deterministic safety net.
