/**
 * pipeline.ts
 * Incremental update pipeline: scrape → parse → write JSON.
 * Designed to run in GitHub Actions. Only processes new PDFs.
 */

import * as fs from 'fs';
import * as path from 'path';
import { scrapePdfLinks, downloadNewPdfs, PdfEntry } from './scrape';
import { parsePdf, LiturgicalProper } from './parse';

const DATA_DIR = path.join(__dirname, '..', 'data');
const PROPERS_DIR = path.join(DATA_DIR, 'propers');
const INDEX_FILE = path.join(DATA_DIR, 'index.json');

interface SundayIndex {
  lastUpdated: string;
  sundays: Array<{ date: string; title: string }>;
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadIndex(): SundayIndex {
  if (fs.existsSync(INDEX_FILE)) {
    return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
  }
  return { lastUpdated: new Date().toISOString(), sundays: [] };
}

function saveIndex(index: SundayIndex): void {
  ensureDir(DATA_DIR);
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');
  console.log(`Wrote index.json (${index.sundays.length} entries)`);
}

function properExists(date: string): boolean {
  return fs.existsSync(path.join(PROPERS_DIR, `${date}.json`));
}

function writeProper(proper: LiturgicalProper): void {
  ensureDir(PROPERS_DIR);
  const filePath = path.join(PROPERS_DIR, `${proper.date}.json`);
  fs.writeFileSync(filePath, JSON.stringify(proper, null, 2), 'utf-8');
  console.log(`  Wrote data/propers/${proper.date}.json`);
}

function rebuildIndex(): void {
  ensureDir(PROPERS_DIR);
  const files = fs.readdirSync(PROPERS_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();

  const sundays = files.map((f) => {
    const data: LiturgicalProper = JSON.parse(
      fs.readFileSync(path.join(PROPERS_DIR, f), 'utf-8')
    );
    return { date: data.date, title: data.liturgicalTitle };
  });

  saveIndex({ lastUpdated: new Date().toISOString(), sundays });
}

async function main(): Promise<void> {
  console.log('=== Liturgical Propers Pipeline ===\n');

  // 1. Scrape
  console.log('Step 1: Scraping PDF links...');
  const allEntries = await scrapePdfLinks();

  // Filter to only entries we don't already have JSON for
  const newEntries: PdfEntry[] = [];
  for (const entry of allEntries) {
    // Try to infer date from filename or link text — if we can't, include it to be safe
    const dateMatch = entry.filename.match(/\d{4}-\d{2}-\d{2}/) ??
                      entry.linkText.match(/\d{4}-\d{2}-\d{2}/);
    if (dateMatch && properExists(dateMatch[0])) {
      console.log(`  [skip] ${entry.filename} already parsed.`);
    } else {
      newEntries.push(entry);
    }
  }

  if (newEntries.length === 0) {
    console.log('\nNo new PDFs to process. Done.');
    return;
  }

  // 2. Download
  console.log(`\nStep 2: Downloading ${newEntries.length} new PDF(s)...`);
  const downloaded = await downloadNewPdfs(newEntries);

  // 3. Parse
  console.log(`\nStep 3: Parsing ${downloaded.length} PDF(s)...`);
  let successCount = 0;
  for (const entry of downloaded) {
    console.log(`  Parsing ${entry.filename}...`);
    const proper = await parsePdf(entry.filePath);
    if (proper) {
      writeProper(proper);
      successCount++;
    }
  }

  // 4. Rebuild index
  console.log('\nStep 4: Rebuilding index.json...');
  rebuildIndex();

  console.log(`\nDone. Processed ${successCount}/${downloaded.length} PDFs.`);
}

main().catch((err) => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});
