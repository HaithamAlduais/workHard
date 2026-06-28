import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../lib/theme';
import { I18nProvider } from '../lib/i18n';
import { AuthProvider } from '../lib/auth';
import { useOfflineSync } from '../lib/sync';

function SyncManager() {
  useOfflineSync();
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <SyncManager />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="workout/[id]" options={{ gestureEnabled: false }} />
              <Stack.Screen name="skill-tree" />
              <Stack.Screen name="journey" />
              <Stack.Screen name="analytics" />
              <Stack.Screen name="coach" />
              <Stack.Screen name="weekly-review" />
              <Stack.Screen name="projection-planner" />
              <Stack.Screen name="settings" />
            </Stack>
            <StatusBar style="auto" />
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
