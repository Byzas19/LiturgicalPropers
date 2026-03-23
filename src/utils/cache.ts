import AsyncStorage from '@react-native-async-storage/async-storage';
import { LiturgicalProper, PropersListItem } from '../data/types';

const PROPER_KEY = (date: string) => `@proper_${date}`;
const LIST_KEY = '@propers_list';
const CACHE_META_KEY = '@cache_meta';

interface CacheMeta {
  lastFetched: string;
  version: number;
}

export const cacheProper = async (proper: LiturgicalProper): Promise<void> => {
  try {
    await AsyncStorage.setItem(PROPER_KEY(proper.date), JSON.stringify(proper));
  } catch (e) {
    console.warn('Failed to cache proper:', e);
  }
};

export const getCachedProper = async (date: string): Promise<LiturgicalProper | null> => {
  try {
    const raw = await AsyncStorage.getItem(PROPER_KEY(date));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const cachePropersList = async (list: PropersListItem[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(LIST_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to cache propers list:', e);
  }
};

export const getCachedPropersList = async (): Promise<PropersListItem[] | null> => {
  try {
    const raw = await AsyncStorage.getItem(LIST_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const updateCacheMeta = async (): Promise<void> => {
  try {
    const meta: CacheMeta = { lastFetched: new Date().toISOString(), version: 1 };
    await AsyncStorage.setItem(CACHE_META_KEY, JSON.stringify(meta));
  } catch {}
};

export const getCacheMeta = async (): Promise<CacheMeta | null> => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_META_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const isCacheStale = async (maxAgeHours = 24): Promise<boolean> => {
  const meta = await getCacheMeta();
  if (!meta) return true;
  const ageMs = Date.now() - new Date(meta.lastFetched).getTime();
  return ageMs > maxAgeHours * 60 * 60 * 1000;
};

export const clearAllCache = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const liturgicalKeys = keys.filter(
      (k) => k.startsWith('@proper_') || k === LIST_KEY || k === CACHE_META_KEY
    );
    await AsyncStorage.multiRemove(liturgicalKeys);
  } catch (e) {
    console.warn('Failed to clear cache:', e);
  }
};
