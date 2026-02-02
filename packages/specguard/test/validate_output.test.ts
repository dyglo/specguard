import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateAndReport } from '../src/index.js';

vi.mock('../src/spec/loader.js', () => ({
    loadSpec: vi.fn(() => ({}))
}));
vi.mock('../src/git/diff.js', () => ({
    getChangedFiles: vi.fn(async () => [])
}));
vi.mock('../src/validators/file_system.js', () => ({
    validateForbiddenGlobs: vi.fn(() => [])
}));
vi.mock('../src/validators/secrets.js', () => ({
    validateSecrets: vi.fn(async () => [])
}));
vi.mock('../src/validators/policy_tamper.js', () => ({
    validatePolicyTamper: vi.fn(() => [])
}));
vi.mock('../src/validators/tools.js', () => ({
    runToolChecks: vi.fn(async () => ({
        results: [],
        violations: [{ type: 'tool_missing', severity: 'warning', details: 'missing tool' }]
    }))
}));
vi.mock('../src/reporting/json_reporter.js', () => ({
    generateReport: vi.fn(async () => undefined)
}));

describe('validateAndReport output', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('prints PASS with warnings message', async () => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        const result = await validateAndReport({
            specPath: '/repo/spec.yaml',
            repoRoot: '/repo',
            reportDir: '/repo/reports',
            format: 'standard'
        });

        expect(result.success).toBe(true);
        expect(logSpy.mock.calls.some((call) => call[0].includes('PASS (with warnings: 1)'))).toBe(true);

        logSpy.mockRestore();
    });
});