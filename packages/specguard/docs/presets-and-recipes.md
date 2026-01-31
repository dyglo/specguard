# Presets & Recipes

Here are common SpecGuard configurations for different tech stacks.

## ⚛️ Next.js (Safe Defaults)

Focuses on preventing environment leaks and running standard linting.

```yaml
spec_id: "nextjs-standard"
repo:
  forbidden_globs:
    - ".env*"
    - "out/**"
    - ".next/**"
tool_verified:
  steps:
    - name: "Lint"
      command: "npm run lint"
      optional: true
      skip_if_missing: true
    - name: "Build Test"
      command: "npm run build"
      optional: false # Required for merge
```

## 🐍 Python (Ruff + Pytest)

Using `skip_if_missing` for optional local tools.

```yaml
spec_id: "python-safety"
repo:
  forbidden_globs:
    - "__pycache__/**"
    - "*.pyc"
    - ".venv/**"
tool_verified:
  steps:
    - name: "Ruff Lint"
      command: "ruff check ."
      optional: true
    - name: "Pytest"
      command: "pytest"
      optional: false
```

## 📦 Monorepo (Component Isolation)

Use `cwd` to target specific package directories.

```yaml
spec_id: "monorepo-spec"
tool_verified:
  steps:
    - name: "Core Utility Tests"
      command: "npm test"
      cwd: "packages/core"
    - name: "API Service Lint"
      command: "npm run lint"
      cwd: "packages/api"
      optional: true
```

## Best Practices

### Optional vs Required
- **Optional**: Good for local-only tools, experimental linters, or "nice to have" checks.
- **Required**: Essential for CI and merging. If a required tool fails, SpecGuard exits with code 1.

### When to use `skip_if_missing`
Set `skip_if_missing: true` for tools that might not be installed globally or aren't present in every developer's environment. This prevents "Expected failure" noise.

### Regular Policy Tightening
Start with many `optional: true` steps. As your repository matures and agents become more capable, flip them to `optional: false` to enforce stricter standards.
