#!/usr/bin/env node
/**
 * Static analysis guard: prevents direct Anthropic client instantiation in API routes.
 *
 * All Anthropic usage must go through the shared client at `lib/anthropic.ts`
 * which includes the required ZDR (Zero Data Retention) header.
 *
 * Usage:
 *   node scripts/check-no-direct-anthropic.js
 *
 * Validates requirement 2.2: shared client module prevents accidental ZDR omission.
 */

const fs = require('fs');
const path = require('path');

const API_DIR = path.resolve(__dirname, '..', 'app', 'api');
const PATTERN = /new\s+Anthropic\s*\(/;
const SHARED_CLIENT = 'lib/anthropic.ts';

function getTypeScriptFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) {
    return results;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip __tests__ directories — test files may legitimately reference the pattern
      if (entry.name === '__tests__') continue;
      results.push(...getTypeScriptFiles(fullPath));
    } else if (entry.isFile() && /\.ts$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

function checkFiles() {
  const files = getTypeScriptFiles(API_DIR);
  const violations = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (PATTERN.test(lines[i])) {
        const relativePath = path.relative(path.resolve(__dirname, '..'), file);
        violations.push({ file: relativePath, line: i + 1, text: lines[i].trim() });
      }
    }
  }

  if (violations.length > 0) {
    console.error('\n❌ STATIC ANALYSIS FAILED: Direct Anthropic instantiation detected in API routes!\n');
    console.error('The following files use `new Anthropic(` directly:\n');
    for (const v of violations) {
      console.error(`  ${v.file}:${v.line}`);
      console.error(`    → ${v.text}\n`);
    }
    console.error(`All Anthropic client usage MUST go through the shared client at \`${SHARED_CLIENT}\`.`);
    console.error('This ensures the ZDR (Zero Data Retention) header is always included.\n');
    console.error('Fix: Replace `new Anthropic(...)` with `import { anthropic } from \'@/lib/anthropic\'`\n');
    process.exit(1);
  }

  console.log('✅ Static analysis passed: No direct Anthropic instantiation found in API routes.');
  console.log(`   All routes correctly use the shared client from \`${SHARED_CLIENT}\`.`);
  process.exit(0);
}

checkFiles();
