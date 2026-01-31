import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { init } from '../src/init.js';
import fs from 'fs';
import path from 'path';

vi.mock('fs');

describe('init command', () => {
    afterEach(() => {
        vi.resetAllMocks();
    });

    beforeEach(() => {
        vi.spyOn(path, 'join').mockImplementation((...args) => args.join('/'));
    });

    it('should create spec directory and files', async () => {
        const cwd = '/tmp/repo';
        vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
        vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
        vi.spyOn(fs, 'existsSync').mockReturnValue(false);
        // Mock readFileSync to avoid undefined errors if it's called
        vi.spyOn(fs, 'readFileSync').mockReturnValue('');

        await init(cwd, false);

        expect(fs.mkdirSync).toHaveBeenCalledWith('/tmp/repo/.ai/specguard/reports', { recursive: true });
        expect(fs.writeFileSync).toHaveBeenCalledWith('/tmp/repo/.ai/specguard/spec.yaml', expect.stringContaining('spec_id: "default-spec"'));
        expect(fs.writeFileSync).toHaveBeenCalledWith('/tmp/repo/AGENTS.md', expect.stringContaining('SpecGuard Enforced'));
    });

    it('should not overwrite spec.yaml without force', async () => {
        const cwd = '/tmp/repo';
        // Mock that spec.yaml exists
        vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
            return typeof p === 'string' && p.endsWith('spec.yaml');
        });
        const writeFile = vi.spyOn(fs, 'writeFileSync');
        vi.spyOn(fs, 'readFileSync').mockReturnValue('');

        await init(cwd, false);

        // Should NOT write spec.yaml
        expect(writeFile).not.toHaveBeenCalledWith(expect.stringContaining('spec.yaml'), expect.any(String));
    });

    it('should overwrite spec.yaml WITH force', async () => {
        const cwd = '/tmp/repo';
        vi.spyOn(fs, 'existsSync').mockReturnValue(true);
        const writeFile = vi.spyOn(fs, 'writeFileSync');
        vi.spyOn(fs, 'readFileSync').mockReturnValue('');

        await init(cwd, true);

        expect(writeFile).toHaveBeenCalledWith(expect.stringContaining('spec.yaml'), expect.any(String));
    });
});
