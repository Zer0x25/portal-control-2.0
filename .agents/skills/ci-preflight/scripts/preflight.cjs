#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../../../');

function run(cmd, desc) {
  console.log(`\n⏳ [${desc}] Running: ${cmd}`);
  execSync(cmd, { cwd: rootDir, stdio: 'inherit' });
}

try {
  run('npm run secrets:scan', '1/5 Secrets Scan');
  run('npm run spec:check', '2/5 Specification Check');
  run('npm run docs:check', '3/5 Documentation Consistency');
  run('npm run lint:budget', '4/5 ESLint Budget Ratchet (0/0)');
  console.log('\n⏳ [5/5 TypeScript Check] Running typecheck on backend & frontend...');
  execSync('npm run check', { cwd: path.join(rootDir, 'backend'), stdio: 'inherit' });
  execSync('npm run check', { cwd: path.join(rootDir, 'frontend'), stdio: 'inherit' });
  console.log('\n✅ All preflight checks passed successfully! Ready to commit.\n');
} catch (error) {
  console.error('\n❌ Preflight validation failed. Fix the issues before committing.');
  process.exit(1);
}
