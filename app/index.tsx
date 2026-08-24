import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

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
      }
    }
    checkOnboarding();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (hasOnboarded) {
    return <Redirect href="/(tabs)/jobs" />;
  }

  return <Redirect href="/onboarding" />;
}
