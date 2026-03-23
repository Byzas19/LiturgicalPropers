import { LiturgicalProper, PropersListItem } from './types';
import { SAMPLE_PROPERS, getSampleProperByDate, getSamplePropersList } from './sampleData';
import {
  cacheProper,
  getCachedProper,
  cachePropersList,
  getCachedPropersList,
  updateCacheMeta,
} from '../utils/cache';

// ── Configuration ────────────────────────────────────────────────────────────
// Set USE_SAMPLE_DATA to false and fill in GITHUB_OWNER / GITHUB_REPO
// once you have real data committed to the repo.

const USE_SAMPLE_DATA = true;

const GITHUB_OWNER = 'YOUR_GITHUB_USERNAME';
const GITHUB_REPO = 'YOUR_REPO_NAME';
const GITHUB_BRANCH = 'main';

const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/data`;

// ── GitHub index type ────────────────────────────────────────────────────────

interface GithubIndex {
  lastUpdated: string;
  sundays: Array<{ date: string; title: string }>;
}

// ── Fetchers ─────────────────────────────────────────────────────────────────

async function githubFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

export const fetchProperByDate = async (date: string): Promise<LiturgicalProper | null> => {
  // 1. Check cache first
  const cached = await getCachedProper(date);
  if (cached) return cached;

  // 2. Sample data during development
  if (USE_SAMPLE_DATA) {
    const sample = getSampleProperByDate(date);
    if (sample) {
      await cacheProper(sample);
      return sample;
    }
    return null;
  }

  // 3. Fetch from GitHub raw
  try {
    const proper = await githubFetch<LiturgicalProper>(
      `${RAW_BASE}/propers/${date}.json`
    );
    await cacheProper(proper);
    return proper;
  } catch (e) {
    console.warn(`fetchProperByDate(${date}) failed:`, e);
    return null;
  }
};

export const fetchPropersList = async (): Promise<PropersListItem[]> => {
  // 1. Check cache
  const cached = await getCachedPropersList();
  if (cached) return cached;

  // 2. Sample data
  if (USE_SAMPLE_DATA) {
    const list = getSamplePropersList();
    await cachePropersList(list);
    return list;
  }

  // 3. Fetch index from GitHub raw
  try {
    const index = await githubFetch<GithubIndex>(`${RAW_BASE}/index.json`);
    const list: PropersListItem[] = index.sundays.map((s) => ({
      date: s.date,
      liturgicalTitle: s.title,
    }));
    await cachePropersList(list);
    await updateCacheMeta();
    return list;
  } catch (e) {
    console.warn('fetchPropersList() failed:', e);
    return [];
  }
};

export const fetchAllPropers = async (): Promise<LiturgicalProper[]> => {
  if (USE_SAMPLE_DATA) return SAMPLE_PROPERS;

  try {
    const list = await fetchPropersList();
    const results = await Promise.allSettled(
      list.map((item) => fetchProperByDate(item.date))
    );
    return results
      .filter(
        (r): r is PromiseFulfilledResult<LiturgicalProper> =>
          r.status === 'fulfilled' && r.value !== null
      )
      .map((r) => r.value);
  } catch {
    return [];
  }
};
