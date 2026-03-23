import { useState, useCallback, useEffect } from 'react';
import { LiturgicalProper, PropersListItem } from '../data/types';
import { fetchProperByDate, fetchPropersList } from '../data/api';

interface UseProperResult {
  proper: LiturgicalProper | null;
  isLoading: boolean;
  error: string | null;
  isCached: boolean;
  refresh: () => Promise<void>;
}

export const useProper = (date: string): UseProperResult => {
  const [proper, setProper] = useState<LiturgicalProper | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchProperByDate(date);
      setProper(result);
      setIsCached(true);
    } catch (e) {
      setError('Unable to load propers. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  return { proper, isLoading, error, isCached, refresh: load };
};

interface UsePopersListResult {
  list: PropersListItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const usePropersList = (): UsePopersListResult => {
  const [list, setList] = useState<PropersListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchPropersList();
      setList(result);
    } catch (e) {
      setError('Unable to load the calendar.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { list, isLoading, error, refresh: load };
};
