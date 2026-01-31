# SpecGuard

SpecGuard is a "Skills++" enforcement engine for code agents. It provides a robust, repository-local mechanism to enforce constraints and validate tooling execution before code is committed or presented to the user.

## Documentation

For full guides and reference, see the [Documentation Index](packages/specguard/docs/README.md).

- [🚀 Quickstart](packages/specguard/docs/quickstart.md)
- [🤖 Codex & Agents](packages/specguard/docs/codex-and-agents.md)
- [🛠️ Spec Reference](packages/specguard/docs/spec-reference.md)
- [📊 Reports](packages/specguard/docs/reports.md)
- [🔄 CI Integration](packages/specguard/docs/ci-integration.md)
- [🔐 Security](packages/specguard/docs/security.md)

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
