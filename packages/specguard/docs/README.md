# SpecGuard Documentation

Welcome to the SpecGuard documentation. SpecGuard is a production-grade enforcement engine designed to make repository interactions safer and more predictable for code agents (like Codex) and developers alike.

## Documentation Index

- [🚀 Quickstart](quickstart.md) - Get up and running in 2 minutes.
- [🤖 Codex & Agents](codex-and-agents.md) - How to integrate SpecGuard into your agent workflows.
- [🛠️ Spec Reference](spec-reference.md) - Detailed guide to `spec.yaml` configuration.
- [📊 Reports](reports.md) - Understanding JSON and Markdown validation outputs.
- [🔄 CI Integration](ci-integration.md) - Running SpecGuard in GitHub Actions and other CI providers.
- [📋 Presets & Recipes](presets-and-recipes.md) - Common configurations for Next.js, Python, and more.
- [🔐 Security](security.md) - Our security model, redirection, and environment isolation.

---

## The SpecGuard Flow

1. **Init**: Scaffold your configuration with `npx specguard@latest init`.
2. **Configure**: Tighten your policies in `.ai/specguard/spec.yaml`.
3. **Validate**: Run `npx specguard@latest validate` before committing.
4. **Iterate**: Use agent-friendly reports to quickly fix violations.
5. **Enforce**: Run the same checks in CI to guarantee repository hygiene.
