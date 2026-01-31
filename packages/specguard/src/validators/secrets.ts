import fs from 'fs';
import path from 'path';
import { Spec } from '../spec/schema.js';

export async function validateSecrets(spec: Spec, changedFiles: string[], repoRoot: string): Promise<any[]> {
    const secrets = spec.deterministic_rules?.secret_patterns || [];
    if (secrets.length === 0) return [];

    const violations: any[] = [];

    for (const file of changedFiles) {
        const fullPath = path.resolve(repoRoot, file);
        if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
            continue;
        }

        try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            for (const secret of secrets) {
                const regex = new RegExp(secret.regex);
                if (regex.test(content)) {
                    violations.push({
                        type: 'secret_detected',
                        file,
                        details: `Potential ${secret.name} detected`
                    });
                }
            }
        } catch (error) {
            // Ignore binary files or read errors
        }
    }

    return violations;
}
