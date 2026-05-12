#!/bin/bash
# Static analysis guard: prevents direct Anthropic client instantiation in API routes.
#
# All Anthropic usage must go through the shared client at `lib/anthropic.ts`
# which includes the required ZDR (Zero Data Retention) header.
#
# Usage:
#   bash scripts/check-no-direct-anthropic.sh
#   OR
#   node scripts/check-no-direct-anthropic.js
#
# Validates requirement 2.2: shared client module prevents accidental ZDR omission.

# Delegate to the Node.js script for cross-platform compatibility
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/check-no-direct-anthropic.js"
