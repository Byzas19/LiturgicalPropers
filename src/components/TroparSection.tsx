import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TroparionEntry } from '../data/types';
import { useTheme } from '../theme/ThemeContext';
import { SectionDivider } from './SectionDivider';

interface TroparSectionProps {
  troparia: TroparionEntry[];
}

export const TroparSection = ({ troparia }: TroparSectionProps) => {
  const { colors, typography } = useTheme();

  if (!troparia.length) return null;

  return (
    <View>
      <SectionDivider label="Tropar" />
      {troparia.map((tropar, index) => (
        <View key={index} style={index > 0 ? styles.additionalEntry : undefined}>
          {index > 0 && (
            <View style={[styles.innerDivider, { backgroundColor: colors.divider }]} />
          )}
          <Text style={[typography.body, { color: colors.text }]}>
            {[tropar.label, tropar.text].filter(Boolean).join('\n')}
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
