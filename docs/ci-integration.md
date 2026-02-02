# CI Integration

SpecGuard is ideally suited for CI/CD pipelines to ensure that every PR meets your safety and quality standards.

## GitHub Actions

Create a `.github/workflows/specguard.yml` file:

```yaml
name: SpecGuard Validation

on:
  pull_request:
    branches: [ main ]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Required for range-based diffs

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run SpecGuard (Range Diff)
        run: |
          npx specguard validate \
            --diff-mode range \
            --base ${{ github.event.pull_request.base.sha }} \
            --head ${{ github.event.pull_request.head.sha }}

      - name: Upload Reports
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: specguard-reports
          path: .ai/specguard/reports/
```

## Failing CI

SpecGuard uses standard exit codes:
- **0 (PASS)**: All rules and required tools passed.
- **1 (FAIL)**: A deterministic rule was violated OR a required tool failed.
- **2 (USAGE/CONFIG)**: Invalid CLI flags or missing spec file.

Any non-zero exit code will naturally fail most CI runners (GitHub Actions, GitLab CI, CircleCI).

## Comparison Modes in CI

- **`range` (Recommended)**: Best for PRs. Only validates files changed between the base branch and the PR head.
- **`staged`**: Useful for pre-commit hooks but less common in CI.
- **`working`**: Useful for local development and linting the entire state of active changes.
