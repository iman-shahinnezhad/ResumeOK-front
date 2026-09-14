import * as FileSystem from 'expo-file-system/legacy';
import { User } from './session';

export async function syncProfileOnLogin(serverUser: User, accessToken: string, apiUrl: string) {
  try {
    const profilePath = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
    const formPath = `${FileSystem.documentDirectory}resume_builder_form_data.json`;
    const completedPath = `${FileSystem.documentDirectory}onboarding_completed.txt`;
    const seenPath = `${FileSystem.documentDirectory}has_seen_onboarding.txt`;

    let localProfile: any = {};
    const localInfo = await FileSystem.getInfoAsync(profilePath).catch(() => ({ exists: false }));
    if (localInfo.exists) {
      try {
        const text = await FileSystem.readAsStringAsync(profilePath);
        localProfile = JSON.parse(text);
      } catch (e) {}
    }

    const serverProfile = serverUser.profile || {};
    const hasLocal = Object.keys(localProfile).length > 0;
    const hasServer = Object.keys(serverProfile).length > 0;

    const mergedProfile = {
      ...localProfile,
      ...serverProfile,
      firstName: serverProfile.firstName || localProfile.firstName || '',
      lastName: serverProfile.lastName || localProfile.lastName || '',
      email: serverUser.email || serverProfile.email || localProfile.email || '',
      jobTitle: serverProfile.jobTitle || localProfile.jobTitle || serverProfile.role || localProfile.role || '',
      role: serverProfile.role || localProfile.role || serverProfile.jobTitle || localProfile.jobTitle || '',
      roles: (serverProfile.roles && serverProfile.roles.length > 0) ? serverProfile.roles : (localProfile.roles || []),
      skills: (serverProfile.skills && serverProfile.skills.length > 0) ? serverProfile.skills : (localProfile.skills || []),
      experience: serverProfile.experience || localProfile.experience || '',
      city: serverProfile.city || localProfile.city || '',
      expectedSalary: serverProfile.expectedSalary || localProfile.expectedSalary || { min: 100000, max: 180000 },
      challenge: serverProfile.challenge || localProfile.challenge || '',
      interests: (serverProfile.interests && serverProfile.interests.length > 0) ? serverProfile.interests : (localProfile.interests || []),
    };

    const hasAnyData = Boolean(
      mergedProfile.jobTitle ||
      mergedProfile.role ||
      (mergedProfile.roles && mergedProfile.roles.length > 0) ||
      (mergedProfile.skills && mergedProfile.skills.length > 0) ||
      mergedProfile.firstName
    );

    if (hasAnyData || hasLocal || hasServer) {
      await FileSystem.writeAsStringAsync(profilePath, JSON.stringify(mergedProfile, null, 2)).catch(() => {});
      await FileSystem.writeAsStringAsync(formPath, JSON.stringify(mergedProfile, null, 2)).catch(() => {});
      await FileSystem.writeAsStringAsync(completedPath, 'true').catch(() => {});
      await FileSystem.writeAsStringAsync(seenPath, 'true').catch(() => {});

      if (accessToken && apiUrl) {
        await fetch(`${apiUrl}/api/user/profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            userId: serverUser.id,
            profile: mergedProfile,
            hasCompletedOnboarding: true
          })
        }).catch((err) => console.log('Error syncing profile to server on login:', err));
      }
    }
  } catch (err) {
    console.error('Failed syncProfileOnLogin:', err);
  }
}
