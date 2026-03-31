import React from 'react';
import { View, Text } from 'react-native';
import { AntiphonEntry } from '../data/types';
import { useTheme } from '../theme/ThemeContext';
import { SectionDivider } from './SectionDivider';

interface AntiphonSectionProps {
  antiphons: AntiphonEntry[];
}

export const AntiphonSection = ({ antiphons }: AntiphonSectionProps) => {
  const { colors, typography } = useTheme();

  if (!antiphons?.length) return null;

  return (
    <View>
      {antiphons.map((antiphon, index) => (
        <View key={index}>
          <SectionDivider label={antiphon.title} />
          <Text style={[typography.body, { color: colors.text }]}>{antiphon.text}</Text>
        </View>
      ))}
    </View>
  );
};
