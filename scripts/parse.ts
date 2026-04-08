/**
 * parse.ts
 * Extracts structured liturgical propers from a PDF.
 *
 * Strategy: use pdfjs-dist to read text items with font metadata, then drive
 * section segmentation off bold typography rather than a hardcoded phrase list.
 * The Stamford propers PDFs use TimesNewRomanPS-BoldMT for every section
 * heading and TimesNewRomanPSMT for body text — see scripts/probe-bold.ts.
 *
 * Header rule: a bold line ending with ":" opens a new section. Subsequent
 * bold lines (e.g. "(Acts 5:12-20)") that immediately follow with no body in
 * between are appended to the current header. Bold lines that appear before
 * any colon-heading become the document title. Cyrillic headings end parsing
 * (the Ukrainian half of each PDF is not consumed).
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */
import * as fs from 'fs';
import * as path from 'path';

// ── Public types ────────────────────────────────────────────────────────────

export interface TroparionEntry { label: string; text: string; tone?: number; }
export interface KondakionEntry { label: string; text: string; tone?: number; }
export interface ProkeimenonEntry { tone?: number; text: string; verse?: string; }
export interface ScriptureReading { reference: string; text: string; }
export interface AlleluiaEntry { tone?: number; verses: string[]; }
export interface AntiphonEntry { title: string; text: string; }
export interface NamedSection { title: string; text: string; }

export interface LiturgicalProper {
  id: string;
  date: string;
  liturgicalTitle: string;
  tone?: number;
  opening?: string;
  antiphons?: AntiphonEntry[];
  entranceHymn?: string;
  holyGod?: string;
  troparia: TroparionEntry[];
  kondakia: KondakionEntry[];
  prokeimenon?: ProkeimenonEntry;
  epistle?: ScriptureReading;
  alleluia?: AlleluiaEntry;
  gospel?: ScriptureReading;
  hirmos?: NamedSection;
  communionHymn?: string;
  postCommunion?: NamedSection[];
  additionalSections?: NamedSection[];
  specialNotes?: string;
  pdfSourceUrl?: string;
  lastUpdated: string;
}

// ── Regex helpers ───────────────────────────────────────────────────────────

