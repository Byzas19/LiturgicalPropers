import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useProper } from '../hooks/usePropers';
import { PropersDisplay } from '../components/PropersDisplay';
import { useTheme } from '../theme/ThemeContext';

export type RootStackParamList = {
  ProperDetail: { date: string };
};

type ProperDetailRouteProp = RouteProp<RootStackParamList, 'ProperDetail'>;

export const ProperDetailScreen = () => {
  const { colors, typography } = useTheme();
  const route = useRoute<ProperDetailRouteProp>();
  const { date } = route.params;
  const { proper, isLoading, error, isCached, refresh } = useProper(date);
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
      </SafeAreaView>
    );
  }

  if (error || !proper) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          {error ?? 'Propers not available for this date.'}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
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
});
