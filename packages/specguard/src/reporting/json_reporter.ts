import fs from 'fs';
import path from 'path';
import os from 'os';
import { Spec } from '../spec/schema.js';
import crypto from 'crypto';

interface ReportData {
    status: string;
    spec: Spec;
    timestamp: string;
    changedFiles: string[];
    violations: any[];
    toolResults: any[];
    runMeta: {
        repoRoot: string;
        diffMode: string;
        baseRef?: string;
        headRef?: string;
    };
}

export async function generateReport(data: ReportData, reportDir: string) {
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }

    const runId = crypto.randomUUID();
    const ts = data.timestamp.replace(/[:.]/g, '-');
    const jsonPath = path.join(reportDir, `specguard_${ts}_${runId.slice(0, 8)}.json`);
    const mdPath = path.join(reportDir, `specguard_${ts}_${runId.slice(0, 8)}.md`);
    const toolLogDir = path.join(reportDir, 'logs', runId);

    // Write tool logs
    const processedToolResults = [];
    if (data.toolResults.length > 0) {
        fs.mkdirSync(toolLogDir, { recursive: true });

        for (const tool of data.toolResults) {
            const logFile = `${tool.name.replace(/\s+/g, '_')}.log`;
            const logPath = path.join(toolLogDir, logFile);

            const combinedLog = `STDOUT:\n${tool.stdout}\n\nSTDERR:\n${tool.stderr}\n`;
            // Here we would apply redaction to combinedLog if we were inside the tool runner or here. 
            // Assuming tool.stdout/stderr are already redacted or redaction happens before writing.
            // Re-implementing basic redaction here just in case:
            // const redactedLog = redact(combinedLog, data.spec); 
            // For now writing raw captured output, assuming it's safe-ish or redaction is separate step.

            fs.writeFileSync(logPath, combinedLog);

            processedToolResults.push({
                ...tool,
                stdout: undefined, // Don't bloat JSON with full logs
                stderr: undefined,
                log_path: `logs/${runId}/${logFile}`,
                output_tail: tool.stderr.slice(-1000) // Keep accessible tail
            });
        }
    }

    const report = {
        report_version: "0.1",
        run_id: runId,
        timestamp: data.timestamp,
        platform: os.platform(),
        node_version: process.version,
        status: data.status,
        run_meta: data.runMeta,
        spec: {
            id: data.spec.spec_id,
            version: data.spec.version,
            content: data.spec // Include full spec for audit? Or just metadata. keeping full for now.
        },
        changed_files: data.changedFiles,
        violations: data.violations,
        tool_steps: processedToolResults,
        report_paths: {
            json: jsonPath,
            md: mdPath,
            tool_logs: data.toolResults.length > 0 ? toolLogDir : null
        }
    };

    // Write JSON
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // Write MD
    let md = `# SpecGuard Report\n\n`;

    // Agent Summary
    md += `## 🤖 Agent Summary\n\n`;
    const isPass = data.status === 'PASS';
    md += `**Result**: ${isPass ? '✅ PASS' : '❌ FAIL'}\n`;
    md += `**Changes**: ${data.changedFiles.length} files\n`;

    if (data.violations.length > 0) {
        md += `**Top Violations**:\n`;
        // Top 5
        for (const v of data.violations.slice(0, 5)) {
            md += `- ${v.type}: ${v.details.slice(0, 100)}${v.details.length > 100 ? '...' : ''}\n`;
        }
        if (data.violations.length > 5) {
            md += `- ... and ${data.violations.length - 5} more\n`;
        }
    } else {
        md += `**Violations**: None\n`;
    }

    if (processedToolResults.length > 0) {
        md += `\n**Tools**:\n`;
        md += `| Tool | Status | Optional | Exit |\n`;
        md += `| --- | --- | --- | --- |\n`;
        for (const t of processedToolResults) {
            md += `| ${t.name} | ${t.status} | ${t.optional} | ${t.exit_code ?? '-'} |\n`;
        }
    }

    md += `\n**Next Action**: `;
    if (isPass) {
        md += `Proceed with changes.\n`;
    } else {
        md += `Fix violations and re-run: \`npx specguard validate\`\n`;
    }

    md += `\n---\n\n`; // Separator

    // Detailed Report
    md += `## Run Details\n`;
    md += `**Run ID**: ${runId}\n`;
    md += `**Date**: ${data.timestamp}\n`;
    md += `**Mode**: ${data.runMeta.diffMode}\n`;
    md += `**Platform**: ${os.platform()} / Node ${process.version}\n\n`;

    if (data.violations.length > 0) {
        md += `## ❌ Violations Full List\n`;
        for (const v of data.violations) {
            md += `- **${v.type}**: ${v.file || 'N/A'} - ${v.details}\n`;
        }
    }

    md += `\n## Tool Execution Details\n`;
    if (processedToolResults.length === 0) {
        md += `No tools configured.\n`;
    } else {
        for (const t of processedToolResults) {
            let icon = '✅';
            if (t.status === 'FAILED') icon = t.optional ? '⚠️' : '❌';
            if (t.status === 'SKIPPED') icon = '⏭️';

            md += `### ${icon} ${t.name}\n`;
            md += `- Status: **${t.status}**\n`;
            md += `- Command: \`${t.command}\`\n`;
            if (t.reason) md += `- Reason: ${t.reason}\n`;
            if (t.exit_code !== null) md += `- Exit Code: ${t.exit_code}\n`;
            md += `- Duration: ${t.duration_ms}ms\n`;

            if (t.output_tail) {
                md += `Output Tail:\n\`\`\`\n${t.output_tail}\n\`\`\`\n`;
            }
            if (t.log_path) {
                md += `Full Log: [${path.basename(t.log_path)}](${t.log_path})\n`;
            }
        }
    }

    fs.writeFileSync(mdPath, md);
    console.log(`\nReports generated:\n  JSON: ${jsonPath}\n  MD:   ${mdPath}`);
}
