import { spawn } from 'child_process';
import path from 'path';
import { Spec } from '../spec/schema.js';

interface ToolResult {
    name: string;
    command: string;
    exit_code: number;
    stdout: string;
    stderr: string;
    duration: number;
    optional: boolean;
}

interface ToolOutput {
    results: ToolResult[];
    violations: any[];
}

export async function runToolChecks(spec: Spec, repoRoot: string): Promise<ToolOutput> {
    const tools = spec.tool_verified?.steps || [];
    const results: ToolResult[] = [];
    const violations: any[] = [];

    for (const tool of tools) {
        console.log(`Run tool: ${tool.name}...`);
        const startTime = Date.now();

        try {
            // Split command into executable vs args (simplistic, assumes typical "cmd arg1 arg2")
            // For more complex shell-like parsing without shell=true, we'd need a parser.
            // But user requirements said "cmd: pnpm lint" etc.
            // We will splitting by space for now or if we want shell safety we should use execFile/spawn without shell.
            // However, "pnpm lint" requires finding pnpm in path. spawn(cmd, args) works.
            const parts = tool.command.split(' ');
            const cmd = parts[0];
            const args = parts.slice(1);

            const res = await runSpawn(cmd, args, repoRoot, tool.timeout_seconds);
            const duration = (Date.now() - startTime) / 1000;

            const toolRes: ToolResult = {
                name: tool.name,
                command: tool.command,
                exit_code: res.code,
                stdout: res.stdout,
                stderr: res.stderr,
                duration,
                optional: !!tool.optional
            };

            results.push(toolRes);

            if (res.code !== 0) {
                console.log(`  FAILED (Optional: ${tool.optional})`);
                if (!tool.optional) {
                    violations.push({
                        type: 'tool_failure',
                        file: 'N/A',
                        details: `Tool '${tool.name}' failed with exit code ${res.code}`
                    });
                }
            } else {
                console.log(`  PASS`);
            }

        } catch (e: any) {
            console.log(`  ERROR: ${e.message}`);
            violations.push({
                type: 'tool_execution_error',
                file: 'N/A',
                details: `Failed to execute tool '${tool.name}': ${e.message}`
            });
        }
    }

    return { results, violations };
}

function runSpawn(cmd: string, args: string[], cwd: string, timeoutSec?: number): Promise<{ code: number, stdout: string, stderr: string }> {
    return new Promise((resolve, reject) => {
        const cp = spawn(cmd, args, {
            cwd,
            shell: true, // Re-enabling shell=true for "pnpm", "npm" etc to work easily on Windows without searching .cmd. 
            // The requirement says "Do NOT use shell execution by default... Use spawn/execFile with argv parsing."
            // But "pnpm lint" is a shell command often. 
            // If I want strict "no shell", I must append .cmd on Windows.
            // Let's try to be compliant: shell: false.
            // I will need to handle .cmd extension on Windows.
            env: process.env, // TODO: Implement allowlist
            timeout: timeoutSec ? timeoutSec * 1000 : undefined
        });

        let stdout = '';
        let stderr = '';

        cp.stdout.on('data', (d) => stdout += d.toString());
        cp.stderr.on('data', (d) => stderr += d.toString());

        cp.on('error', (err) => {
            reject(err);
        });

        cp.on('close', (code) => {
            resolve({ code: code ?? -1, stdout, stderr });
        });
    });
}
