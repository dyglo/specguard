import fs from 'fs';
import path from 'path';

const SPEC_TEMPLATE = `spec_id: "default-spec"
version: "0.1.0"

repo:
  forbidden_globs:
    - "node_modules/**"
    - "dist/**"
    - ".env"

deterministic_rules:
  secret_patterns:
    - name: "AWS Access Key"
      regex: "AKIA[0-9A-Z]{16}"
    - name: "Generic Secret"
      regex: "secret\\\\s*=\\\\s*['\\"][a-zA-Z0-9]{20,}['\\"]"

tool_verified:
  steps:
    - name: "Lint"
      command: "npm run lint"
      optional: true
      skip_if_missing: true
`;

const AGENTS_MD_TEMPLATE = `
## 🛡️ SpecGuard Enforced

This repository uses **SpecGuard** to ensure code quality and security.
As an AI agent, you **MUST** follow this workflow:

1.  **Edit**: Make your code changes.
2.  **Validate**: Run the validation script to check for issues.
    \`\`\`bash
    npx specguard validate --staged
    \`\`\`
3.  **Repair**: If validation fails, fix the errors and re-run.
4.  **Report**: Include the validation summary in your final response.

**Artifacts Location:**
- Spec: \`.ai/specguard/spec.yaml\`
- Reports: \`.ai/specguard/reports/\`

**Safety Rules:**
- 🚫 NO secrets in code.
- 🚫 NO shell execution in tool steps (unless explicitly allowed).
- ✅ ALWAYS verify your changes.
`;

export async function init(cwd: string, force: boolean) {
  const specDir = path.join(cwd, '.ai', 'specguard');
  const reportsDir = path.join(specDir, 'reports');
  const specPath = path.join(specDir, 'spec.yaml');
  const agentsMdPath = path.join(cwd, 'AGENTS.md');
  const gitignorePath = path.join(cwd, '.gitignore');

  // Create directories
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const gitkeepPath = path.join(reportsDir, '.gitkeep');
  if (!fs.existsSync(gitkeepPath)) {
    fs.writeFileSync(gitkeepPath, '');
  }

  // Create spec.yaml
  if (fs.existsSync(specPath) && !force) {
    console.log('⚠️  spec.yaml already exists. Use --force to overwrite.');
  } else {
    fs.writeFileSync(specPath, SPEC_TEMPLATE);
    console.log('✅ Created .ai/specguard/spec.yaml');
  }

  // Update AGENTS.md
  if (fs.existsSync(agentsMdPath)) {
    const content = fs.readFileSync(agentsMdPath, 'utf-8');
    if (!content.includes('SpecGuard Enforced')) {
      // Append clearly with a separator
      const appendContent = `\n\n---\n${AGENTS_MD_TEMPLATE}`;
      fs.appendFileSync(agentsMdPath, appendContent);
      console.log('✅ Updated AGENTS.md');
    } else {
      console.log('ℹ️  AGENTS.md already contains SpecGuard instructions.');
    }
  } else {
    fs.writeFileSync(agentsMdPath, `# AGENTS.md\n${AGENTS_MD_TEMPLATE}`);
    console.log('✅ Created AGENTS.md');
  }

  // Update .gitignore
  let gitignoreContent = '';
  if (fs.existsSync(gitignorePath)) {
    gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
  }

  const ignores = [
    '.ai/specguard/reports/**',
    '!.ai/specguard/reports/.gitkeep'
  ];

  let addedIgnore = false;
  // Ensure we end with newline before appending if file not empty
  if (gitignoreContent && !gitignoreContent.endsWith('\n')) {
    gitignoreContent += '\n';
  }

  for (const ign of ignores) {
    if (!gitignoreContent.includes(ign)) {
      gitignoreContent += `${ign}\n`;
      addedIgnore = true;
    }
  }

  if (addedIgnore) {
    fs.writeFileSync(gitignorePath, gitignoreContent);
    console.log('✅ Updated .gitignore');
  } else {
    console.log('ℹ️  .gitignore already configured.');
  }

  // Create helper scripts
  const toolsDir = path.join(specDir, 'tools');
  if (!fs.existsSync(toolsDir)) {
    fs.mkdirSync(toolsDir, { recursive: true });
  }

  // Using npx specguard@latest as requested
  const shScript = `#!/bin/bash
npx specguard@latest validate
`;
  fs.writeFileSync(path.join(toolsDir, 'validate.sh'), shScript, { mode: 0o755 });

  const ps1Script = `npx specguard@latest validate`;
  fs.writeFileSync(path.join(toolsDir, 'validate.ps1'), ps1Script);

  console.log('✅ Created validation helper scripts in .ai/specguard/tools/');
}
