# SpecGuard 🛡️

**The Production-Grade Validation & Enforcement Engine for AI-Enhanced Workflows.**

SpecGuard is a deterministic validation framework designed to ensure that AI agents and developers operate within defined safety and quality boundaries. It bridges the gap between agentic flexibility and repository integrity by providing high-fidelity verification of codebase modifications.

[![NPM Version](https://img.shields.io/npm/v/specguard.svg)](https://www.npmjs.com/package/specguard)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🌟 Why SpecGuard?

As AI agents become a core part of the development lifecycle, keeping a repository stable requires more than just a linter. SpecGuard provides:

- **Deterministic Enforcement**: Stop forbidden file modifications and secret leaks before they reach CI.
- **Agent-Centric Design**: Machine-readable reports designed to feed back into agent repair loops.
- **Cross-Platform Stability**: Robust tool execution on Windows, macOS, and Linux with safe shell fallback mechanisms.
- **Zero-Trust Tooling**: Executes verification tools in restricted environments, masking sensitive output automatically.

---

## 🚀 Key Features

### 🛠️ Secure Tool runner
Execute `npm`, `pnpm`, `make`, or custom scripts with granular control. By default, tools run without a shell to prevent injection, with opt-in shell support when needed.

### 🔍 Intelligence & Redaction
SpecGuard automatically redacts secrets from tool outputs using your custom patterns, ensuring that agent logs remain lean and secure.

### 📄 Comprehensive Reporting
Generates both human-readable Markdown and machine-parsable JSON reports. Every run creates an audit trail of passes, skips, and failures with precise reasons.

### 🤖 Agent-Ready (v0.1.4+)
Dedicated `AGENTS.md` instructions and structured output formats allow integration with LLM-based coding agents to verify their own work autonomously.

---

## 📦 Installation

```bash
npm install specguard --save-dev
```

Or run it instantly via `npx`:

```bash
npx specguard validate
```

---

## ⚙️ Quick Start

1. **Initialize SpecGuard** in your repository:
   ```bash
   npx specguard init
   ```
   This creates a `.ai/specguard/spec.yaml` configuration file and setup instructions.

2. **Configure Your Spec**:
   Define your repo rules in `.ai/specguard/spec.yaml`:
   ```yaml
   repo:
     forbidden_globs:
       - "**/config/secrets.json"
       - ".env*"
   
   tool_verified:
     steps:
       - name: "Linting"
         command: "npm run lint"
         optional: false
   ```

3. **Validate**:
   ```bash
   npx specguard validate
   ```

---

## 📖 Component Overview

| Feature | Description |
| :--- | :--- |
| **Repo Guard** | Restricts modifications to critical paths using glob patterns. |
| **Secret Scanner** | Regex-based scanning of modified files and command output. |
| **Tool Verifier** | High-fidelity execution of verification scripts (Lint/Test/Build). |
| **Output Contract** | Enforces that agents only claim successful runs when tools actually pass. |

---

## 📚 Documentation

Deep-dive into SpecGuard's capabilities:

- [🚀 Quickstart Guide](/docs/quickstart.md)
- [🤖 AI Agent Integration](/docs/codex-and-agents.md)
- [🛠️ Spec Schema Reference](/docs/spec-reference.md)
- [📊 Understanding Reports](/docs/reports.md)

---

## ⚖️ License

SpecGuard is open-source software licensed under the [MIT License](LICENSE).
