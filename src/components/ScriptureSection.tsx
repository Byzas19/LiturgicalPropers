import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScriptureReading, AlleluiaEntry } from '../data/types';
import { useTheme } from '../theme/ThemeContext';
import { SectionDivider } from './SectionDivider';

interface EpistleSectionProps {
  epistle: ScriptureReading;
}

export const EpistleSection = ({ epistle }: EpistleSectionProps) => {
  const { colors, typography } = useTheme();

  return (
    <View>
      <SectionDivider label="Epistle" />
      <Text style={[typography.reference, styles.reference, { color: colors.primary }]}>
        {epistle.reference}
      </Text>
      <Text style={[typography.body, { color: colors.text }]}>{epistle.text}</Text>
    </View>
  );
};

interface AlleluiaSectionProps {
  alleluia: AlleluiaEntry;
}

export const AlleluiaSection = ({ alleluia }: AlleluiaSectionProps) => {
  const { colors, typography } = useTheme();

  return (
    <View>
      <SectionDivider label="Alleluia" />
      {alleluia.tone && (
        <Text style={[typography.subLabel, styles.toneLabel, { color: colors.textMuted }]}>
          Tone {alleluia.tone}
        </Text>
      )}
      {alleluia.verses.map((verse, index) => (
        <Text key={index} style={[typography.body, styles.verse, { color: colors.text }]}>
          {verse}
        </Text>
      ))}
    </View>
  );
};

interface GospelSectionProps {
  gospel: ScriptureReading;
}

export const GospelSection = ({ gospel }: GospelSectionProps) => {
  const { colors, typography } = useTheme();

  return (
    <View>
      <SectionDivider label="Gospel" />
      <Text style={[typography.reference, styles.reference, { color: colors.primary }]}>
        {gospel.reference}
      </Text>
      <Text style={[typography.body, { color: colors.text }]}>{gospel.text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  reference: {
    marginBottom: 12,
  },
  toneLabel: {
    marginBottom: 8,
  },
  verse: {
    marginBottom: 4,
  },
});
