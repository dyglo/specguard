# Changelog

## [0.1.4] - 2026-02-01
- Fix: Prevent Windows spawn crashes completely by wrapping execution in try/catch.
- Fix: Restore safe shell fallback for tools with `allow_shell: true`.
- Docs: Added AGENTS.md with instructions for AI agents.

## [0.1.3] - 2026-02-01
- Fix: Stabilize tool execution on Windows by fixing argument parsing regression (no shell).
- Fix: Harden spawn to prevent crashes with empty or undefined arguments.

## [0.1.2] - 2026-01-31
- Initial release with regression.
