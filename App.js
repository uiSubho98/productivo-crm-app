import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation';
import useThemeStore from './src/store/themeStore';
import useAuthStore from './src/store/authStore';
import { setupNotificationHandler, runNotificationCheck } from './src/services/notificationService';

export default function App() {
  const { isDark } = useThemeStore();
  const { user } = useAuthStore();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    setupNotificationHandler();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Run on login / user change
    runNotificationCheck(user);

    // Re-run whenever app comes back to foreground
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        runNotificationCheck(user);
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [user]);

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
