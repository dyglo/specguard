# SpecGuard

SpecGuard is a "Skills++" enforcement engine for code agents. It provides a robust, repository-local mechanism to enforce constraints and validate tooling execution before code is committed or presented to the user.

## Documentation

For full guides and reference, see the [Documentation Index](docs/README.md).

- [🚀 Quickstart](docs/quickstart.md)
- [🤖 Codex & Agents](docs/codex-and-agents.md)
- [🛠️ Spec Reference](docs/spec-reference.md)
- [📊 Reports](docs/reports.md)
- [🔄 CI Integration](docs/ci-integration.md)
- [🔐 Security](docs/security.md)

## Examples

To see SpecGuard in action, explore the [examples/repo-pack](examples/repo-pack) directory. This serves as a reference implementation of a SpecGuard-hardened repository.

## Installation

```bash
npm install specguard
```

## Quick Commands

```bash
npx specguard init      # Setup SpecGuard in your repo
npx specguard validate  # Run validation
```

## Structure

- `packages/specguard`: Core CLI and validation logic.
- `docs/`: Comprehensive guides and references.
- `examples/`: Reference implementations.

## License

MIT
