#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../../../');

function run(cmd, desc) {
  console.log(`\n⏳ [${desc}] Running: ${cmd}`);
  execSync(cmd, { cwd: rootDir, stdio: 'inherit' });
}

function checkSddDiscipline() {
  try {
    const gitStatus = execSync('git status --porcelain', { cwd: rootDir, encoding: 'utf8' });
    const lines = gitStatus.split('\n').filter(Boolean);
    const codeChanged = lines.some((l) => /^[MADRCU?]{1,2}\s+(backend\/src|frontend\/src)/.test(l));
    const specsChanged = lines.some((l) => /^[MADRCU?]{1,2}\s+(specs\/|docs\/adr\/)/.test(l));

    if (codeChanged && !specsChanged) {
      console.log('\n💡 [Gobernanza SDD] Detectados cambios en código productivo (src/) sin cambios en specs/ ni docs/adr/.');
      console.log('   Si es una nueva funcionalidad o refactor estructural, crea su spec con: npm run spec:new <slug>');
    }
  } catch {
    // ignore git error if not in git repo
  }
}

try {
  run('npm run secrets:scan', '1/6 Secrets Scan');
  run('npm run spec:check', '2/6 Specification Check');
  run('npm run docs:check', '3/6 Documentation Consistency');
  run('backend/node_modules/.bin/prettier --check "docs/adr/*.md" "specs/**/*.md" ".agents/**/*.md" "AGENTS.md"', '4/6 Markdown Prettier Formatting');
  run('npm run lint:budget', '5/6 ESLint Budget Ratchet (0/0)');
  console.log('\n⏳ [6/6 TypeScript Check] Running typecheck on backend & frontend...');
  execSync('npm run check', { cwd: path.join(rootDir, 'backend'), stdio: 'inherit' });
  execSync('npm run check', { cwd: path.join(rootDir, 'frontend'), stdio: 'inherit' });

  checkSddDiscipline();

  console.log('\n✅ All preflight checks passed successfully! Ready to commit.\n');
} catch (error) {
  console.error('\n❌ Preflight validation failed. Fix the issues before committing.');
  process.exit(1);
}
