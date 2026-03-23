import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { usePropersList } from '../hooks/usePropers';
import { SundayListItem } from '../components/SundayListItem';
import { useTheme } from '../theme/ThemeContext';
import { sortByDate } from '../utils/dateHelpers';
import { RootStackParamList } from './ProperDetailScreen';

type CalendarNavProp = NativeStackNavigationProp<RootStackParamList>;

export const CalendarScreen = () => {
  const { colors, typography } = useTheme();
  const navigation = useNavigation<CalendarNavProp>();
  const { list, isLoading, error, refresh } = usePropersList();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    const sorted = sortByDate(list);
    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.toLowerCase();
    return sorted.filter((item) => item.liturgicalTitle.toLowerCase().includes(q));
  }, [list, searchQuery]);

  const handleSelect = (date: string) => {
    navigation.navigate('ProperDetail', { date });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={styles.header}>
        <Text style={[typography.title, styles.screenTitle, { color: colors.text }]}>Calendar</Text>
        <TextInput
          style={[
            styles.searchInput,
            typography.body,
            { backgroundColor: colors.cardBackground, color: colors.text, borderColor: colors.border },
          ]}
          placeholder="Search Sundays..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {error ? (
        <View style={styles.centered}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity onPress={refresh} style={[styles.retryButton, { borderColor: colors.primary }]}>
            <Text style={[typography.subLabel, { color: colors.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.date}
          renderItem={({ item }) => (
            <SundayListItem item={item} onPress={() => handleSelect(item.date)} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[typography.body, { color: colors.textMuted }]}>No Sundays found.</Text>
            </View>
          }
          contentContainerStyle={filtered.length === 0 ? styles.emptyList : undefined}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  screenTitle: {
    marginBottom: 4,
  },
  searchInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyList: {
    flex: 1,
  },
});
