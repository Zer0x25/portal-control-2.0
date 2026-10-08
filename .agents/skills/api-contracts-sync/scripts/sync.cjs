#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../../../');
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');

function run(cmd, cwd, desc) {
  console.log(`\n⏳ [${desc}] Running: ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

try {
  run('npm run docs:generate', backendDir, '1/3 Generate Swagger Spec');
  run('npm run sdk:generate', frontendDir, '2/3 Generate Frontend SDK Types');
  run('npm run check:sdk', backendDir, '3/3 Verify SDK Hash Guard');
  console.log('\n✅ API Contracts and Frontend SDK synchronized successfully!\n');
} catch (error) {
  console.error('\n❌ API Sync failed:', error.message);
  process.exit(1);
}
