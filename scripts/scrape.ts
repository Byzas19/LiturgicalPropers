/**
 * scrape.ts
 * Discovers and downloads liturgical propers PDFs from stamforddio.org.
 * Uses Playwright (Chromium) to handle Wix's JS-rendered page.
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

const PROPERS_PAGE_URL = 'https://www.stamforddio.org/liturgical-propers';
const PDF_DOWNLOAD_DIR = path.join(__dirname, '..', 'tmp', 'pdfs');
const MANIFEST_FILE = path.join(PDF_DOWNLOAD_DIR, 'manifest.json');

export type PdfManifest = Record<string, { url: string; linkText: string }>;

export interface PdfEntry {
  url: string;
  linkText: string;
  filename: string;
  filePath: string;
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9\-_\.]/g, '_').replace(/_+/g, '_').substring(0, 120);
}

async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const file = fs.createWriteStream(destPath);
    const request = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
      // Follow redirects
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.destroy();
        fs.unlinkSync(destPath);
        downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        file.destroy();
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
    });
    request.on('error', (err) => {
      fs.existsSync(destPath) && fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

export async function scrapePdfLinks(): Promise<PdfEntry[]> {
  console.log(`Loading ${PROPERS_PAGE_URL} with Playwright...`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  });
  const page = await context.newPage();

  try {
    await page.goto(PROPERS_PAGE_URL, { waitUntil: 'networkidle', timeout: 60000 });
    // Extra wait for Wix hydration
    await page.waitForTimeout(3000);

    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      return anchors
        .filter((a) => {
          const href = (a as HTMLAnchorElement).href;
          return href && href.toLowerCase().includes('.pdf');
        })
        .map((a) => ({
          url: (a as HTMLAnchorElement).href,
          linkText: (a.textContent || '').trim(),
        }));
    });

    console.log(`Found ${links.length} PDF link(s).`);
    return links.map(({ url, linkText }) => {
      const urlPath = decodeURIComponent(new URL(url).pathname);
      const rawFilename = path.basename(urlPath) || sanitizeFilename(linkText) + '.pdf';
      const filename = rawFilename.endsWith('.pdf') ? rawFilename : rawFilename + '.pdf';
      return {
        url,
        linkText,
        filename,
        filePath: path.join(PDF_DOWNLOAD_DIR, filename),
      };
    });
  } finally {
    await browser.close();
  }
}

/** Saves (or merges) scraper metadata so it survives between runs. */
export function saveManifest(entries: PdfEntry[]): void {
  ensureDir(PDF_DOWNLOAD_DIR);
  let existing: PdfManifest = {};
  if (fs.existsSync(MANIFEST_FILE)) {
    existing = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf-8')) as PdfManifest;
  }
  for (const e of entries) {
    existing[e.filename] = { url: e.url, linkText: e.linkText };
  }
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(existing, null, 2), 'utf-8');
}

/** Loads the saved scraper manifest, or returns an empty object if none exists. */
export function loadManifest(): PdfManifest {
  if (!fs.existsSync(MANIFEST_FILE)) return {};
  return JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf-8')) as PdfManifest;
}

export async function downloadNewPdfs(entries: PdfEntry[]): Promise<PdfEntry[]> {
  ensureDir(PDF_DOWNLOAD_DIR);

  const newEntries: PdfEntry[] = [];
  for (const entry of entries) {
    if (fs.existsSync(entry.filePath)) {
      console.log(`  [skip] ${entry.filename} already downloaded.`);
      continue;
    }
    try {
      console.log(`  [downloading] ${entry.filename}`);
      await downloadFile(entry.url, entry.filePath);
      console.log(`  [ok] ${entry.filename}`);
      newEntries.push(entry);
    } catch (err) {
      console.error(`  [error] ${entry.filename}: ${err}`);
    }
  }
  // Always persist the full entry list so linkText survives future runs
  saveManifest(entries);
  return newEntries;
}
