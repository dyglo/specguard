# SpecGuard

SpecGuard is a "Skills++" enforcement engine for code agents. It provides a robust, repository-local mechanism to enforce constraints and validate tooling execution before code is committed or presented to the user.

## Features

*   **Deterministic Validation**: Enforce file path restrictions (forbidden globs) and scan for secrets.
*   **Tool Verification**: Run and verify local tools (lint, test, build) with captured output.
*   **Repo-Local**: Configuration lives in `.ai/specguard/spec.yaml`.
*   **Agent-Friendly**: Designed to be used by AI agents to self-correct.

## Quickstart

### Installation

```bash
npm install specguard
```

### Initialization

To set up SpecGuard in a new repository:

```bash
npx specguard init
```

This will create:
*   `.ai/specguard/spec.yaml`
*   `AGENTS.md` (if not present, or append instructions)

### Validation

To run validation:

```bash
npx specguard validate
```

### CLI Options

*   `init`:
    *   `--force`: Overwrite existing configuration files.

*   `validate`:
    *   `--spec <path>`: Path to `spec.yaml` (default: `.ai/specguard/spec.yaml`).
    *   `--repo-root <path>`: Root of the repository (default: cwd).
    *   `--report-dir <path>`: Directory to write reports (default: `.ai/specguard/reports`).
    *   `--diff-mode <mode>`: `working` (default), `staged`, or `range`.
    *   `--staged`: Alias for `--diff-mode staged`.
    *   `--base <ref>` / `--head <ref>`: Refs for `range` mode.

## Structure

*   `packages/specguard`: Core CLI and validation logic (Node.js).
*   `examples/repo-pack`: Example repository structure.

## License

MIT
