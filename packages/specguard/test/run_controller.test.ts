import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runController } from '../src/run_controller.js';
import * as ChildProcess from 'child_process';
import fs from 'fs';
import { validateAndReport } from '../src/index.js';

vi.mock('child_process');
vi.mock('fs');
vi.mock('../src/index.js', () => ({
    validateAndReport: vi.fn()
}));

const mockSpawn = ChildProcess.spawn as unknown as ReturnType<typeof vi.fn>;
const mockValidate = validateAndReport as unknown as ReturnType<typeof vi.fn>;

function createReport(blocked: string[] = ['.ai/specguard/**']) {
    return {
        schema_version: '0.1.0',
        run_id: 'run-1',
        verdict: 'FAIL',
        summary: { errors: 1, warnings: 0 },
        findings: [
            {
                id: 'SG-TOOL-FAILED',
                severity: 'error',
                title: 'Required tool failed',
                reason: 'fail',
                locations: [],
                evidence: ['fail'],
                acceptance: ['Fix tool failures.']
            }
        ],
        constraints: {
            blocked_paths: blocked,
            allow_shell_effective: false
        },
        next_action: {
            agent_message: 'Fix failures.',
            ordered_fix_plan: ['Fix failures.']
        }
    };
}

function mockSpawnSuccess() {
    mockSpawn.mockImplementation(() => {
        const listeners: Record<string, any> = {};
        return {
            on: (evt: string, cb: any) => {
                listeners[evt] = cb;
                if (evt === 'close') {
                    cb(0);
                }
            }
        };
    });
}

describe('runController', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.spyOn(fs, 'existsSync').mockReturnValue(true);
        vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined as any);
        vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined as any);
        mockSpawnSuccess();
    });

    it('returns 0 on PASS', async () => {
        mockValidate.mockResolvedValue({ success: true });
        const code = await runController({ agent: 'codex', cmd: ['echo', 'hi'], repoRoot: '/repo' });
        expect(code).toBe(0);
    });

    it('prints PASS with warnings summary', async () => {
        const warnReport = createReport([]);
        warnReport.summary.warnings = 1;
        warnReport.findings = [
            {
                id: 'SG-TOOL-MISSING',
                severity: 'warning',
                title: 'Optional tool missing',
                reason: 'missing',
                locations: [],
                evidence: ['Tool: Lint'],
                acceptance: ['Install tool.']
            }
        ];
        mockValidate.mockResolvedValue({ success: true, report: warnReport, reportPath: '/repo/.ai/specguard/reports/report.json' });
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        const code = await runController({ agent: 'codex', cmd: ['echo', 'hi'], repoRoot: '/repo' });
        expect(code).toBe(0);
        expect(logSpy.mock.calls.some((call) => call[0].includes('PASS with warnings'))).toBe(true);

        logSpy.mockRestore();
    });

    it('writes repair json to repo root when blocked', async () => {
        mockValidate.mockResolvedValue({ success: false, report: createReport() });
        const code = await runController({ agent: 'codex', cmd: ['echo'], repoRoot: '/repo', maxIterations: 1 });
        expect(code).toBe(1);
        expect(fs.writeFileSync).toHaveBeenCalledWith(
            expect.stringContaining('specguard-repair.json'),
            expect.any(String)
        );
    });

    it('writes repair json to .ai/specguard when allowed', async () => {
        mockValidate.mockResolvedValue({ success: false, report: createReport([]) });
        const code = await runController({ agent: 'codex', cmd: ['echo'], repoRoot: '/repo', maxIterations: 1 });
        expect(code).toBe(1);
        expect(fs.writeFileSync).toHaveBeenCalledWith(
            expect.stringContaining('last-repair.json'),
            expect.any(String)
        );
    });

    it('stops after repeated failing rule IDs', async () => {
        mockValidate.mockResolvedValue({ success: false, report: createReport() });
        const code = await runController({ agent: 'codex', cmd: ['echo'], repoRoot: '/repo', maxIterations: 3 });
        expect(code).toBe(1);
        expect(mockSpawn).toHaveBeenCalledTimes(2);
    });
});
