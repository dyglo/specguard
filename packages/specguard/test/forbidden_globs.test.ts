import { describe, it, expect } from 'vitest';
import { validateForbiddenGlobs } from '../src/validators/file_system.js';
import { Spec } from '../src/spec/schema.js';

describe('validateForbiddenGlobs', () => {
    it('should detect forbidden files', () => {
        const spec: Spec = {
            repo: {
                forbidden_globs: ['engine/**', '*.secret']
            }
        };
        const changedFiles = ['engine/core.ts', 'src/utils.ts', 'config.secret'];

        const violations = validateForbiddenGlobs(spec, changedFiles);

        expect(violations).toHaveLength(2);
        expect(violations[0].file).toBe('engine/core.ts');
        expect(violations[1].file).toBe('config.secret');
    });

    it('should allow allowed files', () => {
        const spec: Spec = {
            repo: {
                forbidden_globs: ['engine/**']
            }
        };
        const changedFiles = ['src/utils.ts'];

        const violations = validateForbiddenGlobs(spec, changedFiles);

        expect(violations).toHaveLength(0);
    });
});
