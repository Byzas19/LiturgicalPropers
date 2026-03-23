import { useState, useEffect } from 'react';
import { getCurrentOrNextSunday, toISODate } from '../utils/dateHelpers';

export const useCurrentSunday = () => {
  const [sundayDate, setSundayDate] = useState<string>(() =>
    toISODate(getCurrentOrNextSunday())
  );

  useEffect(() => {
    setSundayDate(toISODate(getCurrentOrNextSunday()));
  }, []);

  return sundayDate;
};
