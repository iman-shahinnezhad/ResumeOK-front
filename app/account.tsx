import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as FileSystem from 'expo-file-system/legacy';
import Svg, { Circle } from 'react-native-svg';

export default function Account() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, guestCredit } = useAuth();

  const [profileData, setProfileData] = useState<any>(null);
  const [resumesCount, setResumesCount] = useState<number>(0);
  const [completionRate, setCompletionRate] = useState<number>(0);
  const [personalInfoMissing, setPersonalInfoMissing] = useState<number>(0);

  useFocusEffect(
    useCallback(() => {
      loadRealData();
    }, [])
  );

  const loadRealData = async () => {
    try {
      // 1. Read onboarding profile
      const profilePath = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
      const profileInfo = await FileSystem.getInfoAsync(profilePath);
      let loadedProfile: any = null;
      if (profileInfo.exists) {
        const content = await FileSystem.readAsStringAsync(profilePath);
        loadedProfile = JSON.parse(content);
        setProfileData(loadedProfile);
      }

      // 2. Read resumes count
      const resumesPath = `${FileSystem.documentDirectory}resumes.json`;
      const resumesInfo = await FileSystem.getInfoAsync(resumesPath);
      let count = 0;
      if (resumesInfo.exists) {
        const content = await FileSystem.readAsStringAsync(resumesPath);
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          count = parsed.length;
        }
      } else if (loadedProfile?.resumeFile) {
        count = 1;
      }
      setResumesCount(count);

      // 3. Calculate Overall Profile Completion Percentage Across 3 Pillars
      // Pillar A: Personal Info (11 required fields)
      const checkFields = [
        'firstName',
        'lastName',
        'email',
        'phone',
        'city',
        'expectedSalary',
        'dob',
        'gender',
        'ethnicity',
        'disability',
        'citizenship',
      ];
      let personalFilled = 0;
      if (loadedProfile) {
        checkFields.forEach((field) => {
          if (field === 'city') {
            if (loadedProfile.city || loadedProfile.address) personalFilled++;
          } else if (field === 'expectedSalary') {
            if (loadedProfile.expectedSalary && (loadedProfile.expectedSalary.min || loadedProfile.expectedSalary)) personalFilled++;
          } else if (loadedProfile[field] && String(loadedProfile[field]).trim().length > 0) {
            personalFilled++;
          }
        });
      }
      const missingPersonal = checkFields.length - personalFilled;
      setPersonalInfoMissing(missingPersonal);

      // Pillar B: Professional Detail (12 required items target)
      const summaryRemaining = Math.max(0, 2 - (loadedProfile?.summaries?.length || (loadedProfile?.jobTitle ? 1 : 0)));
      const expRemaining = Math.max(0, 2 - (loadedProfile?.experiences?.length || 0));
      const projectRemaining = Math.max(0, 3 - (loadedProfile?.projects?.length || 0));
      const eduRemaining = Math.max(0, 1 - (loadedProfile?.educations?.length || 0));
      const techCount = loadedProfile?.skills?.length || 0;
      const softCount = loadedProfile?.softSkills?.length || 0;
      const skillRemaining = Math.max(0, 3 - (techCount + softCount));
      const langRemaining = Math.max(0, 1 - (loadedProfile?.languages?.length || 0));

      const profFilled = (2 - summaryRemaining) + (2 - expRemaining) + (3 - projectRemaining) + (1 - eduRemaining) + (3 - skillRemaining) + (1 - langRemaining);

      // Pillar C: Resumes (1 required resume target)
      const resumeFilled = count > 0 ? 1 : 0;

      // Total Target = 11 + 12 + 1 = 24 items
      const totalTarget = 24;
      const totalFilled = personalFilled + profFilled + resumeFilled;

      const rate = Math.min(100, Math.max(0, Math.round((totalFilled / totalTarget) * 100)));
      setCompletionRate(rate);

    } catch (e) {
      console.log('Error loading account profile data:', e);
    }
  };

  const totalCredits = user?.credit ?? guestCredit ?? 0;

  // Real display name resolution
  const fullName = profileData
    ? `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim()
    : user?.name || 'Omid Moradi';

  const displayName = fullName.length > 0 ? fullName : 'Omid Moradi';

  // SVG Circular Ring Math
  const ringSize = 84;
  const strokeWidth = 4;
  const center = ringSize / 2;
  const radius = (ringSize - strokeWidth) / 2; // 40
  const circumference = 2 * Math.PI * radius; // ~251.32
  const strokeDashoffset = circumference - (circumference * completionRate) / 100;

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>My Account</Text>

        <View style={styles.headerRight}>
          {/* Credits Badge Pill */}
          <TouchableOpacity
            style={styles.creditsBadge}
            activeOpacity={0.8}
            onPress={() => router.push('/pricing' as any)}
          >
            <Text style={styles.creditsText}>{totalCredits}</Text>
            <Ionicons name="sparkles" size={16} color="#000000" />
          </TouchableOpacity>

          {/* Settings Gear Button */}
          <TouchableOpacity
            style={styles.settingsBtn}
            activeOpacity={0.8}
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="settings-outline" size={22} color="#000000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ANNOUNCEMENT BANNER (ONLY DISPLAY IF COMPLETION < 100%) */}
      {completionRate < 100 && (
        <View style={styles.bannerContainer}>
          <Text style={styles.bannerText}>
            Complete your profile to get better job matches 🤫
          </Text>
        </View>
      )}

      {/* MAIN CONTENT */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* USER PROFILE HEADER CARD */}
        <View style={styles.userProfileCard}>
          {/* Avatar with SVG Circular Progress Ring */}
          <View style={styles.avatarRingContainer}>
            <View style={styles.svgRingBox}>
              <Svg width={ringSize} height={ringSize} style={[styles.svgCanvas, { transform: [{ rotate: '90deg' }] }]}>
                {/* Track Circle */}
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke="#E5E7EB"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                {/* Progress Arc Circle */}
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={completionRate === 100 ? '#16A34A' : '#2563EB'}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </Svg>

              <Image
                source={require('../assets/images/placeholder-avatar.png')}
                style={styles.avatarImage}
              />
            </View>

            <View style={[styles.completionBadge, completionRate === 100 && styles.completionBadgeGreen]}>
              <Text style={styles.completionBadgeText}>{completionRate}%</Text>
            </View>
          </View>

          {/* Name & Stats */}
          <View style={styles.userDetailsCol}>
            <Text style={styles.userNameText} numberOfLines={1}>{displayName}</Text>
            <View style={styles.statsRow}>
              <Text style={styles.statNumber}>0 <Text style={styles.statLabel}>Applications</Text></Text>
              <Text style={styles.statNumber}>{resumesCount} <Text style={styles.statLabel}>Tailored Resume</Text></Text>
            </View>
          </View>
        </View>

        {/* PLAN & CREDIT CARD */}
        <View style={styles.planCreditCard}>
          <View style={styles.planCol}>
            <Text style={styles.planLabel}>Plan:</Text>
            <Text style={styles.planValue}>Free</Text>
          </View>

          <View style={styles.planCol}>
            <Text style={styles.planLabel}>Credit:</Text>
            <Text style={styles.planValue}>{totalCredits}</Text>
          </View>

          <TouchableOpacity
            style={styles.upgradeBtn}
            activeOpacity={0.8}
            onPress={() => router.push('/pricing' as any)}
          >
            <Text style={styles.upgradeBtnText}>Upgrade</Text>
          </TouchableOpacity>
        </View>

        {/* MENU LIST ITEMS */}
        <View style={styles.menuList}>

          {/* ITEM 1: Personal info */}
          <TouchableOpacity
            style={styles.menuCard}
            activeOpacity={0.7}
            onPress={() => router.push('/personal-info')}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#F0EEFF' }]}>
              <Ionicons name="person" size={22} color="#7C3AED" />
            </View>

            <View style={styles.menuTextCol}>
              <Text style={styles.menuTitle}>Personal info</Text>
              <Text style={styles.menuSubtitle}>Contact information & Demographic</Text>
            </View>

            {personalInfoMissing > 0 ? (
              <View style={styles.badgePillRed}>
                <Text style={styles.badgeTextWhite}>Add {personalInfoMissing}</Text>
              </View>
            ) : (
              <View style={styles.badgePillGreen}>
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              </View>
            )}

            <Ionicons name="chevron-forward" size={18} color="#999999" style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          {/* ITEM 2: Professional Detail */}
          <TouchableOpacity
            style={styles.menuCard}
            activeOpacity={0.7}
            onPress={() => router.push('/professional-detail' as any)}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="briefcase" size={22} color="#0284C7" />
            </View>

            <View style={styles.menuTextCol}>
              <Text style={styles.menuTitle}>Professional Detail</Text>
              <Text style={styles.menuSubtitle}>Experiences, Skills, Education, and ...</Text>
            </View>

            {(() => {
              const summaryRemaining = Math.max(0, 2 - (profileData?.summaries?.length || (profileData?.jobTitle ? 1 : 0)));
              const expRemaining = Math.max(0, 2 - (profileData?.experiences?.length || 0));
              const projectRemaining = Math.max(0, 3 - (profileData?.projects?.length || 0));
              const eduRemaining = Math.max(0, 1 - (profileData?.educations?.length || 0));
              const techCount = profileData?.skills?.length || 0;
              const softCount = profileData?.softSkills?.length || 0;
              const skillRemaining = Math.max(0, 3 - (techCount + softCount));
              const langRemaining = Math.max(0, 1 - (profileData?.languages?.length || 0));

              const totalRemaining = summaryRemaining + expRemaining + projectRemaining + eduRemaining + skillRemaining + langRemaining;

              if (totalRemaining > 0) {
                return (
                  <View style={styles.badgePillRed}>
                    <Text style={styles.badgeTextWhite}>Add {totalRemaining}</Text>
                  </View>
                );
              }
              return (
                <View style={styles.badgePillGreen}>
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                </View>
              );
            })()}

            <Ionicons name="chevron-forward" size={18} color="#999999" style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          {/* ITEM 3: Resume */}
          <TouchableOpacity
            style={styles.menuCard}
            activeOpacity={0.7}
            onPress={() => router.push('/resumes' as any)}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#EBF3FF' }]}>
              <Ionicons name="document-text" size={22} color="#2563EB" />
            </View>

            <View style={styles.menuTextCol}>
              <Text style={styles.menuTitle}>Resume</Text>
              <Text style={styles.menuSubtitle}>Manage & upload your resumes</Text>
            </View>

            {resumesCount === 0 ? (
              <View style={styles.badgePillRed}>
                <Text style={styles.badgeTextWhite}>Add 1</Text>
              </View>
            ) : (
              <View style={styles.badgePillGreen}>
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              </View>
            )}

            <Ionicons name="chevron-forward" size={18} color="#999999" style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          {/* ITEM 4: Task & Rewards */}
          <TouchableOpacity
            style={styles.menuCard}
            activeOpacity={0.7}
            onPress={() => router.push('/tasks' as any)}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="flame" size={22} color="#DC2626" />
            </View>

            <View style={styles.menuTextCol}>
              <Text style={styles.menuTitle}>Task & Rewards</Text>
              <Text style={styles.menuSubtitle}>Share love earn free extra credits</Text>
            </View>

            <View style={styles.taskRewardBadgePill}>
              <Text style={styles.taskRewardBadgeText}>✦ +30</Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color="#999999" style={{ marginLeft: 4 }} />
          </TouchableOpacity>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#F5F5F7',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  creditsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FDE047',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  creditsText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },

  bannerContainer: {
    backgroundColor: '#EBF3FF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },

  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
    gap: 16,
  },

  userProfileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarRingContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgRingBox: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  svgCanvas: {
    position: 'absolute',
    transform: [{ rotate: '90deg' }],
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E5E7EB',
  },
  completionBadge: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: '#2563EB',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  completionBadgeGreen: {
    backgroundColor: '#16A34A',
  },
  completionBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  userDetailsCol: {
    flex: 1,
    justifyContent: 'center',
  },
  userNameText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: '#666666',
  },

  planCreditCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  planCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planLabel: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  planValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
  upgradeBtn: {
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  upgradeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  menuList: {
    gap: 12,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  menuIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextCol: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '400',
  },

  badgePillRed: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgePillGreen: {
    backgroundColor: '#16A34A',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTextWhite: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  taskRewardBadgePill: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  taskRewardBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
