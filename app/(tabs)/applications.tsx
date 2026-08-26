import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
  Animated,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SymbolView } from 'expo-symbols';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth, API_URL } from '../../context/AuthContext';

export default function ApplicationsTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, guestCredit } = useAuth();
  const safeTop = Math.max(insets.top + 12, 54);

  const [activeSegment, setActiveSegment] = useState<'applied' | 'skipped'>('applied');
  const [appliedJobs, setAppliedJobs] = useState<any[]>([]);
  const [skippedJobs, setSkippedJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sliding tab switch animation
  const slideAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: activeSegment === 'applied' ? 0 : 106,
      tension: 40,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [activeSegment]);

  useFocusEffect(
    useCallback(() => {
      loadApplicationsData();
    }, [])
  );

  const loadApplicationsData = async () => {
    setIsLoading(true);
    try {
      // 1. Load Applied Jobs locally
      const appliedPath = `${FileSystem.documentDirectory}user_applied_jobs.json`;
      const appliedInfo = await FileSystem.getInfoAsync(appliedPath);
      if (appliedInfo.exists) {
        const text = await FileSystem.readAsStringAsync(appliedPath);
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) setAppliedJobs(parsed);
        } catch (e) { }
      } else {
        setAppliedJobs([]);
      }

      // 2. Load Skipped Jobs locally
      const skippedPath = `${FileSystem.documentDirectory}user_skipped_jobs.json`;
      const skippedInfo = await FileSystem.getInfoAsync(skippedPath);
      if (skippedInfo.exists) {
        const text = await FileSystem.readAsStringAsync(skippedPath);
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) setSkippedJobs(parsed);
        } catch (e) { }
      } else {
        // Fallback to user_rejected_jobs.json if skipped file doesn't exist yet
        const rejPath = `${FileSystem.documentDirectory}user_rejected_jobs.json`;
        const rejInfo = await FileSystem.getInfoAsync(rejPath);
        if (rejInfo.exists) {
          const text = await FileSystem.readAsStringAsync(rejPath);
          try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) setSkippedJobs(parsed);
          } catch (e) { }
        } else {
          setSkippedJobs([]);
        }
      }

      // 3. Sync online from Backend Server (Real-time web & mobile sync)
      const userId = user?.id || 'guest';
      const onlineRes = await fetch(`${API_URL}/api/user-jobs/${userId}`);
      if (onlineRes.ok) {
        const onlineData = await onlineRes.json();
        if (onlineData.appliedJobs && Array.isArray(onlineData.appliedJobs)) {
          setAppliedJobs(onlineData.appliedJobs);
          await FileSystem.writeAsStringAsync(appliedPath, JSON.stringify(onlineData.appliedJobs));
        }
        const serverSkipped = onlineData.skippedJobs || onlineData.rejectedJobs;
        if (serverSkipped && Array.isArray(serverSkipped)) {
          setSkippedJobs(serverSkipped);
          await FileSystem.writeAsStringAsync(skippedPath, JSON.stringify(serverSkipped));
        }
      }
    } catch (e) {
      console.log('Online applications fetch/sync error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteJob = async (id: string, type: 'applied' | 'skipped') => {
    Alert.alert(
      'Delete Application',
      'Are you sure you want to remove this job from your list?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              const fileName = type === 'applied' ? 'user_applied_jobs.json' : 'user_skipped_jobs.json';
              const filePath = `${FileSystem.documentDirectory}${fileName}`;

              if (type === 'applied') {
                const filtered = appliedJobs.filter(j => j.id !== id);
                setAppliedJobs(filtered);
                await FileSystem.writeAsStringAsync(filePath, JSON.stringify(filtered));
              } else {
                const filtered = skippedJobs.filter(j => j.id !== id);
                setSkippedJobs(filtered);
                await FileSystem.writeAsStringAsync(filePath, JSON.stringify(filtered));
              }
            } catch (e) {
              console.log('Error deleting job:', e);
            }
          }
        }
      ]
    );
  };

  const currentList = activeSegment === 'applied' ? appliedJobs : skippedJobs;
  const totalCredits = user?.credit ?? guestCredit ?? 0;

  const renderJobCard = ({ item }: { item: any }) => (
    <View style={styles.jobCard}>
      <View style={styles.jobCardHeader}>
        <View style={styles.violetCompanyLogoBox}>
          <Ionicons name="briefcase-outline" size={22} color="#FFFFFF" />
        </View>
        <View style={styles.jobCardTitleCol}>
          <Text style={styles.jobCardCompany}>{item.companyName || 'Company'}</Text>
          <Text style={styles.jobCardTitle} numberOfLines={1}>
            {item.title || 'Job Title'}
          </Text>
          <Text style={styles.jobCardMeta}>
            {item.location || 'Remote'} • {item.date || 'Recent'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.deleteCircleBtn}
          activeOpacity={0.7}
          onPress={() => handleDeleteJob(item.id, activeSegment)}
        >
          {Platform.OS === 'ios' ? (
            <SymbolView name="trash" size={16} tintColor="#EF4444" resizeMode="scaleAspectFit" />
          ) : (
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.jobCardFooter}>
        <View style={[
          styles.statusBadge,
          activeSegment === 'applied' ? styles.statusBadgeApplied : styles.statusBadgeRejected
        ]}>
          <Text style={[
            styles.statusBadgeText,
            activeSegment === 'applied' ? styles.statusBadgeTextApplied : styles.statusBadgeTextRejected
          ]}>
            {activeSegment === 'applied' ? '✓ Applied' : '⏭ Skipped'}
          </Text>
        </View>

        {item.url ? (
          <TouchableOpacity
            style={styles.openUrlBtn}
            activeOpacity={0.75}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({
                pathname: '/apply-job',
                params: {
                  url: item.url,
                  title: item.title,
                  company: item.companyName
                }
              });
            }}
          >
            <Text style={styles.openUrlBtnText}>View Site</Text>
            <Ionicons name="arrow-forward" size={14} color="#0F172A" />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <BlurView intensity={90} tint="light" style={[styles.header, { paddingTop: insets.top + 12 }]}>
        {/* Top Row: Title & Credits */}
        <View style={styles.headerTopRow}>
          <Text style={styles.headerTitleText}>Applications</Text>
          
          <TouchableOpacity
            style={styles.creditsBadgeHeader}
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/pricing' as any);
            }}
          >
            <Text style={styles.creditsText}>{totalCredits}</Text>
            <Image
              source={require('../../assets/images/header-icon.png')}
              style={{ width: 14, height: 14, marginLeft: 4, resizeMode: 'contain' }}
            />
          </TouchableOpacity>
        </View>

        {/* Bottom Row: Segmented Control */}
        <View style={styles.segmentedWrapper}>
          <View style={styles.segmentedContainer}>
            <Animated.View
              style={[
                styles.animatedBackgroundPill,
                {
                  transform: [{ translateX: slideAnim }],
                },
              ]}
            />

            <TouchableOpacity
              style={styles.segmentedTab}
              activeOpacity={0.75}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveSegment('applied');
              }}
            >
              <Text style={[styles.segmentedText, activeSegment === 'applied' && styles.segmentedTextActive]}>
                Applied
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.segmentedTab}
              activeOpacity={0.75}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveSegment('skipped');
              }}
            >
              <Text style={[styles.segmentedText, activeSegment === 'skipped' && styles.segmentedTextActive]}>
                Skip
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>

      {/* LIST OF JOBS */}
      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#0F172A" />
        </View>
      ) : (
        <FlatList
          data={currentList}
          keyExtractor={(item, index) => (item && item.id) ? String(item.id) : `app-job-${index}`}
          renderItem={renderJobCard}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, paddingTop: insets.top + 130 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Image
                source={require('../../assets/images/application.png')}
                style={styles.emptyStateImage}
              />
              <Text style={styles.emptyTitle}>It is empty here!</Text>
              <Text style={styles.emptySubtitle}>No job application yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.4)',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  headerTitleText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  creditsBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
    height: 40,
  },
  segmentedWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditsBadgeAbsolute: {
    position: 'absolute',
    right: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  creditsText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '700',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 4,
    width: 220,
    alignSelf: 'center',
    marginTop: 8,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  segmentedTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  animatedBackgroundPill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    width: 106,
    backgroundColor: '#E4E4E7',
    borderRadius: 20,
    zIndex: 1,
  },
  segmentedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#71717A',
  },
  segmentedTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  jobCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  violetCompanyLogoBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#6D28D9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobCardTitleCol: {
    flex: 1,
    marginLeft: 12,
  },
  jobCardCompany: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  jobCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginTop: 2,
  },
  jobCardMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  deleteCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeApplied: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeRejected: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadgeTextApplied: {
    color: '#15803D',
  },
  statusBadgeTextRejected: {
    color: '#B91C1C',
  },
  openUrlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  openUrlBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  emptyStateImage: {
    width: 280,
    height: 280,
    resizeMode: 'contain',
    alignSelf: 'center',
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#737373',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
});
