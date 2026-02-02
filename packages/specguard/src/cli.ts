import { Command } from 'commander';
import { validate } from './index.js';
import { init } from './init.js';
import { runController } from './run_controller.js';
import path from 'path';
import fs from 'fs';

const program = new Command();

program
    .name('specguard')
    .description('SpecGuard Validator CLI')
    .version('0.2.0');

program
    .command('validate')
    .description('Run validation against a spec')
    .option('--spec <path>', 'Path to spec.yaml')
    .option('--repo-root <path>', 'Path to repository root (default: cwd)')
    .option('--report-dir <path>', 'Path to report output directory')
    .option('--format <format>', 'Output format: standard | repair-json')
    .option('--allow-policy-edit', 'Allow changes under .ai/specguard/**')
    .option('--staged', 'Alias for --diff-mode staged')
    .option('--diff-mode <mode>', 'working | staged | range (default: working)')
    .option('--base <ref>', 'Base ref for range diff mode')
    .option('--head <ref>', 'Head ref for range diff mode')
    .action(async (options) => {
        try {
            const repoRoot = options.repoRoot ? path.resolve(process.cwd(), options.repoRoot) : process.cwd();

            let specPath = options.spec ? path.resolve(process.cwd(), options.spec) : path.join(repoRoot, '.ai', 'specguard', 'spec.yaml');
            if (!fs.existsSync(specPath)) {
                console.error(`❌ Spec file not found at ${specPath}`);
                console.error(`   Run 'npx specguard init' to scaffold a new configuration.`);
                process.exit(2);
            }

            let reportDir = options.reportDir ? path.resolve(process.cwd(), options.reportDir) : path.join(repoRoot, '.ai', 'specguard', 'reports');

            let diffMode = options.diffMode || 'working';
            if (options.staged) diffMode = 'staged';

            // Validate diff mode
            if (!['working', 'staged', 'range'].includes(diffMode)) {
                console.error(`❌ Invalid diff mode: ${diffMode}`);
                process.exit(2);
            }

            if (diffMode === 'range' && !options.base) {
                console.error(`❌ --base <ref> is required for range diff mode`);
                process.exit(2);
            }

            const format = options.format || 'standard';
            if (!['standard', 'repair-json'].includes(format)) {
                console.error(`❌ Invalid format: ${format}`);
                process.exit(2);
            }

            const success = await validate({
                specPath,
                repoRoot,
                reportDir,
                diffMode: diffMode as any,
                baseRef: options.base,
                headRef: options.head,
                format,
                allowPolicyEdit: !!options.allowPolicyEdit
            });
            process.exit(success ? 0 : 1);
        } catch (error: any) {
            console.error('Error:', error.message);
            process.exit(2);
        }
    });

program
    .command('init')
    .description('Initialize SpecGuard in the current directory')
    .option('--force', 'Overwrite existing files')
    .action(async (options) => {
        try {
            await init(process.cwd(), !!options.force);
        } catch (e: any) {
            console.error('❌ Init failed:', e.message);
            process.exit(2);
        }
    });

program
    .command('run')
    .description('Run an agent command with SpecGuard loop control')
    .option('--agent <agent>', 'Agent identifier', 'codex')
    .option('--spec <path>', 'Path to spec.yaml')
    .option('--repo-root <path>', 'Path to repository root (default: cwd)')
    .option('--report-dir <path>', 'Path to report output directory')
    .option('--max-iterations <count>', 'Maximum iterations (default: 3)')
    .option('--allow-policy-edit', 'Allow changes under .ai/specguard/**')
    .allowUnknownOption(true)
    .action(async (options) => {
        const delimiterIndex = process.argv.indexOf('--');
        const cmd = delimiterIndex === -1 ? [] : process.argv.slice(delimiterIndex + 1);
        if (cmd.length === 0) {
            console.error('❌ Missing agent command. Use: specguard run --agent codex -- <command>');
            process.exit(2);
        }

        const maxIterations = Number.parseInt(options.maxIterations || '3', 10);
        if (!Number.isFinite(maxIterations) || maxIterations < 1) {
            console.error(`❌ Invalid --max-iterations value: ${options.maxIterations}`);
            process.exit(2);
        }

        const exitCode = await runController({
            agent: options.agent,
            cmd,
            maxIterations,
            specPath: options.spec,
            repoRoot: options.repoRoot,
            reportDir: options.reportDir,
            allowPolicyEdit: !!options.allowPolicyEdit
        });

        process.exit(exitCode);
    });

program.parse();
