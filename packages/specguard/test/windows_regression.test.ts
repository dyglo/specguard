
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runToolChecks } from '../src/validators/tools.js';
import { parseCommand } from '../src/utils/cmd_parser.js';
import * as ChildProcess from 'child_process';
import fs from 'fs';

vi.mock('child_process');
vi.mock('fs');

describe('Windows Regression Fix (v0.1.3)', () => {

    describe('parseCommand hardening', () => {
        it('should throw on empty string', () => {
            expect(() => parseCommand('')).toThrow('Invalid tool command');
            expect(() => parseCommand('   ')).toThrow('Invalid tool command');
        });

        it('should filter empty quoted strings from args', () => {
            // "npm run \"\"" -> cmd: npm, args: [run]
            // This ensures we never pass empty string args to spawn
            const res = parseCommand('npm run ""');
            expect(res.args).toEqual(['run']);
        });

        it('should handle "npm run lint"', () => {
            const res = parseCommand('npm run lint');
            expect(res.cmd).toBe('npm');
            expect(res.args).toEqual(['run', 'lint']);
        });
    });

    describe('runToolChecks safety', () => {
        const mockSpawn = ChildProcess.spawn as unknown as ReturnType<typeof vi.fn>;

        beforeEach(() => {
            vi.resetAllMocks();
            vi.spyOn(fs, 'existsSync').mockReturnValue(true);
            vi.spyOn(fs, 'readFileSync').mockReturnValue('{"scripts":{"lint":"echo"}}');

            // Mock spawn implementation minimal
            mockSpawn.mockImplementation(() => ({
                stdout: { on: vi.fn() },
                stderr: { on: vi.fn() },
                on: vi.fn(),
            }));
        });

        it('should catch invalid command errors and mark as FAILED', async () => {
            const spec: any = {
                tool_verified: {
                    steps: [{ name: 'Bad', command: '   ' }] // Should throw in parser
                }
            };
            const result = await runToolChecks(spec, '.');
            expect(result.results[0].status).toBe('FAILED');
            expect(result.results[0].reason).toContain('Invalid tool command');
        });

        it('should not pass empty arguments to spawn', async () => {
            const spec: any = {
                tool_verified: {
                    steps: [{ name: 'EmptyArg', command: 'npm run ""', skip_if_missing: false }]
                }
            };

            // Mock spawn to capture args
            let capturedArgs: any[] = [];
            mockSpawn.mockImplementation((cmd, args) => {
                capturedArgs = args;
                return {
                    stdout: { on: vi.fn() },
                    stderr: { on: vi.fn() },
                    on: (evt: string, cb: any) => {
                        if (evt === 'close') cb(0);
                    }
                };
            });

            await runToolChecks(spec, '.');
            expect(capturedArgs).toEqual(['run']); // empty string filtered out
        });

        it('should handle synchronous spawn crash gracefully', async () => {
            const spec: any = {
                tool_verified: {
                    steps: [{ name: 'Crash', command: 'npm run crash', skip_if_missing: false }]
                }
            };

            // Mock spawn to throw synchronously
            mockSpawn.mockImplementation(() => {
                throw new Error('spawn EINVAL');
            });

            const result = await runToolChecks(spec, '.');
            expect(result.results[0].status).toBe('FAILED');
            expect(result.results[0].reason).toContain('Spawn failed synchronously: spawn EINVAL');
        });
    });
});
