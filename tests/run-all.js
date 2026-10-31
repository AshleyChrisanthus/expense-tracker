import { run } from 'node:test';
import { spec } from 'node:test/reporters';
import path from 'node:path';
import fs from 'node:fs';

// Initialize test environment hooks and shims
import './helpers/setup.js';

const testFiles = [
  // Tier 1: Feature Coverage
  'path:/tier1-features/storage-crud.test.js',
  'path:/tier1-features/recurrence-engine.test.js',
  'path:/tier1-features/keep-notes-parser.test.js',
  'path:/tier1-features/export-backup-service.test.js',
  'path:/tier1-features/theme-presets.test.js',
  'path:/tier1-features/accounting-analytics.test.js',
  'path:/tier1-features/banner-modes-selection.test.js',
  'path:/tier1-features/pwa-manifest-serviceworker.test.js',

  // Tier 2: Boundary & Corner Cases
  'path:/tier2-boundary/empty-and-edge-items.test.js',
  'path:/tier2-boundary/recurrence-boundaries.test.js',
  'path:/tier2-boundary/corrupt-backup-parsing.test.js',
  'path:/tier2-boundary/keep-parser-edge-cases.test.js',

  // Tier 3: Cross-Feature Interactions
  'path:/tier3-interactions/cross-feature-workflows.test.js',

  // Tier 4: Real-World Workload Scenarios
  'path:/tier4-workloads/realistic-backup-import.test.js',
  'path:/tier4-workloads/standalone-bundle.test.js'
].map(f => path.resolve(process.cwd(), 'tests', f.replace('path:/', '')));

// Verify every test file exists
for (const file of testFiles) {
  if (!fs.existsSync(file)) {
    console.error('Test file not found:', file);
    process.exit(1);
  }
}

console.log('='.repeat(70));
console.log('Glassmorphism Expense Tracker — Tiers 1-4 Regression Test Suite');
console.log('Executing', testFiles.length, 'test suites sequentially...');
console.log('='.repeat(70));

run({
  files: testFiles,
  concurrency: 1,
  recursive: false
})
  .on('test:fail', () => {
    process.exitCode = 1;
  })
  .pipe(new spec())
  .pipe(process.stdout);
