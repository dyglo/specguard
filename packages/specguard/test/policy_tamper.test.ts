import { describe, it, expect } from 'vitest';
import { validatePolicyTamper } from '../src/validators/policy_tamper.js';

describe('validatePolicyTamper', () => {
    it('should fail when policy files change by default', () => {
        const violations = validatePolicyTamper(['.ai/specguard/spec.yaml']);
        expect(violations).toHaveLength(1);
        expect(violations[0].type).toBe('policy_tamper');
    });

    it('should allow policy changes when override is set', () => {
        const violations = validatePolicyTamper(['.ai/specguard/spec.yaml'], true);
        expect(violations).toHaveLength(0);
    });
});