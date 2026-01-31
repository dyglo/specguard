import fs from 'fs';
import yaml from 'yaml';
import { SpecSchema, Spec } from './schema.js';

export function loadSpec(specPath: string): Spec {
    if (!fs.existsSync(specPath)) {
        throw new Error(`Spec file not found at ${specPath}`);
    }

    const content = fs.readFileSync(specPath, 'utf-8');
    let parsed: any;
    try {
        parsed = yaml.parse(content);
    } catch (e: any) {
        throw new Error(`Failed to parse YAML spec: ${e.message}`);
    }

    const result = SpecSchema.safeParse(parsed);
    if (!result.success) {
        const errorMsg = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
        throw new Error(`Invalid spec structure: ${errorMsg}`);
    }

    return result.data;
}
