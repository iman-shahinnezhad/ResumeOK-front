import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as SplashScreen from 'expo-splash-screen';

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState(false);

  useEffect(() => {
    async function checkOnboarding() {
      try {
        const completedPath = `${FileSystem.documentDirectory}onboarding_completed.txt`;
        const seenPath = `${FileSystem.documentDirectory}has_seen_onboarding.txt`;

        const [completedInfo, seenInfo] = await Promise.all([
          FileSystem.getInfoAsync(completedPath).catch(() => ({ exists: false })),
          FileSystem.getInfoAsync(seenPath).catch(() => ({ exists: false })),
        ]);

        setHasOnboarded(completedInfo.exists || seenInfo.exists);
      } catch (e) {
        setHasOnboarded(false);
      } finally {
        setLoading(false);
        // Hide splash screen now that onboarding status is loaded and redirect is ready
        await SplashScreen.hideAsync().catch(() => {});
      }
    }
    checkOnboarding();
  }, []);

  if (loading) {
    return null;
  }

  if (hasOnboarded) {
    return <Redirect href="/(tabs)/jobs" />;
  }

  return <Redirect href="/onboarding" />;
}
