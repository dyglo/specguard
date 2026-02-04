# Silicon-Loop Documentation

Welcome to the Silicon-Loop documentation. Silicon-Loop is a production-grade enforcement engine designed to make repository interactions safer and more predictable for code agents (like Codex) and developers alike.

## Documentation Index

- [🚀 Quickstart](quickstart.md) - Get up and running in 2 minutes.
- [🤖 Codex & Agents](codex-and-agents.md) - How to integrate Silicon-Loop into your agent workflows.
- [🛠️ Spec Reference](spec-reference.md) - Detailed guide to `spec.yaml` configuration.
- [📊 Reports](reports.md) - Understanding JSON and Markdown validation outputs.
- [🔄 CI Integration](ci-integration.md) - Running Silicon-Loop in GitHub Actions and other CI providers.
- [📋 Presets & Recipes](presets-and-recipes.md) - Common configurations for Next.js, Python, and more.
- [🔐 Security](security.md) - Our security model, redirection, and environment isolation.

---

## The Silicon-Loop Flow

1. **Init**: Scaffold your configuration with `npx silicon-loop@latest init`.
2. **Configure**: Tighten your policies in `.ai/silicon-loop/spec.yaml`.
3. **Validate**: Run `npx silicon-loop@latest validate` before committing.
4. **Repair Loop**: Use `npx silicon-loop@latest validate --format repair-json` or `npx silicon-loop@latest run --agent codex -- <cmd>` to automate fixes.
5. **Iterate**: Use agent-friendly reports to quickly fix violations.
6. **Enforce**: Run the same checks in CI to guarantee repository hygiene.
