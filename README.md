# SpecGuard

SpecGuard is a deterministic validation engine for AI-assisted development. It lets teams enforce repository rules, run verified tools safely, and produce agent-friendly reports that make repair loops predictable.

It is designed to be secure by default, cross-platform (Windows-safe), and easy to integrate into developer workflows without adding fragile scripting.

## Why SpecGuard

- **Deterministic validation**: A single pass/fail contract with structured, auditable reporting.
- **Secure by default**: Tools run without a shell unless explicitly allowed.
- **Agent-ready outputs**: JSON and Markdown reports optimized for repair loops.
- **Works locally and in CI**: Same rules on laptops and pipelines.

## Tech Stack

- 🟢 **Node.js** (CLI runtime)
- 🔷 **TypeScript** (type-safe core)
- 🧪 **Vitest** (tests)
- 🧭 **Commander** (CLI framework)
- 🧩 **Zod** (schema validation)
- 🗂️ **YAML** (spec configuration)
- 🔁 **GitHub Actions** (CI on Windows + Ubuntu)
- 🪟 **Windows**, 🐧 **Linux**, 🍎 **macOS** (supported environments)

## Documentation

Start here: [Documentation Index](/docs/README.md)

- [Quickstart](/docs/quickstart.md)
- [Codex & Agents](/docs/codex-and-agents.md)
- [Spec Reference](/docs/spec-reference.md)
- [Reports](/docs/reports.md)
- [CI Integration](/docs/ci-integration.md)
- [Security](/docs/security.md)

## Quickstart

Install and initialize SpecGuard in a repository:

```bash
npm install specguard
npx specguard init
```

Run validation locally:

```bash
npx specguard validate
```

For agent repair loops:

```bash
npx specguard validate --format repair-json
```

## PASS with Warnings

Optional tools remain non-blocking. If an optional tool is missing or fails, SpecGuard reports **PASS with warnings** and includes actionable guidance (for example, add the missing script or install the missing binary). See the reports guide for details.

## Examples

Explore a reference implementation in:

- `examples/repo-pack`

## For Developers

Local development workflow:

```bash
npm install
npm run build --workspaces
npm run test --workspaces
```

Recommended checks before a PR:

```bash
npx specguard validate
```

## Community & Support

- Contributing guide: `/CONTRIBUTING.md`
- Code of Conduct: `/CODE_OF_CONDUCT.md`
- Security policy: `/SECURITY.md`
- Support: `/SUPPORT.md`

## Repository Structure

- `packages/specguard`: Core CLI and validation engine
- `docs/`: User guides and reference docs
- `examples/`: Reference implementations

## License

MIT