import fs from 'fs';
import path from 'path';
import { loadSpec } from './spec/loader.js';
import { validateForbiddenGlobs } from './validators/file_system.js';
import { validateSecrets } from './validators/secrets.js';
import { runToolChecks } from './validators/tools.js';
import { getChangedFiles, DiffMode } from './git/diff.js';
import { generateReport } from './reporting/json_reporter.js';
import { generateRepairJsonReport, RepairJsonReport } from './reporting/repair_json_reporter.js';

export interface ValidateOptions {
    specPath: string;
    repoRoot: string;
    reportDir: string;
    diffMode?: DiffMode;
    baseRef?: string;
    headRef?: string;
    format?: 'standard' | 'repair-json';
    allowPolicyEdit?: boolean;
}

export interface ValidateResult {
    success: boolean;
    report?: RepairJsonReport;
    reportPath?: string;
}

export async function validateAndReport(options: ValidateOptions & { returnReport?: boolean }): Promise<ValidateResult> {
    const format = options.format || 'standard';
    const logger = format === 'repair-json' ? console.error : console.log;

    logger(`🛡️  SpecGuard: Running validation...`);
    logger(`   Spec: ${options.specPath}`);
    logger(`   Repo: ${options.repoRoot}`);

    const diffMode = options.diffMode || 'working';

    // 1. Load Spec
    const spec = loadSpec(options.specPath);

    // 2. Get Changed Files
    const changedFiles = await getChangedFiles(options.repoRoot, {
        mode: diffMode,
        base: options.baseRef,
        head: options.headRef
    });
    logger(`   Detected ${changedFiles.length} changed files (${diffMode} mode).`);

    const violations: any[] = [];
    const toolResults: any[] = [];

    // 3. Validators
    violations.push(...validateForbiddenGlobs(spec, changedFiles));
    violations.push(...await validateSecrets(spec, changedFiles, options.repoRoot));

    const toolOutputs = await runToolChecks(spec, options.repoRoot);
    toolResults.push(...toolOutputs.results);
    violations.push(...toolOutputs.violations);

    // 4. Report
    const status = violations.length === 0 ? 'PASS' : 'FAIL';
    const reportData = {
        status,
        spec,
        changedFiles,
        violations,
        toolResults,
        timestamp: new Date().toISOString(),
        runMeta: {
            repoRoot: options.repoRoot,
            diffMode: diffMode,
            baseRef: options.baseRef,
            headRef: options.headRef
        }
    };

    let repairReport: RepairJsonReport | undefined;
    let repairPath: string | undefined;

    if (format === 'repair-json') {
        const result = generateRepairJsonReport(reportData, options.reportDir, {
            allowPolicyEdit: options.allowPolicyEdit
        });
        repairReport = result.report;
        repairPath = result.reportPath;
        console.log(JSON.stringify(repairReport, null, 2));
    } else {
        await generateReport(reportData, options.reportDir);
    }

    if (status === 'FAIL') {
        logger('\n❌ Validation FAILED');
    } else {
        logger('\n✅ Validation PASSED');
    }

    return {
        success: status === 'PASS',
        report: options.returnReport ? repairReport : undefined,
        reportPath: options.returnReport ? repairPath : undefined
    };
}

export async function validate(options: ValidateOptions): Promise<boolean> {
    const result = await validateAndReport(options);
    return result.success;
}
