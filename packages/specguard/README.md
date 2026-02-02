# SpecGuard

Production-grade "Skills++" enforcement engine for code agents.

## Features

- **🛡️ Secure Tool Execution**: Tools run without a shell by default.
- **🔍 Secret Redaction**: Deterministic masking of secrets in logs and reports.
- **📄 Agent-Friendly Reporting**: Built-in "Agent Summary" for repair loops.
- **⏭️ Smart Skipping**: Automatic detection of missing optional scripts.

## Documentation

For full guides and reference, see the [Documentation Index](/docs/README.md).

- [🚀 Quickstart](/docs/quickstart.md)
- [🤖 Codex & Agents](/docs/codex-and-agents.md)
- [🛠️ Spec Reference](/docs/spec-reference.md)
- [📊 Reports](/docs/reports.md)
- [🔄 CI Integration](/docs/ci-integration.md)
- [🔐 Security](/docs/security.md)

## Installation

```bash
npm install specguard
```

## Quick Commands

```bash
npx specguard init      # Setup SpecGuard in your repo
npx specguard validate  # Run validation
```

## License

MIT
