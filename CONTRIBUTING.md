# Contributing to SpecGuard

Thanks for your interest in improving SpecGuard. This guide explains how to propose changes, run the project locally, and submit a high-quality pull request.

## Quick Start

1. Fork and clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build and test:
   ```bash
   npm run build --workspaces
   npm run test --workspaces
   ```
4. Run SpecGuard validation before submitting:
   ```bash
   npx specguard validate
   ```

## Development Workflow

- Use feature branches from `main`.
- Prefer small, focused PRs.
- Keep changes Windows-safe and cross-platform.
- Follow the existing architecture in `packages/specguard`.
- Write tests for new behavior and run them locally.

## Commit & PR Conventions

- Use Conventional Commits (e.g., `feat:`, `fix:`, `docs:`).
- Include clear descriptions and reasoning in PRs.
- Add or update docs when behavior changes.

## Documentation References

- Documentation index: `/docs/README.md`
- Quickstart: `/docs/quickstart.md`
- Spec reference: `/docs/spec-reference.md`
- Reports: `/docs/reports.md`
- Security model: `/docs/security.md`

## Code of Conduct

Please read and follow `CODE_OF_CONDUCT.md`.

## Security Issues

For security-sensitive reports, follow `SECURITY.md`.