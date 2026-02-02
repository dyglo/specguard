import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Spec } from '../spec/schema.js';

export type RepairSeverity = 'error' | 'warning';

export interface RepairJsonLocation {
    path: string;
    line?: number;
    column?: number;
}

export interface RepairJsonFinding {
    id: string;
    severity: RepairSeverity;
    title: string;
    reason: string;
    locations: RepairJsonLocation[];
    evidence: string[];
    acceptance: string[];
    fix?: {
        summary: string;
        steps: string[];
    };
}

export interface RepairJsonReport {
    schema_version: string;
    run_id: string;
    verdict: 'PASS' | 'FAIL';
    summary: {
        errors: number;
        warnings: number;
        drift_score?: number;
    };
    findings: RepairJsonFinding[];
    constraints: {
        blocked_paths: string[];
        allow_shell_effective: boolean;
        required_steps?: string[];
    };
    next_action: {
        agent_message: string;
        ordered_fix_plan: string[];
    };
}

interface RepairReportData {
    status: string;
    spec: Spec;
    timestamp: string;
    changedFiles: string[];
    violations: any[];
    toolResults: any[];
    runMeta: {
        repoRoot: string;
        diffMode: string;
        baseRef?: string;
        headRef?: string;
    };
}

interface RepairReportOptions {
    allowPolicyEdit?: boolean;
}

const VIOLATION_DEFS: Record<string, {
    id: string;
    title: string;
    acceptance: string[];
    fixSummary?: string;
    fixSteps?: string[];
}> = {
    forbidden_file: {
        id: 'SG-FORBIDDEN-GLOB',
        title: 'Forbidden file change',
        acceptance: ['Do not modify files that match forbidden globs.'],
        fixSummary: 'Revert forbidden file changes',
        fixSteps: ['Revert or remove changes to forbidden paths.']
    },
    secret_detected: {
        id: 'SG-SECRET-DETECTED',
        title: 'Secret detected',
        acceptance: ['Remove secrets from code and rotate affected credentials.'],
        fixSummary: 'Remove detected secret',
        fixSteps: [
            'Remove secret from the file and replace it with a safe reference.',
            'Rotate any exposed credentials.'
        ]
    },
    tool_failure: {
        id: 'SG-TOOL-FAILED',
        title: 'Required tool failed',
        acceptance: ['Fix tool failures and re-run SpecGuard.'],
        fixSummary: 'Fix required tool failure',
        fixSteps: ['Run the tool locally and resolve failures.', 'Re-run SpecGuard validation.']
    },
    tool_execution_error: {
        id: 'SG-TOOL-ERROR',
        title: 'Tool execution error',
        acceptance: ['Ensure tool commands are valid and shell is only enabled when required.'],
        fixSummary: 'Fix tool execution error',
        fixSteps: [
            'Verify the tool command, working directory, and dependencies.',
            'Enable allow_shell only if shell features are required.'
        ]
    },
    policy_tamper: {
        id: 'SG-POLICY-TAMPER',
        title: 'SpecGuard policy tamper',
        acceptance: ['Do not edit .ai/specguard/** unless --allow-policy-edit is used.'],
        fixSummary: 'Revert policy edits',
        fixSteps: [
            'Revert changes under .ai/specguard/**, or rerun with --allow-policy-edit if authorized.'
        ]
    },
    tool_missing: {
        id: 'SG-TOOL-MISSING',
        title: 'Optional tool missing',
        acceptance: ['Install the missing tool or remove the optional step from spec.']
    },
    tool_optional_failed: {
        id: 'SG-TOOL-FAILED-OPTIONAL',
        title: 'Optional tool failed',
        acceptance: ['Fix optional tool failures or remove the optional step from spec.']
    }
};

const DEFAULT_DEF = {
    id: 'SG-UNKNOWN',
    title: 'Unknown violation',
    acceptance: ['Resolve the violation and re-run SpecGuard.'],
    fixSummary: 'Resolve unknown violation',
    fixSteps: ['Review the violation details and fix the issue.']
};

function normalizePath(value: string): string {
    return value.replace(/\\/g, '/');
}

function buildLocations(violation: any): RepairJsonLocation[] {
    if (violation.file && violation.file !== 'N/A') {
        return [{ path: normalizePath(violation.file) }];
    }
    return [];
}

function buildFinding(violation: any): RepairJsonFinding {
    const def = VIOLATION_DEFS[violation.type] || DEFAULT_DEF;
    const severity: RepairSeverity = violation.severity === 'warning' ? 'warning' : 'error';
    const reason = violation.details || 'Policy violation detected.';
    const evidence: string[] = [];
    if (violation.tool_name) evidence.push(`Tool: ${violation.tool_name}`);
    if (violation.command) evidence.push(`Command: ${violation.command}`);
    if (violation.exit_code !== undefined && violation.exit_code !== null) {
        evidence.push(`Exit Code: ${violation.exit_code}`);
    }
    if (violation.error) evidence.push(`Error: ${violation.error}`);
    if (evidence.length === 0 && violation.details) {
        evidence.push(violation.details);
    }
    const finding: RepairJsonFinding = {
        id: def.id,
        severity,
        title: def.title,
        reason,
        locations: buildLocations(violation),
        evidence,
        acceptance: def.acceptance
    };

    if (violation.type === 'tool_missing') {
        const guidance = buildMissingToolFix(violation.command || '');
        finding.fix = guidance;
    } else if (def.fixSummary && def.fixSteps) {
        finding.fix = {
            summary: def.fixSummary,
            steps: def.fixSteps
        };
    }

    return finding;
}

