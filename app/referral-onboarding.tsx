import { useRouter } from 'expo-router';
import React from 'react';
import ReferralOnboarding from '../components/ReferralOnboarding';

export default function OnboardingScreen() {
  const router = useRouter();

  const handleDismiss = () => {
    router.replace('/(tabs)');
  };

  return <ReferralOnboarding onDismiss={handleDismiss} />;
}
