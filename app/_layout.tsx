import * as FileSystem from 'expo-file-system/legacy';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Appearance } from 'react-native';
import { ThemeProvider, DefaultTheme } from '@react-navigation/native';
import ErrorBoundary from '../components/ErrorBoundary';
import Splash from '../components/Splash';
import { AuthProvider } from '../context/AuthContext';

// Force the app's JS layer to always run in light mode
Appearance.setColorScheme('light');

// Keep the native splash screen visible until we explicitly hide it in RootLayout
SplashScreen.preventAutoHideAsync().catch(() => { });

export default function RootLayout() {
  const router = useRouter();
  const [appReady, setAppReady] = useState(false);
  const [showReferral, setShowReferral] = useState(false);

  useEffect(() => {
    // Hide the native splash screen as soon as the JS bundle mounts
    // and is ready to show the custom animated Splash component
    SplashScreen.hideAsync().catch(() => { });
  }, []);

  useEffect(() => {
    const checkReferral = async () => {
      try {
        const info = await FileSystem.getInfoAsync(FileSystem.documentDirectory + 'has_seen_referral.txt');
        if (!info.exists) {
          setShowReferral(true);
        }
      } catch (e) {
        setShowReferral(true); // Fallback to showing if we can't check
      }
    };
    checkReferral();
  }, []);

  useEffect(() => {
    if (appReady && showReferral) {
      router.replace('/referral-onboarding');
    }
  }, [appReady, showReferral]);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="dark" />

          <ThemeProvider value={DefaultTheme}>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'default',
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="audit" />
              <Stack.Screen name="pricing" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="account" />
              <Stack.Screen name="report-bug" />
              <Stack.Screen name="referral-onboarding" />
            </Stack>
          </ThemeProvider>

          {!appReady && <Splash onContinue={() => setAppReady(true)} />}
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
