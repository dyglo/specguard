import { describe, it, expect, vi, afterEach } from 'vitest';
import { getChangedFiles } from '../src/git/diff.js';
import { execFile } from 'child_process';

// Mock child_process
vi.mock('child_process', async (importOriginal) => {
    return {
        ...await importOriginal<typeof import('child_process')>(),
        execFile: vi.fn(),
    };
});

describe('getChangedFiles', () => {
    afterEach(() => {
        vi.resetAllMocks();
    });

    it('should use default HEAD for working mode', async () => {
        const mockExec = vi.mocked(execFile);
        mockExec.mockImplementation((cmd: any, args: any, opts: any, cb: any) => {
            cb(null, { stdout: 'file1.ts\nfile2.ts' });
            return {} as any;
        });

        const files = await getChangedFiles('/repo', { mode: 'working' });

        expect(mockExec).toHaveBeenCalledWith('git', ['diff', '--name-only', 'HEAD'], { cwd: '/repo' }, expect.any(Function));
        expect(files).toEqual(['file1.ts', 'file2.ts']);
    });

    it('should use --cached for staged mode', async () => {
        const mockExec = vi.mocked(execFile);
        mockExec.mockImplementation((cmd: any, args: any, opts: any, cb: any) => {
            cb(null, { stdout: 'staged.ts' });
            return {} as any;
        });

        const files = await getChangedFiles('/repo', { mode: 'staged' });
        expect(mockExec).toHaveBeenCalledWith('git', ['diff', '--name-only', '--cached'], { cwd: '/repo' }, expect.any(Function));
        expect(files).toEqual(['staged.ts']);
    });

    it('should use base...head for range mode', async () => {
        const mockExec = vi.mocked(execFile);
        mockExec.mockImplementation((cmd: any, args: any, opts: any, cb: any) => {
            cb(null, { stdout: 'range.ts' });
            return {} as any;
        });

        const files = await getChangedFiles('/repo', { mode: 'range', base: 'main', head: 'feat' });
        expect(mockExec).toHaveBeenCalledWith('git', ['diff', '--name-only', 'main...feat'], { cwd: '/repo' }, expect.any(Function));
        expect(files).toEqual(['range.ts']);
    });
});
