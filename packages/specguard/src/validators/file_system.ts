import ignore from 'ignore';
import { Spec } from '../spec/schema.js';

export function validateForbiddenGlobs(spec: Spec, changedFiles: string[]): any[] {
    const globs = spec.repo?.forbidden_globs || [];
    if (globs.length === 0) return [];

    // @ts-ignore
    const ig = ignore().add(globs);
    const violations: any[] = [];

    for (const file of changedFiles) {
        if (ig.ignores(file)) {
            violations.push({
                type: 'forbidden_file',
                file,
                details: `Matches forbidden pattern in: ${globs.join(', ')}` // Simplifying detail
            });
        }
    }

    return violations;
}
