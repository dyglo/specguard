import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { runToolChecks } from '../src/validators/tools.js';
import * as ChildProcess from 'child_process'; // For spying on spawn
import fs from 'fs';
import path from 'path';

// Mock dependencies
vi.mock('child_process');
vi.mock('fs');

describe('runToolChecks', () => {
    const mockSpawn = ChildProcess.spawn as unknown as ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.resetAllMocks();
        // Default fs mocks
        vi.spyOn(fs, 'existsSync').mockReturnValue(true);
        vi.spyOn(fs, 'readFileSync').mockReturnValue('{}');
        vi.spyOn(path, 'resolve').mockImplementation((...args) => args.join('/'));

        // Mock spawn to return a fake process
        mockSpawn.mockImplementation((cmd, args, options) => {
            const listeners: any = {};
            const stdoutListeners: any[] = [];
            const stderrListeners: any[] = [];

            return {
                stdout: {
                    on: (evt: string, cb: any) => { if (evt === 'data') stdoutListeners.push(cb); }
                },
                stderr: {
                    on: (evt: string, cb: any) => { if (evt === 'data') stderrListeners.push(cb); }
                },
                on: (evt: string, cb: any) => { listeners[evt] = cb; },
                // Helper to emit events for testing
                emitClose: (code: number) => listeners['close'] && listeners['close'](code),
                emitError: (err: any) => listeners['error'] && listeners['error'](err),
                emitStdout: (data: string) => stdoutListeners.forEach(cb => cb(data)),
                emitStderr: (data: string) => stderrListeners.forEach(cb => cb(data))
            };
        });
    });

    it('should split command and args correctly (no shell)', async () => {
        const spec: any = {
            tool_verified: {
                steps: [{ name: 'Test', command: 'echo "hello world" --flag', optional: false }]
            }
        };

        const promise = runToolChecks(spec, '/repo');

        // Find the spawn mock
        expect(mockSpawn).toHaveBeenCalled();
        const [cmd, args, opts] = mockSpawn.mock.calls[0];

        expect(cmd).toBe('echo');
        expect(args).toEqual(['hello world', '--flag']);
        expect(opts.shell).toBe(false);

        // Finish the process
        mockSpawn.mock.results[0].value.emitClose(0);
        await promise;
    });

    it('should use shell if allow_shell is true', async () => {
        const spec: any = {
            tool_verified: {
                steps: [{ name: 'Test', command: 'echo hello | grep h', allow_shell: true }]
            }
        };

        const promise = runToolChecks(spec, '/repo');

        expect(mockSpawn).toHaveBeenCalled();
        const [cmd, args, opts] = mockSpawn.mock.calls[0];

        // With shell=true, behavior depends on impl. 
        // Our impl: spawns(cmdStr, [], { shell: true })
        expect(cmd).toBe('echo hello | grep h');
        expect(args).toEqual([]);
        expect(opts.shell).toBe(true);

        mockSpawn.mock.results[0].value.emitClose(0);
        await promise;
    });

    it('should skip npm script if package.json missing', async () => {
        const spec: any = {
            tool_verified: {
                steps: [{ name: 'Lint', command: 'npm run lint', optional: true, skip_if_missing: true }]
            }
        };

        // Mock package.json missing
        vi.spyOn(fs, 'existsSync').mockReturnValue(false);

        const result = await runToolChecks(spec, '/repo');

        expect(result.results[0].status).toBe('SKIPPED');
        expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('should NOT skip required npm script if skip_if_missing is false', async () => {
        const spec: any = {
            tool_verified: {
                steps: [{ name: 'Lint', command: 'npm run lint', optional: false, skip_if_missing: false }]
            }
        };

        vi.spyOn(fs, 'existsSync').mockReturnValue(false);

        const promise = runToolChecks(spec, '/repo');

        // Should run and fail natively via spawn (since we decided to let it run or synthetically fail?)
        // Wait, looking at tools.ts Logic:
        // if (shouldSkip) { ... }
        // if skip_if_missing !== false, we set shouldSkip=true.
        // else we do NOT set shouldSkip=true.
        // So it proceeds to spawn.

        // So mockSpawn SHOULD be called.
        // And it will likely fail if we didn't mock npm properly in system, but we mocked spawn.

        // Wait, current logic in tools.ts for skip_if_missing=false simply DOES NOT SKIP.
        // It does not force fail. It attempts execution.

        // So we expect spawn called.
        expect(mockSpawn).toHaveBeenCalled();
        mockSpawn.mock.results[0].value.emitClose(1);
        await promise;
    });

    it('should redact secrets in output', async () => {
        const spec: any = {
            deterministic_rules: {
                secret_patterns: [{ name: 'Key', regex: 'SECRET_KEY' }]
            },
            tool_verified: {
                steps: [{ name: 'Leak', command: 'echo SECRET_KEY' }]
            }
        };

        const promise = runToolChecks(spec, '/repo');

        const proc = mockSpawn.mock.results[0].value;
        proc.emitStdout('This is my SECRET_KEY here');
        proc.emitClose(0);

        const output = await promise;
        expect(output.results[0].stdout).toContain('***REDACTED***');
        expect(output.results[0].stdout).not.toContain('SECRET_KEY');
    });

    it('should pass env allowlist', async () => {
        const spec: any = {
            tool_verified: {
                steps: [{ name: 'Env', command: 'env', env_allowlist: ['MY_VAR'] }]
            }
        };
        process.env.MY_VAR = 'allowed';
        process.env.OTHER = 'blocked';

        const promise = runToolChecks(spec, '/repo');

        const [cmd, args, opts] = mockSpawn.mock.calls[0];
        expect(opts.env.MY_VAR).toBe('allowed');
        expect(opts.env.OTHER).toBeUndefined();

        mockSpawn.mock.results[0].value.emitClose(0);
        await promise;
    });
});
