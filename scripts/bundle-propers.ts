/**
 * bundle-propers.ts
 * Merges all data/propers/*.json files into a single
 * src/data/bundledPropers.json for use by the React Native app.
 *
 * Run after bootstrap or pipeline:
 *   npx ts-node --project scripts/tsconfig.json scripts/bundle-propers.ts
 * Or:
 *   npm run bundle-propers
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const PROPERS_DIR = path.join(__dirname, '..', 'data', 'propers');
const INDEX_FILE = path.join(__dirname, '..', 'data', 'index.json');
const OUT_FILE = path.join(__dirname, '..', 'src', 'data', 'bundledPropers.json');

interface BundledPropers {
  generatedAt: string;
  propers: Record<string, unknown>;
}

function main(): void {
  if (!fs.existsSync(PROPERS_DIR)) {
    console.error(`data/propers/ not found. Run "npm run bootstrap" first.`);
    process.exit(1);
  }

  const files = fs.readdirSync(PROPERS_DIR)
    .filter((f: string) => f.endsWith('.json') && /^\d{4}-\d{2}-\d{2}/.test(f))
    .sort();

  if (files.length === 0) {
    console.error('No dated JSON files found in data/propers/. Run "npm run bootstrap" first.');
    process.exit(1);
  }

  console.log(`Bundling ${files.length} propers into src/data/bundledPropers.json...`);

  const propers: Record<string, unknown> = {};
  let skipped = 0;

  for (const file of files) {
    const date = file.replace('.json', '');
    try {
      const content = JSON.parse(fs.readFileSync(path.join(PROPERS_DIR, file), 'utf-8'));
      propers[date] = content;
    } catch (e) {
      console.warn(`  [skip] ${file}: parse error — ${e}`);
      skipped++;
    }
  }

  // Also load the index so the app has the ordered list
  let index: unknown = null;
  if (fs.existsSync(INDEX_FILE)) {
    index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
  }

  const bundle: BundledPropers & { index: unknown } = {
    generatedAt: new Date().toISOString(),
    index,
    propers,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(bundle, null, 2), 'utf-8');

  console.log(`Done. ${files.length - skipped} propers bundled${skipped > 0 ? `, ${skipped} skipped` : ''}.`);
  console.log(`Output: src/data/bundledPropers.json`);
}

main();
