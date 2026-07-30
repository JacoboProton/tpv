import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASELINE_FILE = join(__dirname, '.any-baseline');
const ROOT = join(__dirname, '..');

const IGNORE_PATTERNS = [
  /__tests__/,
  /\.test\.(ts|tsx)$/,
  /\.spec\.(ts|tsx)$/,
  /node_modules/,
  /\.next/,
  /out\//,
];

const DIRS = ['app', 'api', 'lib', 'components', 'db', 'hooks', 'modules'];

const ANY_RE = /:\s*any\b|as\s+any\b|<any>/g;

function shouldIgnore(filePath) {
  return IGNORE_PATTERNS.some(p => p.test(filePath));
}

function countAny() {
  let total = 0;
  for (const dir of DIRS) {
    const files = globSync(`${dir}/**/*.@(ts|tsx)`, { cwd: ROOT, ignore: 'node_modules/**' });
    for (const f of files) {
      if (shouldIgnore(f)) continue;
      const content = readFileSync(join(ROOT, f), 'utf8');
      const matches = content.match(ANY_RE);
      if (matches) total += matches.length;
    }
  }
  return total;
}

function main() {
  const count = countAny();
  const baselineRaw = readFileSync(BASELINE_FILE, 'utf8').trim();
  const baselineNum = parseInt(baselineRaw, 10);

  console.log(`any count: ${count}`);
  console.log(`baseline:  ${baselineNum}`);

  if (count > baselineNum) {
    console.error(`FAIL: any count (${count}) exceeds baseline (${baselineNum})`);
    process.exit(1);
  }
}

if (process.argv.includes('--update')) {
  const count = countAny();
  writeFileSync(BASELINE_FILE, String(count));
  console.log(`Baseline updated to ${count}`);
} else {
  main();
}
