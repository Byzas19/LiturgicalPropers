import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { KondakionEntry } from '../data/types';
import { useTheme } from '../theme/ThemeContext';
import { SectionDivider } from './SectionDivider';

interface KondakSectionProps {
  kondakia: KondakionEntry[];
}

export const KondakSection = ({ kondakia }: KondakSectionProps) => {
  const { colors, typography } = useTheme();

  if (!kondakia.length) return null;

  return (
    <View>
      <SectionDivider label="Kondak" />
      {kondakia.map((kondak, index) => (
        <View key={index} style={index > 0 ? styles.additionalEntry : undefined}>
          {index > 0 && (
            <View style={[styles.innerDivider, { backgroundColor: colors.divider }]} />
          )}
          <Text style={[typography.body, { color: colors.text }]}>
            {[kondak.label, kondak.text].filter(Boolean).join('\n')}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  additionalEntry: {
    marginTop: 16,
  },
  innerDivider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
});
