/**
 * parse.ts
 * Extracts structured liturgical propers from a PDF file using pdf-parse.
 * Outputs a LiturgicalProper JSON object.
 */

import * as fs from 'fs';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>;

// Import shared types from the app
export interface TroparionEntry { label: string; text: string; tone?: number; }
export interface KondakionEntry { label: string; text: string; tone?: number; }
export interface ProkeimenonEntry { tone?: number; text: string; verse?: string; }
export interface ScriptureReading { reference: string; text: string; }
export interface AlleluiaEntry { tone?: number; verses: string[]; }
export interface AntiphonEntry { title: string; text: string; }

export interface LiturgicalProper {
  id: string;
  date: string;
  liturgicalTitle: string;
  tone?: number;
  opening?: string;
  antiphons?: AntiphonEntry[];
  holyGod?: string;
  troparia: TroparionEntry[];
  kondakia: KondakionEntry[];
  prokeimenon?: ProkeimenonEntry;
  epistle?: ScriptureReading;
  alleluia?: AlleluiaEntry;
  gospel?: ScriptureReading;
  communionHymn?: string;
  specialNotes?: string;
  pdfSourceUrl?: string;
  lastUpdated: string;
}

// ── Regex patterns ──────────────────────────────────────────────────────────

const SECTION_PATTERNS: Record<string, RegExp> = {
  antiphon:     /^\s*(?:First|Second|Third)\s+Antiphon\b/i,
  entranceHymn: /^\s*Entrance\s+Hymn\b/i,
  troparKondak: /^\s*Tropar(?:ion)?\s+and\s+(?:Kond[ao]k|Kontak)(?:ion)?\b/i,
  // Only match numbered entries like "Troparion (1):" so plain "Troparion:" antiphon lines stay in their section
  tropar:       /^\s*Tropar(?:ion)?\s*\(\d+\)/i,
  kondak:       /^\s*(?:Kond[ao]k(?:ion)?|Kontak(?:ion)?)\s*\(\d+\)/i,
  holyGod:      /^\s*Holy\s+God\b/i,
  prokimen:     /^\s*Prok(?:e)?imen(?:on)?\b/i,
  epistle:      /^\s*(?:Epistle|Apostol)\b/i,
  alleluia:     /^\s*Alleluia\b/i,
  gospel:       /^\s*Gospel\b/i,
  communion:    /^\s*(?:Communion\s+(?:Hymn|Verse)|Prychasten)\b/i,
};

const TONE_RE = /\bTone\s+(\d+|[IVXivx]+)\b/i;

const SCRIPTURE_REF_RE = /((?:Gen|Ex|Lev|Num|Deut|Josh|Judg|Ruth|[12]\s*Sam|[12]\s*Kings|[12]\s*Chr|Ezra|Neh|Esth|Job|Ps|Prov|Eccl|Song|Isa|Jer|Lam|Ezek|Dan|Hos|Joel|Amos|Obad|Jon|Mic|Nah|Hab|Zeph|Hag|Zech|Mal|Matt?|Mark|Luke|John|Acts|Rom|[12]\s*Cor|Gal|Eph|Phil|Col|[12]\s*Thess|[12]\s*Tim|Titus|Phlm|Heb|Jas|[12]\s*Pet|[123]\s*John|Jude|Rev)\s*\d+:\d+(?:[–\-]\d+)?)/i;

