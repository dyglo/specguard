import { execFile } from 'child_process';
import util from 'util';

const execFileAsync = util.promisify(execFile);

export type DiffMode = 'working' | 'staged' | 'range';

export interface DiffOptions {
    mode: DiffMode;
    base?: string;
    head?: string;
}

export async function getChangedFiles(repoRoot: string, options: DiffOptions): Promise<string[]> {
    try {
        let args: string[] = ['diff', '--name-only'];

        switch (options.mode) {
            case 'staged':
                args.push('--cached');
                break;
            case 'range':
                if (!options.base) throw new Error('Base ref required for range mode');
                const head = options.head || 'HEAD';
                args.push(`${options.base}...${head}`);
                break;
            case 'working':
            default:
                // Default: HEAD vs working tree (staged + unstaged)
                // HEAD is implied if not specified, but explicit HEAD avoids ambiguity
                args.push('HEAD');
                break;
        }

        const { stdout } = await execFileAsync('git', args, { cwd: repoRoot });
        return stdout.split('\n').map(l => l.trim()).filter(Boolean);
    } catch (error: any) {
        // Handling initial commit or no HEAD case
        if (options.mode === 'working' && error.message.includes('ambiguous argument \'HEAD\'')) {
            // Likely initial commit, return all files
            try {
                const { stdout } = await execFileAsync('git', ['ls-files'], { cwd: repoRoot });
                return stdout.split('\n').map(l => l.trim()).filter(Boolean);
            } catch (e) {
                return [];
            }
        }
        // Propagate other errors or return empty
        console.warn(`Git diff failed: ${error.message}`);
        return [];
    }
}
