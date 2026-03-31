# Liturgical Propers — Project Instructions

## Project Overview

A React Native (Expo) mobile app that displays the Sunday liturgical propers — Tropars, Kondaks, Prokimens, scripture readings, and other variable prayers — for the **Ukrainian Catholic Diocese of Stamford (Eparchy of Stamford)**.

Source content lives at `https://www.stamforddio.org/liturgical-propers` as a list of printable PDFs, one per Sunday. The goal is to replace the print-and-carry workflow with a clean, phone-readable experience.

---

## 1. Architecture & Tech Stack

### React Native App
- **Expo SDK 54** (managed workflow) — pinned to SDK 54 for Expo Go compatibility
- **TypeScript** throughout
- **React Navigation** — bottom tab navigator + native stack
- **React Native Paper** — UI components
- **Noto Serif / Noto Sans** — loaded via `expo-font` and `@expo-google-fonts`
- **AsyncStorage** — local caching for offline use
- **react-native-web** + **react-dom 18.3.1** — web browser support via `npm run web`

### Data Layer — GitHub as the Backend
There is no traditional backend. Instead:
- A **GitHub Actions pipeline** scrapes the diocesan website, parses PDFs into structured JSON, and commits the results to `data/` in the repo
- JSON files are served directly from **GitHub raw content URLs** (`raw.githubusercontent.com`)
- The app fetches JSON from GitHub on launch and caches locally with **AsyncStorage**
- Zero hosting costs, no database, no server to maintain

### Data Pipeline (TypeScript/Node.js — runs in GitHub Actions)
- **Playwright** (Chromium) to render the Wix-hosted page and discover PDF links
- **pdf-parse v1.1.1** (based on Mozilla pdf.js) to extract text from downloaded PDFs
- **Custom TypeScript parser** using regex-based section detection
- All pipeline code lives in `scripts/` with its own `tsconfig.json`

---

## 2. Repository Structure

```
LiturgicalPropers/
├── data/
│   ├── propers/
│   │   ├── 2026-03-22.json       # One JSON file per Sunday, named by ISO date
│   │   ├── 2026-03-29.json
│   │   └── ...
│   └── index.json                # Manifest listing all available Sundays
├── scripts/
│   ├── scrape.ts                 # Discovers and downloads PDFs; saves manifest.json
│   ├── parse.ts                  # Extracts text from PDFs → structured JSON
│   ├── pipeline.ts               # Incremental update orchestrator (used by GitHub Action)
│   ├── bootstrap.ts              # One-time bulk import of all existing PDFs
│   └── tsconfig.json             # Pipeline-specific TS config (ES2023, CommonJS)
├── src/
│   ├── components/
│   │   ├── PropersDisplay.tsx
│   │   ├── SectionDivider.tsx
│   │   ├── TroparSection.tsx
│   │   ├── KondakSection.tsx
│   │   ├── ScriptureSection.tsx
│   │   ├── ProkeimenonSection.tsx
│   │   └── SundayListItem.tsx
│   ├── screens/
│   │   ├── TodayScreen.tsx
│   │   ├── CalendarScreen.tsx
│   │   ├── ProperDetailScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── data/
│   │   ├── types.ts              # Shared TypeScript interfaces
│   │   ├── sampleData.ts         # Placeholder data for development
│   │   └── api.ts                # GitHub raw URL fetchers
│   ├── hooks/
│   │   ├── usePropers.ts
│   │   └── useCurrentSunday.ts
│   ├── theme/
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   └── ThemeContext.tsx
│   ├── utils/
│   │   ├── dateHelpers.ts
│   │   └── cache.ts
│   └── navigation/
│       └── AppNavigator.tsx
├── tmp/
│   └── pdfs/
│       ├── *.pdf                 # Downloaded PDFs (gitignored)
│       └── manifest.json         # Scraper metadata: filename → {url, linkText}
├── .github/
│   └── workflows/
│       └── update-propers.yml
├── App.tsx
├── package.json
└── INSTRUCTIONS.md               # This file
```

