import * as FileSystem from 'expo-file-system/legacy';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Appearance, Alert, Linking } from 'react-native';
import * as Application from 'expo-application';
import { ThemeProvider, DefaultTheme } from '@react-navigation/native';
import ErrorBoundary from '../components/ErrorBoundary';
import { AuthProvider } from '../context/AuthContext';

// Force the app's JS layer to always run in light mode
Appearance.setColorScheme('light');

// Keep the native splash screen visible until we explicitly hide it in RootLayout
SplashScreen.preventAutoHideAsync().catch(() => { });

export default function RootLayout() {
  const [checkingStorage, setCheckingStorage] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboardingStates = async () => {
      try {
        const completedPath = `${FileSystem.documentDirectory}onboarding_completed.txt`;
        const seenPath = `${FileSystem.documentDirectory}has_seen_onboarding.txt`;

        const [completedInfo, seenInfo] = await Promise.all([
          FileSystem.getInfoAsync(completedPath).catch(() => ({ exists: false })),
          FileSystem.getInfoAsync(seenPath).catch(() => ({ exists: false })),
        ]);

        const hasCompletedOnboarding = completedInfo.exists || seenInfo.exists;
        setShowOnboarding(!hasCompletedOnboarding);
      } catch (e) {
        setShowOnboarding(true);
      } finally {
        setCheckingStorage(false);
        await SplashScreen.hideAsync().catch(() => {});
      }
    };

    checkOnboardingStates();
  }, []);

  useEffect(() => {
    const checkAppUpdate = async () => {
      try {
        let remoteVersion = '';
        let appStoreUrl = 'https://apps.apple.com/app/resumeok-ai-resume-builder/id6783382482';
        
        // 1. Fetch from backend config
        try {
          const API_URL = 'http://188.166.164.115:3030';
          const backendRes = await fetch(`${API_URL}/api/app-config`);
          if (backendRes.ok) {
            const config = await backendRes.json();
            remoteVersion = config.latestVersion;
            appStoreUrl = config.trackViewUrl || appStoreUrl;
          }
        } catch (apiErr) {
          console.log("Failed to check backend config for updates:", apiErr);
        }

        // 2. Fetch from App Store lookup
        try {
          const response = await fetch('https://itunes.apple.com/lookup?bundleId=com.pixflow.resumeok&country=us');
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            remoteVersion = data.results[0].version;
            appStoreUrl = data.results[0].trackViewUrl || appStoreUrl;
          }
        } catch (storeErr) {
          console.log("App Store lookup failed, relying on backend config:", storeErr);
        }

        if (!remoteVersion) return;

        const localVersion = Application.nativeApplicationVersion || '2.0.1';

        const isVersionNewer = (local: string, remote: string) => {
          const localParts = local.split('.').map(Number);
          const remoteParts = remote.split('.').map(Number);
          for (let i = 0; i < Math.max(localParts.length, remoteParts.length); i++) {
            const localVal = localParts[i] || 0;
            const remoteVal = remoteParts[i] || 0;
            if (remoteVal > localVal) return true;
            if (localVal > remoteVal) return false;
          }
          return false;
        };

        if (isVersionNewer(localVersion, remoteVersion)) {
          Alert.alert(
            "Update Available",
            `A new version (${remoteVersion}) of ResumeOK is available. Please update the app to the latest version for improved features and stability.`,
            [
              {
                text: "Later",
                style: "cancel"
              },
              {
                text: "Update",
                onPress: () => Linking.openURL(appStoreUrl).catch(() => {})
              }
            ],
            { cancelable: false }
          );
        }
      } catch (error) {
        console.log("Error checking for updates:", error);
      }
    };

    checkAppUpdate();
  }, []);

  if (checkingStorage) {
    return null;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="dark" />

          <ThemeProvider value={DefaultTheme}>
            <Stack
              initialRouteName={showOnboarding ? 'onboarding' : '(tabs)'}
              screenOptions={{
                headerShown: false,
                animation: 'default',
              }}
            >
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="audit" />
              <Stack.Screen
                name="pricing"
                options={{
                  presentation: 'formSheet',
                  sheetAllowedDetents: [0.95, 1.0],
                  sheetGrabberVisible: true,
                  sheetCornerRadius: 28,
                }}
              />
              <Stack.Screen name="account" />
              <Stack.Screen
                name="report-bug"
                options={{
                  presentation: 'formSheet',
                  sheetAllowedDetents: [0.8, 1.0],
                  sheetGrabberVisible: true,
                  sheetCornerRadius: 28,
                }}
              />
              <Stack.Screen
                name="apply-job"
                options={{
                  presentation: 'pageSheet',
                  sheetAllowedDetents: [0.92, 1.0],
                  sheetGrabberVisible: true,
                  sheetCornerRadius: 28,
                }}
              />
              <Stack.Screen name="referral-onboarding" />
              <Stack.Screen name="jobs" />
              <Stack.Screen name="job-details" />
              <Stack.Screen name="build-resume" />
              <Stack.Screen name="resumes" />
              <Stack.Screen name="personal-info" />
              <Stack.Screen name="work-experience" />
              <Stack.Screen name="education" />
              <Stack.Screen name="skills" />
              <Stack.Screen name="projects" />
              <Stack.Screen name="certificates" />
              <Stack.Screen name="awards" />
              <Stack.Screen name="languages" />
              <Stack.Screen name="volunteer" />
              <Stack.Screen name="recognitions" />
              <Stack.Screen name="title-summary" />
              <Stack.Screen name="links" />
              <Stack.Screen name="tasks" />
              <Stack.Screen name="settings" />
              <Stack.Screen name="professional-detail" />
            </Stack>
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
