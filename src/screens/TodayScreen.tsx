import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCurrentSunday } from '../hooks/useCurrentSunday';
import { useProper } from '../hooks/usePropers';
import { PropersDisplay } from '../components/PropersDisplay';
import { useTheme } from '../theme/ThemeContext';

export const TodayScreen = () => {
  const { colors, typography } = useTheme();
  const sundayDate = useCurrentSunday();
  const { proper, isLoading, error, isCached, refresh } = useProper(sundayDate);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[typography.body, styles.loadingText, { color: colors.textSecondary }]}>
          Loading propers...
        </Text>
      </SafeAreaView>
    );
  }

  if (error || !proper) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.cross, { color: colors.accent }]}>☦</Text>
        <Text style={[typography.subtitle, styles.emptyTitle, { color: colors.text }]}>
          {error ? 'Unable to Load' : 'Not Yet Available'}
        </Text>
        <Text style={[typography.body, styles.emptyMessage, { color: colors.textSecondary }]}>
          {error
            ? 'Please check your connection and try again.'
            : 'The propers for this Sunday have not yet been posted.'}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={error ? handleRefresh : () => Linking.openURL('https://www.stamforddio.org/liturgical-propers')}
        >
          <Text style={[typography.subLabel, styles.retryText]}>
            {error ? 'Try Again' : 'Visit Website'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <PropersDisplay
        proper={proper}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        isCached={isCached}
      />
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
  cross: {
    fontSize: 48,
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 16,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyMessage: {
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
  },
});
