#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../../../');
const isPrMode = process.argv.includes('--pr') || process.argv.includes('--full');

function run(cmd, desc, cwd = rootDir) {
  console.log(`\n⏳ [${desc}] Running: ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function checkSddDiscipline() {
  try {
    const gitStatus = execSync('git status --porcelain', { cwd: rootDir, encoding: 'utf8' });
    const lines = gitStatus.split('\n').filter(Boolean);
    const codeChanged = lines.some((l) => /^[MADRCU?]{1,2}\s+(backend\/src|frontend\/src)/.test(l));
    const specsChanged = lines.some((l) => /^[MADRCU?]{1,2}\s+(specs\/|docs\/adr\/)/.test(l));

    if (codeChanged && !specsChanged) {
      console.log(
        '\n💡 [Gobernanza SDD] Detectados cambios en código productivo (src/) sin cambios en specs/ ni docs/adr/.',
      );
      console.log(
        '   Si es una nueva funcionalidad o refactor estructural, crea su spec con: npm run spec:new <slug>',
      );
    }
  } catch {
    // ignore git error if not in git repo
  }
}

try {
  run('npm run secrets:scan', '1/6 Secrets Scan');
  run('npm run spec:check', '2/6 Specification Check');
  run('npm run docs:check', '3/6 Documentation Consistency');
  run(
    'backend/node_modules/.bin/prettier --check "docs/adr/*.md" "specs/**/*.md" ".agents/**/*.md" "AGENTS.md"',
    '4/6 Markdown Prettier Formatting',
  );
  run('npm run lint:budget', '5/6 ESLint Budget Ratchet (0/0)');
  console.log('\n⏳ [6/6 TypeScript Check] Running typecheck on backend & frontend...');
  execSync('npm run check', { cwd: path.join(rootDir, 'backend'), stdio: 'inherit' });
  execSync('npm run check', { cwd: path.join(rootDir, 'frontend'), stdio: 'inherit' });

  if (isPrMode) {
    console.log('\n🛡️  [Pre-PR Gate] Ejecutando suite completa de pruebas antes de PR / Push...');
    run('npm run test:run:ci', 'Pre-PR Frontend Full Tests', path.join(rootDir, 'frontend'));
    run('npm run check:sdk', 'Pre-PR Backend SDK Sync Check', path.join(rootDir, 'backend'));
    run('npm run test:schemas-refactor', 'Pre-PR Backend Schema Tests', path.join(rootDir, 'backend'));
  }

  checkSddDiscipline();

  console.log(
    `\n✅ All preflight checks passed successfully! Ready to ${isPrMode ? 'open PR / merge' : 'commit'}.\n`,
  );
} catch (error) {
  console.error(
    `\n❌ Preflight validation failed. Fix the issues before ${isPrMode ? 'opening PR' : 'committing'}.`,
  );
  process.exit(1);
}
