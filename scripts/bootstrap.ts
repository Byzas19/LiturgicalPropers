/**
 * bootstrap.ts
 * One-time bulk import: scrapes ALL posted PDFs and parses every one.
 * Run manually to populate data/propers/ with the full backlog.
 *
 * Usage:
 *   npx ts-node --project scripts/tsconfig.json scripts/bootstrap.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { scrapePdfLinks, downloadNewPdfs, loadManifest } from './scrape';
import { parsePdf, LiturgicalProper } from './parse';

const DATA_DIR = path.join(__dirname, '..', 'data');
const PROPERS_DIR = path.join(DATA_DIR, 'propers');
const INDEX_FILE = path.join(DATA_DIR, 'index.json');
const TMP_DIR = path.join(__dirname, '..', 'tmp', 'pdfs');

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeProper(proper: LiturgicalProper): void {
  ensureDir(PROPERS_DIR);
  const filePath = path.join(PROPERS_DIR, `${proper.date}.json`);
  fs.writeFileSync(filePath, JSON.stringify(proper, null, 2), 'utf-8');
  console.log(`  Wrote ${proper.date}.json — "${proper.liturgicalTitle}"`);
}

function writeIndex(propers: LiturgicalProper[]): void {
  ensureDir(DATA_DIR);
  const sundays = propers
    .toSorted((a: LiturgicalProper, b: LiturgicalProper) => a.date.localeCompare(b.date))
    .map((p: LiturgicalProper) => ({ date: p.date, title: p.liturgicalTitle }));
  const index = { lastUpdated: new Date().toISOString(), sundays };
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');
  console.log(`\nWrote index.json with ${sundays.length} entries.`);
}

function readAllPropers(): LiturgicalProper[] {
  if (!fs.existsSync(PROPERS_DIR)) return [];
  return fs.readdirSync(PROPERS_DIR)
    .filter((f: string) => f.endsWith('.json'))
    .map((f: string) => JSON.parse(fs.readFileSync(path.join(PROPERS_DIR, f), 'utf-8')) as LiturgicalProper);
}

/** Returns the set of dates already present in data/propers/ as JSON files. */
function getIndexedDates(): Set<string> {
  if (!fs.existsSync(PROPERS_DIR)) return new Set();
  return new Set(
    fs.readdirSync(PROPERS_DIR)
      .filter((f: string) => f.endsWith('.json'))
      .map((f: string) => f.replace('.json', ''))
  );
}

/** Returns all PDF file paths in the tmp download directory. */
function getLocalPdfs(): Array<{ filePath: string; filename: string }> {
  if (!fs.existsSync(TMP_DIR)) return [];
  return fs.readdirSync(TMP_DIR)
    .filter((f: string) => f.endsWith('.pdf'))
    .map((f: string) => ({ filePath: path.join(TMP_DIR, f), filename: f }));
}

/**
 * Reconciles the tmp PDF directory against data/propers/.
 * Returns any PDF that does not yet have a corresponding JSON output file.
 */
function findUnparsedPdfs(): Array<{ filePath: string; filename: string }> {
  const indexed = getIndexedDates();
  const localPdfs = getLocalPdfs();

  const DATE_RE = /(\d{4}-\d{2}-\d{2})/;
  const unparsed = localPdfs.filter(({ filename }) => {
    const dateMatch = DATE_RE.exec(filename);
    if (dateMatch) return !indexed.has(dateMatch[1]);
    // Can't determine date from filename — include it to be safe
    return true;
  });

  if (unparsed.length === 0) {
    console.log(`  All ${localPdfs.length} local PDF(s) already have JSON output — skipping parse.`);
  } else {
    console.log(`  ${localPdfs.length} local PDF(s) found, ${unparsed.length} missing from data/propers/.`);
  }

  return unparsed;
}

async function main(): Promise<void> {
  console.log('=== Bootstrap: Bulk PDF Import ===\n');
  console.log('This will scrape ALL PDFs from stamforddio.org and parse any that are missing.\n');

  // Step 1: Scrape
  console.log('Step 1: Scraping all PDF links...');
  const allEntries = await scrapePdfLinks();
  console.log(`Found ${allEntries.length} PDF(s).\n`);

  // Step 2: Download (skips already-downloaded files; saves manifest with linkText)
  console.log('Step 2: Downloading PDFs...');
  const downloaded = await downloadNewPdfs(allEntries);
  console.log(`\nDownloaded ${downloaded.length} new PDF(s).`);

  // Step 2b: Reconcile — compare local PDFs against data/propers/ JSON files
  console.log('\nStep 2b: Reconciling downloads against existing parsed output...');
  const toParse = findUnparsedPdfs();

  if (toParse.length === 0) {
    console.log('\nStep 3: Skipping parse (nothing new to process).');
    console.log('\nStep 4: Rebuilding index.json from existing data...');
    writeIndex(readAllPropers());
    console.log(`\nBootstrap complete. ${getIndexedDates().size} Sundays already indexed — nothing new to do.`);
    return;
  }

  // Step 3: Load manifest so we can pass linkText to the parser for accurate date extraction
  const manifest = loadManifest();

  console.log(`\nStep 3: Parsing ${toParse.length} PDF(s)...`);
  const newResults: LiturgicalProper[] = [];
  for (const { filePath, filename } of toParse) {
    process.stdout.write(`  Parsing ${filename}... `);
    const linkText = manifest[filename]?.linkText;
    const proper = await parsePdf(filePath, linkText);
    if (proper) {
      writeProper(proper);
      newResults.push(proper);
      console.log('OK');
    } else {
      console.log('FAILED');
    }
  }

  // Step 4: Rebuild index from all JSON files on disk (existing + newly parsed)
  console.log('\nStep 4: Rebuilding index.json...');
  const allPropers = readAllPropers();
  writeIndex(allPropers);

  console.log(`\nBootstrap complete. ${newResults.length} new Sunday(s) parsed; ${allPropers.length} total in index.`);
  console.log('Review data/propers/ and fix any parsing issues before committing.');
}

// Top-level await is unavailable in CommonJS (ts-node); async IIFE is the correct pattern here.
(async () => { // NOSONAR
  try {
    await main();
  } catch (err) {
    console.error('Bootstrap failed:', err);
    process.exit(1);
  }
})();
