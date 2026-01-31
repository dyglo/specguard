import { describe, it, expect, vi, afterEach } from 'vitest';
import { validateSecrets } from '../src/validators/secrets.js';
import { Spec } from '../src/spec/schema.js';
import fs from 'fs';
import path from 'path';

vi.mock('fs');
vi.mock('path');

describe('validateSecrets', () => {
    afterEach(() => {
        vi.resetAllMocks();
    });

    it('should detect secrets in files', async () => {
        const spec: Spec = {
            deterministic_rules: {
                secret_patterns: [
                    { name: 'API Key', regex: 'API_KEY_[0-9]+' }
                ]
            }
        };
        const changedFiles = ['src/config.ts'];
        const repoRoot = '/repo';

        vi.spyOn(path, 'resolve').mockReturnValue('/repo/src/config.ts');
        vi.spyOn(fs, 'existsSync').mockReturnValue(true);
        vi.spyOn(fs, 'statSync').mockReturnValue({ isFile: () => true } as any);
        vi.spyOn(fs, 'readFileSync').mockReturnValue('const key = "API_KEY_12345";');

        const violations = await validateSecrets(spec, changedFiles, repoRoot);

        expect(violations).toHaveLength(1);
        expect(violations[0].type).toBe('secret_detected');
        expect(violations[0].details).toContain('API Key');
    });

    it('should ignore safe files', async () => {
        const spec: Spec = {
            deterministic_rules: {
                secret_patterns: [
                    { name: 'API Key', regex: 'API_KEY_[0-9]+' }
                ]
            }
        };
        const changedFiles = ['src/utils.ts'];
        const repoRoot = '/repo';

        vi.spyOn(path, 'resolve').mockReturnValue('/repo/src/utils.ts');
        vi.spyOn(fs, 'existsSync').mockReturnValue(true);
        vi.spyOn(fs, 'statSync').mockReturnValue({ isFile: () => true } as any);
        vi.spyOn(fs, 'readFileSync').mockReturnValue('const x = 1;');

        const violations = await validateSecrets(spec, changedFiles, repoRoot);
        expect(violations).toHaveLength(0);
    });
});
