import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TroparionEntry, KondakionEntry } from '../data/types';
import { useTheme } from '../theme/ThemeContext';
import { SectionDivider } from './SectionDivider';

interface TroparionKontakionSectionProps {
  troparia: TroparionEntry[];
  kondakia: KondakionEntry[];
}

function splitLabel(label: string): { prefix: string; rest: string } {
  const colonIdx = label.indexOf(':');
  if (colonIdx < 0) return { prefix: '', rest: label };
  return {
    prefix: label.substring(0, colonIdx + 1),
    rest: label.substring(colonIdx + 1).trimStart(),
  };
}

export const TroparionKontakionSection = ({ troparia, kondakia }: TroparionKontakionSectionProps) => {
  const { colors, typography } = useTheme();

  // Only include numbered entries (e.g. "Troparion (1):") — filters out legacy antiphon-style entries
  const tkTroparia = troparia.filter((t) => /\(\d+\)/.test(t.label));
  const entries = [
    ...tkTroparia.map((e) => ({ ...e })),
    ...kondakia.map((e) => ({ ...e })),
  ];

  if (!entries.length) return null;

  return (
    <View>
      <SectionDivider label="Troparion and Kontakion" />
      {entries.map((entry, index) => {
        const { prefix, rest } = splitLabel(entry.label);
        const fullText = [rest, entry.text].filter(Boolean).join('\n');
        return (
          <View key={index} style={index > 0 ? styles.additionalEntry : undefined}>
            {index > 0 && (
              <View style={[styles.innerDivider, { backgroundColor: colors.divider }]} />
            )}
            <Text style={[typography.body, { color: colors.text }]}>
              {prefix ? (
                <Text style={{ fontWeight: '700', color: colors.accent }}>{prefix + ' '}</Text>
              ) : null}
              {fullText}
            </Text>
          </View>
        );
      })}
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
