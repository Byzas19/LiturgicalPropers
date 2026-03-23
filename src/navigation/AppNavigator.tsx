import React from 'react';
import { Text, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TodayScreen } from '../screens/TodayScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ProperDetailScreen } from '../screens/ProperDetailScreen';
import { useTheme } from '../theme/ThemeContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const CalendarStack = () => {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontFamily: 'NotoSerif_700Bold', color: colors.text },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="CalendarList" component={CalendarScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="ProperDetail"
        component={ProperDetailScreen}
        options={{ title: 'Propers', headerBackTitle: 'Calendar' }}
      />
    </Stack.Navigator>
  );
};

const TabIcon = ({ icon, focused, color }: { icon: string; focused: boolean; color: string }) => (
  <Text style={{ fontSize: focused ? 24 : 22, color }}>{icon}</Text>
);

export const AppNavigator = () => {
  const { colors, isDark } = useTheme();

  return (
    <NavigationContainer
      theme={{
        dark: isDark,
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: colors.accent,
        },
        fonts: {
          regular: { fontFamily: 'NotoSans_400Regular', fontWeight: '400' },
          medium: { fontFamily: 'NotoSans_400Regular', fontWeight: '500' },
          bold: { fontFamily: 'NotoSans_700Bold', fontWeight: '700' },
          heavy: { fontFamily: 'NotoSans_700Bold', fontWeight: '900' },
        },
      }}
    >
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: Platform.OS === 'ios' ? 0 : 4,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: {
            fontFamily: 'NotoSans_400Regular',
            fontSize: 11,
          },
        }}
      >
        <Tab.Screen
          name="Today"
          component={TodayScreen}
          options={{
            tabBarLabel: 'Today',
            tabBarIcon: ({ focused, color }) => (
              <TabIcon icon="☦" focused={focused} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Calendar"
          component={CalendarStack}
          options={{
            tabBarLabel: 'Calendar',
            tabBarIcon: ({ focused, color }) => (
              <TabIcon icon="📅" focused={focused} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: 'Settings',
            tabBarIcon: ({ focused, color }) => (
              <TabIcon icon="⚙️" focused={focused} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};
