#!/bin/bash

# Get the repository root directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$(dirname "$(dirname "$(dirname "$SCRIPT_DIR")")")"

# Navigate to repo root necessary? 
# The python script now takes absolute paths, but it's good practice.
cd "$REPO_ROOT" || exit 1

# Check for Python
if command -v python3 &>/dev/null; then
    PYTHON_CMD=python3
elif command -v python &>/dev/null; then
    PYTHON_CMD=python
else
    echo "Error: Python not found."
    exit 1
fi

SPEC_PATH=".ai/specguard/spec.yaml"
REPORT_DIR=".ai/specguard/reports"

# Run the validator with explicit arguments
echo "🚀 Running SpecGuard Validator..."
$PYTHON_CMD .ai/specguard/specguard.py validate \
    --spec "$SPEC_PATH" \
    --repo-root . \
    --report-dir "$REPORT_DIR"

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ SpecGuard: PASS"
else
    echo "❌ SpecGuard: FAIL"
fi

exit $EXIT_CODE
