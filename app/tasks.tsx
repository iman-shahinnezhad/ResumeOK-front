import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Linking,
  Share,
  Platform,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system/legacy';

interface TaskItem {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  reward: number;
  url?: string;
  actionType: 'url' | 'share' | 'profile';
  claimed?: boolean;
}

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, guestCredit, refundCredits } = useAuth();

  const [claimedTaskIds, setClaimedTaskIds] = useState<string[]>([]);
  const [activeTaskModal, setActiveTaskModal] = useState<TaskItem | null>(null);
  const [completionRate, setCompletionRate] = useState<number>(0);

  const tasks: TaskItem[] = [
    {
      id: 'youtube_sub',
      tag: '▶️ Youtube Sub',
      title: 'Subscribe Pixflow on YouTube',
      subtitle: 'Subscribe to @Pixflow channel on YouTube',
      reward: 20,
      url: 'https://www.youtube.com/@Pixflow',
      actionType: 'url',
    },
    {
      id: 'insta_follow',
      tag: '📷 Love insta',
      title: 'Follow Pixflow on Instagram',
      subtitle: 'Follow @pixflow_net on Instagram',
      reward: 10,
      url: 'https://www.instagram.com/pixflow_net',
      actionType: 'url',
    },
    {
      id: 'app_review',
      tag: '⭐️ Rate App',
      title: 'Rate ResumeOK 5-Stars',
      subtitle: 'Leave a 5-star review on the App Store',
      reward: 15,
      url: 'https://apps.apple.com',
      actionType: 'url',
    },
    {
      id: 'share_referral',
      tag: '🎁 Referral',
      title: 'Invite Friends to ResumeOK',
      subtitle: 'Share ResumeOK with developer friends',
      reward: 25,
      actionType: 'share',
    },
    {
      id: 'complete_profile',
      tag: '👤 Profile Goal',
      title: 'Complete 100% Profile',
      subtitle: 'Fill all details in Personal & Professional info',
      reward: 30,
      actionType: 'profile',
    },
  ];

  useFocusEffect(
    useCallback(() => {
      loadClaimedTasks();
      calculateProfileCompletion();
    }, [])
  );

  const loadClaimedTasks = async () => {
    try {
      const path = `${FileSystem.documentDirectory}claimed_tasks.json`;
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        const text = await FileSystem.readAsStringAsync(path);
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          setClaimedTaskIds(data);
        }
      }
    } catch (e) {
      console.log('Error reading claimed tasks:', e);
    }
  };

  const calculateProfileCompletion = async () => {
    try {
      const profilePath = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
      const profileInfo = await FileSystem.getInfoAsync(profilePath);
      let loadedProfile: any = null;
      if (profileInfo.exists) {
        const content = await FileSystem.readAsStringAsync(profilePath);
        loadedProfile = JSON.parse(content);
      }

      const resumesPath = `${FileSystem.documentDirectory}resumes.json`;
      const resumesInfo = await FileSystem.getInfoAsync(resumesPath);
      let count = 0;
      if (resumesInfo.exists) {
        const content = await FileSystem.readAsStringAsync(resumesPath);
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) count = parsed.length;
      } else if (loadedProfile?.resumeFile) {
        count = 1;
      }

      // Pillar A: Personal Info (11 fields)
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
          } else if (field === 'phone') {
            if (loadedProfile.phone || loadedProfile.phoneNumber || loadedProfile.mobile) personalFilled++;
          } else if (loadedProfile[field] && String(loadedProfile[field]).trim().length > 0) {
            personalFilled++;
          }
        });
      }

      // Pillar B: Professional Detail (12 items target)
      const summaryRemaining = Math.max(0, 2 - (loadedProfile?.summaries?.length || (loadedProfile?.jobTitle ? 1 : 0)));
      const expRemaining = Math.max(0, 2 - (loadedProfile?.experiences?.length || 0));
      const projectRemaining = Math.max(0, 3 - (loadedProfile?.projects?.length || 0));
      const eduRemaining = Math.max(0, 1 - (loadedProfile?.educations?.length || 0));
      const techCount = loadedProfile?.skills?.length || 0;
      const softCount = loadedProfile?.softSkills?.length || 0;
      const skillRemaining = Math.max(0, 3 - (techCount + softCount));
      const langRemaining = Math.max(0, 1 - (loadedProfile?.languages?.length || 0));

      const profFilled = (2 - summaryRemaining) + (2 - expRemaining) + (3 - projectRemaining) + (1 - eduRemaining) + (3 - skillRemaining) + (1 - langRemaining);

      // Pillar C: Resumes (1 target)
      const resumeFilled = count > 0 ? 1 : 0;

      const totalTarget = 24;
      const totalFilled = personalFilled + profFilled + resumeFilled;
      const rate = Math.min(100, Math.max(0, Math.round((totalFilled / totalTarget) * 100)));
      setCompletionRate(rate);
      return rate;
    } catch (e) {
      console.log('Error calculating completion rate:', e);
      return 0;
    }
  };

  const saveClaimedTasks = async (list: string[]) => {
    try {
      const path = `${FileSystem.documentDirectory}claimed_tasks.json`;
      await FileSystem.writeAsStringAsync(path, JSON.stringify(list));
      setClaimedTaskIds(list);
    } catch (e) {
      console.log('Error saving claimed tasks:', e);
    }
  };

  const handleTaskPress = async (task: TaskItem) => {
    const isClaimed = claimedTaskIds.includes(task.id);
    if (isClaimed) {
      Alert.alert('Task Completed', 'You have already claimed credits for this task! 🎉');
      return;
    }

    if (task.actionType === 'url' && task.url) {
      // 1. Open social/review link
      await Linking.openURL(task.url);
      // 2. Open confirmation modal (credits NOT added until user clicks Claim!)
      setActiveTaskModal(task);
    } else if (task.actionType === 'share') {
      try {
        await Share.share({
          message: 'Build an ATS-friendly resume in seconds with ResumeOK! Download here: https://resumeok.app',
        });
        // Open confirmation modal
        setActiveTaskModal(task);
      } catch (e) {
        console.log('Share error:', e);
      }
    } else if (task.actionType === 'profile') {
      const rate = await calculateProfileCompletion();
      if (rate >= 100) {
        // Profile is 100%! Open claim modal to collect +30 credits
        setActiveTaskModal(task);
      } else {
        // Profile is under 100%, redirect to My Profile (/account)
        Alert.alert(
          'Profile Incomplete',
          `Your profile completion is at ${rate}%. Complete all details in your profile to unlock +30 Credits!`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Go to Profile',
              onPress: () => router.push('/account'),
            },
          ]
        );
      }
    }
  };

  const handleConfirmClaim = async () => {
    if (!activeTaskModal) return;

    const task = activeTaskModal;
    await refundCredits(task.reward);

    const updated = [...claimedTaskIds, task.id];
    await saveClaimedTasks(updated);

    Alert.alert(
      '🎉 Reward Claimed!',
      `Congratulations! You earned +${task.reward} Credits.`
    );

    setActiveTaskModal(null);
  };

  const totalCredits = user?.credit ?? guestCredit ?? 0;

  return (
    <View style={styles.container}>
      {/* SOFT GRADIENT TOP HEADER */}
      <LinearGradient
        colors={['#C3D3FE', '#DCE7FE', '#F5F5F7']}
        style={[styles.headerGradient, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.8}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={22} color="#000000" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Task & Rewards</Text>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.creditsBadge}
              activeOpacity={0.8}
              onPress={() => router.push('/pricing' as any)}
            >
              <Text style={styles.creditsText}>{totalCredits}</Text>
              <Image
                source={require('../assets/images/header-icon.png')}
                style={{ width: 14, height: 14, marginLeft: 4, resizeMode: 'contain' }}
              />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* TASK LIST SCROLLVIEW */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {tasks.map((task) => {
          const isClaimed = claimedTaskIds.includes(task.id);
          return (
            <TouchableOpacity
              key={task.id}
              style={[styles.taskCard, isClaimed && styles.taskCardClaimed]}
              activeOpacity={0.8}
              onPress={() => handleTaskPress(task)}
            >
              {/* Top Tag Label (Pink/Red text matching screenshot) */}
              <Text style={styles.taskTagText}>{task.tag}</Text>

              {/* Title & Subtitle */}
              <View style={styles.cardMainRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.taskTitleText}>{task.title}</Text>
                  <Text style={styles.taskSubtitleText}>{task.subtitle}</Text>
                </View>

                {isClaimed ? (
                  <View style={styles.claimedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" style={{ marginRight: 3 }} />
                    <Text style={styles.claimedBadgeText}>Done</Text>
                  </View>
                ) : (
                  <View style={styles.rewardPill}>
                    <Text style={styles.rewardPillText}>+{task.reward} ✦</Text>
                  </View>
                )}

                <Ionicons name="chevron-forward" size={18} color="#8E8E93" style={{ marginLeft: 6 }} />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* CLAIM CONFIRMATION MODAL */}
      <Modal
        visible={!!activeTaskModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActiveTaskModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.flameIconCircle}>
              <Ionicons name="flame" size={32} color="#DC2626" />
            </View>

            <Text style={styles.modalTitleText}>Claim Reward</Text>
            <Text style={styles.modalSubtitleText}>
              Did you complete the task &quot;{activeTaskModal?.title}&quot;?
            </Text>

            <View style={styles.modalRewardBadge}>
              <Ionicons name="sparkles" size={16} color="#000000" />
              <Text style={styles.modalRewardBadgeText}>+{activeTaskModal?.reward} Free Credits</Text>
            </View>

            <TouchableOpacity
              style={styles.claimConfirmBtn}
              activeOpacity={0.8}
              onPress={handleConfirmClaim}
            >
              <Text style={styles.claimConfirmBtnText}>Claim +{activeTaskModal?.reward} Credits</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.claimCancelBtn}
              activeOpacity={0.8}
              onPress={() => setActiveTaskModal(null)}
            >
              <Text style={styles.claimCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000000',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  creditsBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
    height: 40,
  },
  creditsText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '700',
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },

  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 14,
  },

  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  taskCardClaimed: {
    backgroundColor: '#FAFAFA',
    opacity: 0.85,
  },
  taskTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 6,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  taskSubtitleText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  rewardPill: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  rewardPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  claimedBadge: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  claimedBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  flameIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 6,
  },
  modalSubtitleText: {
    fontSize: 14,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  modalRewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FDE047',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 20,
  },
  modalRewardBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },
  claimConfirmBtn: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  claimConfirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  claimCancelBtn: {
    paddingVertical: 8,
  },
  claimCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
});
