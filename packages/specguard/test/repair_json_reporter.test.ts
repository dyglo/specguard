import { describe, it, expect, vi } from 'vitest';
import { buildRepairJsonReport } from '../src/reporting/repair_json_reporter.js';

vi.mock('crypto', () => ({
    default: {
        randomUUID: () => 'run-1234'
    }
}));

describe('buildRepairJsonReport', () => {
    const baseData: any = {
        status: 'PASS',
        spec: { spec_id: 'test', version: '1' },
        timestamp: '2026-02-02T00:00:00Z',
        changedFiles: [],
        violations: [],
        toolResults: [],
        runMeta: { repoRoot: '/repo', diffMode: 'working' }
    };

    it('should snapshot PASS repair-json output', () => {
        const report = buildRepairJsonReport(baseData);
        expect(JSON.stringify(report, null, 2)).toMatchInlineSnapshot(`
          "{
            "schema_version": "0.1.0",
            "run_id": "run-1234",
            "verdict": "PASS",
            "summary": {
              "errors": 0,
              "warnings": 0
            },
            "findings": [],
            "constraints": {
              "blocked_paths": [
                ".ai/specguard/**"
              ],
              "allow_shell_effective": false
            },
            "next_action": {
              "agent_message": "SpecGuard PASS. No fixes required.",
              "ordered_fix_plan": []
            }
          }"
        `);
    });

    it('should snapshot FAIL repair-json output with deterministic ordering', () => {
        const data = {
            ...baseData,
            status: 'FAIL',
            spec: {
                repo: { forbidden_globs: ['engine/**'] },
                tool_verified: { steps: [{ name: 'Lint', command: 'npm run lint' }] }
            },
            violations: [
                { type: 'tool_failure', details: 'Lint failed', file: 'N/A' },
                { type: 'forbidden_file', details: 'Matches forbidden pattern', file: 'engine/core.ts' },
                { type: 'policy_tamper', details: 'Policy tamper', file: '.ai/specguard/spec.yaml' }
            ]
        };
        const report = buildRepairJsonReport(data, { allowPolicyEdit: true });
        expect(JSON.stringify(report, null, 2)).toMatchInlineSnapshot(`
          "{
            "schema_version": "0.1.0",
            "run_id": "run-1234",
            "verdict": "FAIL",
            "summary": {
              "errors": 3,
              "warnings": 0
            },
            "findings": [
              {
                "id": "SG-FORBIDDEN-GLOB",
                "severity": "error",
                "title": "Forbidden file change",
                "reason": "Matches forbidden pattern",
                "locations": [
                  {
                    "path": "engine/core.ts"
                  }
                ],
                "evidence": [
                  "Matches forbidden pattern"
                ],
                "acceptance": [
                  "Do not modify files that match forbidden globs."
                ],
                "fix": {
                  "summary": "Revert forbidden file changes",
                  "steps": [
                    "Revert or remove changes to forbidden paths."
                  ]
                }
              },
              {
                "id": "SG-POLICY-TAMPER",
                "severity": "error",
                "title": "SpecGuard policy tamper",
                "reason": "Policy tamper",
                "locations": [
                  {
                    "path": ".ai/specguard/spec.yaml"
                  }
                ],
                "evidence": [
                  "Policy tamper"
                ],
                "acceptance": [
                  "Do not edit .ai/specguard/** unless --allow-policy-edit is used."
                ],
                "fix": {
                  "summary": "Revert policy edits",
                  "steps": [
                    "Revert changes under .ai/specguard/**, or rerun with --allow-policy-edit if authorized."
                  ]
                }
              },
              {
                "id": "SG-TOOL-FAILED",
                "severity": "error",
                "title": "Required tool failed",
                "reason": "Lint failed",
                "locations": [],
                "evidence": [
                  "Lint failed"
                ],
                "acceptance": [
                  "Fix tool failures and re-run SpecGuard."
                ],
                "fix": {
                  "summary": "Fix required tool failure",
                  "steps": [
                    "Run the tool locally and resolve failures.",
                    "Re-run SpecGuard validation."
                  ]
                }
              }
            ],
            "constraints": {
              "blocked_paths": [
                "engine/**"
              ],
              "allow_shell_effective": false,
              "required_steps": [
                "Lint"
              ]
            },
            "next_action": {
              "agent_message": "Fix 3 error(s) (SG-FORBIDDEN-GLOB, SG-POLICY-TAMPER, SG-TOOL-FAILED) then re-run: npx specguard validate --format repair-json",
              "ordered_fix_plan": [
                "Revert forbidden file changes",
                "Revert policy edits",
                "Fix required tool failure"
              ]
            }
          }"
        `);
    });
});
