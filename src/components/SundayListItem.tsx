import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { PropersListItem } from '../data/types';
import { useTheme } from '../theme/ThemeContext';
import { formatShortDate, isUpcoming, toISODate, getCurrentOrNextSunday } from '../utils/dateHelpers';

interface SundayListItemProps {
  item: PropersListItem;
  onPress: () => void;
}

export const SundayListItem = ({ item, onPress }: SundayListItemProps) => {
  const { colors, typography } = useTheme();
  const currentSunday = toISODate(getCurrentOrNextSunday());
  const isCurrent = item.date === currentSunday;
  const upcoming = isUpcoming(item.date);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: isCurrent ? colors.cardBackground : 'transparent', borderColor: colors.border },
        isCurrent && { borderColor: colors.primary },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.dateRow}>
          <Text style={[typography.caption, styles.dateText, { color: upcoming ? colors.primary : colors.textMuted }]}>
            {formatShortDate(item.date)}
          </Text>
          {isCurrent && (
            <View style={[styles.currentBadge, { backgroundColor: colors.primary }]}>
              <Text style={[typography.caption, styles.currentText]}>This Sunday</Text>
            </View>
          )}
        </View>
        <Text style={[typography.subtitle, styles.title, { color: colors.text }]} numberOfLines={2}>
          {item.liturgicalTitle}
        </Text>
        {item.tone && (
          <Text style={[typography.caption, { color: colors.textMuted }]}>Tone {item.tone}</Text>
        )}
      </View>
      <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderWidth: 0,
    borderRadius: 0,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    lineHeight: 22,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  currentText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 22,
    paddingLeft: 8,
  },
});
