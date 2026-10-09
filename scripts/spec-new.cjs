#!/usr/bin/env node
/**
 * Scaffolds a new Spec-Driven Development (SDD) directory and optional ADR.
 * Usage:
 *   node scripts/spec-new.cjs <slug> [--adr]
 * Example:
 *   npm run spec:new optimizaciones-e2e
 *   npm run spec:new migracion-tokens -- --adr
 */
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const SPECS_DIR = path.join(ROOT, 'specs');
const ADR_DIR = path.join(ROOT, 'docs', 'adr');
const ADR_INDEX = path.join(ADR_DIR, 'README.md');

// Parse args
const args = process.argv.slice(2);
const slugArg = args.find((a) => !a.startsWith('--'));
const withAdr = args.includes('--adr');

if (!slugArg) {
  console.error('Uso: npm run spec:new <slug> [-- --adr]');
  console.error('Ejemplo: npm run spec:new optimizaciones-e2e');
  process.exit(1);
}

// Normalize slug: lowercase, replace spaces/underscores with dashes, strip non-alphanumeric except dash
const slug = slugArg
  .toLowerCase()
  .trim()
  .replace(/[\s_]+/g, '-')
  .replace(/[^a-z0-9-]/g, '');

if (!slug) {
  console.error('Error: el slug especificado no es válido.');
  process.exit(1);
}

// 1. Find next spec number
const existingSpecs = fs
  .readdirSync(SPECS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory() && /^\d+/.test(e.name))
  .map((e) => {
    const match = e.name.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  });

const nextSpecNum = (Math.max(0, ...existingSpecs) + 1).toString().padStart(3, '0');
const specFolderName = `${nextSpecNum}-${slug}`;
const targetSpecDir = path.join(SPECS_DIR, specFolderName);

if (fs.existsSync(targetSpecDir)) {
  console.error(`Error: el directorio ${targetSpecDir} ya existe.`);
  process.exit(1);
}

// Today's date
const today = new Date().toISOString().split('T')[0];

// User name / author
let author = '@dev';
try {
  const gitUser = execSync('git config user.name', { encoding: 'utf8' }).trim();
  if (gitUser) author = gitUser;
} catch {
  // ignore
}

// Title format
const title = slug
  .split('-')
  .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
  .join(' ');

// Next ADR number if requested
let adrNumStr = '';
let adrFileName = '';
let adrRelPath = '';
if (withAdr) {
  const existingAdrs = fs
    .readdirSync(ADR_DIR)
    .filter((f) => /^\d{4}-.*\.md$/.test(f) && f !== '0000-template.md')
    .map((f) => {
      const match = f.match(/^(\d{4})/);
      return match ? parseInt(match[1], 10) : 0;
    });

  const nextAdrNum = (Math.max(0, ...existingAdrs) + 1).toString().padStart(4, '0');
  adrNumStr = nextAdrNum;
  adrFileName = `${nextAdrNum}-${slug}.md`;
  adrRelPath = `docs/adr/${adrFileName}`;
}

// Create spec folder
fs.mkdirSync(targetSpecDir, { recursive: true });

// Read templates from specs/_template/
const templateSpec = fs.readFileSync(path.join(SPECS_DIR, '_template', 'spec.md'), 'utf8');
const templatePlan = fs.readFileSync(path.join(SPECS_DIR, '_template', 'plan.md'), 'utf8');
const templateTasks = fs.readFileSync(path.join(SPECS_DIR, '_template', 'tasks.md'), 'utf8');

// Replace placeholders
const specContent = templateSpec
  .replace(/Spec NNNN: Título corto/, `Spec ${nextSpecNum}: ${title}`)
  .replace(/@usuario/, author)
  .replace(/YYYY-MM-DD/, today)
  .replace(
    /`docs\/adr\/NNNN-\*\.md` \(si aplica\)/,
    withAdr ? `\`${adrRelPath}\`` : 'N/A'
  );

const planContent = templatePlan
  .replace(/Plan NNNN: Título corto/, `Plan ${nextSpecNum}: ${title}`);

const tasksContent = templateTasks
  .replace(/Tareas NNNN: Título corto/, `Tareas ${nextSpecNum}: ${title}`);

fs.writeFileSync(path.join(targetSpecDir, 'spec.md'), specContent, 'utf8');
fs.writeFileSync(path.join(targetSpecDir, 'plan.md'), planContent, 'utf8');
fs.writeFileSync(path.join(targetSpecDir, 'tasks.md'), tasksContent, 'utf8');

console.log(`✅ Spec creado exitosamente en: specs/${specFolderName}/`);
console.log(`   - specs/${specFolderName}/spec.md`);
console.log(`   - specs/${specFolderName}/plan.md`);
console.log(`   - specs/${specFolderName}/tasks.md`);

// If ADR requested, scaffold it too
if (withAdr) {
  const templateAdr = fs.readFileSync(path.join(ADR_DIR, '0000-template.md'), 'utf8');
  const targetAdrPath = path.join(ADR_DIR, adrFileName);

  const adrContent = templateAdr
    .replace(/ADR-0000: Título corto en imperativo/, `ADR-${adrNumStr}: ${title}`)
    .replace(/@usuario/, author)
    .replace(/YYYY-MM-DD/, today);

  fs.writeFileSync(targetAdrPath, adrContent, 'utf8');

  // Update ADR README index
  if (fs.existsSync(ADR_INDEX)) {
    let indexContent = fs.readFileSync(ADR_INDEX, 'utf8');
    const newEntry = `| [${adrNumStr}](${adrFileName}) | Propuesto | ${title} |\n`;
    indexContent += newEntry;
    fs.writeFileSync(ADR_INDEX, indexContent, 'utf8');
  }

  console.log(`✅ ADR creado exitosamente en: ${adrRelPath}`);
  console.log(`   - Indexado en docs/adr/README.md`);
}

// Format created files with prettier
try {
  execSync(
    `npx prettier --write "specs/${specFolderName}/*.md"${withAdr ? ` "${adrRelPath}" "docs/adr/README.md"` : ''}`,
    {
      cwd: ROOT,
      stdio: 'ignore',
    }
  );
} catch {
  // Prettier fallback
}

console.log('\nPróximos pasos:');
console.log(`1. Edita specs/${specFolderName}/spec.md definiendo problema y criterios de aceptación.`);
console.log(`2. Edita specs/${specFolderName}/plan.md con estrategia técnica y archivos a tocar.`);
console.log(`3. Edita specs/${specFolderName}/tasks.md con la lista de tareas ejecutables.`);
console.log('4. Valida la estructura con: npm run spec:check\n');