const TONE_RE = /\bTone\s+(\d+|[IVXivx]+)\b/i;
const SCRIPTURE_REF_RE = /((?:Gen|Ex|Lev|Num|Deut|Josh|Judg|Ruth|[12]\s*Sam|[12]\s*Kings|[12]\s*Chr|Ezra|Neh|Esth|Job|Ps|Prov|Eccl|Song|Isa|Jer|Lam|Ezek|Dan|Hos|Joel|Amos|Obad|Jon|Mic|Nah|Hab|Zeph|Hag|Zech|Mal|Matt?|Mt|Mark|Mk|Luke|Lk|Jn|John|Acts|Rom|[12]\s*Cor|Gal|Eph|Phil|Col|[12]\s*Thess|[12]\s*Tim|Titus|Phlm|Heb|Jas|[12]\s*Pet|[123]\s*John|Jude|Rev)\s*\d+[:,]\d+(?:[–\-:;,]\s*\d+)*)/i;
const DATE_RE = /(January|February|March|April|May|June|July|August|September|Sepember|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i;
const CYRILLIC_RE = /[\u0400-\u04FF]/;

const MONTHS: Record<string, string> = {
  January: '01', February: '02', March: '03', April: '04',
  May: '05', June: '06', July: '07', August: '08',
  September: '09', Sepember: '09', October: '10', November: '11', December: '12',
};

function romanToInt(s: string): number | undefined {
  const vals: Record<string, number> = { I: 1, V: 5, X: 10 };
  const upper = s.toUpperCase();
  if (![...upper].every((c) => c in vals)) return undefined;
  let result = 0;
  let prev = 0;
  for (const c of [...upper].reverse()) {
    const val = vals[c];
    result += val >= prev ? val : -val;
    prev = val;
  }
  return result >= 1 && result <= 8 ? result : undefined;
}

function extractTone(text: string): number | undefined {
  const m = TONE_RE.exec(text);
  if (!m) return undefined;
  const val = m[1];
  if (/^\d+$/.test(val)) {
    const n = parseInt(val, 10);
    return n >= 1 && n <= 8 ? n : undefined;
  }
  return romanToInt(val);
}

function extractDate(text: string): string | undefined {
  const m = DATE_RE.exec(text);
  if (!m) return undefined;
  const month = MONTHS[m[1]];
  const day = m[2].padStart(2, '0');
  const year = m[3];
  return `${year}-${month}-${day}`;
}

function extractScriptureRef(text: string): string | undefined {
  const m = SCRIPTURE_REF_RE.exec(text);
  return m ? m[0] : undefined;
}

// ── PDF text extraction ─────────────────────────────────────────────────────

interface Line {
  text: string;
  bold: boolean;
}

async function extractLines(filePath: string): Promise<Line[]> {
  const pdfjs: any = require('pdfjs-dist/legacy/build/pdf.js');
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

  const allLines: Line[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    // Force fonts to load so commonObjs.get(...) resolves below.
    await page.getOperatorList();
    const content = await page.getTextContent({ includeMarkedContent: false });

    // Resolve every fontName referenced on this page to its real font name.
    const fontIsBold = new Map<string, boolean>();
    const seenFonts = new Set<string>(
      content.items
        .map((it: any) => it.fontName)
        .filter((n: any): n is string => typeof n === 'string'),
    );
    for (const fontName of seenFonts) {
      try {
        const font: any = await new Promise((resolve) =>
          page.commonObjs.get(fontName, resolve),
        );
        const realName: string = font?.name ?? font?.loadedName ?? fontName;
        const flagBold = !!(font?.descriptor?.flags & (1 << 18));
        fontIsBold.set(fontName, flagBold || /bold|black|heavy/i.test(realName));
      } catch {
        fontIsBold.set(fontName, /bold/i.test(fontName));
      }
    }

    // Bucket text items by y coordinate (rounded to nearest int) so visually
    // adjacent runs land on the same line.
    type Item = { str: string; y: number; x: number; font: string };
    const items: Item[] = content.items
      .filter((it: any) => typeof it.str === 'string' && it.transform)
      .map((it: any) => ({
        str: it.str,
        y: it.transform[5],
        x: it.transform[4],
        font: it.fontName,
      }));

    const lineMap = new Map<number, Item[]>();
    for (const it of items) {
      const key = Math.round(it.y);
      if (!lineMap.has(key)) lineMap.set(key, []);
      lineMap.get(key)!.push(it);
    }

    // Top-down (PDF coords are bottom-up, so largest y first).
    const sortedY = [...lineMap.keys()].sort((a, b) => b - a);
    for (const y of sortedY) {
      const lineItems = lineMap.get(y)!.sort((a, b) => a.x - b.x);
      const text = lineItems.map((i) => i.str).join('').trim();
      if (!text) continue;

      // Dominant font = font that contributed the most non-space chars.
      const weights = new Map<string, number>();
      for (const it of lineItems) {
        const w = it.str.replace(/\s/g, '').length;
        if (w === 0) continue;
        weights.set(it.font, (weights.get(it.font) ?? 0) + w);
      }
      const dominant = [...weights.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      const bold = dominant ? fontIsBold.get(dominant) === true : false;

      allLines.push({ text, bold });
    }
  }

  return allLines;
}

// ── Segmentation ────────────────────────────────────────────────────────────

interface RawSection {
  header: string;
  body: string;
}

interface SegmentedDocument {
  title: string;
  opening: string;
  sections: RawSection[];
}

function segment(lines: Line[]): SegmentedDocument {
  const titleLines: string[] = [];
  const openingLines: string[] = [];
  const sections: RawSection[] = [];
  let currentHeader: string[] | null = null;
  let currentBody: string[] = [];

  const flush = () => {
    if (currentHeader) {
      sections.push({
        header: currentHeader.join(' ').trim(),
        body: currentBody.join('\n').trim(),
      });
    }
    currentHeader = null;
    currentBody = [];
  };

  for (const line of lines) {
    // Stop as soon as we encounter the Ukrainian half of the document.
    if (CYRILLIC_RE.test(line.text)) {
      break;
    }

    if (line.bold) {
      const endsWithColon = /:\s*$/.test(line.text);
      if (endsWithColon) {
        // New section heading.
        flush();
        currentHeader = [line.text];
      } else if (currentHeader && currentBody.length === 0) {
        // Continuation of the current header (e.g. "(Acts 5:12-20)" right
        // after "Epistle:") — body hasn't started yet.
        currentHeader.push(line.text);
      } else if (currentHeader === null && sections.length === 0) {
        // No section started yet — this is part of the document title.
        titleLines.push(line.text);
      } else {
        // Stray bold line in the middle of a body — treat as body text.
        currentBody.push(line.text);
      }
    } else {
      if (currentHeader) {
        currentBody.push(line.text);
      } else {
        // Non-bold text before the first section — opening / preamble.
        openingLines.push(line.text);
      }
    }
  }
  flush();

  return {
    title: titleLines.join('\n').trim(),
    opening: openingLines.join('\n').trim(),
    sections,
  };
}

// ── Header → typed-field mapping ────────────────────────────────────────────

type SectionKind =
  | 'antiphon'
  | 'entranceHymn'
  | 'troparKondak'
  | 'holyGod'
  | 'prokimen'
  | 'epistle'
  | 'alleluia'
  | 'gospel'
  | 'hirmos'
  | 'communion'
  | 'other';

function classifyHeader(header: string): SectionKind {
  const h = header.toLowerCase();
  if (/\b(first|second|third)\s+antiphon\b/.test(h)) return 'antiphon';
  if (/\bentrance\s+hymn\b/.test(h)) return 'entranceHymn';
  if (/\btropar/.test(h) || /\bkontak/.test(h) || /\bkondak/.test(h)) return 'troparKondak';
  if (/\bholy\s+god\b/.test(h)) return 'holyGod';
  if (/\bprok[ei]men/.test(h)) return 'prokimen';
  if (/\bepistle\b|\bapostol/.test(h)) return 'epistle';
  if (/\balleluia\b/.test(h)) return 'alleluia';
  if (/\bgospel\b/.test(h)) return 'gospel';
  if (/it\s+is\s+truly\s+right|hirmos\s+of\s+the\s+feast/.test(h)) return 'hirmos';
  if (/\bcommunion\s+(?:hymn|verse)\b|\bprychasten/.test(h)) return 'communion';
  return 'other';
}

// Strip a leading "Header:" prefix from a body if pdfjs accidentally rolled
// it into the body text (rare; defensive).
function cleanBody(body: string): string {
  return body.trim();
}

function splitTroparia(body: string): { troparia: TroparionEntry[]; kondakia: KondakionEntry[] } {
  // Split body into chunks at every "Troparion (n):" / "Kontakion (n):" /
  // "Kondak (n):" inline marker. The first chunk before any marker is dropped.
  const markerRe = /(Tropar(?:ion)?|Kontakion|Kondak(?:ion)?)\s*\((\d+)\)\s*:/g;
  const troparia: TroparionEntry[] = [];
  const kondakia: KondakionEntry[] = [];

  const matches: { kind: 'tropar' | 'kondak'; tone: number; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = markerRe.exec(body))) {
    const kind = /tropar/i.test(m[1]) ? 'tropar' : 'kondak';
    matches.push({ kind, tone: parseInt(m[2], 10), start: m.index, end: markerRe.lastIndex });
  }

  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const next = matches[i + 1];
    const text = body.slice(cur.end, next?.start ?? body.length).trim();
    const label = `${cur.kind === 'tropar' ? 'Troparion' : 'Kontakion'} (${cur.tone})`;
    if (cur.kind === 'tropar') {
      troparia.push({ label, text, tone: cur.tone });
    } else {
      kondakia.push({ label, text, tone: cur.tone });
    }
  }

  // If no inline markers were found, treat the whole body as a single tropar.
  if (matches.length === 0 && body.trim()) {
    troparia.push({ label: 'Troparion', text: body.trim() });
  }

  return { troparia, kondakia };
}

