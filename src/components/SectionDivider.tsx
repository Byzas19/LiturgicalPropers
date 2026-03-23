import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface SectionDividerProps {
  label?: string;
  showCross?: boolean;
}

export const SectionDivider = ({ label, showCross = false }: SectionDividerProps) => {
  const { colors, typography } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.line, { backgroundColor: colors.divider }]} />
      {(label || showCross) && (
        <View style={styles.centerContent}>
          {showCross && (
            <Text style={[styles.cross, { color: colors.accent }]}>☦</Text>
          )}
          {label && (
            <Text style={[typography.sectionLabel, styles.label, { color: colors.sectionLabel }]}>
              {label}
            </Text>
          )}
        </View>
      )}
      {(label || showCross) && (
        <View style={[styles.line, { backgroundColor: colors.divider }]} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    paddingHorizontal: 0,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth * 2,
  },
  centerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 6,
  },
  cross: {
    fontSize: 14,
  },
  label: {
    paddingHorizontal: 4,
  },
});
