import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateReport } from '../src/reporting/json_reporter.js';
import fs from 'fs';
import path from 'path';

vi.mock('fs');
vi.mock('crypto', () => ({
    default: {
        randomUUID: () => '1111-2222'
    }
}));

describe('generateReport', () => {
    it('should write JSON and MD reports and log files', async () => {
        const reportDir = path.normalize('/reports');
        vi.spyOn(fs, 'existsSync').mockReturnValue(true);
        const writeFile = vi.spyOn(fs, 'writeFileSync');
        const mkdir = vi.spyOn(fs, 'mkdirSync');

        const data: any = {
            status: 'PASS',
            spec: { spec_id: 'test', version: '1' },
            timestamp: '2023-01-01',
            changedFiles: ['a.ts'],
            violations: [],
            toolResults: [{
                name: 'TestTool',
                command: 'echo',
                status: 'RAN',
                exit_code: 0,
                stdout: 'out',
                stderr: 'err',
                optional: false,
                duration_ms: 100
            }],
            runMeta: { diffMode: 'working', repoRoot: '/repo' }
        };

        await generateReport(data, reportDir);

        // Expect logs dir creation
        const expectedLogsDir = path.join(reportDir, 'logs', '1111-2222');
        expect(mkdir).toHaveBeenCalledWith(expectedLogsDir, { recursive: true });

        // Expect log file write
        expect(writeFile).toHaveBeenCalledWith(
            expect.stringContaining('TestTool.log'),
            expect.stringContaining('STDOUT:\nout')
        );

        // Expect JSON write
        expect(writeFile).toHaveBeenCalledWith(
            expect.stringContaining('.json'),
            expect.stringContaining('"run_id": "1111-2222"')
        );
    });

    it('should handle skipped tools without stderr', async () => {
        const reportDir = path.normalize('/reports');
        vi.spyOn(fs, 'existsSync').mockReturnValue(true);
        const writeFile = vi.spyOn(fs, 'writeFileSync');
        vi.spyOn(fs, 'mkdirSync');

        const data: any = {
            status: 'PASS',
            spec: { spec_id: 'test', version: '1' },
            timestamp: '2023-01-01',
            changedFiles: [],
            violations: [],
            toolResults: [{
                name: 'Optional',
                command: 'missing',
                status: 'SKIPPED',
                exit_code: null,
                optional: true,
                duration_ms: 10
            }],
            runMeta: { diffMode: 'working', repoRoot: '/repo' }
        };

        await generateReport(data, reportDir);

        expect(writeFile).toHaveBeenCalledWith(
            expect.stringContaining('.json'),
            expect.stringContaining('"output_tail": ""')
        );
    });
});