---

## 3. Data Model

```typescript
interface LiturgicalProper {
  id: string;                     // ISO date: "2026-03-22"
  date: string;                   // ISO date: "2026-03-22"
  liturgicalTitle: string;        // "Fourth Sunday of the Great Fast"
  tone?: number;                  // Octoechos tone (1–8)
  troparia: TroparionEntry[];
  kondakia: KondakionEntry[];
  prokeimenon?: ProkeimenonEntry;
  epistle?: ScriptureReading;
  alleluia?: AlleluiaEntry;
  gospel?: ScriptureReading;
  communionHymn?: string;
  specialNotes?: string;
  pdfSourceUrl?: string;
  lastUpdated: string;            // ISO datetime
}
```

The `data/index.json` manifest has this shape:

```json
{
  "lastUpdated": "2026-03-22T00:00:00Z",
  "sundays": [
    { "date": "2026-03-22", "title": "Fourth Sunday of the Great Fast" }
  ]
}
```

---

## 4. Data Pipeline

### Running the Pipeline

**First-time bulk import (run once manually):**
```bash
npm run bootstrap
```

This will:
1. Scrape all PDF links from stamforddio.org using Playwright
2. Download any PDFs not already in `tmp/pdfs/` (idempotent — skips existing files)
3. Save a `tmp/pdfs/manifest.json` mapping filename → `{url, linkText}`
4. Compare `tmp/pdfs/` against `data/propers/` — parse only PDFs missing a JSON output
5. Rebuild `data/index.json` from all JSON files on disk

**Incremental update (used by GitHub Action):**
```bash
npm run pipeline
```

Same as bootstrap but skips PDFs whose date is already in `data/propers/`.

### Pipeline Scripts

| Script | Purpose |
|---|---|
| `scripts/scrape.ts` | Playwright scraper; exports `scrapePdfLinks`, `downloadNewPdfs`, `saveManifest`, `loadManifest` |
| `scripts/parse.ts` | PDF text extractor; exports `parsePdf(filePath, linkText?)` |
| `scripts/pipeline.ts` | Incremental orchestrator for GitHub Actions |
| `scripts/bootstrap.ts` | Full backlog importer with reconciliation logic |

### Date Extraction Priority

The parser determines each Sunday's date using this fallback chain:

1. **Link text from the scraper manifest** — most reliable; the website link text usually contains the Sunday name and date (e.g., `"Fourth Sunday of the Great Fast, March 22, 2026"`)
2. **First 10 lines of PDF content** — avoids footer/print dates common to all PDFs
3. **ISO date pattern in the filename** (e.g., `2026-03-22.pdf`)
4. **Unique slug from the filename** — prevents silent overwrites when date cannot be determined (outputs `unknown-{slug}.json`)

### Known Issues

**URL-encoded link text:** Wix sometimes encodes link text with `%20` (URL-encoded spaces), which appears in the manifest and output filenames as literal `20`. This produces filenames like `unknown-Sepember-2029-202024-20--20NINETEENTH-20.json`.

**Fix:** Before running bootstrap, check `tmp/pdfs/manifest.json`. If `linkText` values contain `%20`, decode them:

```bash
# Quick check
node -e "const m = require('./tmp/pdfs/manifest.json'); Object.values(m).forEach(e => console.log(e.linkText))"
```

If the link texts are URL-encoded, add a `decodeURIComponent()` call in `scrape.ts` where `linkText` is extracted:

```typescript
linkText: decodeURIComponent((a.textContent || '').trim()),
```

Then delete `tmp/pdfs/manifest.json` and rerun `npm run bootstrap` to regenerate it with clean link texts.

**Varying PDF formats:** The Eparchy's PDFs are not always consistently formatted. After bootstrap, review a few `data/propers/*.json` files against their source PDFs and adjust the regex patterns in `scripts/parse.ts` if sections are being missed or misidentified.

