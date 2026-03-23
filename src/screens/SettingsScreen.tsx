import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { FontSizeScale } from '../theme/typography';
import { clearAllCache, getCacheMeta } from '../utils/cache';
import { fetchAllPropers } from '../data/api';
import { cacheProper } from '../utils/cache';

const VERSION = '1.0.0';

export const SettingsScreen = () => {
  const { colors, typography, themeMode, fontSizeScale, setThemeMode, setFontSizeScale } = useTheme();
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [cacheMeta, setCacheMeta] = React.useState<{ lastFetched: string } | null>(null);

  React.useEffect(() => {
    getCacheMeta().then(setCacheMeta);
  }, []);

  const handleDownloadAll = async () => {
    setIsDownloading(true);
    try {
      const all = await fetchAllPropers();
      await Promise.all(all.map((p) => cacheProper(p)));
      Alert.alert('Downloaded', `${all.length} Sundays saved for offline use.`);
    } catch {
      Alert.alert('Error', 'Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClearCache = () => {
    Alert.alert('Clear Cache', 'This will remove all locally saved propers. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearAllCache();
          setCacheMeta(null);
          Alert.alert('Done', 'Cache cleared.');
        },
      },
    ]);
  };

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <View style={[styles.row, { borderBottomColor: colors.divider }]}>
      <Text style={[typography.subLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.rowRight}>{children}</View>
    </View>
  );

  const SegmentButton = ({
    label,
    active,
    onPress,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[
        styles.segmentBtn,
        { borderColor: colors.border },
        active && { backgroundColor: colors.primary, borderColor: colors.primary },
      ]}
      onPress={onPress}
    >
      <Text style={[typography.caption, { color: active ? '#FFFFFF' : colors.textSecondary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[typography.title, styles.title, { color: colors.text }]}>Settings</Text>

        {/* Appearance */}
        <Text style={[typography.sectionLabel, styles.sectionHeader, { color: colors.sectionLabel }]}>
          Appearance
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Row label="Theme">
            <View style={styles.segmentGroup}>
              {(['light', 'system', 'dark'] as const).map((mode) => (
                <SegmentButton
                  key={mode}
                  label={mode.charAt(0).toUpperCase() + mode.slice(1)}
                  active={themeMode === mode}
                  onPress={() => setThemeMode(mode)}
                />
              ))}
            </View>
          </Row>
          <Row label="Font Size">
            <View style={styles.segmentGroup}>
              {(['small', 'medium', 'large'] as const).map((scale) => (
                <SegmentButton
                  key={scale}
                  label={scale.charAt(0).toUpperCase() + scale.slice(1)}
                  active={fontSizeScale === scale}
                  onPress={() => setFontSizeScale(scale as FontSizeScale)}
                />
              ))}
            </View>
          </Row>
        </View>

        {/* Offline */}
        <Text style={[typography.sectionLabel, styles.sectionHeader, { color: colors.sectionLabel }]}>
          Offline
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {cacheMeta && (
            <View style={[styles.cacheInfo, { borderBottomColor: colors.divider }]}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                Last synced: {new Date(cacheMeta.lastFetched).toLocaleDateString()}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.actionButton, { borderBottomColor: colors.divider }]}
            onPress={handleDownloadAll}
            disabled={isDownloading}
          >
            <Text style={[typography.body, { color: colors.primary }]}>
              {isDownloading ? 'Downloading...' : 'Download All for Offline'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleClearCache}>
            <Text style={[typography.body, { color: colors.error }]}>Clear Cached Data</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <Text style={[typography.sectionLabel, styles.sectionHeader, { color: colors.sectionLabel }]}>
          About
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.actionButton, { borderBottomColor: colors.divider }]}
            onPress={() => Linking.openURL('https://www.stamforddio.org')}
          >
            <Text style={[typography.body, { color: colors.primary }]}>Visit Eparchy Website</Text>
          </TouchableOpacity>
          <View style={styles.aboutText}>
            <Text style={[typography.caption, { color: colors.textMuted, lineHeight: 18 }]}>
              Version {VERSION}
            </Text>
            <Text style={[typography.caption, styles.disclaimer, { color: colors.textMuted, lineHeight: 18 }]}>
              Liturgical content provided by the Ukrainian Catholic Diocese of Stamford. This app is an unofficial reader and is not affiliated with or endorsed by the Eparchy.
            </Text>
            <Text style={[typography.caption, styles.disclaimer, { color: colors.textMuted }]}>
              ☦ Slava Isusu Khrystu
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  title: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 24,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowRight: {
    flexShrink: 1,
    marginLeft: 12,
  },
  segmentGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  segmentBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cacheInfo: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  aboutText: {
    padding: 16,
    gap: 8,
  },
  disclaimer: {
    marginTop: 4,
  },
});
