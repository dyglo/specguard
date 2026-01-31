# Codex & Agents

SpecGuard is built specifically to improve the reliability of AI agents like Codex, Clippy, or Custom GPTs. 

## The Core Concept: AGENTS.md

When you run `npx specguard init`, it creates or updates an `AGENTS.md` file in your repository root. This file acts as a **mandatory contract** for any AI agent interacting with your repository.

### Recommended template:
```markdown
## 🛡️ SpecGuard Enforced

This repository uses **SpecGuard** for validation. As an AI agent, you **MUST**:

1. **Edit**: Implement your changes.
2. **Validate**: Run `npx specguard validate --staged` before submitting.
3. **Repair**: If validation fails, read the report in `.ai/specguard/reports/` and fix violations.
4. **Finalize**: Mention that validation passed in your final response.
```

## Agent Workflow Loop

1. **Agent Modification**: The agent edits files in the repository.
2. **Validation**: The agent executes `npx specguard validate`.
3. **Report Analysis**: 
   - If success: The agent proceeds.
   - If failure: The agent reads `.ai/specguard/reports/specguard_latest.md`.
4. **Self-Correction**: The agent uses the "Agent Summary" and "Top Violations" list to fix its own errors without human intervention.
5. **Repeat**: The agent validates again until the result is **PASS**.

## Encouraging Agent Compliance

To ensure agents follow the workflow, include a directive in your system prompt or project instructions:

> "Always check for an AGENTS.md file in the repository root. If it includes a SpecGuard section, you must run `npx specguard validate` after every set of changes and fix any violations before responding."

## Troubleshooting Agents

- **Agent skips validate**: Remind the agent that SpecGuard is mandatory for repository hygiene.
- **PATH issues**: If the agent can't find `npx`, ensuring a proper `node` environment is available to the agent tool-runner.
- **Reporting paths**: Ensure the agent knows where to look for reports (usually `.ai/specguard/reports/`).
