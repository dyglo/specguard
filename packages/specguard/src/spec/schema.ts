import { z } from 'zod';

export const SpecSchema = z.object({
    spec_id: z.string().optional(),
    version: z.string().optional(),
    repo: z.object({
        forbidden_globs: z.array(z.string()).optional()
    }).optional(),
    deterministic_rules: z.object({
        secret_patterns: z.array(z.object({
            name: z.string(),
            regex: z.string()
        })).optional()
    }).optional(),
    tool_verified: z.object({
        steps: z.array(z.object({
            name: z.string(),
            command: z.string(),
            optional: z.boolean().optional(),
            timeout_seconds: z.number().optional(),
            env_allowlist: z.array(z.string()).optional(),
            env: z.record(z.string()).optional(),
            cwd: z.string().optional(),
            skip_if_missing: z.boolean().optional(),
            allow_shell: z.boolean().optional()
        })).optional()
    }).optional(),
    output_contract: z.object({
        forbid_unverified_tool_claims: z.boolean().optional()
    }).optional()
});

export type Spec = z.infer<typeof SpecSchema>;
