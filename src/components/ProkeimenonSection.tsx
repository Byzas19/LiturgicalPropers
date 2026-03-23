import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ProkeimenonEntry } from '../data/types';
import { useTheme } from '../theme/ThemeContext';
import { SectionDivider } from './SectionDivider';

interface ProkeimenonSectionProps {
  prokeimenon: ProkeimenonEntry;
}

export const ProkeimenonSection = ({ prokeimenon }: ProkeimenonSectionProps) => {
  const { colors, typography } = useTheme();

  return (
    <View>
      <SectionDivider label="Prokimen" />
      {prokeimenon.tone && (
        <Text style={[typography.subLabel, styles.toneLabel, { color: colors.textMuted }]}>
          Tone {prokeimenon.tone}
        </Text>
      )}
      <Text style={[typography.body, { color: colors.text }]}>{prokeimenon.text}</Text>
      {prokeimenon.verse && (
        <Text style={[typography.body, styles.verse, { color: colors.textSecondary }]}>
          {prokeimenon.verse}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  toneLabel: {
    marginBottom: 8,
  },
  verse: {
    marginTop: 8,
    fontStyle: 'italic',
  },
});