const DATE_RE = /(January|February|March|April|May|June|July|August|September|Sepember|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i;

const MONTHS: Record<string, string> = {
  January: '01', February: '02', March: '03', April: '04',
  May: '05', June: '06', July: '07', August: '08',
  September: '09', Sepember: '09', October: '10', November: '11', December: '12',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

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

// ── Core parser ──────────────────────────────────────────────────────────────

type SectionKey = 'preamble' | 'antiphon' | 'entranceHymn' | 'troparKondak' | 'tropar' | 'kondak' | 'holyGod' | 'prokimen' | 'epistle' | 'alleluia' | 'gospel' | 'communion';

interface Section {
  key: SectionKey;
  lines: string[];
}

function segmentText(lines: string[]): Section[] {
  const sections: Section[] = [];
  let currentKey: SectionKey = 'preamble';
  let currentLines: string[] = [];

  for (const line of lines) {
    let matched: SectionKey | null = null;
    for (const [key, pattern] of Object.entries(SECTION_PATTERNS)) {
      if (pattern.test(line)) {
        matched = key as SectionKey;
        break;
      }
    }
    if (matched) {
      if (currentLines.length) sections.push({ key: currentKey, lines: currentLines });
      currentKey = matched;
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }
  if (currentLines.length) sections.push({ key: currentKey, lines: currentLines });
  return sections;
}

function getSectionText(sections: Section[], key: SectionKey): string {
  const found = sections.find((s) => s.key === key);
  if (!found) return '';
  return found.lines.slice(1).join('\n').trim();
}

function getAllSections(sections: Section[], key: SectionKey): Section[] {
  return sections.filter((s) => s.key === key);
}

// ── Main export ──────────────────────────────────────────────────────────────

export async function parsePdf(filePath: string, linkText?: string): Promise<LiturgicalProper | null> {
  let rawText: string;
  try {
    const buffer = fs.readFileSync(filePath);
    const result = await pdfParse(buffer);
    rawText = result.text;
  } catch (err) {
    console.error(`  [error] Could not read PDF ${path.basename(filePath)}: ${err}`);
    return null;
  }

  const lines = rawText.split('\n').map((l) => l.trimEnd());
  const titleLine = lines.find((l) => l.trim().length > 0) ?? 'Unknown Sunday';

  // Date extraction priority:
  // 1. Link text from the scraper — most reliable, contains the Sunday name/date
  // 2. First 10 lines of PDF content — avoids picking up footer/print dates
  // 3. ISO date pattern in the filename
  // 4. Unique slug from filename so we never silently overwrite another entry
  const dateFromLinkText = linkText ? extractDate(linkText) : undefined;
  const dateFromContent = extractDate(lines.slice(0, 10).join('\n'));
  const filenameBase = path.basename(filePath, '.pdf');
  const dateFromFilename = /(\d{4}-\d{2}-\d{2})/.exec(filenameBase)?.[1] ?? extractDate(filenameBase);
  const filenameSlug = filenameBase.replaceAll(/[^a-zA-Z0-9]/g, '-').substring(0, 40);
  const date = dateFromLinkText ?? dateFromContent ?? dateFromFilename ?? `unknown-${filenameSlug}`;

  const sections = segmentText(lines);

  // Troparia (may be multiple)
  const troparSections = getAllSections(sections, 'tropar');
  const troparia: TroparionEntry[] = troparSections.map((s) => {
    const header = s.lines[0] ?? 'Tropar';
    const text = s.lines.slice(1).join('\n').trim();
    return { label: header.trim(), text, tone: extractTone(header) };
  });

  // Kondakia (may be multiple)
  const kondakSections = getAllSections(sections, 'kondak');
  const kondakia: KondakionEntry[] = kondakSections.map((s) => {
    const header = s.lines[0] ?? 'Kondak';
    const text = s.lines.slice(1).join('\n').trim();
    return { label: header.trim(), text, tone: extractTone(header) };
  });

  // Overall tone: use first tropar tone if available
  const tone = troparia[0]?.tone ?? kondakia[0]?.tone;

  // Prokeimenon — skip bare header-only sections (e.g. "Prokimenon:" with no body).
  // The main text lives on the header line itself after the colon (e.g. "Prokimenon (3): Great is the Lord..."),
  // and the verse(s) are in the body lines starting with "Verse:".
  let prokeimenon: LiturgicalProper['prokeimenon'];
  const prokSection = getAllSections(sections, 'prokimen').find((s) => {
    const headerRest = s.lines[0].replace(/^\s*Prok(?:e)?imen(?:on)?\s*(?:\(\d+\))?\s*:?\s*/i, '').trim();
    const bodyText = s.lines.slice(1).join('\n').trim();
    return headerRest.length > 0 || bodyText.length > 0;
  });
  if (prokSection) {
    const header = prokSection.lines[0];
    const mainText = header.replace(/^\s*Prok(?:e)?imen(?:on)?\s*(?:\(\d+\))?\s*:?\s*/i, '').trim();
    const bodyLines = prokSection.lines.slice(1).filter((l) => l.trim());
    const verse = bodyLines.find((l) => /^\s*Verse:/i.test(l))?.trim();
    const tone = extractTone(header);
    prokeimenon = { tone, text: mainText, verse };
  }

  // Epistle
  const epistleText = getSectionText(sections, 'epistle');
  const epistle: LiturgicalProper['epistle'] = epistleText
    ? { reference: extractScriptureRef(epistleText) ?? '', text: epistleText }
    : undefined;

  // Alleluia
  const alleluiaText = getSectionText(sections, 'alleluia');
  const alleluia: LiturgicalProper['alleluia'] = alleluiaText
    ? {
        tone: extractTone(alleluiaText),
        verses: alleluiaText.split('\n').map((l) => l.trim()).filter(Boolean),
      }
    : undefined;

  // Gospel
  const gospelText = getSectionText(sections, 'gospel');
  const gospel: LiturgicalProper['gospel'] = gospelText
    ? { reference: extractScriptureRef(gospelText) ?? '', text: gospelText }
    : undefined;

  // Communion hymn
  const communionHymn = getSectionText(sections, 'communion') || undefined;

  // Antiphons
  const antiphons: AntiphonEntry[] = getAllSections(sections, 'antiphon')
    .map((s) => ({
      title: s.lines[0].replace(/:?\s*$/, '').trim(),
      text: s.lines.slice(1).join('\n').trim(),
    }))
    .filter((a) => a.text.length > 0);

  // Holy God (Trisagion substitute, e.g. Paschal season)
  const holyGodText = getSectionText(sections, 'holyGod') || undefined;

  // Opening: unlabeled text between the title and the first section header (e.g. Easter refrain)
  const preambleSection = sections.find((s) => s.key === 'preamble');
  const openingText = preambleSection
    ? preambleSection.lines
        .filter((l) => l.trim() !== titleLine.trim() && l.trim().length > 0)
        .join('\n')
        .trim()
    : '';

  return {
    id: date,
    date,
    liturgicalTitle: titleLine.trim(),
    tone,
    opening: openingText || undefined,
    antiphons: antiphons.length > 0 ? antiphons : undefined,
    holyGod: holyGodText,
    troparia,
    kondakia,
    prokeimenon,
    epistle,
    alleluia,
    gospel,
    communionHymn,
    pdfSourceUrl: 'https://www.stamforddio.org/liturgical-propers',
    lastUpdated: new Date().toISOString(),
  };
}
