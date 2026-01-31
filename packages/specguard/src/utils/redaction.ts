import { Spec } from '../spec/schema.js';

export function redact(text: string, spec: Spec): string {
    if (!text || !spec.deterministic_rules?.secret_patterns) {
        return text;
    }

    let redacted = text;
    for (const pattern of spec.deterministic_rules.secret_patterns) {
        try {
            const regex = new RegExp(pattern.regex, 'g');
            redacted = redacted.replace(regex, '***REDACTED***');
        } catch (e) {
            // Ignore invalid regex in spec to prevent crashes
            console.error(`Invalid regex for secret pattern '${pattern.name}':`, e);
        }
    }
    return redacted;
}
