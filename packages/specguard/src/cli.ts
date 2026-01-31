import { Command } from 'commander';
import { validate } from './index.js';
import { init } from './init.js';
import path from 'path';
import fs from 'fs';

const program = new Command();

program
    .name('specguard')
    .description('SpecGuard Validator CLI')
    .version('0.1.0');

program
    .command('validate')
    .description('Run validation against a spec')
    .option('--spec <path>', 'Path to spec.yaml')
    .option('--repo-root <path>', 'Path to repository root (default: cwd)')
    .option('--report-dir <path>', 'Path to report output directory')
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

            const success = await validate({
                specPath,
                repoRoot,
                reportDir,
                diffMode: diffMode as any,
                baseRef: options.base,
                headRef: options.head
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

program.parse();
