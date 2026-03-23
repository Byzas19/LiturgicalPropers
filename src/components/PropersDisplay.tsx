import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { LiturgicalProper } from '../data/types';
import { useTheme } from '../theme/ThemeContext';
import { SectionDivider } from './SectionDivider';
import { TroparSection } from './TroparSection';
import { KondakSection } from './KondakSection';
import { ProkeimenonSection } from './ProkeimenonSection';
import { EpistleSection, AlleluiaSection, GospelSection } from './ScriptureSection';
import { formatShortDate } from '../utils/dateHelpers';

interface PropersDisplayProps {
  proper: LiturgicalProper;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  isCached?: boolean;
}

export const PropersDisplay = ({
  proper,
  isRefreshing = false,
  onRefresh,
  isCached = false,
}: PropersDisplayProps) => {
  const { colors, typography } = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[typography.caption, styles.appLabel, { color: colors.textMuted }]}>
          ☦  LITURGICAL PROPERS
        </Text>
        <Text style={[typography.caption, styles.dioceseLabel, { color: colors.textMuted }]}>
          Ukrainian Catholic Diocese of Stamford
        </Text>
      </View>

      <SectionDivider showCross={false} />

      {/* Title block */}
      <View style={styles.titleBlock}>
        <Text style={[typography.title, styles.title, { color: colors.text }]}>
          {proper.liturgicalTitle}
        </Text>
        <Text style={[typography.subtitle, styles.date, { color: colors.textSecondary }]}>
          {formatShortDate(proper.date)}
        </Text>
        {proper.tone && (
          <View style={[styles.toneBadge, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[typography.caption, { color: colors.toneIndicator }]}>
              Tone {proper.tone}
            </Text>
          </View>
        )}
      </View>

      {/* Special notes */}
      {proper.specialNotes && (
        <View style={[styles.notesBox, { backgroundColor: colors.cardBackground, borderLeftColor: colors.accent }]}>
          <Text style={[typography.subLabel, styles.notesText, { color: colors.textSecondary }]}>
            {proper.specialNotes}
          </Text>
        </View>
      )}

      {/* Main sections */}
      <TroparSection troparia={proper.troparia} />
      <KondakSection kondakia={proper.kondakia} />
      {proper.prokeimenon && <ProkeimenonSection prokeimenon={proper.prokeimenon} />}
      {proper.epistle && <EpistleSection epistle={proper.epistle} />}
      {proper.alleluia && <AlleluiaSection alleluia={proper.alleluia} />}
      {proper.gospel && <GospelSection gospel={proper.gospel} />}

      {/* Communion Hymn */}
      {proper.communionHymn && (
        <View>
          <SectionDivider label="Communion Hymn" />
          <Text style={[typography.body, { color: colors.text }]}>{proper.communionHymn}</Text>
        </View>
      )}

      {/* Footer */}
      <SectionDivider showCross={true} />
      <View style={styles.footer}>
        {isCached && (
          <Text style={[typography.caption, { color: colors.cached }]}>● Saved offline</Text>
        )}
        {proper.pdfSourceUrl && (
          <TouchableOpacity onPress={() => Linking.openURL('https://www.stamforddio.org/liturgical-propers')}>
            <Text style={[typography.caption, styles.sourceLink, { color: colors.textMuted }]}>
              Source: stamforddio.org
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 48,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  appLabel: {
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dioceseLabel: {
    textAlign: 'center',
  },
  titleBlock: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  title: {
    textAlign: 'center',
  },
  date: {
    textAlign: 'center',
  },
  toneBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 4,
  },
  notesBox: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 8,
    marginVertical: 16,
    borderRadius: 2,
  },
  notesText: {
    fontStyle: 'italic',
  },
  footer: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
  },
  sourceLink: {
    textDecorationLine: 'underline',
  },
});
