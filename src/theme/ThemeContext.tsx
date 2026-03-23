import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightColors, DarkColors, ColorScheme } from './colors';
import { getTypography, FontSizeScale } from './typography';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  colors: ColorScheme;
  typography: ReturnType<typeof getTypography>;
  themeMode: ThemeMode;
  fontSizeScale: FontSizeScale;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setFontSizeScale: (scale: FontSizeScale) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_KEY = '@liturgical_theme';
const FONT_SIZE_KEY = '@liturgical_font_size';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [fontSizeScale, setFontSizeScaleState] = useState<FontSizeScale>('medium');

  useEffect(() => {
    (async () => {
      try {
        const [savedTheme, savedFont] = await Promise.all([
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(FONT_SIZE_KEY),
        ]);
        if (savedTheme) setThemeModeState(savedTheme as ThemeMode);
        if (savedFont) setFontSizeScaleState(savedFont as FontSizeScale);
      } catch {}
    })();
  }, []);

  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');

  const colors = isDark ? DarkColors : LightColors;
  const typography = getTypography(fontSizeScale);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem(THEME_KEY, mode);
  };

  const setFontSizeScale = async (scale: FontSizeScale) => {
    setFontSizeScaleState(scale);
    await AsyncStorage.setItem(FONT_SIZE_KEY, scale);
  };

  return (
    <ThemeContext.Provider
      value={{ colors, typography, themeMode, fontSizeScale, isDark, setThemeMode, setFontSizeScale }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
