import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { HabitProvider } from './src/store/HabitStore';
import {
  requestPermissions,
  scheduleDailyReminder,
  setupAndroidChannel,
} from './src/utils/notifications';

import CheckInScreen from './src/screens/CheckInScreen';
import StatsScreen from './src/screens/StatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }) {
  const icons = { CheckIn: '✅', Stats: '📊', Settings: '⚙️' };
  return (
    <Text style={{ fontSize: focused ? 22 : 18, opacity: focused ? 1 : 0.5 }}>
      {icons[label]}
    </Text>
  );
}

export default function App() {
  useEffect(() => {
    (async () => {
      await setupAndroidChannel();
      const granted = await requestPermissions();
      if (granted) await scheduleDailyReminder();
    })();
  }, []);

  return (
    <HabitProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarIcon: ({ focused }) => (
              <TabIcon label={route.name} focused={focused} />
            ),
            tabBarActiveTintColor: '#4D96FF',
            tabBarInactiveTintColor: '#A0AEC0',
            tabBarStyle: {
              backgroundColor: '#FFFFFF',
              borderTopColor: '#EDF2F7',
              borderTopWidth: 1,
              paddingBottom: 4,
              height: 60,
            },
            tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          })}
        >
          <Tab.Screen name="CheckIn" component={CheckInScreen} options={{ tabBarLabel: 'Today' }} />
          <Tab.Screen name="Stats" component={StatsScreen} options={{ tabBarLabel: 'Stats' }} />
          <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: 'Settings' }} />
        </Tab.Navigator>
      </NavigationContainer>
    </HabitProvider>
  );
}
