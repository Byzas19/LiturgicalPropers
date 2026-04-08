/**
 * reparse-all.ts
 * One-off: re-runs parsePdf on every PDF in tmp/pdfs/ and overwrites the
 * corresponding JSON in data/propers/. Also rebuilds data/index.json.
 *
 * Usage:
 *   npx ts-node --project scripts/tsconfig.json scripts/reparse-all.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parsePdf, LiturgicalProper } from './parse';
import { loadManifest } from './scrape';

const DATA_DIR = path.join(__dirname, '..', 'data');
const PROPERS_DIR = path.join(DATA_DIR, 'propers');
const INDEX_FILE = path.join(DATA_DIR, 'index.json');
const TMP_DIR = path.join(__dirname, '..', 'tmp', 'pdfs');

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function main(): Promise<void> {
  if (!fs.existsSync(TMP_DIR)) {
    console.error(`No PDF directory found at ${TMP_DIR}`);
    process.exit(1);
  }
  ensureDir(PROPERS_DIR);

  const pdfFiles = fs.readdirSync(TMP_DIR)
    .filter((f) => f.endsWith('.pdf'))
    .sort();

  console.log(`Reparsing ${pdfFiles.length} PDF(s) from ${TMP_DIR}\n`);

  const manifest = loadManifest();
  const results: LiturgicalProper[] = [];
  let okCount = 0;
  let failCount = 0;

  for (const filename of pdfFiles) {
    const filePath = path.join(TMP_DIR, filename);
    const linkText = manifest[filename]?.linkText;
    process.stdout.write(`  ${filename} ... `);
    try {
      const proper = await parsePdf(filePath, linkText);
      if (proper) {
        const out = path.join(PROPERS_DIR, `${proper.date}.json`);
        fs.writeFileSync(out, JSON.stringify(proper, null, 2), 'utf-8');
        results.push(proper);
        okCount++;
        console.log(`OK → ${proper.date}.json`);
      } else {
        failCount++;
        console.log('FAILED (parser returned null)');
      }
    } catch (err) {
      failCount++;
      console.log(`FAILED (${(err as Error).message})`);
    }
  }

  // Rebuild index from everything we just wrote.
  const sundays = results
    .toSorted((a, b) => a.date.localeCompare(b.date))
    .map((p) => ({ date: p.date, title: p.liturgicalTitle }));
  fs.writeFileSync(
    INDEX_FILE,
    JSON.stringify({ lastUpdated: new Date().toISOString(), sundays }, null, 2),
    'utf-8',
  );

  console.log(`\nDone. ${okCount} succeeded, ${failCount} failed. Index has ${sundays.length} entries.`);
}

main().catch((err) => {
  console.error('reparse-all failed:', err);
  process.exit(1);
});
