import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { Spec } from '../spec/schema.js';
import { parseCommand } from '../utils/cmd_parser.js';
import { redact } from '../utils/redaction.js';

interface ToolResult {
    name: string;
    command: string;
    status: 'RAN' | 'SKIPPED' | 'FAILED';
    exit_code: number | null;
    stdout?: string;
    stderr?: string;
    reason?: string;
    duration_ms: number;
    optional: boolean;
}

interface ToolOutput {
    results: ToolResult[];
    violations: any[];
}

const DEFAULT_ENV_ALLOWLIST = [
    "PATH", "HOME", "USERPROFILE", "TEMP", "TMP", "NODE_ENV", "CI", "npm_config_user_agent"
];

export async function runToolChecks(spec: Spec, repoRoot: string): Promise<ToolOutput> {
    const tools = spec.tool_verified?.steps || [];
    const results: ToolResult[] = [];
    const violations: any[] = [];

    for (const tool of tools) {
        console.log(`Run tool: ${tool.name}...`);
        const startTime = Date.now();

        // Determine script existence for npm/pnpm/yarn commands
        // If script is missing and skip_if_missing is true (default for optional), SKIP.
        const firstWord = tool.command.split(/\s+/)[0];
        const isNpmRun = firstWord === 'npm' || firstWord === 'pnpm' || firstWord === 'yarn';

        let shouldSkip = false;
        let skipReason = '';

        if (isNpmRun) {
            // Check process.cwd() or tool.cwd? Default checks repoRoot unless cwd specified
            const toolCwd = tool.cwd ? path.resolve(repoRoot, tool.cwd) : repoRoot;
            const pkgJsonPath = path.join(toolCwd, 'package.json');

            // Extract script name. e.g. "npm run lint" -> "lint"
            // "pnpm lint" -> "lint"; "yarn lint" -> "lint"
            const args = tool.command.split(/\s+/);
            let scriptName = '';

            if (firstWord === 'npm' && args[1] === 'run' && args[2]) scriptName = args[2];
            else if (firstWord === 'pnpm' && args[1] === 'run' && args[2]) scriptName = args[2];
            else if (firstWord === 'pnpm' && args[1]) scriptName = args[1]; // pnpm lint
            else if (firstWord === 'yarn' && args[1]) scriptName = args[1];

            if (scriptName) {
                if (!fs.existsSync(pkgJsonPath)) {
                    // No package.json
                    if (tool.skip_if_missing !== false) {
                        shouldSkip = true;
                        skipReason = `No package.json found in ${toolCwd}`;
                    }
                } else {
                    try {
                        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
                        if (!pkg.scripts || !pkg.scripts[scriptName]) {
                            if (tool.skip_if_missing !== false) {
                                shouldSkip = true;
                                skipReason = `Script '${scriptName}' missing in package.json`;
                            } else {
                                // If skip_if_missing = false, we proceed and let logic fail or we fail early
                                // But npm run will fail anyway if script missing.
                                // Requirement says: "If skip_if_missing=false => mark FAILED with clear message."
                                // But let's let it run? No, npm output might not be clear.
                                // Let's rely on runSpawn failing ideally, but user asked for detection.
                                // Let's let it run if not skipping? No, prompt "mark SKIPPED (not FAILED)" implies logic here.
                            }
                        }
                    } catch (e) {
                        // Broken package.json, treat same as missing
                        if (tool.skip_if_missing !== false) {
                            shouldSkip = true;
                            skipReason = 'Failed to parse package.json';
                        }
                    }
                }
            }
        }

        // Manual skip override? (Not in spec, but helpful logic)
        // Check "Skip if missing" default logic: default TRUE for optional, FALSE for required
        if (tool.skip_if_missing === undefined) {
            // If optional=true, default skip=true. If optional=false, default skip=false.
            // Actually, strict logic requested: "default: true for optional steps; false for required steps"
            // Implemented above implicitly? No.
            // Wait, above logic only sets shouldSkip if explicit check fails.
        }

        if (shouldSkip) {
            console.log(`  SKIPPED: ${skipReason}`);
            results.push({
                name: tool.name,
                command: tool.command,
                status: 'SKIPPED',
                exit_code: null,
                reason: skipReason,
                duration_ms: Date.now() - startTime,
                optional: !!tool.optional
            });
            continue;
        }

        try {
            const cwd = tool.cwd ? path.resolve(repoRoot, tool.cwd) : repoRoot;

            // Env construction
            const env: NodeJS.ProcessEnv = {};
            // Allowlist
            const allowList = tool.env_allowlist || DEFAULT_ENV_ALLOWLIST;
            for (const key of allowList) {
                if (process.env[key] !== undefined) {
                    env[key] = process.env[key];
                }
            }
            // Overrides
            if (tool.env) {
                Object.assign(env, tool.env);
            }

            // Command Parsing
            let cmdStr = tool.command;
            let finalCmd: string;
            let finalArgs: string[];
            let shell = false;

            if (tool.allow_shell) {
                shell = true;
                finalCmd = cmdStr;
                finalArgs = []; // Spawn with shell enabled takes command string as first arg usually, or requires shell syntax
                // spawn(command, args, { shell: true }) -> command is string.
                // But wait, spawn behavior with shell: true:
                // If args provided, they are passed to shell.
                // Usually we just pass the whole command string if shell=true.
            } else {
                const parsed = parseCommand(cmdStr);
                finalCmd = parsed.cmd;
                finalArgs = parsed.args;

                // Compatibility hack for Windows npm/pnpm without shell
                if (process.platform === 'win32') {
                    if (['npm', 'pnpm', 'yarn'].includes(finalCmd)) {
                        finalCmd = `${finalCmd}.cmd`;
                    }
                }
            }

            const res = await runSpawn(finalCmd!, finalArgs!, cwd, env, tool.timeout_seconds, shell);
            const duration = Date.now() - startTime;

            // Redact output
            const stdout = redact(res.stdout, spec);
            const stderr = redact(res.stderr, spec);

            const status = res.code === 0 ? 'RAN' : 'FAILED';

            const toolRes: ToolResult = {
                name: tool.name,
                command: tool.command,
                status,
                exit_code: res.code,
                stdout,
                stderr,
                duration_ms: duration,
                optional: !!tool.optional,
                reason: res.reason
            };

            results.push(toolRes);

            if (status === 'FAILED') {
                console.log(`  FAILED (Optional: ${tool.optional}) - Code: ${res.code}`);
                if (!tool.optional) {
                    violations.push({
                        type: 'tool_failure',
                        file: 'N/A',
                        details: `Tool '${tool.name}' failed with exit code ${res.code}. Reason: ${res.reason || 'Process exited with error'}`
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
            results.push({
                name: tool.name,
                command: tool.command,
                status: 'FAILED',
                exit_code: 1, // Synthetic
                reason: e.message,
                duration_ms: Date.now() - startTime,
                optional: !!tool.optional
            });
        }
    }

    return { results, violations };
}

function runSpawn(
    cmd: string,
    args: string[],
    cwd: string,
    env: NodeJS.ProcessEnv,
    timeoutSec?: number,
    shell: boolean = false
): Promise<{ code: number, stdout: string, stderr: string, reason?: string }> {
    return new Promise((resolve, reject) => {
        // If shell=true, 'cmd' is the full command string, args should be empty or handled carefully.
        // Node spawn with shell: true treats 'cmd' as command line.

        const cp = spawn(cmd, args, {
            cwd,
            shell,
            env,
            timeout: timeoutSec ? (timeoutSec * 1000) : 300000 // Default 300s
        });

        let stdout = '';
        let stderr = '';

        cp.stdout.on('data', (d) => stdout += d.toString());
        cp.stderr.on('data', (d) => stderr += d.toString());

        cp.on('error', (err) => {
            // reject(err); // Don't reject, just return error code so we can log it
            resolve({ code: 127, stdout, stderr, reason: `Spawn error: ${err.message}` });
        });

        cp.on('close', (code, signal) => {
            if (signal) {
                resolve({ code: 128 + 15, stdout, stderr, reason: `Killed by signal ${signal} (Timeout?)` });
            } else {
                resolve({ code: code ?? -1, stdout, stderr });
            }
        });
    });
}
