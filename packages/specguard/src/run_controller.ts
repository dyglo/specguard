import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { validateAndReport } from './index.js';
import { RepairJsonReport } from './reporting/repair_json_reporter.js';

interface RunControllerOptions {
    agent: string;
    cmd: string[];
    maxIterations?: number;
    specPath?: string;
    repoRoot?: string;
    reportDir?: string;
    allowPolicyEdit?: boolean;
}

interface SpawnResult {
    code: number;
    reason?: string;
}

function normalizeWinCommand(command: string): string {
    if (process.platform !== 'win32') return command;
    if (command.includes('.') || command.includes(path.sep)) return command;
    if (['npm', 'pnpm', 'yarn', 'npx'].includes(command)) {
        return `${command}.cmd`;
    }
    return command;
}

function runSpawn(cmd: string, args: string[], cwd: string, env: NodeJS.ProcessEnv): Promise<SpawnResult> {
    return new Promise((resolve) => {
        try {
            const cp = spawn(cmd, args, {
                cwd,
                env,
                shell: false,
                stdio: 'inherit'
            });

            cp.on('error', (err) => {
                resolve({ code: 127, reason: `Spawn error: ${err.message}` });
            });

            cp.on('close', (code, signal) => {
                if (signal) {
                    resolve({ code: 128 + 15, reason: `Killed by signal ${signal}` });
                } else {
                    resolve({ code: code ?? -1 });
                }
            });
        } catch (error: any) {
            resolve({ code: 127, reason: `Spawn failed synchronously: ${error.message}` });
        }
    });
}

function buildAgentFailureReport(reason: string, allowPolicyEdit?: boolean): RepairJsonReport {
    const blocked = allowPolicyEdit ? [] : ['.ai/specguard/**'];
    return {
        schema_version: '0.1.0',
        run_id: crypto.randomUUID(),
        verdict: 'FAIL',
        summary: {
            errors: 1,
            warnings: 0
        },
        findings: [
            {
                id: 'SG-AGENT-EXEC-FAILED',
                severity: 'error',
                title: 'Agent command failed',
                reason,
                locations: [],
                evidence: [reason],
                acceptance: ['Ensure the agent command is valid and executable.']
            }
        ],
        constraints: {
            blocked_paths: blocked,
            allow_shell_effective: false
        },
        next_action: {
            agent_message: `Agent command failed: ${reason}`,
            ordered_fix_plan: ['Fix the agent command and retry.']
        }
    };
}

function selectRepairOutputPath(report: RepairJsonReport, repoRoot: string): string {
    const blocked = report.constraints?.blocked_paths || [];
    if (!blocked.includes('.ai/specguard/**')) {
        return path.join(repoRoot, '.ai', 'specguard', 'last-repair.json');
    }
    return path.join(repoRoot, 'specguard-repair.json');
}

function writeRepairJson(report: RepairJsonReport, outputPath: string): void {
    const dir = path.dirname(outputPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
}

export async function runController(options: RunControllerOptions): Promise<number> {
    const repoRoot = options.repoRoot ? path.resolve(process.cwd(), options.repoRoot) : process.cwd();
    const specPath = options.specPath
        ? path.resolve(process.cwd(), options.specPath)
        : path.join(repoRoot, '.ai', 'specguard', 'spec.yaml');
    const reportDir = options.reportDir
        ? path.resolve(process.cwd(), options.reportDir)
        : path.join(repoRoot, '.ai', 'specguard', 'reports');

    if (!fs.existsSync(specPath)) {
        const report = buildAgentFailureReport(`Spec file not found at ${specPath}`, options.allowPolicyEdit);
        const outputPath = selectRepairOutputPath(report, repoRoot);
        writeRepairJson(report, outputPath);
        console.error(report.next_action.agent_message);
        return 2;
    }

    if (!options.cmd || options.cmd.length === 0) {
        const report = buildAgentFailureReport('Missing agent command.', options.allowPolicyEdit);
        const outputPath = selectRepairOutputPath(report, repoRoot);
        writeRepairJson(report, outputPath);
        console.error(report.next_action.agent_message);
        return 2;
    }

    const maxIterations = options.maxIterations ?? 3;
    let lastFailureSignature = '';
    let repeatedFailures = 0;
    let lastRepairPath: string | undefined;

    for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
        const [rawCmd, ...rawArgs] = options.cmd;
        const cmd = normalizeWinCommand(rawCmd);
        const env: NodeJS.ProcessEnv = {
            ...process.env,
            SPEC_GUARD_AGENT: options.agent,
            SPEC_GUARD_ITERATION: String(iteration)
        };
        if (lastRepairPath) {
            env.SPEC_GUARD_REPAIR_JSON = lastRepairPath;
        }

        const spawnResult = await runSpawn(cmd, rawArgs, repoRoot, env);
        if (spawnResult.reason) {
            const report = buildAgentFailureReport(spawnResult.reason, options.allowPolicyEdit);
            const outputPath = selectRepairOutputPath(report, repoRoot);
            writeRepairJson(report, outputPath);
            console.error(report.next_action.agent_message);
            return 1;
        }

        const validation = await validateAndReport({
            specPath,
            repoRoot,
            reportDir,
            diffMode: 'working',
            format: 'repair-json',
            allowPolicyEdit: options.allowPolicyEdit,
            emitJson: false,
            returnReport: true
        });

        if (validation.success) {
            const warnings = validation.report?.summary?.warnings || 0;
            if (warnings > 0) {
                const warningLabels = (validation.report?.findings || [])
                    .filter((finding) => finding.severity === 'warning')
                    .map((finding) => {
                        const toolEvidence = finding.evidence?.find((item) => item.startsWith('Tool: '));
                        if (toolEvidence) {
                            return `${finding.id} (${toolEvidence.replace('Tool: ', '')})`;
                        }
                        return finding.id;
                    })
                    .join(', ');
                const reportPath = validation.reportPath ? ` See ${validation.reportPath}.` : '';
                console.log(`✅ SpecGuard PASS with warnings: ${warningLabels}.${reportPath}`);
            } else {
                console.log(`✅ SpecGuard PASS (iteration ${iteration})`);
            }
            return 0;
        }

        const report = validation.report;
        if (!report) {
            const fallback = buildAgentFailureReport('SpecGuard failed to produce repair JSON.', options.allowPolicyEdit);
            const outputPath = selectRepairOutputPath(fallback, repoRoot);
            writeRepairJson(fallback, outputPath);
            console.error(fallback.next_action.agent_message);
            return 1;
        }

        const outputPath = selectRepairOutputPath(report, repoRoot);
        writeRepairJson(report, outputPath);
        lastRepairPath = outputPath;

        console.error(report.next_action.agent_message);

        const failingIds = report.findings
            .filter((finding) => finding.severity === 'error')
            .map((finding) => finding.id)
            .sort();
        const signature = failingIds.join('|');

        if (signature === lastFailureSignature) {
            repeatedFailures += 1;
            if (repeatedFailures >= 1) {
                console.error('SpecGuard stuck: repeated failing rule IDs.');
                return 1;
            }
        } else {
            repeatedFailures = 0;
        }
        lastFailureSignature = signature;
    }

    return 1;
}