---

## 5. App Screens & Navigation

```
Bottom Tab Navigator
├── Today     — current/next Sunday's propers (pull-to-refresh)
├── Calendar  — searchable list of all available Sundays
└── Settings  — theme, font size, offline cache controls
```

The **Calendar** tab uses a nested stack: list → `ProperDetailScreen` (reuses `PropersDisplay`).

---

## 6. Switching to Live Data

The app ships in sample-data mode. To switch to live GitHub data:

1. Commit and push your `data/` directory to GitHub
2. Open `src/data/api.ts` and update:

```typescript
const USE_SAMPLE_DATA = false;
const GITHUB_OWNER = 'your-github-username';
const GITHUB_REPO  = 'your-repo-name';
const GITHUB_BRANCH = 'main';
```

The app will then fetch from:
```
https://raw.githubusercontent.com/{owner}/{repo}/main/data/index.json
https://raw.githubusercontent.com/{owner}/{repo}/main/data/propers/{date}.json
```

No API keys or authentication required.

---

## 7. UI / Design

### Color Palette

| Token | Light | Dark |
|---|---|---|
| Background | `#FAF8F5` (warm off-white) | `#1A1A2E` (deep charcoal) |
| Primary (gold) | `#B8860B` | `#D4A017` |
| Accent (burgundy) | `#722F37` | `#9B4A52` |
| Text | `#2D2D2D` | `#F0EDE8` |

### Typography
- **Body:** Noto Serif — 17pt default, 1.65 line height
- **Headers:** Noto Sans Bold
- **Section labels:** Noto Sans Bold, uppercase, letterspaced, burgundy accent color
- **Scripture references:** Italic, slightly smaller

### Font Size Scales
Three scales (Small / Medium / Large) adjustable in Settings — persisted via AsyncStorage.

### Theme
Light / Dark / System — persisted via AsyncStorage.

---

## 8. GitHub Actions Automation

The workflow at `.github/workflows/update-propers.yml` runs automatically:
- **Tuesday at 6:00 AM UTC** — catches early-week posts
- **Friday at 6:00 AM UTC** — catches late posts before Sunday
- **Manual dispatch** — trigger from the GitHub Actions UI anytime

Most runs will be no-ops (nothing new to scrape). When new PDFs are found, they are parsed and committed back to `data/` automatically.

---

## 9. Running Locally

```bash
# Install dependencies
npm install

# Install Playwright browser
npx playwright install chromium

# Start the app
npm start          # Expo Go (scan QR code)
npm run web        # Browser (http://localhost:8081)
npm run android    # Android emulator
npm run ios        # iOS simulator (macOS only)

# Run the data pipeline
npm run bootstrap  # First-time full import
npm run pipeline   # Incremental update
```

**Expo Go version required:** SDK 54. Use the latest version of Expo Go from the App Store / Play Store.

---

## 10. Content & Attribution

Liturgical content is provided by the **Ukrainian Catholic Diocese of Stamford**. This app is an unofficial reader and is not affiliated with or endorsed by the Eparchy.

The app's About screen (Settings → About) displays:
> "Liturgical content provided by the Ukrainian Catholic Diocese of Stamford. This app is an unofficial reader and is not affiliated with or endorsed by the Eparchy."

Consider reaching out to the Eparchy to request permission or a partnership — they may appreciate the effort and be able to provide structured data directly.

---

## 11. Future Enhancements

- **Push notifications** — "This Sunday's propers are ready" on Saturday evening
- **iOS/Android widget** — showing the Sunday title
- **Bookmarks** — save propers for re-reading
- **Text-to-speech** — read propers aloud
- **Bilingual toggle** — English / Ukrainian side-by-side
- **Multi-eparchy support** — Philadelphia, Chicago, Edmonton, etc.
- **Parish finder** — integrate with the Eparchy's parish directory
- **Apple Watch complication** — current Sunday title
