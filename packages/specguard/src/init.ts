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
`;

const AGENTS_MD_TEMPLATE = `
## 🛡️ SpecGuard Enforced

This repository uses SpecGuard for validation.

**Workflow:**
1. Make changes.
2. Run validation:
   \`\`\`bash
   npm exec specguard validate
   \`\`\`
3. Fix any violations.
4. Include validation report in your PR/Final Answer.
`;

export async function init(cwd: string, force: boolean) {
  const specDir = path.join(cwd, '.ai', 'specguard');
  const reportsDir = path.join(specDir, 'reports');
  const specPath = path.join(specDir, 'spec.yaml');
  const agentsMdPath = path.join(cwd, 'AGENTS.md');

  // Create directories
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(path.join(reportsDir, '.gitkeep'), '');

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
      fs.appendFileSync(agentsMdPath, AGENTS_MD_TEMPLATE);
      console.log('✅ Updated AGENTS.md');
    } else {
      console.log('ℹ️  AGENTS.md already contains SpecGuard instructions.');
    }
  } else {
    fs.writeFileSync(agentsMdPath, `# AGENTS.md\n${AGENTS_MD_TEMPLATE}`);
    console.log('✅ Created AGENTS.md');
  }

  // Create legacy wrapper scripts for convenience? 
  // User asked for .ai/specguard/tools/validate.sh
  const toolsDir = path.join(specDir, 'tools');
  fs.mkdirSync(toolsDir, { recursive: true });

  const shScript = `#!/bin/bash
npx specguard validate --spec "${path.posix.join('.ai', 'specguard', 'spec.yaml')}" --repo-root . --report-dir "${path.posix.join('.ai', 'specguard', 'reports')}"
`;
  fs.writeFileSync(path.join(toolsDir, 'validate.sh'), shScript, { mode: 0o755 });

  const ps1Script = `npx specguard validate --spec ".ai\\specguard\\spec.yaml" --repo-root . --report-dir ".ai\\specguard\\reports"`;
  fs.writeFileSync(path.join(toolsDir, 'validate.ps1'), ps1Script);

  console.log('✅ Created helper scripts in .ai/specguard/tools/');
}