function buildProkeimenon(body: string): ProkeimenonEntry | undefined {
  const text = body.trim();
  if (!text) return undefined;
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const verse = lines.find((l) => /^Verse:/i.test(l));
  const main = lines.filter((l) => !/^Verse:/i.test(l)).join('\n');
  return {
    tone: extractTone(text),
    text: main,
    verse,
  };
}

function buildAlleluia(body: string): AlleluiaEntry | undefined {
  const text = body.trim();
  if (!text) return undefined;
  return {
    tone: extractTone(text),
    verses: text.split('\n').map((l) => l.trim()).filter(Boolean),
  };
}

function buildScriptureReading(header: string, body: string): ScriptureReading | undefined {
  const text = body.trim();
  if (!text) return undefined;
  // Scripture ref usually lives in the header (e.g. "Epistle: (Acts 5:12-20)")
  // but sometimes appears in the body — check both.
  const ref = extractScriptureRef(header) ?? extractScriptureRef(text) ?? '';
  return { reference: ref, text };
}

// ── Main parser ─────────────────────────────────────────────────────────────

export async function parsePdf(filePath: string, linkText?: string): Promise<LiturgicalProper | null> {
  let lines: Line[];
  try {
    lines = await extractLines(filePath);
  } catch (err) {
    console.error(`  [error] Could not read PDF ${path.basename(filePath)}: ${err}`);
    return null;
  }

  const doc = segment(lines);

  // Date extraction priority: link text → first lines of PDF → filename ISO date.
  const titleAndOpening = `${doc.title}\n${doc.opening}`;
  const dateFromLinkText = linkText ? extractDate(linkText) : undefined;
  const dateFromContent = extractDate(titleAndOpening);
  const filenameBase = path.basename(filePath, '.pdf');
  // PDFs downloaded from the Wix site keep URL-encoded names (%20 → space).
  const decodedFilename = decodeURIComponent(filenameBase);
  const dateFromFilename =
    /(\d{4}-\d{2}-\d{2})/.exec(decodedFilename)?.[1] ?? extractDate(decodedFilename);
  const filenameSlug = filenameBase.replaceAll(/[^a-zA-Z0-9]/g, '-').substring(0, 40);
  const date = dateFromLinkText ?? dateFromContent ?? dateFromFilename ?? `unknown-${filenameSlug}`;

  const proper: LiturgicalProper = {
    id: date,
    date,
    liturgicalTitle: doc.title || 'Unknown Sunday',
    troparia: [],
    kondakia: [],
    opening: doc.opening || undefined,
    pdfSourceUrl: 'https://www.stamforddio.org/liturgical-propers',
    lastUpdated: new Date().toISOString(),
  };

  const antiphons: AntiphonEntry[] = [];
  const additional: NamedSection[] = [];
  const postCommunion: NamedSection[] = [];

  // Headings that come AFTER the communion verse and aren't otherwise typed
  // get bucketed as postCommunion.
  let seenCommunion = false;

  for (const section of doc.sections) {
    const kind = classifyHeader(section.header);
    const headerTitle = section.header.replace(/:\s*$/, '').trim();
    const body = cleanBody(section.body);

    switch (kind) {
      case 'antiphon':
        antiphons.push({ title: headerTitle, text: body });
        break;
      case 'entranceHymn':
        proper.entranceHymn = body || undefined;
        break;
      case 'troparKondak': {
        const { troparia, kondakia } = splitTroparia(body);
        proper.troparia.push(...troparia);
        proper.kondakia.push(...kondakia);
        break;
      }
      case 'holyGod':
        proper.holyGod = body || undefined;
        break;
      case 'prokimen':
        proper.prokeimenon = buildProkeimenon(body);
        break;
      case 'epistle':
        proper.epistle = buildScriptureReading(section.header, body);
        break;
      case 'alleluia':
        proper.alleluia = buildAlleluia(body);
        break;
      case 'gospel':
        proper.gospel = buildScriptureReading(section.header, body);
        break;
      case 'hirmos':
        proper.hirmos = { title: headerTitle, text: body };
        break;
      case 'communion':
        proper.communionHymn = body || undefined;
        seenCommunion = true;
        break;
      case 'other':
      default:
        if (seenCommunion) {
          postCommunion.push({ title: headerTitle, text: body });
        } else {
          additional.push({ title: headerTitle, text: body });
        }
        break;
    }
  }

  if (antiphons.length > 0) proper.antiphons = antiphons;
  if (postCommunion.length > 0) proper.postCommunion = postCommunion;
  if (additional.length > 0) proper.additionalSections = additional;

  // Overall tone: prefer the first tropar tone, fall back to first kondak.
  proper.tone = proper.troparia[0]?.tone ?? proper.kondakia[0]?.tone;

  return proper;
}
