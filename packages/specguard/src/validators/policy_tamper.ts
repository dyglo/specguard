export function validatePolicyTamper(changedFiles: string[], allowPolicyEdit?: boolean): any[] {
    if (allowPolicyEdit) return [];

    const violations: any[] = [];

    for (const file of changedFiles) {
        const normalized = file.replace(/\\/g, '/');
        if (normalized === '.ai/specguard' || normalized.startsWith('.ai/specguard/')) {
            violations.push({
                type: 'policy_tamper',
                file,
                details: 'Changes to .ai/specguard/** are blocked unless --allow-policy-edit is set.'
            });
        }
    }

    return violations;
}