function buildMissingToolFix(command: string): { summary: string; steps: string[] } {
    const parts = command.trim().split(/\s+/);
    const binary = parts[0] || 'tool';
    let scriptName = '';

    if (['npm', 'pnpm'].includes(binary) && parts[1] === 'run' && parts[2]) {
        scriptName = parts[2];
    } else if (binary === 'yarn' && parts[1] && parts[1] !== 'run') {
        scriptName = parts[1];
    } else if (binary === 'yarn' && parts[1] === 'run' && parts[2]) {
        scriptName = parts[2];
    } else if (binary === 'pnpm' && parts[1] && parts[1] !== 'run') {
        scriptName = parts[1];
    }

    if (scriptName) {
        return {
            summary: `Add script '${scriptName}' or remove optional step`,
            steps: [
                `Add script '${scriptName}' to package.json, or remove this optional step from spec.`,
                'Re-run SpecGuard validation.'
            ]
        };
    }

    return {
        summary: `Install missing tool '${binary}' or adjust command`,
        steps: [
            `Install the dependency that provides '${binary}', or adjust the command to an available tool.`,
            'Re-run SpecGuard validation.'
        ]
    };
}

function buildConstraints(spec: Spec, allowPolicyEdit?: boolean): RepairJsonReport['constraints'] {
    const blocked = new Set<string>();
    for (const glob of spec.repo?.forbidden_globs || []) {
        blocked.add(glob);
    }
    if (!allowPolicyEdit) {
        blocked.add('.ai/specguard/**');
    }

    const requiredSteps = (spec.tool_verified?.steps || [])
        .filter((step) => step.optional !== true)
        .map((step) => step.name);

    return {
        blocked_paths: Array.from(blocked).sort(),
        allow_shell_effective: (spec.tool_verified?.steps || []).some((step) => step.allow_shell === true),
        required_steps: requiredSteps.length > 0 ? requiredSteps : undefined
    };
}

function buildNextAction(findings: RepairJsonFinding[], verdict: 'PASS' | 'FAIL', errorCount: number): RepairJsonReport['next_action'] {
    const orderedFixPlan = findings.map((finding) => {
        return finding.fix?.summary || `Resolve ${finding.id}: ${finding.title}`;
    });

    const warningFindings = findings.filter((finding) => finding.severity === 'warning');

    if (verdict === 'PASS') {
        if (warningFindings.length === 0) {
            return {
                agent_message: 'SpecGuard PASS. No fixes required.',
                ordered_fix_plan: []
            };
        }

        const warningIds = warningFindings.map((finding) => finding.id).join(', ');
        const recommendation = warningFindings[0]?.fix?.summary || warningFindings[0]?.title;
        return {
            agent_message: `SpecGuard PASS with warnings (${warningFindings.length}): ${warningIds}. Recommended fix: ${recommendation}.`,
            ordered_fix_plan: orderedFixPlan
        };
    }

    const errorIds = findings.filter((finding) => finding.severity === 'error').map((finding) => finding.id).join(', ');
    return {
        agent_message: `Fix ${errorCount} error(s) (${errorIds}) then re-run: npx specguard validate --format repair-json`,
        ordered_fix_plan: orderedFixPlan
    };
}

function sortFindings(findings: RepairJsonFinding[]): RepairJsonFinding[] {
    const severityRank: Record<RepairSeverity, number> = { error: 0, warning: 1 };
    return [...findings].sort((a, b) => {
        const severityDelta = severityRank[a.severity] - severityRank[b.severity];
        if (severityDelta !== 0) return severityDelta;
        if (a.id !== b.id) return a.id.localeCompare(b.id);
        const aPath = a.locations[0]?.path || '';
        const bPath = b.locations[0]?.path || '';
        if (aPath !== bPath) return aPath.localeCompare(bPath);
        return a.title.localeCompare(b.title);
    });
}

export function buildRepairJsonReport(data: RepairReportData, options: RepairReportOptions = {}): RepairJsonReport {
    const findings = sortFindings(data.violations.map(buildFinding));
    const errors = findings.filter((finding) => finding.severity === 'error').length;
    const warnings = findings.filter((finding) => finding.severity === 'warning').length;
    const verdict: 'PASS' | 'FAIL' = data.status === 'PASS' ? 'PASS' : 'FAIL';

    return {
        schema_version: '0.1.0',
        run_id: crypto.randomUUID(),
        verdict,
        summary: {
            errors,
            warnings
        },
        findings,
        constraints: buildConstraints(data.spec, options.allowPolicyEdit),
        next_action: buildNextAction(findings, verdict, errors)
    };
}

export function generateRepairJsonReport(
    data: RepairReportData,
    reportDir: string,
    options: RepairReportOptions = {}
): { report: RepairJsonReport; reportPath?: string } {
    const report = buildRepairJsonReport(data, options);

    let reportPath: string | undefined;
    try {
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }
        const ts = data.timestamp.replace(/[:.]/g, '-');
        reportPath = path.join(reportDir, `specguard_repair_${ts}_${report.run_id.slice(0, 8)}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    } catch (error: any) {
        console.error(`❌ Failed to write repair report: ${error.message}`);
    }

    return { report, reportPath };
}
