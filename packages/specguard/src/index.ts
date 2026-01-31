import fs from 'fs';
import path from 'path';
import { loadSpec } from './spec/loader.js';
import { validateForbiddenGlobs } from './validators/file_system.js';
import { validateSecrets } from './validators/secrets.js';
import { runToolChecks } from './validators/tools.js';
import { getChangedFiles, DiffMode } from './git/diff.js';
import { generateReport } from './reporting/json_reporter.js';

export interface ValidateOptions {
    specPath: string;
    repoRoot: string;
    reportDir: string;
    diffMode?: DiffMode;
    baseRef?: string;
    headRef?: string;
}

export async function validate(options: ValidateOptions): Promise<boolean> {
    console.log(`🛡️  SpecGuard: Running validation...`);
    console.log(`   Spec: ${options.specPath}`);
    console.log(`   Repo: ${options.repoRoot}`);

    const diffMode = options.diffMode || 'working';

    // 1. Load Spec
    const spec = loadSpec(options.specPath);

    // 2. Get Changed Files
    const changedFiles = await getChangedFiles(options.repoRoot, {
        mode: diffMode,
        base: options.baseRef,
        head: options.headRef
    });
    console.log(`   Detected ${changedFiles.length} changed files (${diffMode} mode).`);

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
    await generateReport({
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
    }, options.reportDir);

    if (status === 'FAIL') {
        console.log('\n❌ Validation FAILED');
        return false;
    } else {
        console.log('\n✅ Validation PASSED');
        return true;
    }
}
