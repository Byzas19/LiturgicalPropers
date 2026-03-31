export const getNextSunday = (from: Date = new Date()): Date => {
  const date = new Date(from);
  const day = date.getDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  date.setDate(date.getDate() + daysUntilSunday);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const getPreviousSunday = (from: Date = new Date()): Date => {
  const date = new Date(from);
  const day = date.getDay();
  if (day === 0) {
    date.setHours(0, 0, 0, 0);
    return date;
  }
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const getCurrentOrNextSunday = (from: Date = new Date()): Date => {
  return from.getDay() === 0 ? getPreviousSunday(from) : getNextSunday(from);
};

export const toISODate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDisplayDate = (isoDate: string): string => {
  const date = new Date(isoDate + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatShortDate = (isoDate: string): string => {
  const date = new Date(isoDate + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

export const isSunday = (date: Date): boolean => date.getDay() === 0;

export const isToday = (isoDate: string): boolean => {
  return toISODate(new Date()) === isoDate;
};

export const isUpcoming = (isoDate: string): boolean => {
  const target = new Date(isoDate + 'T12:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return target >= today;
};

export const sortByDate = <T extends { date: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => b.date.localeCompare(a.date));
