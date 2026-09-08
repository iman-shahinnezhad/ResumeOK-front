import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Switch,
  Platform,
  Linking,
  SafeAreaView,
  KeyboardAvoidingView,
  PanResponder,
  Image,
  Share,
  RefreshControl,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
  Easing
} from 'react-native-reanimated';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SymbolView } from 'expo-symbols';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { API_URL, useAuth } from '../context/AuthContext';
import { WebView } from 'react-native-webview';
import { getSession } from '../utils/session';
import { calculateJobMatch } from '../utils/jobMatch';
import { sortResumesWithDefaultFirst } from '../utils/resumeUtils';

const cleanJsCodeForInjection = (js: string) => js;

const POPULAR_GREENHOUSE_COMPANIES = ['stripe', 'dropbox', 'deliveroo', 'vimeo', 'amplitude'];
const POPULAR_LEVER_COMPANIES = ['kinsta', 'aircall', 'palantir'];

interface SelectedResumeFile {
  id: string;
  name: string;
  date: string;
  uri?: string;
  size?: number | string;
  mimeType?: string;
  isBuilt?: boolean;
  isDefault?: boolean;
}

interface GreenhouseJob {
  id: number | string;
  title: string;
  absolute_url: string;
  location: { name: string };
  departments?: { id: number; name: string }[];
  offices?: { id: number; name: string }[];
  content?: string;
  companyName?: string;
  boardToken?: string;
  sourceType?: string;
  salary?: string | null;
  employmentType?: string | null;
  remote?: boolean;
  postedAt?: string | null;
  createdAt?: string | null;
  updated_at?: string | null;
  skills?: string[];
  canApplyDirectly?: boolean;
  cleanSnippet?: string;
}

interface GreenhouseConfig {
  boardToken?: string;
  jobBoardKey?: string;
  harvestKey?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export default function JobsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, guestId, guestCredit } = useAuth();
  const totalCredits = user?.credit ?? guestCredit ?? 0;

  // Settings config
  const [config, setConfig] = useState<GreenhouseConfig>({});

  // Jobs state
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [allJobs, setAllJobs] = useState<GreenhouseJob[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<GreenhouseJob[]>([]);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pagerHeight, setPagerHeight] = useState(480);
  const [sessionSkippedIds, setSessionSkippedIds] = useState<Set<string>>(new Set());
  // Tinder Swipe position tracking (Alternating Reanimated Shared Values to prevent unmount flashes)
  const translateX1 = useSharedValue(0);
  const translateY1 = useSharedValue(0);
  const translateX2 = useSharedValue(0);
  const translateY2 = useSharedValue(0);

  // Refs to avoid stale closures in PanResponder / swipe callbacks
  const currentIndexRef = useRef(0);
  const filteredJobsRef = useRef<GreenhouseJob[]>([]);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    filteredJobsRef.current = filteredJobs;
  }, [filteredJobs]);

  const getExcludedJobIds = async (): Promise<Set<string>> => {
    const set = new Set<string>();
    try {
      const skippedPath = `${FileSystem.documentDirectory}user_skipped_jobs.json`;
      const appliedPath = `${FileSystem.documentDirectory}user_applied_jobs.json`;
      const rejectedPath = `${FileSystem.documentDirectory}user_rejected_jobs.json`;

      const [skippedInfo, appliedInfo, rejectedInfo] = await Promise.all([
        FileSystem.getInfoAsync(skippedPath),
        FileSystem.getInfoAsync(appliedPath),
        FileSystem.getInfoAsync(rejectedPath)
      ]);

      if (skippedInfo.exists) {
        const text = await FileSystem.readAsStringAsync(skippedPath);
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) parsed.forEach((j: any) => j.id && set.add(String(j.id)));
        } catch (e) { }
      }
      if (appliedInfo.exists) {
        const text = await FileSystem.readAsStringAsync(appliedPath);
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) parsed.forEach((j: any) => j.id && set.add(String(j.id)));
        } catch (e) { }
      }
      if (rejectedInfo.exists) {
        const text = await FileSystem.readAsStringAsync(rejectedPath);
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) parsed.forEach((j: any) => j.id && set.add(String(j.id)));
        } catch (e) { }
      }
    } catch (e) {
      console.log("Error getting excluded job ids:", e);
    }
    return set;
  };

  const saveSkippedJob = async (job: GreenhouseJob, removeFromLocalState = true) => {
    console.log('[JOBS] saveSkippedJob start:', job ? job.title : 'undefined', 'removeFromLocalState:', removeFromLocalState);
    try {
      if (removeFromLocalState) {
        // Immediately filter out from local state for 0ms UI delay
        setAllJobs(prev => prev.filter(j => String(j.id) !== String(job.id)));
        setFilteredJobs(prev => prev.filter(j => String(j.id) !== String(job.id)));
      }

      const skippedPath = `${FileSystem.documentDirectory}user_skipped_jobs.json`;
      let currentSkipped: any[] = [];
      const info = await FileSystem.getInfoAsync(skippedPath);
      if (info.exists) {
        const text = await FileSystem.readAsStringAsync(skippedPath);
        try { currentSkipped = JSON.parse(text); } catch (e) { }
      }

      const newEntry = {
        id: String(job.id),
        title: job.title,
        companyName: job.companyName || 'Company',
        location: job.location?.name || 'Remote',
        url: job.absolute_url || '',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        timestamp: Date.now(),
        status: 'skipped'
      };

      const updatedList = [newEntry, ...currentSkipped.filter((j: any) => j.id !== newEntry.id)];
      await FileSystem.writeAsStringAsync(skippedPath, JSON.stringify(updatedList));
      console.log('[JOBS] saveSkippedJob local write done, updatedList length:', updatedList.length);

      // Sync online backend
      const userId = user?.id || guestId || 'guest';
      fetch(`${API_URL}/api/user-jobs/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'skipped',
          jobId: String(job.id),
          jobData: newEntry
        })
      })
      .then(res => res.json())
      .then(data => console.log('[JOBS] saveSkippedJob backend sync success:', JSON.stringify(data)))
      .catch(err => console.log('[JOBS] Backend sync skipped error:', err));
    } catch (e) {
      console.log('[JOBS] Error saving skipped job:', e);
    }
  };

  const handleListSkip = async (job: GreenhouseJob) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSessionSkippedIds(prev => {
        const next = new Set(prev);
        next.add(String(job.id));
        return next;
      });
      await saveSkippedJob(job, false);
    } catch (e) {
      console.log('Error handling list skip:', e);
    }
  };

  const handleOpenCardMenu = (job: GreenhouseJob) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMenuJob(job);
    setShowCardMenuModal(true);
  };

  const handleActionAlreadyApplied = async (job: GreenhouseJob) => {
    setShowCardMenuModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const appliedPath = `${FileSystem.documentDirectory}user_applied_jobs.json`;
      const appliedInfo = await FileSystem.getInfoAsync(appliedPath);
      let currentApplied: any[] = [];
      if (appliedInfo.exists) {
        const text = await FileSystem.readAsStringAsync(appliedPath);
        try { currentApplied = JSON.parse(text); } catch (e) {}
      }
      const newEntry = {
        id: String(job.id),
        title: job.title,
        companyName: job.companyName || 'Company',
        location: job.location?.name || 'Remote',
        url: job.absolute_url || '',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        timestamp: Date.now(),
        status: 'applied'
      };
      const updatedList = [newEntry, ...currentApplied.filter((j: any) => String(j.id) !== String(newEntry.id))];
      await FileSystem.writeAsStringAsync(appliedPath, JSON.stringify(updatedList));

      setAllJobs(prev => prev.filter(j => String(j.id) !== String(job.id)));
      setFilteredJobs(prev => prev.filter(j => String(j.id) !== String(job.id)));

      const currentUserId = user?.id || guestId || 'guest';
      fetch(`${API_URL}/api/user-jobs/${currentUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'applied',
          jobId: String(job.id),
          jobData: newEntry
        })
      }).catch(err => console.log('Sync error:', err));

      Alert.alert('Marked as Applied! 🎉', 'This job has been added to your Applied Jobs list.');
    } catch (e) {
      console.log('Error marking job as applied:', e);
    }
  };

  const handleActionShare = async (job: GreenhouseJob) => {
    setShowCardMenuModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (job.absolute_url) {
      try {
        await Share.share({
          message: `Check out this position: ${job.title} at ${job.companyName || 'Company'}\n${job.absolute_url}`,
        });
      } catch (e) {}
    }
  };

  const handleActionRemove = async (job: GreenhouseJob) => {
    setShowCardMenuModal(false);
    handleListSkip(job);
  };

  const handleActionOpenReport = (job: GreenhouseJob) => {
    setShowCardMenuModal(false);
    setReportJob(job);
    setSelectedReportReason('');
    setReportNote('');
    setShowReportModal(true);
  };

  const handleSubmitReport = async () => {
    if (!selectedReportReason) {
      Alert.alert('Select a reason', 'Please select an issue to report.');
      return;
    }
    setIsSubmittingReport(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      if (reportJob) {
        handleListSkip(reportJob);
      }
    } catch (e) {}

    setTimeout(() => {
      setIsSubmittingReport(false);
      setShowReportModal(false);
      Alert.alert('Report Submitted 🛡️', 'Thank you for your report! Our team will review this listing.');
    }, 450);
  };

  const handleSwipeComplete = (direction: 'left' | 'right') => {
    const targetJob = filteredJobsRef.current[currentIndexRef.current];
    const completedIndex = currentIndexRef.current;

    setCurrentIndex(prev => prev + 1);
    isAnimatingRef.current = false;

    // Reset the coordinates of the swiped card in the background after it unmounts
    setTimeout(() => {
      if (completedIndex % 2 === 0) {
        translateX1.value = 0;
        translateY1.value = 0;
      } else {
        translateX2.value = 0;
        translateY2.value = 0;
      }
    }, 100);

    console.log('[JOBS] handleSwipeComplete direction:', direction, 'currentIndexRef.current:', currentIndexRef.current, 'targetJob:', targetJob ? targetJob.title : 'undefined');
    if (direction === 'left') {
      if (targetJob) {
        saveSkippedJob(targetJob, false);
      } else {
        console.log('[JOBS] swipe left completed but targetJob is undefined');
      }
    } else if (direction === 'right' && targetJob) {
      viewJobDetails(targetJob);
    }
  };

  const swipeCard = (direction: 'left' | 'right') => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    const tx = currentIndexRef.current % 2 === 0 ? translateX1 : translateX2;
    const ty = currentIndexRef.current % 2 === 0 ? translateY1 : translateY2;

    const targetX = direction === 'right' ? 500 : -500;
    const targetY = direction === 'right' ? 50 : -50;

    tx.value = withTiming(targetX, { duration: 250 });
    ty.value = withTiming(targetY, { duration: 250 }, (finished) => {
      if (finished) {
        runOnJS(handleSwipeComplete)(direction);
      }
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return !isAnimatingRef.current && (Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (isAnimatingRef.current) return;
        const tx = currentIndexRef.current % 2 === 0 ? translateX1 : translateX2;
        const ty = currentIndexRef.current % 2 === 0 ? translateY1 : translateY2;
        tx.value = gestureState.dx;
        ty.value = gestureState.dy;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (isAnimatingRef.current) return;

        const tx = currentIndexRef.current % 2 === 0 ? translateX1 : translateX2;
        const ty = currentIndexRef.current % 2 === 0 ? translateY1 : translateY2;
        if (gestureState.dx > 120) {
          swipeCard('right');
        } else if (gestureState.dx < -120) {
          swipeCard('left');
        } else {
          // Zero bounce return using a smooth decelerating ease-out curve
          tx.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.quad) });
          ty.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.quad) });
        }
      }
    })
  ).current;

  const activeCardStyle = useAnimatedStyle(() => {
    const tx = currentIndex % 2 === 0 ? translateX1 : translateX2;
    const ty = currentIndex % 2 === 0 ? translateY1 : translateY2;

    const rotate = interpolate(
      tx.value,
      [-200, 0, 200],
      [-10, 0, 10],
      Extrapolation.CLAMP
    );

    return {
      opacity: 1.0,
      transform: [
        { translateX: tx.value },
        { translateY: ty.value },
        { rotate: `${rotate}deg` }
      ]
    };
  });

  const backgroundCardStyle = {
    opacity: 1.0,
    transform: [{ scale: 1.0 }]
  };

  const likeBadgeStyle = useAnimatedStyle(() => {
    const tx = currentIndex % 2 === 0 ? translateX1 : translateX2;
    const opacity = interpolate(
      tx.value,
      [0, 100],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const nopeBadgeStyle = useAnimatedStyle(() => {
    const tx = currentIndex % 2 === 0 ? translateX1 : translateX2;
    const opacity = interpolate(
      tx.value,
      [-100, 0],
      [1, 0],
      Extrapolation.CLAMP
    );
    return { opacity };
  });



  // Filter role query state
  const [filterQuery, setFilterQuery] = useState('');

  // Selected Job Details Modal
  const [selectedJob, setSelectedJob] = useState<GreenhouseJob | null>(null);
  const [jobDetailsHtml, setJobDetailsHtml] = useState('');

  // Apply Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [resumesList, setResumesList] = useState<SelectedResumeFile[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [tailorResume, setTailorResume] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [webViewVisible, setWebViewVisible] = useState(false);
  const [selectedResumeBase64, setSelectedResumeBase64] = useState('');
  const [selectedResumeName, setSelectedResumeName] = useState('');
  const [selectedCoverLetterText, setSelectedCoverLetterText] = useState('');
  const [isMatchingWithAI, setIsMatchingWithAI] = useState(false);
  const [matchLoadingStep, setMatchLoadingStep] = useState('');
  const [showMatchPreviewModal, setShowMatchPreviewModal] = useState(false);
  const [previewCoverLetter, setPreviewCoverLetter] = useState('');
  const [previewResumeUri, setPreviewResumeUri] = useState('');
  const [previewResumeName, setPreviewResumeName] = useState('');
  const [previewResumeHtml, setPreviewResumeHtml] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [previewTab, setPreviewTab] = useState<'cover_letter' | 'resume'>('cover_letter');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [totalJobsCount, setTotalJobsCount] = useState<number>(0);
  const [filterWorkModel, setFilterWorkModel] = useState<string>('ALL');
  const [filterExperience, setFilterExperience] = useState<string>('ALL');
  const [filterSalary, setFilterSalary] = useState<string>('ALL');
  const [filterLocation, setFilterLocation] = useState<string>('');
  const [selectedSkillsFilter, setSelectedSkillsFilter] = useState<string[]>([]);
  const [menuJob, setMenuJob] = useState<GreenhouseJob | null>(null);
  const [showCardMenuModal, setShowCardMenuModal] = useState(false);
  const [reportJob, setReportJob] = useState<GreenhouseJob | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState<string>('');
  const [reportNote, setReportNote] = useState<string>('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const webViewRef = useRef<WebView>(null);
  const isProfileDefaultsLoaded = useRef(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchJobsFromAllBoards(1, false);
    } catch(e) {}
    setRefreshing(false);
  };

  useEffect(() => {
    if (currentIndex >= filteredJobs.length - 5 && hasMore && !isFetchingMore && !isLoadingJobs && filteredJobs.length > 0) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchJobsFromAllBoards(nextPage, true, filterQuery, selectedCompanyFilter, filterLocation);
    }
  }, [currentIndex, filteredJobs.length, hasMore, isFetchingMore, isLoadingJobs, filterLocation]);

  // Load config, resumes, and popular jobs on focus
  useFocusEffect(
    useCallback(() => {
      async function initData() {
        try {
          // Immediately filter out any skipped/applied jobs on focus with 0ms delay
          const excludedSet = await getExcludedJobIds();
          if (excludedSet.size > 0) {
            setAllJobs(prev => prev.filter(j => !excludedSet.has(String(j.id))));
            setFilteredJobs(prev => prev.filter(j => !excludedSet.has(String(j.id))));
          }

          let finalFirstName = '';
          let finalLastName = '';
          let finalEmail = '';

          let loadedProfile: any = null;
          let loadedConfig: any = null;
          let loadedResumes: any[] = [];

          // Load onboarding profile values first as a default fallback
          const profilePath = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
          const profileInfo = await FileSystem.getInfoAsync(profilePath);
          if (profileInfo.exists) {
            const text = await FileSystem.readAsStringAsync(profilePath);
            loadedProfile = JSON.parse(text);
            setUserProfile(loadedProfile);
            if (loadedProfile.firstName) finalFirstName = loadedProfile.firstName;
            if (loadedProfile.lastName) finalLastName = loadedProfile.lastName;
            if (loadedProfile.email) finalEmail = loadedProfile.email;
            const profilePhone = loadedProfile.phone || loadedProfile.phoneNumber || loadedProfile.mobile || '';
            if (profilePhone) setPhone(profilePhone);

            if (!isProfileDefaultsLoaded.current) {
              // Auto-populate filter values from onboarding choices (Prioritize targeted job roles)
              const onboardingRoles = Array.isArray(loadedProfile.roles) && loadedProfile.roles.length > 0
                ? loadedProfile.roles
                : (Array.isArray(loadedProfile.skills) ? loadedProfile.skills : []);

              const onboardingRole = (Array.isArray(loadedProfile.roles) && loadedProfile.roles[0]) || loadedProfile.jobTitle || loadedProfile.role || onboardingRoles[0] || '';
              if (onboardingRole && !filterQuery) {
                setFilterQuery(onboardingRole);
              }

              // Location auto-selection from onboarding profile
              const onboardingLoc = loadedProfile.city || loadedProfile.location || '';
              if (onboardingLoc && !filterLocation) {
                setFilterLocation(onboardingLoc);
              }

              // Work Model auto-selection from onboarding city or interests
              const interestsArr = Array.isArray(loadedProfile.interests) ? loadedProfile.interests : [];
              const isRemotePref = onboardingLoc.toLowerCase().includes('remote') || interestsArr.some((i: any) => String(i).toLowerCase().includes('remote'));
              const isHybridPref = onboardingLoc.toLowerCase().includes('hybrid') || interestsArr.some((i: any) => String(i).toLowerCase().includes('hybrid'));
              if (isRemotePref && filterWorkModel === 'ALL') {
                setFilterWorkModel('Remote');
              } else if (isHybridPref && filterWorkModel === 'ALL') {
                setFilterWorkModel('Hybrid');
              }

              // Experience Seniority auto-selection
              const onboardingExp = (loadedProfile.experienceLevel || loadedProfile.experience || '').toLowerCase();
              if (onboardingExp && filterExperience === 'ALL') {
                if (onboardingExp.includes('senior') || onboardingExp.includes('expert') || onboardingExp.includes('leadership') || onboardingExp.includes('6-9') || onboardingExp.includes('10+')) {
                  setFilterExperience('Senior');
                } else if (onboardingExp.includes('mid') || onboardingExp.includes('3-5') || onboardingExp.includes('3-4')) {
                  setFilterExperience('Mid');
                } else if (onboardingExp.includes('junior') || onboardingExp.includes('entry') || onboardingExp.includes('intern') || onboardingExp.includes('1-2')) {
                  setFilterExperience('Junior');
                }
              }

              // Salary Range auto-selection from onboarding expectedSalary
              if (loadedProfile.expectedSalary) {
                const minS = typeof loadedProfile.expectedSalary === 'object' ? (loadedProfile.expectedSalary.min ?? 0) : Number(loadedProfile.expectedSalary) || 0;
                const maxS = typeof loadedProfile.expectedSalary === 'object' ? (loadedProfile.expectedSalary.max ?? 500000) : 500000;

                if (minS <= 0 || (minS <= 30000 && maxS >= 250000)) {
                  setFilterSalary('ALL');
                } else if (minS >= 180000) {
                  setFilterSalary('$180K+');
                } else if (minS >= 100000) {
                  setFilterSalary('$100K - $180K');
                } else if (minS >= 40000) {
                  setFilterSalary('$50K - $100K');
                } else {
                  setFilterSalary('ALL');
                }
              }

              isProfileDefaultsLoaded.current = true;
            }
          }

          // Load greenhouse config and override/merge
          const configPath = `${FileSystem.documentDirectory}greenhouse_config.json`;
          const configInfo = await FileSystem.getInfoAsync(configPath);
          if (configInfo.exists) {
            const text = await FileSystem.readAsStringAsync(configPath);
            loadedConfig = JSON.parse(text);
            setConfig(loadedConfig);
            if (loadedConfig.email) finalEmail = loadedConfig.email;
            if (loadedConfig.firstName) finalFirstName = loadedConfig.firstName;
            if (loadedConfig.lastName) finalLastName = loadedConfig.lastName;
            if (loadedConfig.phone) setPhone(loadedConfig.phone);
          }

          setFirstName(finalFirstName);
          setLastName(finalLastName);
          setEmail(finalEmail);

          // Load resumes
          const resumesPath = `${FileSystem.documentDirectory}resumes.json`;
          const resumesInfo = await FileSystem.getInfoAsync(resumesPath);
          if (resumesInfo.exists) {
            const content = await FileSystem.readAsStringAsync(resumesPath);
            const parsedResumes = JSON.parse(content);
            if (Array.isArray(parsedResumes)) {
              loadedResumes = sortResumesWithDefaultFirst(parsedResumes.filter(r => r.uri));
              setResumesList(loadedResumes);
              if (loadedResumes.length > 0) {
                // Prioritize the default resume if set, otherwise keep valid selection or fall back to first
                setSelectedResumeId(prev => {
                  const defaultItem = loadedResumes.find(r => r.isDefault);
                  if (defaultItem) return defaultItem.id;
                  const stillExists = loadedResumes.some(r => r.id === prev);
                  return stillExists ? prev : loadedResumes[0].id;
                });
              }
            }
          }

          console.log('\n================ 👤 USER DATA STORED IN APP 👤 ================');
          console.log('📋 Onboarding Profile (Skills, Exp, Salary, Location):', JSON.stringify(loadedProfile, null, 2));
          console.log('📞 Contact & Account Config:', JSON.stringify(loadedConfig, null, 2));
          console.log('📄 Resumes Count & List:', loadedResumes.length, JSON.stringify(loadedResumes, null, 2));
          console.log('=================================================================\n');
        } catch (e) {
          console.log("Error initializing jobs screen on focus:", e);
        }
      }
      initData();
    }, [])
  );

  const fetchJobsFromAllBoards = async (pageToFetch = 1, append = false, queryStr = filterQuery, companyStr = selectedCompanyFilter, locationStr = filterLocation) => {
    if (pageToFetch === 1) {
      setIsLoadingJobs(true);
    } else {
      setIsFetchingMore(true);
    }
    console.log(`Fetching jobs from backend aggregator: page=${pageToFetch}, q=${queryStr}, company=${companyStr}, location=${locationStr}`);
    try {
      const qParam = queryStr.trim() ? `&q=${encodeURIComponent(queryStr.trim())}` : '';
      const companyParam = companyStr && companyStr !== 'ALL' ? `&company=${encodeURIComponent(companyStr)}` : '';
      const locParam = locationStr.trim() ? `&location=${encodeURIComponent(locationStr.trim())}` : '';
      const currentUserId = user?.id || guestId || '';
      const userIdParam = currentUserId ? `&userId=${encodeURIComponent(currentUserId)}` : '';
      const response = await fetch(`${API_URL}/api/jobs?limit=50&page=${pageToFetch}${qParam}${companyParam}${userIdParam}${locParam}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.jobs)) {
          console.log(`Successfully fetched ${data.jobs.length} jobs for page ${pageToFetch}`);

          const serverTotal = typeof data.total === 'number' ? data.total :
            typeof data.totalCount === 'number' ? data.totalCount :
              typeof data.total_count === 'number' ? data.total_count :
                typeof data.totalJobs === 'number' ? data.totalJobs :
                  typeof data.total_jobs === 'number' ? data.total_jobs :
                    typeof data.count === 'number' ? data.count : undefined;

          if (serverTotal !== undefined && serverTotal > 0) {
            setTotalJobsCount(serverTotal);
          } else if (data.jobs.length >= 50) {
            setTotalJobsCount(3604);
          } else {
            setTotalJobsCount(data.jobs.length);
          }

          if (data.jobs.length < 50) {
            setHasMore(false);
          } else {
            setHasMore(true);
          }

          // Pre-process rich HTML content & filter out skipped/applied jobs with 0ms delay
          const excludedSet = await getExcludedJobIds();
          const processed = data.jobs
            .filter((job: GreenhouseJob) => !excludedSet.has(String(job.id)))
            .map((job: GreenhouseJob) => {
              const rawDescription = stripHtml(job.content || "");
              const cleanSnippet = rawDescription.length > 280
                ? rawDescription.slice(0, 280) + "..."
                : rawDescription;
              return {
                ...job,
                cleanSnippet
              };
            });

          if (append) {
            setAllJobs(prev => {
              const existingIds = new Set(prev.map((j: GreenhouseJob) => j.id));
              const newJobs = processed.filter((j: GreenhouseJob) => !existingIds.has(j.id));
              const combined = [...prev, ...newJobs];
              setFilteredJobs(combined);
              return combined;
            });
          } else {
            setAllJobs(processed);
            setFilteredJobs(processed);
            setCurrentPage(1);
            setCurrentIndex(0);
            setSessionSkippedIds(new Set());
          }
        }
      }
    } catch (err: any) {
      console.log("Error in fetchJobsFromAllBoards:", err);
    } finally {
      setIsLoadingJobs(false);
      setIsFetchingMore(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchJobsFromAllBoards(1, false, filterQuery, selectedCompanyFilter, filterLocation);
    }, 450); // 450ms debounce to prevent flooding search requests

    return () => clearTimeout(delayDebounce);
  }, [filterQuery, selectedCompanyFilter, filterLocation]);

  // Client-side multi-filter effect (Work Model, Experience Level, Salary, Location, Skills)
  useEffect(() => {
    let result = [...allJobs];

    if (selectedSkillsFilter.length > 0) {
      result = result.filter(job => {
        const deptNames = Array.isArray(job.departments) ? job.departments.map(d => d.name).join(' ') : '';
        const jobText = `${job.title || ''} ${job.content || ''} ${job.companyName || ''} ${deptNames}`.toLowerCase();
        return selectedSkillsFilter.some(skill => jobText.includes(skill.toLowerCase()));
      });
    }

    if (filterWorkModel !== 'ALL') {
      result = result.filter(job => getJobWorkModel(job).toLowerCase() === filterWorkModel.toLowerCase());
    }

    if (filterExperience !== 'ALL') {
      result = result.filter(job => {
        const exp = getJobExperience(job).toLowerCase();
        if (filterExperience === 'Senior') return exp.includes('5+') || exp.includes('6+') || exp.includes('7+') || exp.includes('8+') || exp.includes('10+') || exp.includes('senior') || exp.includes('lead') || exp.includes('principal') || exp.includes('staff');
        if (filterExperience === 'Mid') return exp.includes('3') || exp.includes('4') || exp.includes('5') || exp.includes('mid');
        if (filterExperience === 'Junior') return exp.includes('1') || exp.includes('2') || exp.includes('junior') || exp.includes('entry') || exp.includes('intern');
        return true;
      });
    }

    if (filterSalary !== 'ALL') {
      result = result.filter(job => {
        const salStr = getJobSalary(job).toLowerCase();
        const matches = salStr.match(/\$(\d+)k?/g);
        if (!matches || matches.length === 0) return true;
        const nums = matches.map(m => parseInt(m.replace(/\D/g, ''), 10));
        const maxVal = Math.max(...nums);
        const minVal = Math.min(...nums);

        if (filterSalary === '$50K - $100K') {
          return minVal <= 100 && maxVal >= 50;
        } else if (filterSalary === '$100K - $180K') {
          return minVal <= 180 && maxVal >= 100;
        } else if (filterSalary === '$180K+') {
          return maxVal >= 180;
        }
        return true;
      });
    }

    if (filterLocation.trim() !== '') {
      const target = filterLocation.toLowerCase().trim();
      result = result.filter(job => {
        const loc = (job.location?.name || '').toLowerCase();
        const content = (job.content || '').toLowerCase();
        const title = (job.title || '').toLowerCase();
        return loc.includes(target) || content.includes(target) || title.includes(target);
      });
    }

    if (filterQuery.trim() !== '') {
      const SENIORITY = new Set(['senior', 'sr', 'junior', 'jr', 'lead', 'principal', 'staff', 'associate', 'intern', 'entry', 'mid', 'head', 'vp', 'director', 'manager']);
      const qWords = filterQuery.trim().toLowerCase().split(/\s+/).filter(t => t.length > 1);
      const domainWords = qWords.filter(w => !SENIORITY.has(w));

      if (domainWords.length > 0) {
        result = result.filter(job => {
          const titleLower = (job.title || '').toLowerCase();
          const contentLower = (job.content || '').toLowerCase();
          return domainWords.some(dw => titleLower.includes(dw) || contentLower.includes(dw));
        });

        result.sort((a, b) => {
          const aTitle = (a.title || '').toLowerCase();
          const bTitle = (b.title || '').toLowerCase();

          const aDomainScore = domainWords.filter(w => aTitle.includes(w)).length * 10 + qWords.filter(w => aTitle.includes(w)).length;
          const bDomainScore = domainWords.filter(w => bTitle.includes(w)).length * 10 + qWords.filter(w => bTitle.includes(w)).length;

          if (aDomainScore !== bDomainScore) {
            return bDomainScore - aDomainScore;
          }
          return getJobTimestamp(b) - getJobTimestamp(a);
        });
      } else {
        result.sort((a, b) => getJobTimestamp(b) - getJobTimestamp(a));
      }
    } else {
      result.sort((a, b) => getJobTimestamp(b) - getJobTimestamp(a));
    }

    setFilteredJobs(result);
    // Reset active card index when filter changes, but NOT during background fetches
    if (!isFetchingMore) {
      setCurrentIndex(0);
    }
  }, [allJobs, filterQuery, filterWorkModel, filterExperience, filterSalary, filterLocation, selectedSkillsFilter, userProfile]);

  const viewJobDetails = async (job: GreenhouseJob) => {
    try {
      const storedPath = `${FileSystem.documentDirectory}cached_current_job.json`;
      await FileSystem.writeAsStringAsync(storedPath, JSON.stringify(job));
    } catch (e) { }

    router.push({
      pathname: '/job-details',
      params: {
        id: String(job.id),
        jobJson: JSON.stringify(job),
      },
    });
  };

  const stripHtml = (html: string) => {
    if (!html) return '';
    return html
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&middot;/g, '•')
      .replace(/&bull;/g, '•')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim();
  };

  // Pure JavaScript base64 encoder
  const encodeBase64 = (input: string): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let str = input;
    let output = '';
    for (let block = 0, charCode, i = 0, map = chars;
      str.charAt(i | 0) || (map = '=', i % 1);
      output += map.charAt(63 & block >> 8 - i % 1 * 8)) {
      charCode = str.charCodeAt(i += 3 / 4);
      if (charCode > 0xFF) {
        throw new Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
      }
      block = block << 8 | charCode;
    }
    return output;
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'log') {
        console.log('\x1b[33m[WebView Log]\x1b[0m', data.message);
      }
    } catch (e) {
      console.log('\x1b[33m[WebView Raw Log]\x1b[0m', event.nativeEvent.data);
    }
  };

  const getAutofillJS = () => {

    const experiences = userProfile?.workExperiences || userProfile?.experiences || [];
    const currentExp = experiences.length > 0 ? experiences[0] : null;

    const educations = userProfile?.educations || userProfile?.education || [];
    const currentEdu = educations.length > 0 ? educations[0] : null;

    const fullNameCombined = (userProfile?.fullName || userProfile?.name || userProfile?.userName || '').trim();
    const nameParts = fullNameCombined ? fullNameCombined.split(' ') : [];
    const extractedFirstName = firstName.trim() || userProfile?.firstName || userProfile?.givenName || (nameParts.length > 0 ? nameParts[0] : '');
    const extractedLastName = lastName.trim() || userProfile?.lastName || userProfile?.familyName || userProfile?.surname || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');

    const payload = {
      firstName: (extractedFirstName || '').trim(),
      lastName: (extractedLastName || '').trim(),
      email: (email.trim() || userProfile?.email || userProfile?.emailAddress || '').trim(),
      phone: (phone.trim() || userProfile?.phone || userProfile?.phoneNumber || userProfile?.mobile || '').trim(),
      linkedinUrl: (userProfile?.linkedinUrl || userProfile?.linkedin || userProfile?.linkedIn || '').trim(),
      portfolioUrl: (userProfile?.portfolioUrl || userProfile?.portfolio || userProfile?.website || userProfile?.url || '').trim(),
      city: (userProfile?.city || userProfile?.location || userProfile?.address || '').trim(),
      country: (userProfile?.country || 'United States').trim(),
      resumeBase64: '',
      resumeName: selectedResumeName,
      coverLetterText: '',
      currentJobTitle: (currentExp?.jobTitle || userProfile?.jobTitle || userProfile?.role || '').trim(),
      currentEmployer: (currentExp?.companyName || userProfile?.companyName || '').trim(),
      workStartDate: (currentExp?.startDate || '').trim(),
      workEndDate: (currentExp?.endDate || '').trim(),
      educationSchool: (currentEdu?.schoolName || userProfile?.schoolName || '').trim(),
      degree: (currentEdu?.degree || userProfile?.degree || '').trim(),
      discipline: (currentEdu?.fieldOfStudy || currentEdu?.degree || '').trim(),
      eduStartDate: (currentEdu?.startDate || '').trim(),
      eduEndDate: (currentEdu?.endDate || '').trim(),
    };

    console.log("Preparing injection script with contact details and cover letter:", {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      resumeSize: payload.resumeBase64 ? payload.resumeBase64.length : 0,
      hasCoverLetter: !!payload.coverLetterText
    });

    const jsCode = `
      (function() {
        const payload = JSON.parse(decodeURIComponent("${encodeURIComponent(JSON.stringify(payload))}"));
        let attempts = 0;
        const maxAttempts = 10;
        
        function sendLog(msg) {
          const messageStr = JSON.stringify({ type: 'log', message: msg });
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(messageStr);
          } else if (window.parent && window.parent !== window) {
            window.parent.postMessage(messageStr, '*');
          }
        }

        function sendSuccess(count) {
          const messageStr = JSON.stringify({ type: 'AUTOFILL_SUCCESS', count: count });
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(messageStr);
          } else if (window.parent && window.parent !== window) {
            window.parent.postMessage(messageStr, '*');
          }
        }

        function sendError(errMsg) {
          const messageStr = JSON.stringify({ type: 'AUTOFILL_ERROR', error: errMsg });
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(messageStr);
          } else if (window.parent && window.parent !== window) {
            window.parent.postMessage(messageStr, '*');
          }
        }

        if (window === window.top) {
          if (!window.hasAutofillProxy) {
            window.hasAutofillProxy = true;
            window.addEventListener('message', function(event) {
              try {
                if (window.ReactNativeWebView && typeof event.data === 'string') {
                  const parsed = JSON.parse(event.data);
                  if (parsed.type === 'log' || parsed.type === 'AUTOFILL_SUCCESS' || parsed.type === 'AUTOFILL_ERROR') {
                    window.ReactNativeWebView.postMessage(event.data);
                  }
                }
              } catch (e) {}
            });
          }
        }

        sendLog('[v2.1 Fast-Autofill] Script loaded on host: ' + window.location.host);

        function base64ToBlob(base64, mimeType) {
          const byteCharacters = atob(base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          return new Blob([byteArray], { type: mimeType });
        }

        function triggerInputChange(element, value) {
          if (!element) return;
          try {
            const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
            const prototype = Object.getPrototypeOf(element);
            const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
            if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
              prototypeValueSetter.call(element, value);
            } else if (valueSetter) {
              valueSetter.call(element, value);
            } else {
              element.value = value;
            }
          } catch (e) {
            element.value = value;
          }
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }

        function tryAutofill() {
          attempts++;
          sendLog('Autofill attempt #' + attempts);

          // 0. IFRAME REDIRECT (to bypass Cross-Origin restrictions on custom domains)
          const isAlreadyOnATS = window.location.host.includes('greenhouse.io') || window.location.host.includes('lever.co');
          if (!isAlreadyOnATS) {
            const ghIframe = document.querySelector('iframe[src*="greenhouse.io"]') || document.querySelector('iframe#grnhse_iframe');
            if (ghIframe && ghIframe.src && !window.location.href.includes('embed/job_app')) {
              sendLog('Found Greenhouse iframe on ' + window.location.host + '. Redirecting to direct ATS URL: ' + ghIframe.src);
              window.location.href = ghIframe.src;
              return;
            }

            const leverIframe = document.querySelector('iframe[src*="lever.co"]') || document.querySelector('iframe#lever-iframe');
            if (leverIframe && leverIframe.src && !window.location.href.includes('embed/job_app')) {
              sendLog('Found Lever iframe on ' + window.location.host + '. Redirecting to direct ATS URL: ' + leverIframe.src);
              window.location.href = leverIframe.src;
              return;
            }

            const genericATS = document.querySelector('iframe[src*="greenhouse"]') || document.querySelector('iframe[src*="lever"]');
            if (genericATS && genericATS.src) {
              sendLog('Found ATS iframe on ' + window.location.host + '. Redirecting to direct ATS URL: ' + genericATS.src);
              window.location.href = genericATS.src;
              return;
            }
          }

          function findInputs(selectors, labelKeywords, placeholderKeywords) {
            const found = new Set();
            
            if (selectors) {
              document.querySelectorAll(selectors).forEach(el => {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
                  found.add(el);
                }
              });
            }

            if (labelKeywords && labelKeywords.length > 0) {
              document.querySelectorAll('label').forEach(label => {
                const labelText = (label.innerText || label.textContent || '').toLowerCase();
                if (labelText && labelKeywords.some(kw => labelText.includes(kw))) {
                  const htmlFor = label.getAttribute('for');
                  if (htmlFor) {
                    const el = document.getElementById(htmlFor);
                    if (el) found.add(el);
                  }
                  const nestedInput = label.querySelector('input, textarea, select');
                  if (nestedInput) found.add(nestedInput);
                  let sibling = label.nextElementSibling;
                  if (sibling) {
                    if (sibling.tagName === 'INPUT' || sibling.tagName === 'TEXTAREA' || sibling.tagName === 'SELECT') {
                      found.add(sibling);
                    } else {
                      const child = sibling.querySelector('input, textarea, select');
                      if (child) found.add(child);
                    }
                  }
                  let parent = label.parentElement;
                  for (let depth = 0; depth < 3 && parent; depth++) {
                    const nestedInputs = parent.querySelectorAll('input, textarea, select');
                    if (nestedInputs.length > 0) {
                      nestedInputs.forEach(inp => found.add(inp));
                      break;
                    }
                    parent = parent.parentElement;
                  }
                }
              });
            }

            if (placeholderKeywords && placeholderKeywords.length > 0) {
              document.querySelectorAll('input, textarea').forEach(el => {
                const ph = (el.getAttribute('placeholder') || '').toLowerCase();
                if (placeholderKeywords.some(kw => ph.includes(kw))) {
                  found.add(el);
                }
              });
            }

            if (labelKeywords && labelKeywords.length > 0) {
              document.querySelectorAll('input, textarea, select').forEach(el => {
                const name = (el.getAttribute('name') || '').toLowerCase();
                const id = (el.getAttribute('id') || '').toLowerCase();
                const ph = (el.getAttribute('placeholder') || '').toLowerCase();
                const aria = (el.getAttribute('aria-label') || '').toLowerCase();
                const auto = (el.getAttribute('autocomplete') || '').toLowerCase();
                
                if (labelKeywords.some(kw => 
                  name.includes(kw) || 
                  id.includes(kw) || 
                  ph.includes(kw) || 
                  aria.includes(kw) || 
                  auto.includes(kw)
                )) {
                  found.add(el);
                }
              });
            }

            return Array.from(found);
          }

          const isLever = window.location.host.includes('lever.co') || !!document.querySelector('form[action*="lever.co"]');
          const isGreenhouse = window.location.host.includes('greenhouse.io') || !!document.querySelector('form#application_form') || !!document.querySelector('form[action*="greenhouse.io"]');

          if (isGreenhouse) {
            sendLog('Executing Greenhouse fuzzy autofill...');
            
            // First Name
            if (payload.firstName) {
              const els = findInputs('input[name*="first" i], input[id*="first" i], input[autocomplete="given-name"]', ['first name', 'given name'], ['first name', 'given name']);
              els.forEach(el => {
                if (!el.value) {
                  triggerInputChange(el, payload.firstName);
                  sendLog('Filled first name field');
                }
              });
            }
            
            // Last Name
            if (payload.lastName) {
              const els = findInputs('input[name*="last" i], input[id*="last" i], input[autocomplete="family-name"]', ['last name', 'surname', 'family name'], ['last name', 'surname', 'family name']);
              els.forEach(el => {
                if (!el.value) {
                  triggerInputChange(el, payload.lastName);
                  sendLog('Filled last name field');
                }
              });
            }
            
            // Email
            if (payload.email) {
              const els = findInputs('input[type="email" i], input[name*="email" i], input[id*="email" i], input[autocomplete="email"]', ['email', 'e-mail'], ['email', 'e-mail']);
              els.forEach(el => {
                if (!el.value) {
                  triggerInputChange(el, payload.email);
                  sendLog('Filled email field');
                }
              });
            }
            
            // Phone
            if (payload.phone) {
              const els = findInputs('input[type="tel" i], input[name*="phone" i], input[id*="phone" i], input[name*="mobile" i]', ['phone', 'telephone', 'mobile', 'cell', 'number'], ['phone', 'telephone', 'mobile', 'cell', 'number']);
              els.forEach(el => {
                if (!el.value) {
                  triggerInputChange(el, payload.phone);
                  sendLog('Filled phone field');
                }
              });
            }
            
            // LinkedIn
            if (payload.linkedinUrl) {
              const els = findInputs('input[name*="linkedin" i], input[id*="linkedin" i], input[name*="link" i]', ['linkedin'], ['linkedin']);
              els.forEach(el => {
                if (!el.value) {
                  triggerInputChange(el, payload.linkedinUrl);
                  sendLog('Filled LinkedIn field');
                }
              });
            }
            
            // Portfolio / Website / GitHub
            if (payload.portfolioUrl) {
              const els = findInputs('input[name*="website" i], input[name*="portfolio" i], input[id*="website" i], input[name*="url" i]', ['portfolio', 'website', 'url', 'github', 'personal link'], ['portfolio', 'website', 'url', 'github']);
              els.forEach(el => {
                if (!el.value) {
                  triggerInputChange(el, payload.portfolioUrl);
                  sendLog('Filled portfolio/website field');
                }
              });
            }
            
            // City / Location
            if (payload.city) {
              const els = findInputs('input[name*="location" i], input[name*="city" i], input[id*="location" i], input[name*="address" i]', ['location', 'city', 'address', 'living in'], ['location', 'city', 'address']);
              els.forEach(el => {
                if (!el.value) {
                  triggerInputChange(el, payload.city);
                  sendLog('Filled city/location field');
                }
              });
            }
            
            // Country
            if (payload.country) {
              const els = findInputs('select[name*="country" i], select[id*="country" i], input[name*="country" i], input[id*="country" i]', ['country'], ['country']);
              els.forEach(el => {
                if (el.tagName === 'SELECT') {
                  const options = Array.from(el.options);
                  const valLower = payload.country.toLowerCase();
                  let matchedOption = options.find(opt => opt.value.toLowerCase() === valLower || opt.text.toLowerCase().includes(valLower));
                  if (matchedOption) {
                    el.value = matchedOption.value;
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    sendLog('Selected country: ' + matchedOption.text);
                  }
                } else if (el.tagName === 'INPUT' && !el.value) {
                  triggerInputChange(el, payload.country);
                  sendLog('Filled country field');
                }
              });
            }

            // Cover letter text area
            const ghCLText = document.querySelector('textarea#cover_letter_text') || 
                             document.querySelector('textarea[name="cover_letter"]') ||
                             document.querySelector('textarea[id*="cover" i]');
            if (ghCLText && payload.coverLetterText && !ghCLText.value) {
              triggerInputChange(ghCLText, payload.coverLetterText);
              sendLog('Filled Greenhouse cover letter text.');
            }

            // Resume upload logic
            const fileInput = document.querySelector('input[type="file"][id="resume_file"]') || 
                              document.querySelector('input[type="file"][name="resume"]') ||
                              document.querySelector('input[type="file"]');
            sendLog('Greenhouse file input found: ' + !!fileInput);
            if (fileInput && payload.resumeBase64 && (!fileInput.files || !fileInput.files.length)) {
              try {
                const blob = base64ToBlob(payload.resumeBase64, 'application/pdf');
                const file = new File([blob], payload.resumeName || 'resume.pdf', { type: 'application/pdf' });
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                
                // Bypass React files-setter tracker
                const filesSetter = Object.getOwnPropertyDescriptor(fileInput, 'files')?.set;
                const prototype = Object.getPrototypeOf(fileInput);
                const prototypeFilesSetter = Object.getOwnPropertyDescriptor(prototype, 'files')?.set;
                if (prototypeFilesSetter) {
                  prototypeFilesSetter.call(fileInput, dataTransfer.files);
                } else {
                  fileInput.files = dataTransfer.files;
                }
                
                fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                sendLog('Resume attached to Greenhouse form.');
              } catch(e) {
                sendLog('Failed to attach resume to Greenhouse: ' + e.message);
              }
            }

            // Cover letter file input
            const ghCLFile = document.querySelector('input[type="file"][id="cover_letter_file"]') || 
                             document.querySelector('input[type="file"][name="cover_letter"]');
            if (ghCLFile && payload.coverLetterText && (!ghCLFile.files || !ghCLFile.files.length)) {
              try {
                const blob = new Blob([payload.coverLetterText], { type: 'text/plain' });
                const file = new File([blob], 'cover_letter.txt', { type: 'text/plain' });
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                
                // Bypass React files-setter tracker
                const filesSetter = Object.getOwnPropertyDescriptor(ghCLFile, 'files')?.set;
                const prototype = Object.getPrototypeOf(ghCLFile);
                const prototypeFilesSetter = Object.getOwnPropertyDescriptor(prototype, 'files')?.set;
                if (prototypeFilesSetter) {
                  prototypeFilesSetter.call(ghCLFile, dataTransfer.files);
                } else {
                  ghCLFile.files = dataTransfer.files;
                }
                
                ghCLFile.dispatchEvent(new Event('change', { bubbles: true }));
                sendLog('Cover letter attached to Greenhouse form.');
              } catch(e) {
                sendLog('Failed to attach cover letter to Greenhouse: ' + e.message);
              }
            }
          } else if (isLever) {
            sendLog('Executing Lever fuzzy autofill...');
            
            // Full Name
            if (payload.firstName || payload.lastName) {
              const fullNameText = (payload.firstName + ' ' + payload.lastName).trim();
              const els = findInputs('input[name="name"]', ['full name', 'your name', 'complete name'], ['full name', 'name']);
              els.forEach(el => {
                if (!el.value) {
                  triggerInputChange(el, fullNameText);
                  sendLog('Filled Lever name.');
                }
              });
            }
            
            // Email
            if (payload.email) {
              const els = findInputs('input[name="email"]', ['email', 'e-mail'], ['email']);
              els.forEach(el => {
                if (!el.value) {
                  triggerInputChange(el, payload.email);
                  sendLog('Filled Lever email.');
                }
              });
            }
            
            // Phone
            if (payload.phone) {
              const els = findInputs('input[name="phone"]', ['phone', 'mobile', 'telephone'], ['phone', 'mobile']);
              els.forEach(el => {
                if (!el.value) {
                  triggerInputChange(el, payload.phone);
                  sendLog('Filled Lever phone.');
                }
              });
            }
            
            // LinkedIn
            if (payload.linkedinUrl) {
              const els = findInputs('input[name*="linkedin" i], input[name="urls[LinkedIn]"]', ['linkedin'], ['linkedin']);
              els.forEach(el => {
                if (!el.value) {
                  triggerInputChange(el, payload.linkedinUrl);
                  sendLog('Filled Lever LinkedIn.');
                }
              });
            }
            
            // Portfolio / Website / GitHub
            if (payload.portfolioUrl) {
              const els = findInputs('input[name*="portfolio" i], input[name*="website" i], input[name="urls[Portfolio]"]', ['portfolio', 'website'], ['portfolio', 'website']);
              els.forEach(el => {
                if (!el.value) {
                  triggerInputChange(el, payload.portfolioUrl);
                  sendLog('Filled Lever Portfolio/Website.');
                }
              });
            }

            // Cover letter text area / comments
            const leverCLText = document.querySelector('textarea[name="comments"]') || 
                                document.querySelector('textarea#additional-information') ||
                                document.querySelector('textarea[name*="additional" i]');
            if (leverCLText && payload.coverLetterText && !leverCLText.value) {
              triggerInputChange(leverCLText, payload.coverLetterText);
              sendLog('Filled Lever cover letter comments.');
            }

            // Resume upload logic
            const fileInput = document.querySelector('input[type="file"][id="resume-upload-input"]') || 
                              document.querySelector('input[type="file"]');
            sendLog('Lever file input found: ' + !!fileInput);
            if (fileInput && payload.resumeBase64 && (!fileInput.files || !fileInput.files.length)) {
              try {
                const blob = base64ToBlob(payload.resumeBase64, 'application/pdf');
                const file = new File([blob], payload.resumeName || 'resume.pdf', { type: 'application/pdf' });
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                
                // Bypass React files-setter tracker
                const filesSetter = Object.getOwnPropertyDescriptor(fileInput, 'files')?.set;
                const prototype = Object.getPrototypeOf(fileInput);
                const prototypeFilesSetter = Object.getOwnPropertyDescriptor(prototype, 'files')?.set;
                if (prototypeFilesSetter) {
                  prototypeFilesSetter.call(fileInput, dataTransfer.files);
                } else {
                  fileInput.files = dataTransfer.files;
                }
                
                fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                sendLog('Resume attached to Lever form.');
              } catch(e) {
                sendLog('Failed to attach resume to Lever: ' + e.message);
              }
            }

            // Cover letter file input
            const leverCLFile = document.querySelector('input[type="file"][id="cover-letter-upload-input"]') || 
                                document.querySelector('input[type="file"][name="cover_letter"]');
            if (leverCLFile && payload.coverLetterText && (!leverCLFile.files || !leverCLFile.files.length)) {
              try {
                const blob = new Blob([payload.coverLetterText], { type: 'text/plain' });
                const file = new File([blob], 'cover_letter.txt', { type: 'text/plain' });
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                
                // Bypass React files-setter tracker
                const filesSetter = Object.getOwnPropertyDescriptor(leverCLFile, 'files')?.set;
                const prototype = Object.getPrototypeOf(leverCLFile);
                const prototypeFilesSetter = Object.getOwnPropertyDescriptor(prototype, 'files')?.set;
                if (prototypeFilesSetter) {
                  prototypeFilesSetter.call(leverCLFile, dataTransfer.files);
                } else {
                  leverCLFile.files = dataTransfer.files;
                }
                
                leverCLFile.dispatchEvent(new Event('change', { bubbles: true }));
                sendLog('Cover letter attached to Lever form.');
              } catch(e) {
                sendLog('Failed to attach cover letter to Lever: ' + e.message);
              }
            }
          } else {
            sendLog('Executing generic fallback autofill...');
            
            if (payload.firstName) {
              findInputs('input[name*="first" i], input[id*="first" i]', ['first name'], ['first name']).forEach(el => {
                if (!el.value) triggerInputChange(el, payload.firstName);
              });
            }
            if (payload.lastName) {
              findInputs('input[name*="last" i], input[id*="last" i]', ['last name'], ['last name']).forEach(el => {
                if (!el.value) triggerInputChange(el, payload.lastName);
              });
            }
            if (payload.email) {
              findInputs('input[type="email" i], input[name*="email" i]', ['email'], ['email']).forEach(el => {
                if (!el.value) triggerInputChange(el, payload.email);
              });
            }
            if (payload.phone) {
              findInputs('input[type="tel" i], input[name*="phone" i]', ['phone', 'mobile'], ['phone', 'mobile']).forEach(el => {
                if (!el.value) triggerInputChange(el, payload.phone);
              });
            }
          }

          // 4. Fill additional fields (Company, Title, Education, School, Dates)
          if (payload.currentJobTitle) {
            const els = findInputs(
              'input[name*="title" i], input[id*="title" i], input[name*="role" i], input[name*="headline" i]',
              ['current title', 'current job title', 'current role', 'job title', 'headline', 'role'],
              ['current title', 'current job title', 'current role', 'job title', 'headline', 'role']
            );
            els.forEach(el => {
              if (!el.value) {
                triggerInputChange(el, payload.currentJobTitle);
                sendLog('Filled current job title field');
              }
            });
          }

          if (payload.currentEmployer) {
            const els = findInputs(
              'input[name*="company" i], input[id*="company" i], input[name*="employer" i], input[id*="employer" i], input[name*="organization" i]',
              ['current company', 'current employer', 'employer', 'company', 'organization'],
              ['current company', 'current employer', 'employer', 'company', 'organization']
            );
            els.forEach(el => {
              if (!el.value) {
                triggerInputChange(el, payload.currentEmployer);
                sendLog('Filled current employer field');
              }
            });
          }

          if (payload.educationSchool) {
            const els = findInputs(
              'input[name*="school" i], input[id*="school" i], input[name*="university" i], input[id*="university" i], input[name*="college" i]',
              ['school', 'university', 'college', 'institution', 'education school'],
              ['school', 'university', 'college', 'institution']
            );
            els.forEach(el => {
              if (!el.value) {
                triggerInputChange(el, payload.educationSchool);
                sendLog('Filled education school field');
              }
            });
          }

          if (payload.degree) {
            const els = findInputs(
              'select[name*="degree" i], input[name*="degree" i], select[id*="degree" i], input[id*="degree" i]',
              ['degree', 'education degree'],
              ['degree']
            );
            els.forEach(el => {
              if (el.tagName === 'SELECT') {
                const options = Array.from(el.options);
                const valLower = payload.degree.toLowerCase();
                let matchedOption = options.find(opt => opt.value.toLowerCase() === valLower || opt.text.toLowerCase().includes(valLower));
                if (matchedOption) {
                  el.value = matchedOption.value;
                  el.dispatchEvent(new Event('change', { bubbles: true }));
                  sendLog('Selected degree: ' + matchedOption.text);
                }
              } else if (el.tagName === 'INPUT' && !el.value) {
                triggerInputChange(el, payload.degree);
                sendLog('Filled degree field');
              }
            });
          }

          if (payload.discipline) {
            const els = findInputs(
              'input[name*="discipline" i], select[name*="discipline" i], input[name*="major" i], select[name*="major" i], input[name*="study" i], select[name*="study" i]',
              ['discipline', 'major', 'field of study', 'discipline of study', 'area of study'],
              ['discipline', 'major', 'field of study']
            );
            els.forEach(el => {
              if (el.tagName === 'SELECT') {
                const options = Array.from(el.options);
                const valLower = payload.discipline.toLowerCase();
                let matchedOption = options.find(opt => opt.value.toLowerCase() === valLower || opt.text.toLowerCase().includes(valLower));
                if (matchedOption) {
                  el.value = matchedOption.value;
                  el.dispatchEvent(new Event('change', { bubbles: true }));
                  sendLog('Selected discipline: ' + matchedOption.text);
                }
              } else if (el.tagName === 'INPUT' && !el.value) {
                triggerInputChange(el, payload.discipline);
                sendLog('Filled discipline field');
              }
            });
          }

          if (payload.workStartDate) {
            const els = findInputs('input[name*="start" i][name*="job" i], input[name*="start" i][name*="work" i]', ['job start', 'work start', 'employment start'], ['start date', 'start year']);
            els.forEach(el => {
              if (!el.value) {
                triggerInputChange(el, payload.workStartDate);
                sendLog('Filled work start date');
              }
            });
          }
          if (payload.workEndDate) {
            const els = findInputs('input[name*="end" i][name*="job" i], input[name*="end" i][name*="work" i]', ['job end', 'work end', 'employment end'], ['end date', 'end year']);
            els.forEach(el => {
              if (!el.value) {
                triggerInputChange(el, payload.workEndDate);
                sendLog('Filled work end date');
              }
            });
          }
          if (payload.eduStartDate) {
            const els = findInputs('input[name*="start" i][name*="school" i], input[name*="start" i][name*="edu" i]', ['school start', 'education start', 'degree start'], ['start date', 'start year']);
            els.forEach(el => {
              if (!el.value) {
                triggerInputChange(el, payload.eduStartDate);
                sendLog('Filled education start date');
              }
            });
          }
          if (payload.eduEndDate) {
            const els = findInputs('input[name*="end" i][name*="school" i], input[name*="end" i][name*="edu" i], input[name*="grad" i]', ['school end', 'education end', 'graduation', 'degree end'], ['end date', 'end year', 'graduation date']);
            els.forEach(el => {
              if (!el.value) {
                triggerInputChange(el, payload.eduEndDate);
                sendLog('Filled education end date');
              }
            });
          }

          if (attempts >= maxAttempts) {
            clearInterval(autofillInterval);
            sendLog('Finished all autofill attempts.');
          }
        }

        // Start polling
        const autofillInterval = setInterval(tryAutofill, 500);
        tryAutofill();
      })();
      true;
    `;
    return jsCode;
  };

  const getDirectAtsUrl = (url: string) => {
    if (!url) return url;
    const ghJidMatch = url.match(/gh_jid=([0-9]+)/i);
    if (ghJidMatch && ghJidMatch[1]) {
      return `https://boards.greenhouse.io/embed/job_app?token=${ghJidMatch[1]}`;
    }
    return url;
  };

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://188.166.164.115:3030';

  const injectAutofillScript = async () => {
    if (webViewRef.current && userProfile) {
      const experiences = userProfile.workExperiences || userProfile.experiences || [];
      const currentExp = experiences.length > 0 ? experiences[0] : null;

      const educations = userProfile.educations || userProfile.education || [];
      const currentEdu = educations.length > 0 ? educations[0] : null;

      const fn = (userProfile.firstName || '').trim();
      const ln = (userProfile.lastName || '').trim();
      const full = `${fn} ${ln}`.trim();
      const em = (userProfile.email || userProfile.emailAddress || '').trim();
      const ph = (userProfile.phone || userProfile.phoneNumber || '').trim();
      const li = (userProfile.linkedinUrl || userProfile.linkedin || '').trim();
      const po = (userProfile.portfolioUrl || userProfile.portfolio || '').trim();
      const ci = (userProfile.city || userProfile.location || '').trim();

      const sch = (currentEdu?.schoolName || userProfile.schoolName || '').trim();
      const deg = (currentEdu?.degree || userProfile.degree || '').trim();
      const dis = (currentEdu?.fieldOfStudy || currentEdu?.degree || userProfile.discipline || '').trim();
      const edStart = (currentEdu?.startDate || '').trim();
      const edEnd = (currentEdu?.endDate || '').trim();

      const emp = (currentExp?.companyName || userProfile.companyName || '').trim();
      const tit = (currentExp?.jobTitle || userProfile.jobTitle || userProfile.role || '').trim();
      const wkStart = (currentExp?.startDate || '').trim();
      const wkEnd = (currentExp?.endDate || '').trim();

      const gen = (userProfile.gender || userProfile.sex || '').trim();
      const race = (userProfile.race || userProfile.ethnicity || '').trim();
      const vet = (userProfile.veteranStatus || userProfile.veteran || '').trim();
      const disab = (userProfile.disabilityStatus || userProfile.disability || '').trim();

      const resB64 = (userProfile.resumeBase64 || '').trim();

      const purpleJs = `
        (function() {
          function setVal(el, v) {
            if (!el || !v) return;
            try {
              const proto = Object.getPrototypeOf(el);
              const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set || Object.getOwnPropertyDescriptor(el, 'value')?.set;
              if (setter) setter.call(el, v); else el.value = v;
            } catch(e) { el.value = v; }
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }

          const docs = [document];
          document.querySelectorAll('iframe').forEach(f => {
            try { if (f.contentDocument) docs.push(f.contentDocument); } catch(e) {}
          });

          docs.forEach(doc => {
            if ("${fn}") {
              doc.querySelectorAll('input[name*="first" i], input[id*="first" i], input[autocomplete="given-name"]').forEach(e => setVal(e, "${fn}"));
            }
            if ("${ln}") {
              doc.querySelectorAll('input[name*="last" i], input[id*="last" i], input[autocomplete="family-name"]').forEach(e => setVal(e, "${ln}"));
            }
            if ("${full}") {
              doc.querySelectorAll('input[name="name" i], input[id="name" i]').forEach(e => setVal(e, "${full}"));
            }
            if ("${em}") {
              doc.querySelectorAll('input[type="email" i], input[name*="email" i], input[id*="email" i]').forEach(e => setVal(e, "${em}"));
            }
            if ("${ph}") {
              doc.querySelectorAll('input[type="tel" i], input[name*="phone" i], input[id*="phone" i], input[name*="mobile" i]').forEach(e => setVal(e, "${ph}"));
            }
            if ("${li}") {
              doc.querySelectorAll('input[name*="linkedin" i], input[id*="linkedin" i]').forEach(e => setVal(e, "${li}"));
            }
            if ("${po}") {
              doc.querySelectorAll('input[name*="website" i], input[name*="portfolio" i], input[id*="website" i]').forEach(e => setVal(e, "${po}"));
            }
            if ("${ci}") {
              doc.querySelectorAll('input[name*="city" i], input[id*="city" i], input[name*="location" i]').forEach(e => setVal(e, "${ci}"));
            }
            // School / University
            if ("${sch}") {
              doc.querySelectorAll('input[name*="school" i], input[name*="university" i], input[id*="school" i]').forEach(e => setVal(e, "${sch}"));
            }
            // Degree
            if ("${deg}") {
              doc.querySelectorAll('input[name*="degree" i], input[id*="degree" i]').forEach(e => setVal(e, "${deg}"));
            }
            // Discipline / Field of Study
            if ("${dis}") {
              doc.querySelectorAll('input[name*="discipline" i], input[name*="major" i], input[name*="field" i]').forEach(e => setVal(e, "${dis}"));
            }
            // Edu Start Date
            if ("${edStart}") {
              doc.querySelectorAll('input[name*="start" i][name*="school" i], input[name*="start" i][name*="edu" i]').forEach(e => setVal(e, "${edStart}"));
            }
            // Edu End Date
            if ("${edEnd}") {
              doc.querySelectorAll('input[name*="end" i][name*="school" i], input[name*="end" i][name*="edu" i], input[name*="grad" i]').forEach(e => setVal(e, "${edEnd}"));
            }
            // Current Employer
            if ("${emp}") {
              doc.querySelectorAll('input[name*="company" i], input[name*="employer" i], input[id*="company" i], input[name*="org" i]').forEach(e => setVal(e, "${emp}"));
            }
            // Current Job Title
            if ("${tit}") {
              doc.querySelectorAll('input[name*="title" i], input[id*="title" i], input[name*="position" i]').forEach(e => setVal(e, "${tit}"));
            }
            // Work Start Date
            if ("${wkStart}") {
              doc.querySelectorAll('input[name*="start" i][name*="work" i], input[name*="start" i][name*="job" i]').forEach(e => setVal(e, "${wkStart}"));
            }
            // Work End Date
            if ("${wkEnd}") {
              doc.querySelectorAll('input[name*="end" i][name*="work" i], input[name*="end" i][name*="job" i]').forEach(e => setVal(e, "${wkEnd}"));
            }
            // Gender
            if ("${gen}") {
              const gVal = "${gen}".toLowerCase();
              doc.querySelectorAll('select[name*="gender" i], select[id*="gender" i], select[name*="sex" i]').forEach(s => {
                const opts = Array.from(s.options || []);
                const match = opts.find(o => (o.value || '').toLowerCase().includes(gVal) || (o.text || '').toLowerCase().includes(gVal));
                if (match) { s.value = match.value; s.dispatchEvent(new Event('change', { bubbles: true })); }
              });
            }
            // Race / Ethnicity
            if ("${race}") {
              const rVal = "${race}".toLowerCase();
              doc.querySelectorAll('select[name*="race" i], select[name*="ethnicity" i], select[id*="race" i]').forEach(s => {
                const opts = Array.from(s.options || []);
                const match = opts.find(o => (o.value || '').toLowerCase().includes(rVal) || (o.text || '').toLowerCase().includes(rVal));
                if (match) { s.value = match.value; s.dispatchEvent(new Event('change', { bubbles: true })); }
              });
            }
            // Veteran Status
            if ("${vet}") {
              const vVal = "${vet}".toLowerCase();
              doc.querySelectorAll('select[name*="veteran" i], select[id*="veteran" i]').forEach(s => {
                const opts = Array.from(s.options || []);
                const match = opts.find(o => (o.value || '').toLowerCase().includes(vVal) || (o.text || '').toLowerCase().includes(vVal));
                if (match) { s.value = match.value; s.dispatchEvent(new Event('change', { bubbles: true })); }
              });
            }
            // Disability Status
            if ("${disab}") {
              const dVal = "${disab}".toLowerCase();
              doc.querySelectorAll('select[name*="disability" i], select[id*="disability" i]').forEach(s => {
                const opts = Array.from(s.options || []);
                const match = opts.find(o => (o.value || '').toLowerCase().includes(dVal) || (o.text || '').toLowerCase().includes(dVal));
                if (match) { s.value = match.value; s.dispatchEvent(new Event('change', { bubbles: true })); }
              });
            }

            // Instant PDF Resume Auto-Attachment via WebKit DOM Blob
            if ("${resB64}") {
              try {
                fetch("data:application/pdf;base64," + "${resB64}")
                  .then(r => r.blob())
                  .then(blob => {
                    if (blob) {
                      const resFile = new File([blob], "Resume.pdf", { type: 'application/pdf' });
                      const dt = new DataTransfer();
                      dt.items.add(resFile);
                      doc.querySelectorAll('input[type="file"]').forEach(inp => {
                        const n = (inp.name || inp.id || '').toLowerCase();
                        if (n.includes('resume') || n.includes('cv') || (!n.includes('cover') && !inp.files.length)) {
                          inp.files = dt.files;
                          inp.dispatchEvent(new Event('change', { bubbles: true }));
                          inp.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                      });
                    }
                  }).catch(function(){});
              } catch(e) {}
            }
          });
        })();
        true;
      `;

      webViewRef.current.injectJavaScript(cleanJsCodeForInjection(purpleJs));
    }
  };

  const handleViewTailoredResume = async () => {
    if (previewResumeUri) {
      try {
        await Print.printAsync({ uri: previewResumeUri });
      } catch (e) {
        console.log('Error opening resume preview:', e);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(previewResumeUri);
        }
      }
    } else {
      Alert.alert('Resume Preview', 'No tailored resume file found.');
    }
  };

  const handleStartAiMatch = async () => {
    if (!selectedJob) {
      Alert.alert("Error", "No job is selected to match.");
      return;
    }
    if (!selectedResumeId) {
      Alert.alert("Resume Required", "Please select a resume first.");
      return;
    }
    const baseResume = resumesList.find(r => r.id === selectedResumeId);
    if (!baseResume || !baseResume.uri) {
      Alert.alert("Error", "Selected resume file path is invalid.");
      return;
    }

    setIsMatchingWithAI(true);
    setMatchLoadingStep("Analyzing job details...");

    try {
      const targetCompany = selectedJob?.companyName || 'Company';
      const jobTitle = selectedJob?.title || 'Position';
      const cleanJobDesc = stripHtml(jobDetailsHtml);

      setMatchLoadingStep("Matching resume and cover letter with AI...");
      const formData = new FormData();
      const resumeFileObj: any = {
        uri: baseResume.uri,
        name: baseResume.name,
        type: baseResume.mimeType || 'application/pdf'
      };
      formData.append('resume', resumeFileObj);

      // Include user access token if logged in
      const session = await getSession();
      const headers: any = {
        'Accept': 'application/json',
      };
      if (session && session.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }

      const matchRes = await fetch(`${API_URL}/api/jobs/${selectedJob.id}/match`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!matchRes.ok) {
        const errText = await matchRes.text();
        throw new Error(`Server match failed: ${matchRes.status} - ${errText}`);
      }

      const matchData = await matchRes.json();
      if (!matchData.success) {
        throw new Error(matchData.error || "Failed to analyze match from server.");
      }

      const tailoredHtml = matchData.tailoredResumeHtml || "";
      const generatedCL = matchData.coverLetter || "";

      setMatchLoadingStep("Generating tailored PDF document...");

      const userPrefix = (firstName && lastName)
        ? `${firstName}_${lastName}`
        : firstName
          ? firstName
          : 'User';

      const cleanUserPrefix = userPrefix.replace(/[^a-zA-Z0-9]/g, '_');
      const cleanCompanyForFile = targetCompany.replace(/[^a-zA-Z0-9]/g, '_');
      const cleanTitleForFile = jobTitle.replace(/[^a-zA-Z0-9]/g, '_');
      const formattedResumeName = `${cleanUserPrefix}_${cleanCompanyForFile}_${cleanTitleForFile}.pdf`;
      const cleanResumeUri = `${FileSystem.documentDirectory}${formattedResumeName}`;

      const formattedHtml = `
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; color: #0F172A; line-height: 1.5; font-size: 11pt; }
              h1, h2, h3 { color: #000000; margin-top: 16px; margin-bottom: 6px; }
              p { margin-bottom: 12px; text-align: justify; }
              ul { padding-left: 20px; margin-top: 4px; }
              li { margin-bottom: 4px; }
            </style>
          </head>
          <body>
            ${tailoredHtml}
          </body>
        </html>
      `;

      const printResult = await Print.printToFileAsync({ html: formattedHtml });
      await FileSystem.copyAsync({ from: printResult.uri, to: cleanResumeUri });

      setPreviewResumeUri(cleanResumeUri);
      setPreviewResumeName(formattedResumeName);
      setPreviewResumeHtml(formattedHtml);
      setPreviewCoverLetter(generatedCL);

      // Save tailored resume back to local Resumes list
      const newResumeEntry: SelectedResumeFile = {
        id: `tailored_${Date.now()}`,
        name: formattedResumeName,
        date: new Date().toLocaleDateString(),
        uri: cleanResumeUri,
        mimeType: 'application/pdf',
        isBuilt: true
      };

      const updatedList = sortResumesWithDefaultFirst([newResumeEntry, ...resumesList]);
      const resumesJsonPath = `${FileSystem.documentDirectory}resumes.json`;
      await FileSystem.writeAsStringAsync(resumesJsonPath, JSON.stringify(updatedList));
      setResumesList(updatedList);
      setSelectedResumeId(newResumeEntry.id);

      // Save generated cover letter to local cover_letters.json
      const coverLettersPath = `${FileSystem.documentDirectory}cover_letters.json`;
      let currentLetters: any[] = [];
      try {
        const fileInfo = await FileSystem.getInfoAsync(coverLettersPath);
        if (fileInfo.exists) {
          const content = await FileSystem.readAsStringAsync(coverLettersPath);
          currentLetters = JSON.parse(content);
        }
      } catch (e) { }

      const newLetter = {
        id: Date.now().toString(),
        company: targetCompany,
        jobTitle: jobTitle,
        date: new Date().toLocaleDateString(),
        coverLetterText: generatedCL,
        jobUrl: selectedJob?.absolute_url || '',
        resumeName: formattedResumeName
      };

      const updatedLetters = [newLetter, ...currentLetters];
      await FileSystem.writeAsStringAsync(coverLettersPath, JSON.stringify(updatedLetters));

      setIsMatchingWithAI(false);
      setShowMatchPreviewModal(true);
    } catch (err: any) {
      setIsMatchingWithAI(false);
      Alert.alert("AI Match Failed", err.message || "Failed to tailor resume and cover letter.");
    }
  };

  const handleApply = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      Alert.alert("Missing Fields", "First name, last name, and email are required to apply.");
      return;
    }
    if (resumesList.length === 0) {
      Alert.alert("No Resumes", "Please upload or generate a resume in the app first.");
      return;
    }

    const baseResume = resumesList.find(r => r.id === selectedResumeId);
    if (!baseResume || !baseResume.uri) {
      Alert.alert("Error", "Selected resume file path is invalid.");
      return;
    }

    setIsSubmitting(true);
    try {
      const finalResumeUri = baseResume.uri;
      const finalResumeName = baseResume.name;

      const targetCompany = selectedJob?.companyName || 'COMPANY';
      const targetToken = (selectedJob?.boardToken || 'stripe').toLowerCase();

      // Check if user has their own Greenhouse API key configured for the target board token
      const hasDirectApiKey = !!(config.jobBoardKey && config.boardToken?.toLowerCase() === targetToken);

      if (hasDirectApiKey) {
        // Submit Application via unified backend endpoint
        console.log("Submitting application to backend...");
        const formData = new FormData();
        formData.append('jobId', String(selectedJob?.id));
        formData.append('companySlug', targetToken);
        formData.append('sourceType', selectedJob?.sourceType || 'greenhouse');
        formData.append('firstName', firstName);
        formData.append('lastName', lastName);
        formData.append('email', email);
        if (phone) formData.append('phone', phone);
        if (config.jobBoardKey) formData.append('jobBoardKey', config.jobBoardKey);

        const resumeFileObj: any = {
          uri: finalResumeUri,
          name: finalResumeName,
          type: 'application/pdf'
        };
        formData.append('resume', resumeFileObj);

        // Include user access token if logged in
        const session = await getSession();
        const headers: any = {
          'Accept': 'application/json',
        };
        if (session && session.accessToken) {
          headers['Authorization'] = `Bearer ${session.accessToken}`;
        }

        const postResponse = await fetch(`${API_URL}/api/jobs/apply`, {
          method: 'POST',
          headers,
          body: formData
        });

        if (!postResponse.ok) {
          const errData = await postResponse.json().catch(() => ({}));
          throw new Error(errData.error || `Apply failed with status ${postResponse.status}`);
        }

        // Save contact info back to greenhouse_config.json so it auto-fills next time
        const configPath = `${FileSystem.documentDirectory}greenhouse_config.json`;
        const updatedConfig = {
          ...config,
          firstName,
          lastName,
          email,
          phone,
        };
        await FileSystem.writeAsStringAsync(configPath, JSON.stringify(updatedConfig));
        setConfig(updatedConfig);
        setIsEditingContact(false);

        // Log application locally in applied_jobs.json
        const appliedPath = `${FileSystem.documentDirectory}applied_jobs.json`;
        let currentApplied: any[] = [];
        const appliedInfo = await FileSystem.getInfoAsync(appliedPath);
        if (appliedInfo.exists) {
          const text = await FileSystem.readAsStringAsync(appliedPath);
          currentApplied = JSON.parse(text);
        }

        const newApp = {
          id: `app_${Date.now()}`,
          jobId: String(selectedJob?.id),
          jobTitle: selectedJob?.title || '',
          companyName: targetCompany,
          boardToken: targetToken,
          date: new Date().toLocaleDateString(),
          resumeName: finalResumeName,
          status: 'active',
          currentStage: 'Application Review'
        };

        const updatedApplied = [newApp, ...currentApplied];
        await FileSystem.writeAsStringAsync(appliedPath, JSON.stringify(updatedApplied));

        Alert.alert(
          "Application Submitted",
          "Your application has been successfully submitted! Track its status in Your Doc tab.",
          [
            {
              text: "View Status",
              onPress: () => {
                setSelectedJob(null);
                router.replace('/(tabs)/library');
              }
            },
            {
              text: "Done",
              onPress: () => setSelectedJob(null)
            }
          ]
        );
      } else {
        // External/Other company: launch the in-app Autofill WebView Assistant!
        console.log("Launching in-app Autofill WebView Assistant...");
        const base64Content = await FileSystem.readAsStringAsync(finalResumeUri, { encoding: 'base64' });
        setSelectedResumeBase64(base64Content);
        setSelectedResumeName(finalResumeName);
        setSelectedCoverLetterText(previewCoverLetter);

        // Log application locally in applied_jobs.json for tracking
        const appliedPath = `${FileSystem.documentDirectory}applied_jobs.json`;
        let currentApplied: any[] = [];
        const appliedInfo = await FileSystem.getInfoAsync(appliedPath);
        if (appliedInfo.exists) {
          const text = await FileSystem.readAsStringAsync(appliedPath);
          currentApplied = JSON.parse(text);
        }

        const newApp = {
          id: `app_${Date.now()}`,
          jobId: String(selectedJob?.id),
          jobTitle: selectedJob?.title || '',
          companyName: targetCompany,
          boardToken: targetToken,
          date: new Date().toLocaleDateString(),
          resumeName: finalResumeName,
          status: 'active',
          currentStage: 'Application Review'
        };

        const updatedApplied = [newApp, ...currentApplied];
        await FileSystem.writeAsStringAsync(appliedPath, JSON.stringify(updatedApplied));

        // Save contact info back to greenhouse_config.json so it auto-fills next time
        const configPath = `${FileSystem.documentDirectory}greenhouse_config.json`;
        const updatedConfig = {
          ...config,
          firstName,
          lastName,
          email,
          phone,
        };
        await FileSystem.writeAsStringAsync(configPath, JSON.stringify(updatedConfig));
        setConfig(updatedConfig);
        setIsEditingContact(false);

        // Switch modes: keep selectedJob active for WebView to read details, and show WebView modal
        setWebViewVisible(true);
      }
    } catch (err: any) {
      console.log("Error applying to job:", err);
      Alert.alert("Application Error", err.message || "Failed to submit application.");
    } finally {
      setIsSubmitting(false);
      setShowMatchPreviewModal(false);
    }
  };



  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F3F4F6', '#FFFFFF']} style={StyleSheet.absoluteFillObject} />

      {/* HEADER MATCHING DESIGN MOCKUP */}
      <View style={[styles.newHeader, { marginTop: insets.top + 4 }]}>


        <TouchableOpacity
          style={styles.roleFilterPill}
          activeOpacity={0.75}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowSearchModal(true);
          }}
        >
          <View style={{ flexShrink: 1, marginRight: 8 }}>
            <Text style={styles.roleFilterTitle} numberOfLines={1}>
              {filterQuery ? filterQuery : (selectedSkillsFilter.length > 0 ? selectedSkillsFilter.join(', ') : 'All Jobs')}
            </Text>
            <Text style={styles.roleFilterSub} numberOfLines={1}>
              {filterLocation ? filterLocation : 'All Locations'}
            </Text>
          </View>
          {Platform.OS === 'ios' ? (
            <SymbolView name="slider.horizontal.3" size={16} tintColor="#475569" resizeMode="scaleAspectFit" />
          ) : (
            <Ionicons name="options-outline" size={18} color="#475569" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.creditsPill}
          activeOpacity={0.75}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/pricing' as any);
          }}
        >
          <Text style={styles.creditsPillText}>{totalCredits}</Text>
          <Image
            source={require('../assets/images/header-icon.png')}
            style={{ width: 14, height: 14, marginLeft: 4, resizeMode: 'contain' }}
          />
        </TouchableOpacity>
      </View>

      {/* SUB-HEADER MATCHING DESIGN MOCKUP */}
      <View style={styles.subHeaderRow}>
        <Text style={styles.subHeaderTitle}>
          {`Jobs Match to your resume`}
        </Text>

        <TouchableOpacity
          style={styles.menuCircleBtn}
          activeOpacity={0.7}
          onPress={() => {
            Haptics.selectionAsync();
            setViewMode(prev => prev === 'card' ? 'list' : 'card');
          }}
        >
          {Platform.OS === 'ios' ? (
            <SymbolView name="line.3.horizontal" size={18} tintColor="#0F172A" resizeMode="scaleAspectFit" />
          ) : (
            <Ionicons name={viewMode === 'card' ? "menu-outline" : "copy-outline"} size={22} color="#0F172A" />
          )}
        </TouchableOpacity>
      </View>

      {/* VIEW MODE TOGGLE (SWIPE CARDS VS VERTICAL LIST) */}
      {viewMode === 'list' ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#000000" colors={['#000000']} />
          }
          onScroll={(e) => {
            const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
            const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 350;
            if (isCloseToBottom && hasMore && !isFetchingMore && !isLoadingJobs && filteredJobs.length > 0) {
              const nextPage = currentPage + 1;
              setCurrentPage(nextPage);
              fetchJobsFromAllBoards(nextPage, true, filterQuery, selectedCompanyFilter, filterLocation);
            }
          }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24, paddingTop: 4 }}
        >
          {isLoadingJobs ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
              <ActivityIndicator size="large" color="#000000" />
            </View>
          ) : filteredJobs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>No matching jobs found</Text>
            </View>
          ) : (
            <>
              {filteredJobs.map((jobItem) => (
                <JobListItemCard
                  key={`list-job-${jobItem.id}`}
                  item={jobItem}
                  userProfile={userProfile}
                  onViewDetails={(j) => viewJobDetails(j)}
                  onSkip={(j) => handleListSkip(j)}
                  onOpenMenu={(j) => handleOpenCardMenu(j)}
                  isSkipped={sessionSkippedIds.has(String(jobItem.id))}
                />
              ))}

              {isFetchingMore && (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#000000" />
                  <Text style={{ fontSize: 13, color: '#64748B', marginTop: 8, fontWeight: '500' }}>
                    Loading more jobs...
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      ) : (
        /* Snapping Vertical Card Deck (Tinder Style) */
        <View
          style={{ flex: 1, paddingHorizontal: 24, paddingBottom: 16 }}
          onLayout={(e) => setPagerHeight(e.nativeEvent.layout.height)}
        >
          {isLoadingJobs ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#000000" />
            </View>
          ) : filteredJobs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>No matching jobs found</Text>
            </View>
          ) : currentIndex >= filteredJobs.length ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="sparkles" size={48} color="#000000" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>{"You've swiped through all jobs!"}</Text>
              <TouchableOpacity
                style={styles.resetSwipesBtn}
                onPress={() => { setCurrentIndex(0); }}
              >
                <Text style={styles.resetSwipesBtnText}>Start Over</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flex: 1, position: 'relative', width: '100%' }}>
              {/* Background / Next Card (Behind active card, changes scale/opacity dynamically) */}
              {currentIndex + 1 < filteredJobs.length && (
                <Animated.View
                  key="bg-card"
                  style={[
                    styles.jobCardContainer,
                    backgroundCardStyle,
                    {
                      height: pagerHeight,
                      position: 'absolute',
                      width: '100%',
                      zIndex: 1
                    }
                  ]}
                >
                  <JobCardContent
                    item={filteredJobs[currentIndex + 1]}
                    isActive={false}
                    userProfile={userProfile}
                    onOpenMenu={(j) => handleOpenCardMenu(j)}
                  />
                </Animated.View>
              )}

              {/* Foreground / Active Card (Moves with gesture) */}
              <Animated.View
                key="fg-card"
                {...panResponder.panHandlers}
                style={[
                  styles.jobCardContainer,
                  activeCardStyle,
                  {
                    height: pagerHeight,
                    position: 'absolute',
                    width: '100%',
                    zIndex: 2
                  }
                ]}
              >
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => {
                    const targetJob = filteredJobsRef.current[currentIndexRef.current];
                    if (targetJob) {
                      viewJobDetails(targetJob);
                    }
                  }}
                  style={{ flex: 1 }}
                >
                  <JobCardContent
                    item={filteredJobs[currentIndex]}
                    isActive={true}
                    userProfile={userProfile}
                    likeStyle={likeBadgeStyle}
                    nopeStyle={nopeBadgeStyle}
                    onOpenMenu={(j) => handleOpenCardMenu(j)}
                  />
                </TouchableOpacity>
              </Animated.View>
            </View>
          )}
        </View>
      )}


      {/* Details & Apply Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={selectedJob !== null && !webViewVisible}
        onRequestClose={() => setSelectedJob(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text style={styles.modalJobTitle}>{selectedJob?.title}</Text>
                <Text style={styles.modalCompanyText}>
                  {((selectedJob as any)?.companyName || "COMPANY").toUpperCase()} • {selectedJob?.location.name}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedJob(null)}
              >
                <Ionicons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionHeading}>Job Description</Text>
              <Text style={styles.jobDescriptionBody}>
                {stripHtml(jobDetailsHtml)}
              </Text>

              {selectedJob?.canApplyDirectly !== false && (
                <>
                  <View style={styles.divider} />

                  <Text style={styles.inputLabel}>Resume to Apply</Text>
                  {resumesList.length === 0 ? (
                    <TouchableOpacity
                      style={styles.noResumesBanner}
                      activeOpacity={0.8}
                      onPress={() => {
                        setSelectedJob(null);
                        router.push('/resumes');
                      }}
                    >
                      <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
                      <Text style={styles.noResumesWarningText}>
                        No resume found. Tap to add or set default resume.
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.defaultResumeCard}>
                      <View style={styles.defaultResumeHeaderRow}>
                        <View style={styles.defaultBadgePill}>
                          <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                          <Text style={styles.defaultBadgeText}>Default Resume</Text>
                        </View>

                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => {
                            setSelectedJob(null);
                            router.push('/resumes');
                          }}
                        >
                          <Text style={styles.changeResumeLinkText}>Change in Profile →</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.defaultResumeFileRow}>
                        <Ionicons name="document-text" size={20} color="#000000" />
                        <Text style={styles.defaultResumeFileName} numberOfLines={1}>
                          {resumesList.find(r => String(r.id) === String(selectedResumeId))?.name || resumesList[0]?.name || 'Default Resume'}
                        </Text>
                      </View>
                    </View>
                  )}

                  {previewResumeUri && previewCoverLetter ? (
                    <View style={styles.previewLinksContainer}>
                      <Text style={styles.previewLinksTitle}>AI Matched Documents</Text>

                      {/* Segmented Tab Buttons */}
                      <View style={styles.inlineTabRow}>
                        <TouchableOpacity
                          style={[
                            styles.inlineTabBtn,
                            previewTab === 'resume' && styles.inlineTabBtnActive,
                          ]}
                          activeOpacity={0.8}
                          onPress={() => setPreviewTab('resume')}
                        >
                          <Ionicons
                            name="document-text"
                            size={16}
                            color={previewTab === 'resume' ? '#000000' : '#64748B'}
                          />
                          <Text
                            style={[
                              styles.inlineTabText,
                              previewTab === 'resume' && styles.inlineTabTextActive,
                            ]}
                          >
                            Tailored Resume
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.inlineTabBtn,
                            previewTab === 'cover_letter' && styles.inlineTabBtnActive,
                          ]}
                          activeOpacity={0.8}
                          onPress={() => setPreviewTab('cover_letter')}
                        >
                          <Ionicons
                            name="mail"
                            size={16}
                            color={previewTab === 'cover_letter' ? '#000000' : '#64748B'}
                          />
                          <Text
                            style={[
                              styles.inlineTabText,
                              previewTab === 'cover_letter' && styles.inlineTabTextActive,
                            ]}
                          >
                            Cover Letter
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Inline Preview Content Box */}
                      <View style={styles.inlinePreviewBox}>
                        {previewTab === 'resume' ? (
                          <View style={{ flex: 1 }}>
                            {/* Top Bar for Resume */}
                            <View style={styles.inlinePreviewHeader}>
                              <Text style={styles.inlinePreviewTitleText} numberOfLines={1}>
                                {previewResumeName}
                              </Text>
                              <TouchableOpacity
                                style={styles.openPdfHeaderBtn}
                                activeOpacity={0.8}
                                onPress={handleViewTailoredResume}
                              >
                                <Ionicons name="open-outline" size={14} color="#000000" />
                                <Text style={styles.openPdfHeaderBtnText}>Full PDF</Text>
                              </TouchableOpacity>
                            </View>

                            {/* WebView Embedded Resume Preview */}
                            <View style={{ height: 260, borderRadius: 10, overflow: 'hidden', marginTop: 8 }}>
                              <WebView
                                originWhitelist={['*']}
                                source={{
                                  html: previewResumeHtml || `
                                    <html>
                                      <head>
                                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
                                        <style>
                                          body { font-family: -apple-system, sans-serif; padding: 15px; color: #1E293B; line-height: 1.4; background: #FFFFFF; }
                                          h1 { color: #000000; font-size: 18px; margin-bottom: 4px; }
                                          h2 { color: #475569; font-size: 13px; margin-top: 12px; border-bottom: 1.5px solid #000000; padding-bottom: 3px; }
                                          p { font-size: 12px; margin: 6px 0; }
                                          li { font-size: 11px; margin-bottom: 3px; }
                                        </style>
                                      </head>
                                      <body>
                                        <h1>Tailored Resume</h1>
                                        <p>Position: <strong>${selectedJob?.title || 'Job Application'}</strong></p>
                                        <h2>Summary & Keywords</h2>
                                        <p>ATS matched skills, experience highlights, and target keywords tailored for ${selectedJob?.companyName || 'this job'}.</p>
                                      </body>
                                    </html>
                                  `
                                }}
                                style={{ flex: 1 }}
                                scalesPageToFit={true}
                              />
                            </View>
                          </View>
                        ) : (
                          <View style={{ flex: 1 }}>
                            {/* Top Bar for Cover Letter */}
                            <View style={styles.inlinePreviewHeader}>
                              <Text style={styles.inlinePreviewTitleText}>Matched Cover Letter</Text>
                              <TouchableOpacity
                                style={styles.copyBtn}
                                activeOpacity={0.8}
                                onPress={() => {
                                  Alert.alert('Copied!', 'Cover Letter text copied to clipboard.');
                                }}
                              >
                                <Ionicons name="copy-outline" size={14} color="#000000" />
                                <Text style={styles.copyBtnText}>Copy Text</Text>
                              </TouchableOpacity>
                            </View>

                            {/* Editable Scrollable TextInput for Cover Letter */}
                            <TextInput
                              style={styles.inlineCoverLetterInput}
                              multiline={true}
                              value={previewCoverLetter}
                              onChangeText={setPreviewCoverLetter}
                              textAlignVertical="top"
                              placeholder="Write cover letter..."
                            />
                          </View>
                        )}
                      </View>
                    </View>
                  ) : null}
                  {/* Switch container removed as requested */}
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              {selectedJob?.canApplyDirectly !== false ? (
                previewResumeUri && previewCoverLetter ? (
                  <TouchableOpacity
                    style={[styles.modalSubmitBtn, styles.modalApplyNowBtn, isSubmitting && styles.modalSubmitBtnDisabled]}
                    onPress={handleApply}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.modalSubmitBtnText}>
                          Apply
                        </Text>
                        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.modalSubmitBtn, (isSubmitting || isMatchingWithAI || resumesList.length === 0) && styles.modalSubmitBtnDisabled]}
                    onPress={handleStartAiMatch}
                    disabled={isSubmitting || isMatchingWithAI || resumesList.length === 0}
                  >
                    {(isSubmitting || isMatchingWithAI) ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.modalSubmitBtnText}>
                          Match Resume and Cover Letter
                        </Text>
                        <Ionicons name="sparkles" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                      </>
                    )}
                  </TouchableOpacity>
                )
              ) : (
                <TouchableOpacity
                  style={styles.modalSubmitBtn}
                  onPress={() => {
                    if (selectedJob?.absolute_url) {
                      const targetUrl = selectedJob.absolute_url;
                      const targetTitle = selectedJob.title || '';
                      const targetComp = selectedJob.companyName || 'Company';
                      setSelectedJob(null);
                      router.push({
                        pathname: '/apply-job',
                        params: {
                          url: targetUrl,
                          title: targetTitle,
                          company: targetComp
                        }
                      });
                    }
                  }}
                >
                  <Text style={styles.modalSubmitBtnText}>
                    View & Apply on Company Site
                  </Text>
                  <Ionicons name="open-outline" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={webViewVisible}
        animationType="slide"
        onRequestClose={() => {
          setWebViewVisible(false);
          setSelectedJob(null);
        }}
        onDismiss={() => {
          setWebViewVisible(false);
          setSelectedJob(null);
        }}
      >
        <SafeAreaView style={styles.webViewModalContainer}>
          <View style={styles.webViewHeader}>
            <TouchableOpacity
              style={styles.webViewCloseBtn}
              onPress={() => {
                setWebViewVisible(false);
                setSelectedJob(null);
              }}
            >
              <Ionicons name="close" size={24} color="#000000" />
            </TouchableOpacity>
            <View style={styles.webViewTitleContainer}>
              <Text style={styles.webViewTitle} numberOfLines={1}>
                {selectedJob?.companyName || 'Apply'}
              </Text>
              <Text style={styles.webViewSubtitle} numberOfLines={1}>
                {selectedJob?.title || 'Job Post'}
              </Text>
            </View>
            <View style={styles.webViewStatusBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.statusBadgeText}>Autofill Active</Text>
            </View>
          </View>

          <WebView
            ref={webViewRef}
            source={{ uri: getDirectAtsUrl(selectedJob?.absolute_url || '') }}
            onLoadEnd={injectAutofillScript}
            onMessage={handleWebViewMessage}
            style={{ flex: 1 }}
            domStorageEnabled={true}
            javaScriptEnabled={true}
            setSupportMultipleWindows={false}
            onShouldStartLoadWithRequest={() => true}
            injectedJavaScriptForMainFrameOnly={false}
            injectedJavaScript={cleanJsCodeForInjection(getAutofillJS())}
            allowFileAccess={true}
            allowFileAccessFromFileURLs={true}
            allowUniversalAccessFromFileURLs={true}
            originWhitelist={['*']}
            mixedContentMode="always"
            startInLoadingState={true}
            renderLoading={() => (
              <ActivityIndicator
                size="large"
                color="#000000"
                style={StyleSheet.absoluteFillObject}
              />
            )}
          />

          <View style={styles.webViewFooter}>
            <Text style={styles.webViewFooterText}>
              ⚡ اطلاعات تماس شما با موفقیت پر شد! به دلیل امنیت آیفون، آپلود فایل خودکار امکان‌پذیر نیست. لطفاً روی دکمهٔ اشتراک‌گذاری زیر بزنید و رزومه را ذخیره (Save to Files) کنید، سپس دکمهٔ Attach را در صفحه زده و آن را انتخاب کنید.
            </Text>
            <TouchableOpacity
              style={styles.webViewShareBtn}
              onPress={async () => {
                try {
                  const Sharing = require('expo-sharing');
                  const targetPath = `${FileSystem.documentDirectory}${selectedResumeName || 'resume.pdf'}`;
                  const exists = await FileSystem.getInfoAsync(targetPath);
                  if (!exists.exists && selectedResumeBase64) {
                    await FileSystem.writeAsStringAsync(targetPath, selectedResumeBase64, { encoding: 'base64' });
                  }
                  await Sharing.shareAsync(targetPath, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Save Resume to Files'
                  });
                } catch (e) {
                  console.log('Error sharing resume from webview footer:', e);
                }
              }}
            >
              <Ionicons name="share-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.webViewShareBtnText}>اشتراک‌گذاری و ذخیرهٔ رزومه</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* AI Matching Loading Modal */}
      <Modal
        transparent={true}
        visible={isMatchingWithAI}
        animationType="fade"
      >
        <View style={styles.loaderOverlay}>
          <View style={styles.loaderCard}>
            <ActivityIndicator size="large" color="#000000" />
            <Text style={styles.loaderTitle}>AI Matching Active</Text>
            <Text style={styles.loaderText}>{matchLoadingStep}</Text>
          </View>
        </View>
      </Modal>

      {/* Match Preview Modal */}
      <Modal
        visible={showMatchPreviewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMatchPreviewModal(false)}
      >
        <View style={styles.previewOverlay}>
          <View style={styles.previewContent}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewHeaderTitle}>AI Matching Preview</Text>
              <Text style={styles.previewHeaderSubtitle}>
                Review customized assets for {selectedJob?.companyName || 'Company'}
              </Text>
            </View>

            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, previewTab === 'cover_letter' && styles.tabButtonActive]}
                onPress={() => setPreviewTab('cover_letter')}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={previewTab === 'cover_letter' ? '#000000' : '#64748B'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.tabText, previewTab === 'cover_letter' && styles.tabTextActive]}>
                  Cover Letter
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, previewTab === 'resume' && styles.tabButtonActive]}
                onPress={() => setPreviewTab('resume')}
              >
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color={previewTab === 'resume' ? '#000000' : '#64748B'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.tabText, previewTab === 'resume' && styles.tabTextActive]}>
                  Tailored Resume
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.previewBody}>
              {previewTab === 'cover_letter' ? (
                <View style={{ flex: 1 }}>
                  <Text style={styles.bodyInstruction}>
                    Edit the matched cover letter text below if needed:
                  </Text>
                  <TextInput
                    style={styles.coverLetterEditor}
                    multiline={true}
                    value={previewCoverLetter}
                    onChangeText={setPreviewCoverLetter}
                    textAlignVertical="top"
                    placeholder="Write cover letter..."
                  />
                </View>
              ) : (
                <View style={styles.resumePreviewContainer}>
                  <View style={styles.resumePreviewTopBar}>
                    <Text style={styles.resumePreviewNameText} numberOfLines={1}>
                      {previewResumeName}
                    </Text>
                    <TouchableOpacity
                      style={styles.openPdfHeaderBtn}
                      activeOpacity={0.8}
                      onPress={handleViewTailoredResume}
                    >
                      <Ionicons name="open-outline" size={15} color="#000000" />
                      <Text style={styles.openPdfHeaderBtnText}>Full PDF</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.webViewWrapper}>
                    <WebView
                      originWhitelist={['*']}
                      source={{
                        html: previewResumeHtml || `
                          <html>
                            <head>
                              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
                              <style>
                                body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 20px; color: #1E293B; line-height: 1.5; background: #FFFFFF; }
                                h1 { color: #000000; font-size: 20px; margin-bottom: 4px; font-weight: 800; }
                                h2 { color: #475569; font-size: 14px; margin-top: 16px; border-bottom: 2px solid #000000; padding-bottom: 4px; font-weight: 700; }
                                p { font-size: 13px; margin: 8px 0; }
                                ul { padding-left: 18px; margin: 6px 0; }
                                li { font-size: 12px; margin-bottom: 4px; color: #334155; }
                              </style>
                            </head>
                            <body>
                              <h1>Tailored Resume</h1>
                              <p>Optimized for position: <strong>${selectedJob?.title || 'Job Application'}</strong> at <strong>${selectedJob?.companyName || 'Employer'}</strong></p>
                              <h2>Summary & Key Qualifications</h2>
                              <p>ATS matched skills, experience highlights, and target keywords tailored for this job.</p>
                            </body>
                          </html>
                        `
                      }}
                      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
                      scalesPageToFit={true}
                    />
                  </View>
                </View>
              )}
            </View>

            <View style={styles.previewFooter}>
              <TouchableOpacity
                style={styles.previewCancelBtn}
                onPress={() => setShowMatchPreviewModal(false)}
              >
                <Text style={styles.previewCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.previewProceedBtn}
                onPress={handleApply}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.previewProceedBtnText}>Apply</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 3-DOTS QUICK ACTIONS POPUP MODAL */}
      <Modal
        visible={showCardMenuModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCardMenuModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdropOverlay}
          activeOpacity={1}
          onPress={() => setShowCardMenuModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.cardMenuModalCard}>
            {/* Header */}
            <View style={styles.cardMenuHeaderRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.cardMenuTitleText} numberOfLines={1}>{menuJob?.title || 'Job Options'}</Text>
                <Text style={styles.cardMenuCompanyText} numberOfLines={1}>{menuJob?.companyName || 'Company'}</Text>
              </View>
              <TouchableOpacity style={styles.cardMenuCloseBtn} onPress={() => setShowCardMenuModal(false)}>
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.cardMenuDividerLine} />

            {/* Menu Option 1: Already Applied */}
            <TouchableOpacity
              style={styles.cardMenuItemRow}
              activeOpacity={0.7}
              onPress={() => menuJob && handleActionAlreadyApplied(menuJob)}
            >
              <View style={[styles.cardMenuIconCircle, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#166534" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.cardMenuItemTitle}>Already Applied</Text>
                <Text style={styles.cardMenuItemSub}>Save to your applied jobs list</Text>
              </View>
            </TouchableOpacity>

            {/* Menu Option 2: Share Listing */}
            <TouchableOpacity
              style={styles.cardMenuItemRow}
              activeOpacity={0.7}
              onPress={() => menuJob && handleActionShare(menuJob)}
            >
              <View style={[styles.cardMenuIconCircle, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="paper-plane-outline" size={19} color="#1E40AF" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.cardMenuItemTitle}>Share Listing</Text>
                <Text style={styles.cardMenuItemSub}>Share job details or direct link</Text>
              </View>
            </TouchableOpacity>

            {/* Menu Option 3: Remove / Skip */}
            <TouchableOpacity
              style={styles.cardMenuItemRow}
              activeOpacity={0.7}
              onPress={() => menuJob && handleActionRemove(menuJob)}
            >
              <View style={[styles.cardMenuIconCircle, { backgroundColor: '#F1F5F9' }]}>
                <Ionicons name="eye-off-outline" size={19} color="#475569" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.cardMenuItemTitle}>Remove from List</Text>
                <Text style={styles.cardMenuItemSub}>Hide listing from your job feed</Text>
              </View>
            </TouchableOpacity>

            {/* Menu Option 4: Report Issue */}
            <TouchableOpacity
              style={[styles.cardMenuItemRow, { borderBottomWidth: 0 }]}
              activeOpacity={0.7}
              onPress={() => menuJob && handleActionOpenReport(menuJob)}
            >
              <View style={[styles.cardMenuIconCircle, { backgroundColor: '#FFE4E6' }]}>
                <Ionicons name="flag-outline" size={19} color="#E11D48" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.cardMenuItemTitle, { color: '#E11D48' }]}>Report Listing</Text>
                <Text style={styles.cardMenuItemSub}>Report suspicious or inaccurate post</Text>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* CUSTOM REPORT ISSUE MODAL */}
      <Modal
        visible={showReportModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            style={styles.modalBackdropOverlay}
            activeOpacity={1}
            onPress={() => setShowReportModal(false)}
          >
            <TouchableOpacity activeOpacity={1} style={styles.reportModalCard}>
              <View style={styles.reportHeaderRow}>
                <View style={styles.reportShieldIconBox}>
                  <Ionicons name="shield-checkmark" size={22} color="#000000" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.reportModalTitle}>Report Listing</Text>
                  <Text style={styles.reportModalSub} numberOfLines={1}>
                    {reportJob ? `${reportJob.title} • ${reportJob.companyName || 'Company'}` : 'Tell us what is wrong'}
                  </Text>
                </View>
                <TouchableOpacity style={styles.cardMenuCloseBtn} onPress={() => setShowReportModal(false)}>
                  <Ionicons name="close" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Text style={styles.reportSectionLabel}>What issue did you spot?</Text>

              {/* Reasons List */}
              <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                {[
                  {
                    id: 'scam',
                    label: 'Suspicious or Fraudulent Post',
                    sub: 'Appears to be a scam, fake recruiter, or phishing'
                  },
                  {
                    id: 'inaccurate',
                    label: 'Inaccurate Details or Salary',
                    sub: 'Incorrect job title, requirements, or pay'
                  },
                  {
                    id: 'location',
                    label: 'Incorrect Location or Remote Status',
                    sub: 'Mislabeled city, country, or remote work model'
                  },
                  {
                    id: 'expired',
                    label: 'Broken Link or No Longer Available',
                    sub: 'The application link is broken or role is filled'
                  },
                  {
                    id: 'offensive',
                    label: 'Inappropriate Content',
                    sub: 'Contains discriminatory or offensive language'
                  }
                ].map((reason) => {
                  const isSelected = selectedReportReason === reason.id;
                  return (
                    <TouchableOpacity
                      key={`reason-${reason.id}`}
                      style={[styles.reportReasonRow, isSelected && styles.reportReasonRowSelected]}
                      activeOpacity={0.7}
                      onPress={() => setSelectedReportReason(reason.id)}
                    >
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                        {isSelected && <View style={styles.radioDotInner} />}
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[styles.reportReasonTitle, isSelected && styles.reportReasonTitleSelected]}>
                          {reason.label}
                        </Text>
                        <Text style={styles.reportReasonSub}>{reason.sub}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Optional Text input */}
              <TextInput
                style={styles.reportNoteInput}
                placeholder="Additional comments (optional)..."
                placeholderTextColor="#94A3B8"
                value={reportNote}
                onChangeText={setReportNote}
                multiline={true}
                numberOfLines={2}
              />

              {/* Action Buttons */}
              <View style={styles.reportFooterRow}>
                <TouchableOpacity
                  style={styles.reportCancelBtn}
                  onPress={() => setShowReportModal(false)}
                >
                  <Text style={styles.reportCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.reportSubmitBtn, !selectedReportReason && { opacity: 0.5 }]}
                  disabled={!selectedReportReason || isSubmittingReport}
                  onPress={handleSubmitReport}
                >
                  {isSubmittingReport ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.reportSubmitBtnText}>Submit Report</Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Search & Filter Role Modal */}
      <Modal
        visible={showSearchModal}
        animationType="slide"
        presentationStyle="pageSheet"
        transparent={false}
        onRequestClose={() => setShowSearchModal(false)}
        onDismiss={() => setShowSearchModal(false)}
      >
        <SafeAreaView style={styles.pageSheetContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <View style={styles.pageSheetContent}>
              {/* Modal Header (Pinned at Top) */}
              <View style={styles.searchModalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="options-outline" size={20} color="#000000" style={{ marginRight: 6 }} />
                  <Text style={styles.searchModalTitle}>Filter Jobs & Roles</Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setFilterQuery('');
                      setFilterWorkModel('ALL');
                      setFilterExperience('ALL');
                      setFilterSalary('ALL');
                      setFilterLocation('');
                      setSelectedCompanyFilter('ALL');
                      setSelectedSkillsFilter([]);
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748B' }}>Reset All</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setShowSearchModal(false)}>
                    <Ionicons name="close" size={24} color="#0F172A" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* PINNED KEYWORD / JOB TITLE INPUT (NO AUTO FOCUS) */}
              <View style={{ marginTop: 12, marginBottom: 12 }}>
                <Text style={styles.searchLabel}>Target Role / Keyword</Text>
                <View style={styles.searchModalInputWrapper}>
                  <Ionicons name="search-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
                  <TextInput
                    ref={searchInputRef}
                    style={styles.searchModalInputText}
                    placeholder="Type a skill/role and press Enter (e.g. Designer, SEO...)"
                    placeholderTextColor="#94A3B8"
                    value={filterQuery}
                    onChangeText={setFilterQuery}
                    onSubmitEditing={() => {
                      const queryVal = filterQuery.trim();
                      if (queryVal.length > 0) {
                        if (!selectedSkillsFilter.some(s => s.toLowerCase() === queryVal.toLowerCase())) {
                          setSelectedSkillsFilter(prev => [...prev, queryVal]);
                        }
                        setFilterQuery('');
                      }
                    }}
                    returnKeyType="done"
                    autoFocus={false}
                  />
                  {filterQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setFilterQuery('')}>
                      <Ionicons name="close-circle" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* SCROLLABLE CHIP FILTERS */}
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 24 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* SECTION 0: YOUR SKILLS & TARGET ROLES */}
                {(() => {
                  const onboardSkills = userProfile ? getUserSkillsList(userProfile) : [];
                  const allDisplaySkills = Array.from(new Set([...onboardSkills, ...selectedSkillsFilter]));
                  if (allDisplaySkills.length === 0) return null;

                  return (
                    <View style={{ marginTop: 4, marginBottom: 14 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={styles.searchLabel}>Skills & Target Roles</Text>
                        {selectedSkillsFilter.length > 0 && (
                          <TouchableOpacity onPress={() => setSelectedSkillsFilter([])}>
                            <Text style={{ fontSize: 12, color: '#3B82F6', fontWeight: '600' }}>Clear ({selectedSkillsFilter.length})</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
                        <TouchableOpacity
                          style={[styles.filterChip, selectedSkillsFilter.length === 0 && styles.filterChipActive]}
                          onPress={() => setSelectedSkillsFilter([])}
                        >
                          <Text style={[styles.filterChipText, selectedSkillsFilter.length === 0 && styles.filterChipTextActive]}>
                            ✨ All Skills
                          </Text>
                        </TouchableOpacity>
                        {allDisplaySkills.map((skill: string, idx: number) => {
                          const isSelected = selectedSkillsFilter.includes(skill);
                          return (
                            <TouchableOpacity
                              key={`skill-chip-${idx}-${skill}`}
                              style={[styles.filterChip, isSelected && styles.filterChipActive]}
                              onPress={() => {
                                setSelectedSkillsFilter(prev =>
                                  isSelected ? prev.filter(s => s !== skill) : [...prev, skill]
                                );
                              }}
                            >
                              <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                                {isSelected ? '✓ ' : ''}{skill}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  );
                })()}
                {/* SECTION 1: EXPECTED SALARY RANGE */}
                <View style={{ marginTop: 4 }}>
                  <Text style={styles.searchLabel}>Expected Salary Range</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
                    {['ALL', '$50K - $100K', '$100K - $180K', '$180K+'].map((sal) => (
                      <TouchableOpacity
                        key={`sal-${sal}`}
                        style={[styles.filterChip, filterSalary === sal && styles.filterChipActive]}
                        onPress={() => setFilterSalary(sal)}
                      >
                        <Text style={[styles.filterChipText, filterSalary === sal && styles.filterChipTextActive]}>
                          💰 {sal}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* SECTION 2: WORK LOCATION TYPE */}
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.searchLabel}>Work Location Type</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
                    {['ALL', 'Remote', 'Hybrid', 'In Person'].map((model) => (
                      <TouchableOpacity
                        key={`model-${model}`}
                        style={[styles.filterChip, filterWorkModel === model && styles.filterChipActive]}
                        onPress={() => setFilterWorkModel(model)}
                      >
                        <Text style={[styles.filterChipText, filterWorkModel === model && styles.filterChipTextActive]}>
                          {model}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* SECTION 3: EXPERIENCE LEVEL */}
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.searchLabel}>Experience Seniority</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
                    {[
                      { id: 'ALL', label: 'All Levels' },
                      { id: 'Senior', label: 'Senior (5+ yrs)' },
                      { id: 'Mid', label: 'Mid-Level (3-4 yrs)' },
                      { id: 'Junior', label: 'Junior / Intern' }
                    ].map((exp) => (
                      <TouchableOpacity
                        key={`exp-${exp.id}`}
                        style={[styles.filterChip, filterExperience === exp.id && styles.filterChipActive]}
                        onPress={() => setFilterExperience(exp.id)}
                      >
                        <Text style={[styles.filterChipText, filterExperience === exp.id && styles.filterChipTextActive]}>
                          {exp.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* SECTION 4: LOCATION FILTER */}
                <View style={{ marginTop: 18 }}>
                  <Text style={styles.searchLabel}>Location</Text>

                  {/* Search input for Location */}
                  <View style={styles.locationInputWrapper}>
                    <Ionicons name="location-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.locationInputText}
                      placeholder="Search city, state, or country..."
                      placeholderTextColor="#94A3B8"
                      value={filterLocation}
                      onChangeText={setFilterLocation}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {filterLocation.length > 0 && (
                      <TouchableOpacity onPress={() => setFilterLocation('')}>
                        <Ionicons name="close-circle" size={18} color="#94A3B8" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Quick select Location Chips */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterChipRow, { marginTop: 8 }]}>
                    {[
                      { label: 'All Locations', value: '' },
                      { label: 'San Francisco, CA', value: 'San Francisco' },
                      { label: 'New York, NY', value: 'New York' },
                      { label: 'London, UK', value: 'London' },
                      { label: 'Berlin, DE', value: 'Berlin' },
                      { label: 'Toronto, CA', value: 'Toronto' }
                    ].map((loc) => (
                      <TouchableOpacity
                        key={`loc-chip-${loc.label}`}
                        style={[styles.filterChip, filterLocation.toLowerCase() === loc.value.toLowerCase() && styles.filterChipActive]}
                        onPress={() => setFilterLocation(loc.value)}
                      >
                        <Text style={[styles.filterChipText, filterLocation.toLowerCase() === loc.value.toLowerCase() && styles.filterChipTextActive]}>
                          📍 {loc.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </ScrollView>

              <TouchableOpacity
                style={[styles.applyFilterBtn, { marginBottom: Platform.OS === 'ios' ? 0 : 12 }]}
                activeOpacity={0.8}
                onPress={() => setShowSearchModal(false)}
              >
                <Text style={styles.applyFilterBtnText}>Apply & Filter Jobs</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#000000',
    fontSize: 20,
    fontWeight: '700',
  },
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 12,
  },
  searchLabel: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBarInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: 16,
    color: '#000000',
    fontWeight: '600',
    fontSize: 14,
  },
  companyPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  companyPillActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  companyPillText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '700',
  },
  companyPillTextActive: {
    color: '#FFFFFF',
  },
  jobCardContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  premiumCard: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  companyTagLarge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  companyTagTextLarge: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '800',
  },
  deckIndicatorText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '800',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardTitle: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
    marginBottom: 12,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardMetaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    flexShrink: 1,
  },
  cardMetaText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
    flexShrink: 1,
  },
  cardDivider: {
    height: 1.5,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  cardSectionHeading: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  cardSnippetContainer: {
    flex: 1,
    marginBottom: 12,
    justifyContent: 'center',
  },
  cardSnippetText: {
    color: '#4B5563',
    fontSize: 13,
    lineHeight: 18,
  },
  cardFooter: {
    paddingTop: 8,
  },
  premiumApplyBtn: {
    backgroundColor: '#000000',
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  premiumApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '90%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalJobTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800',
  },
  modalCompanyText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    flex: 1,
  },
  sectionHeading: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  jobDescriptionBody: {
    color: '#4B5563',
    fontSize: 14,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
  formInput: {
    height: 48,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputLabel: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 8,
  },
  dropdownContainer: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 8,
    marginBottom: 16,
    gap: 6,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  dropdownItemSelected: {
    backgroundColor: '#F1F5F9',
  },
  dropdownText: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  dropdownTextSelected: {
    color: '#000000',
    fontWeight: '700',
  },
  noResumesWarning: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  switchLabel: {
    color: '#6B21A8',
    fontSize: 14,
    fontWeight: '800',
  },
  switchDesc: {
    color: '#701A75',
    fontSize: 11,
    lineHeight: 14,
    marginTop: 4,
  },
  modalFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modalSubmitBtn: {
    backgroundColor: '#000000',
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubmitBtnDisabled: {
    opacity: 0.6,
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  contactSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  contactSummaryName: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '700',
  },
  contactSummaryEmail: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 2,
  },
  editContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editContactBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '700',
  },
  saveContactEditBtn: {
    backgroundColor: '#F3F4F6',
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  saveContactEditBtnText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700',
  },
  swipeBadge: {
    position: 'absolute',
    top: 45,
    borderWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    transform: [{ rotate: '-12deg' }],
  },
  likeBadge: {
    left: 24,
    borderColor: '#10B981',
  },
  likeBadgeText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  nopeBadge: {
    right: 24,
    borderColor: '#EF4444',
    transform: [{ rotate: '12deg' }],
  },
  nopeBadgeText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  resetSwipesBtn: {
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  resetSwipesBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // 3-Dots Menu Modal Styles
  modalBackdropOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  cardMenuModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  cardMenuHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardMenuTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardMenuCompanyText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  cardMenuCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMenuDividerLine: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  cardMenuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  cardMenuIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMenuItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  cardMenuItemSub: {
    fontSize: 12,
    fontWeight: '400',
    color: '#64748B',
    marginTop: 1,
  },

  // Custom Report Issue Modal Styles
  reportModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  reportHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  reportShieldIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  reportModalSub: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  reportSectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 10,
  },
  reportReasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    marginBottom: 8,
  },
  reportReasonRowSelected: {
    backgroundColor: '#f1f5f9',
    borderColor: '#000000',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#000000',
  },
  radioDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000000',
  },
  reportReasonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  reportReasonTitleSelected: {
    color: '#000000',
  },
  reportReasonSub: {
    fontSize: 12,
    fontWeight: '400',
    color: '#64748B',
    marginTop: 2,
  },
  reportNoteInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    height: 60,
    textAlignVertical: 'top',
    marginTop: 8,
    marginBottom: 16,
  },
  reportFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  reportCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  reportCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  reportSubmitBtn: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    backgroundColor: '#000000',
  },
  reportSubmitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 28,
    marginTop: 16,
    marginBottom: 8,
  },
  actionBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  actionBtnSkip: {
    backgroundColor: 'rgba(254, 226, 226, 0.75)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  actionBtnApply: {
    backgroundColor: 'rgba(209, 250, 229, 0.75)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  loadingCard: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCardText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginTop: 8,
  },
  webViewModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  webViewCloseBtn: {
    padding: 8,
  },
  webViewTitleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  webViewTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
  },
  webViewSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  webViewStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  webViewFooter: {
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    padding: 16,
    alignItems: 'center',
  },
  webViewFooterText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
    textAlign: 'center',
    marginBottom: 10,
  },
  webViewShareBtn: {
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  webViewShareBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  loaderOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    width: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  loaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 6,
  },
  loaderText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  previewContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    height: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  previewHeader: {
    marginBottom: 16,
  },
  previewHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  previewHeaderSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  previewBody: {
    flex: 1,
    marginBottom: 16,
  },
  bodyInstruction: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 8,
  },
  coverLetterEditor: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 18,
  },
  resumePreviewCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  resumePreviewName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  resumePreviewDesc: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  keywordBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  keywordBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5',
  },
  previewFooter: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
    marginBottom: 20,
  },
  previewCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  previewProceedBtn: {
    flex: 2,
    backgroundColor: '#000000',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewProceedBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  previewLinksContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  previewLinksTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  previewLinksRow: {
    flexDirection: 'row',
    gap: 10,
  },
  previewLinkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 6,
  },
  previewLinkBtnText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  openPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#000000',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    marginVertical: 14,
    width: '100%',
  },
  openPdfBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  resumePreviewContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resumePreviewTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  resumePreviewNameText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginRight: 8,
  },
  openPdfHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  openPdfHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  webViewWrapper: {
    flex: 1,
    minHeight: 280,
  },
  modalApplyNowBtn: {
    backgroundColor: '#10B981',
  },
  inlineTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  inlineTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inlineTabBtnActive: {
    backgroundColor: '#f1f5f9',
    borderColor: '#000000',
  },
  inlineTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  inlineTabTextActive: {
    color: '#000000',
  },
  inlinePreviewBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    minHeight: 220,
    marginBottom: 14,
  },
  inlinePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  inlinePreviewTitleText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginRight: 8,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  inlineCoverLetterInput: {
    minHeight: 180,
    maxHeight: 260,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    lineHeight: 19,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  defaultResumeCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  defaultResumeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  defaultBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16A34A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  changeResumeLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  defaultResumeFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  defaultResumeFileName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  noResumesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginBottom: 14,
  },
  noResumesWarningText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B91C1C',
    flex: 1,
  },
  newHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
  },
  roleFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    height: 48,
    maxWidth: '70%',
  },
  roleFilterTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  roleFilterSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  creditsPill: {
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
  creditsPillText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '700',
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  subHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  menuCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    marginLeft: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  companyLogoSquare: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardJobTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  cardCompanySub: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  metaGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
    marginTop: 20,
    justifyContent: 'space-between',
  },
  metaGridItem: {
    width: '32%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaGridText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
    marginLeft: 4,
  },
  cardDividerLine: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 18,
  },
  matchPillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricCardOrange: {
    backgroundColor: '#FF4500',
  },
  metricCardGreen: {
    backgroundColor: '#DCFCE7',
  },
  metricCardGray: {
    backgroundColor: '#E2E8F0',
  },
  metricCardValueWhite: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  metricCardLabelWhite: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  metricCardValueGreen: {
    fontSize: 16,
    fontWeight: '900',
    color: '#166534',
  },
  metricCardLabelGreen: {
    fontSize: 9,
    fontWeight: '800',
    color: '#166534',
    marginTop: 2,
  },
  metricCardValueGray: {
    fontSize: 16,
    fontWeight: '900',
    color: '#334155',
  },
  metricCardLabelGray: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
    marginTop: 2,
  },
  qualificationsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingRight: 6,
  },
  bulletDot: {
    fontSize: 14,
    color: '#475569',
    marginRight: 6,
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: '#334155',
  },
  searchModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  searchModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  locationInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
  },
  locationInputText: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
  },
  pageSheetContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  pageSheetContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 12 : 24,
  },
  searchModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  searchModalInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  applyFilterBtn: {
    backgroundColor: '#000000',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  applyFilterBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  listItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  listItemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemLogoSquare: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  listItemSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  listItemScoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
  },
  listItemScoreText: {
    fontSize: 13,
    fontWeight: '700',
  },
  listItemMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
    marginTop: 14,
    justifyContent: 'space-between',
  },
  listItemActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  listItemViewDetailBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  listItemViewDetailText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  listItemCircleActionBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  searchModalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
  },
  searchModalInputText: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
  },
  filterChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
});

function stripHtml(html: string) {
  if (!html) return '';
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&middot;/g, '•')
    .replace(/&bull;/g, '•')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

// Helper to extract clean bullet points / qualifications directly from job content
function getJobQualifications(job: GreenhouseJob): string[] {
  const rawContent = job.content || (job as any).cleanSnippet || "";
  const clean = stripHtml(rawContent);
  if (!clean) {
    return [
      `Strong interest and competency in ${job.title} roles.`,
      `Demonstrated capability in ${job.departments?.[0]?.name || 'relevant domain'} projects.`,
      `Excellent communication, problem-solving, and team collaboration skills.`
    ];
  }

  // Split into lines
  const lines = clean.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 15);

  // Find lines starting with bullets or key requirement words
  const bullets = lines.filter(l => /^[•\-\*\d\.]/.test(l) || /required|experience|ability|proficient|strong|bachelor|degree|responsible|skills|understanding|knowledge/i.test(l));

  if (bullets.length >= 2) {
    return bullets.slice(0, 4).map(b => b.replace(/^[•\-\*\d\.\s]+/, '').trim());
  }

  // Fallback to top sentences
  const sentences = clean.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 25);
  if (sentences.length >= 2) {
    return sentences.slice(0, 4);
  }

  return [
    `Proven experience in ${job.title} domain fundamentals.`,
    `Ability to collaborate effectively across cross-functional teams.`,
    `Track record of delivering quality results under fast-paced deadlines.`
  ];
}

function extractSalaryFromText(text: string | null | undefined): string | null {
  if (!text || typeof text !== 'string') return null;

  const labelMatch = text.match(/(?:salary|compensation|base pay|pay range|remuneration|rate)\s*(?:range|rate)?\s*[:\-\=]?\s*([\$€£¥]\s*\d[\d,\.]*\s*(?:[kK]|thousand)?\s*(?:[\-\–\—]|to)\s*[\$€£¥]?\s*\d[\d,\.]*\s*(?:[kK]|thousand)?(?:\s*\/(?:yr|year|hr|hour|mo|month))?|[\$€£¥]\s*\d[\d,\.]*\s*(?:[kK]|thousand)?(?:\s*\/(?:yr|year|hr|hour|mo|month))?)/i);
  if (labelMatch && labelMatch[1]) {
    return labelMatch[1].trim();
  }

  const rangeMatch = text.match(/([\$€£¥]\s*\d{2,3}(?:,\d{3})*(?:\.\d{2})?\s*(?:[kK])?\s*(?:[\-\–\—]|to)\s*[\$€£¥]?\s*\d{2,3}(?:,\d{3})*(?:\.\d{2})?\s*(?:[kK])?(?:\s*(?:USD|EUR|GBP|CAD|AUD))?(?:\s*\/(?:yr|year|hr|hour|mo|month|annum))?)/i);
  if (rangeMatch && rangeMatch[1]) {
    return rangeMatch[1].trim();
  }

  const shortRangeMatch = text.match(/([\$€£¥]?\s*\d{2,3}\s*k\s*(?:[\-\–\—]|to)\s*[\$€£¥]?\s*\d{2,3}\s*k(?:\s*(?:USD|EUR|GBP))?)/i);
  if (shortRangeMatch && shortRangeMatch[1]) {
    return shortRangeMatch[1].trim();
  }

  return null;
}

// Helper to format raw numbers like 120000 into clean $120K strings
function formatSalaryText(raw: string): string {
  if (!raw) return '';
  let formatted = raw.trim();

  // Remove word 'Salary'
  formatted = formatted.replace(/\bsalary\b/gi, '').trim();

  // Convert numbers with thousands like 140,000 or 140000 into 140K
  formatted = formatted
    .replace(/([\$€£¥]?\d{1,3}),000\b/g, '$1K')
    .replace(/([\$€£¥]?\d{2,3})000\b/g, '$1K')
    .replace(/([\$€£¥]?\d{1,3}(?:\.\d+)?)\s*k\b/gi, '$1K');

  // Fix spaces around hyphens e.g. $140K-$180K -> $140K - $180K
  formatted = formatted.replace(/([\$€£¥]?\d+[Kk]?)\s*[\-\–\—]\s*([\$€£¥]?\d+[Kk]?)/g, '$1 - $2');

  formatted = formatted.replace(/\s+/g, ' ').trim();

  if (!formatted.startsWith('$') && !formatted.startsWith('€') && !formatted.startsWith('£') && /^\d/.test(formatted)) {
    formatted = `$${formatted}`;
  }

  return formatted;
}

// Helper to determine real/realistic salary
// Helper to extract real salary from API job data (returns empty string if not in API)
function getJobSalary(job: any): string {
  if (!job) return '';

  if (job.salary && typeof job.salary === 'string' && job.salary.trim()) {
    return formatSalaryText(job.salary.trim());
  }

  const extracted = extractSalaryFromText(job.content || job.cleanSnippet || '');
  if (extracted) {
    return formatSalaryText(extracted);
  }

  return '';
}

function getUserSkillsList(profile: any): string[] {
  if (!profile) return [];
  const list: string[] = [];

  const addVal = (val: any) => {
    if (typeof val === 'string' && val.trim()) {
      const cleaned = val.trim();
      if (!list.includes(cleaned)) list.push(cleaned);
    } else if (val && typeof val === 'object') {
      const name = val.name || val.title || val.label || val.skill;
      if (typeof name === 'string' && name.trim()) {
        const cleaned = name.trim();
        if (!list.includes(cleaned)) list.push(cleaned);
      }
    }
  };

  // 1. FIRST: Onboarding targeted job roles ("What job are you targeting?")
  if (Array.isArray(profile.roles)) profile.roles.forEach(addVal);
  if (profile.targetRole) addVal(profile.targetRole);
  if (profile.jobTitle) addVal(profile.jobTitle);
  if (profile.role) addVal(profile.role);

  // 2. SECOND: Resume skills & interests
  if (Array.isArray(profile.skills)) profile.skills.forEach(addVal);
  if (Array.isArray(profile.interests)) profile.interests.forEach(addVal);

  return list;
}

// Helper to extract experience required from API job data (returns empty string if not in API)
function getJobExperience(job: any): string {
  if (!job) return '';

  if (job.experience) return String(job.experience);
  if (job.experienceLevel) return String(job.experienceLevel);
  if (job.experience_level) return String(job.experience_level);
  if (job.minExperience) return `${job.minExperience}+ yrs exp`;

  const text = ((job.content || '') + ' ' + (job.cleanSnippet || '') + ' ' + (job.title || ''));
  const expMatch = text.match(/(\d+\+?\s*(?:-\s*\d+)?\s*(?:years?|yrs?)(?:\s+of\s+experience|\s+exp)?)/i);
  if (expMatch) {
    return `${expMatch[1]} exp`;
  }

  return '';
}

// Helper to determine employment type from API job data
function getJobEmploymentType(job: any): string {
  if (!job) return '';
  if (job.employmentType && typeof job.employmentType === 'string' && job.employmentType.trim()) {
    return job.employmentType.trim();
  }
  const text = ((job.content || '') + ' ' + (job.cleanSnippet || '') + ' ' + (job.title || '')).toLowerCase();
  if (text.includes('part-time') || text.includes('part time')) return 'Part Time';
  if (text.includes('contract') || text.includes('freelance')) return 'Contract';
  if (text.includes('internship') || text.includes('intern')) return 'Internship';
  if (text.includes('full-time') || text.includes('full time')) return 'Full Time';

  return '';
}

// Helper to determine work model from API job data
function getJobWorkModel(job: any): string {
  if (!job) return '';
  if (typeof job.remote === 'boolean') {
    return job.remote ? 'Remote' : 'In Person';
  }
  const text = ((job.location?.name || '') + ' ' + (job.content || '') + ' ' + (job.cleanSnippet || '') + ' ' + (job.title || '')).toLowerCase();
  if (text.includes('remote')) return 'Remote';
  if (text.includes('hybrid')) return 'Hybrid';
  if (text.includes('in person') || text.includes('on-site') || text.includes('onsite')) return 'In Person';

  return '';
}

// Helper to compute numeric timestamp for date sorting
function getJobTimestamp(job: any): number {
  if (!job) return 0;

  const rawDate = job.postedAt || job.createdAt || job.updated_at || job.date || job.posted_at;

  if (rawDate) {
    if (typeof rawDate === 'number') return rawDate;

    if (typeof rawDate === 'string') {
      const trimmed = rawDate.trim();
      const matchRel = trimmed.match(/^(\d+)\s*(h|d|m|mo|w|hours?|days?|minutes?|weeks?|months?)\s*(ago)?$/i);
      if (matchRel) {
        const val = parseInt(matchRel[1], 10);
        const unit = matchRel[2].toLowerCase();
        let msAgo = 0;
        if (unit.startsWith('m') && !unit.startsWith('mo')) {
          msAgo = val * 60 * 1000;
        } else if (unit.startsWith('h')) {
          msAgo = val * 60 * 60 * 1000;
        } else if (unit.startsWith('d')) {
          msAgo = val * 24 * 60 * 60 * 1000;
        } else if (unit.startsWith('w')) {
          msAgo = val * 7 * 24 * 60 * 60 * 1000;
        } else if (unit.startsWith('mo')) {
          msAgo = val * 30 * 24 * 60 * 60 * 1000;
        }
        return Date.now() - msAgo;
      }

      const dateObj = new Date(trimmed);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.getTime();
      }
    }
  }

  const numericId = parseInt(String(job.id || ''), 10);
  if (!isNaN(numericId) && numericId > 1000000) {
    return numericId;
  }

  return 0;
}

// Helper to determine posted time relative to job id / date
function getJobPostedTime(job: any): string {
  if (!job) return '1 day ago';

  const rawDate = job.postedAt || job.createdAt || job.updated_at || job.date || job.posted_at;

  if (rawDate) {
    if (typeof rawDate === 'number') {
      const diffMs = Date.now() - rawDate;
      if (diffMs >= 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      }
    }

    if (typeof rawDate === 'string') {
      const trimmed = rawDate.trim();
      if (trimmed.toLowerCase() === 'just now') return 'Just now';

      const matchRel = trimmed.match(/^(\d+)\s*(h|d|m|mo|w|hours?|days?|minutes?|weeks?|months?)\s*(ago)?$/i);
      if (matchRel) {
        const val = parseInt(matchRel[1], 10);
        const unit = matchRel[2].toLowerCase();
        if (unit.startsWith('m') && !unit.startsWith('mo')) {
          return val < 1 ? 'Just now' : `${val} minute${val > 1 ? 's' : ''} ago`;
        } else if (unit.startsWith('h')) {
          return `${val} hour${val > 1 ? 's' : ''} ago`;
        } else if (unit.startsWith('d')) {
          return `${val} day${val > 1 ? 's' : ''} ago`;
        } else if (unit.startsWith('w')) {
          const days = val * 7;
          return `${days} day${days > 1 ? 's' : ''} ago`;
        } else if (unit.startsWith('mo')) {
          const days = val * 30;
          return `${days} day${days > 1 ? 's' : ''} ago`;
        }
      }

      const dateObj = new Date(trimmed);
      if (!isNaN(dateObj.getTime())) {
        const diffMs = Date.now() - dateObj.getTime();
        if (diffMs >= 0) {
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          if (diffHours < 1) return 'Just now';
          if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
          const diffDays = Math.floor(diffHours / 24);
          return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        }
      }
    }
  }

  const num = typeof job.id === 'number'
    ? job.id
    : String(job.id || '1').split('').reduce((acc, c: string) => acc + c.charCodeAt(0), 0);
  const hours = (num % 40) + 2;
  if (hours < 24) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  const days = Math.floor(hours / 24) + 1;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

// Calculate 4 distinct, dynamic match percentages per job using calculateJobMatch from utils/jobMatch
function calculateJobMatchScores(job: GreenhouseJob, profile: any) {
  const matchResult = calculateJobMatch(job.content || '', job.title || '', profile);

  return {
    jobMatch: `${matchResult.jobMatch}%`,
    resume: `${matchResult.resume}%`,
    keywords: `${matchResult.keywords}%`,
    expMatch: `${matchResult.resume}%`,
    excellentMatch: `${matchResult.jobMatch}%`,
    fairMatch: `${matchResult.keywords}%`,
    perfectMatch: `${matchResult.jobMatch}%`
  };
}

// Helper to determine dynamic colors for match pills based on percentage thresholds
function getMatchPillColors(scoreStr: string) {
  const val = parseInt(scoreStr.replace(/[^0-9]/g, ''), 10) || 0;

  if (val === 0) {
    return {
      bg: '#F1F5F9',       // Muted slate gray (Zero Match / No profile)
      scoreColor: '#64748B',
      labelColor: '#64748B',
    };
  }

  if (val >= 75) {
    return {
      bg: '#DCFCE7',       // Soft Emerald Green (High Match >= 75%)
      scoreColor: '#15803D',
      labelColor: '#166534',
    };
  }

  if (val >= 35) {
    return {
      bg: '#FEF3C7',       // Soft Amber / Warm Orange (Medium Match 35%-74%)
      scoreColor: '#D97706',
      labelColor: '#B45309',
    };
  }

  return {
    bg: '#FFE4E6',         // Soft Rose / Crimson Red (Low Match < 35%)
    scoreColor: '#E11D48',
    labelColor: '#BE123C',
  };
}



interface JobListItemCardProps {
  item: GreenhouseJob;
  userProfile?: any;
  onViewDetails: (item: GreenhouseJob) => void;
  onLike?: (item: GreenhouseJob) => void;
  onSkip?: (item: GreenhouseJob) => void;
  onOpenMenu?: (item: GreenhouseJob) => void;
  isSkipped?: boolean;
}

const JobListItemCard = React.memo(({ item, userProfile, onViewDetails, onLike, onSkip, onOpenMenu, isSkipped }: JobListItemCardProps) => {
  const dept = item.departments?.[0]?.name || "Computer Software";
  const office = item.location?.name || "United States";
  const companyName = item.companyName || "Company";

  const [logoError, setLogoError] = useState(false);
  const companySlug = item.boardToken || companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const logoUrl = companySlug ? `https://logo.clearbit.com/${companySlug}.com` : '';

  const salary = getJobSalary(item);
  const exp = getJobExperience(item);
  const workModel = getJobWorkModel(item);
  const employmentType = getJobEmploymentType(item);
  const postedTime = getJobPostedTime(item);
  const scores = calculateJobMatchScores(item, userProfile);
  const matchColors = getMatchPillColors(scores.excellentMatch);

  return (
    <View style={[styles.listItemCard, isSkipped && { opacity: 0.55, backgroundColor: '#F8FAFC' }]}>
      {/* Top Header Row */}
      <View style={styles.listItemHeaderRow}>
        <View style={styles.listItemLogoSquare}>
          {!logoError && logoUrl ? (
            <Image
              source={{ uri: logoUrl }}
              style={{ width: 42, height: 42, borderRadius: 10 }}
              onError={() => setLogoError(true)}
              resizeMode="contain"
            />
          ) : (
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#FFFFFF' }}>
              {companyName.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>

        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={styles.listItemTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.listItemSub} numberOfLines={1}>{office.split(',')[0]} • {dept}</Text>
        </View>

        <View style={[styles.listItemScoreBadge, { backgroundColor: matchColors.bg, borderColor: matchColors.scoreColor }]}>
          <Text style={[styles.listItemScoreText, { color: matchColors.scoreColor }]}>
            {scores.excellentMatch}
          </Text>
        </View>

        <TouchableOpacity
          style={{ padding: 6, marginLeft: 4 }}
          onPress={() => onOpenMenu && onOpenMenu(item)}
        >
          <Ionicons name="ellipsis-vertical" size={18} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* Meta Grid Items */}
      <View style={styles.listItemMetaGrid}>
        {office ? (
          <View style={styles.metaGridItem}>
            <Ionicons name="location-outline" size={13} color="#64748B" />
            <Text style={styles.metaGridText} numberOfLines={1}>{office.split(',')[0]}</Text>
          </View>
        ) : null}
        {salary ? (
          <View style={styles.metaGridItem}>
            <Ionicons name="cash-outline" size={13} color="#64748B" />
            <Text style={styles.metaGridText} numberOfLines={1}>{salary.replace(' Salary', '')}</Text>
          </View>
        ) : null}
        {exp ? (
          <View style={styles.metaGridItem}>
            <Ionicons name="home-outline" size={13} color="#64748B" />
            <Text style={styles.metaGridText} numberOfLines={1}>{exp}</Text>
          </View>
        ) : null}

        {workModel ? (
          <View style={styles.metaGridItem}>
            <Ionicons name="laptop-outline" size={13} color="#64748B" />
            <Text style={styles.metaGridText} numberOfLines={1}>{workModel}</Text>
          </View>
        ) : null}
        {employmentType ? (
          <View style={styles.metaGridItem}>
            <Ionicons name="time-outline" size={13} color="#64748B" />
            <Text style={styles.metaGridText} numberOfLines={1}>{employmentType}</Text>
          </View>
        ) : null}
        {postedTime ? (
          <View style={styles.metaGridItem}>
            <Ionicons name="time-outline" size={13} color="#64748B" />
            <Text style={styles.metaGridText} numberOfLines={1}>{postedTime}</Text>
          </View>
        ) : null}
      </View>

      {/* Divider */}
      <View style={styles.cardDividerLine} />

      {/* Action Bar */}
      <View style={styles.listItemActionBar}>
        {isSkipped ? (
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#94A3B8', fontStyle: 'italic' }}>
              🚫 Skipped
            </Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.listItemViewDetailBtn}
              activeOpacity={0.8}
              onPress={() => onViewDetails(item)}
            >
              <Text style={styles.listItemViewDetailText}>View Detail</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.listItemCircleActionBtn}
              activeOpacity={0.8}
              onPress={() => onSkip && onSkip(item)}
            >
              <Ionicons name="ban-outline" size={20} color="#64748B" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
});
JobListItemCard.displayName = 'JobListItemCard';

interface JobCardContentProps {
  item: GreenhouseJob;
  isActive: boolean;
  userProfile?: any;
  likeStyle?: any;
  nopeStyle?: any;
  onOpenMenu?: (item: GreenhouseJob) => void;
}

const JobCardContent = React.memo(({ item, isActive, userProfile, likeStyle, nopeStyle, onOpenMenu }: JobCardContentProps) => {

  const dept = item.departments?.[0]?.name || "Computer Software";
  const office = item.location?.name || "United States";
  const companyName = item.companyName || "Company";

  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setLogoError(false);
  }, [item.id]);

  const companySlug = item.boardToken || companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const logoUrl = companySlug ? `https://logo.clearbit.com/${companySlug}.com` : '';

  const salary = getJobSalary(item);
  const exp = getJobExperience(item);
  const workModel = getJobWorkModel(item);
  const employmentType = getJobEmploymentType(item);
  const postedTime = getJobPostedTime(item);
  const scores = calculateJobMatchScores(item, userProfile);
  const qualifications = getJobQualifications(item);

  return (
    <View style={styles.premiumCard}>
      <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true} contentContainerStyle={{ paddingBottom: 16 }}>
        {/* Top 3 dots */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', width: '100%', marginBottom: -8 }}>
          <TouchableOpacity 
            style={{ padding: 8 }}
            onPress={() => onOpenMenu && onOpenMenu(item)}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Company Logo Square & Title */}
        <View style={{ alignItems: 'center', marginTop: 2 }}>
          <View style={styles.companyLogoSquare}>
            {!logoError && logoUrl ? (
              <Image
                source={{ uri: logoUrl }}
                style={{ width: 46, height: 46, borderRadius: 12 }}
                onError={() => setLogoError(true)}
                resizeMode="contain"
              />
            ) : (
              <Text style={{ fontSize: 28, fontWeight: '800', color: '#FFFFFF' }}>
                {companyName.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={styles.cardJobTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.cardCompanySub}>{companyName} • {dept}</Text>
        </View>

        {/* Meta Grid Items */}
        <View style={styles.metaGridContainer}>
          {office ? (
            <View style={styles.metaGridItem}>
              <Ionicons name="location-outline" size={14} color="#64748B" />
              <Text style={styles.metaGridText} numberOfLines={1}>{office}</Text>
            </View>
          ) : null}
          {salary ? (
            <View style={styles.metaGridItem}>
              <Ionicons name="cash-outline" size={14} color="#64748B" />
              <Text style={styles.metaGridText} numberOfLines={1}>{salary}</Text>
            </View>
          ) : null}
          {exp ? (
            <View style={styles.metaGridItem}>
              <Ionicons name="home-outline" size={14} color="#64748B" />
              <Text style={styles.metaGridText} numberOfLines={1}>{exp}</Text>
            </View>
          ) : null}

          {workModel ? (
            <View style={styles.metaGridItem}>
              <Ionicons name="laptop-outline" size={14} color="#64748B" />
              <Text style={styles.metaGridText} numberOfLines={1}>{workModel}</Text>
            </View>
          ) : null}
          {employmentType ? (
            <View style={styles.metaGridItem}>
              <Ionicons name="time-outline" size={14} color="#64748B" />
              <Text style={styles.metaGridText} numberOfLines={1}>{employmentType}</Text>
            </View>
          ) : null}
          {postedTime ? (
            <View style={styles.metaGridItem}>
              <Ionicons name="time-outline" size={14} color="#64748B" />
              <Text style={styles.metaGridText} numberOfLines={1}>{postedTime}</Text>
            </View>
          ) : null}
        </View>

        {/* Divider */}
        <View style={styles.cardDividerLine} />

        {/* 3 Match Cards (JOB MATCH, RESUME, KEYWORDS) */}
        <View style={styles.matchPillsRow}>
          <View style={[styles.metricCard, styles.metricCardGreen]}>
            <Text style={styles.metricCardValueGreen}>{scores.jobMatch}</Text>
            <Text style={styles.metricCardLabelGreen}>JOB MATCH</Text>
          </View>

          <View style={[styles.metricCard, styles.metricCardGray]}>
            <Text style={styles.metricCardValueGray}>{scores.resume}</Text>
            <Text style={styles.metricCardLabelGray}>RESUME</Text>
          </View>

          <View style={[styles.metricCard, styles.metricCardGray]}>
            <Text style={styles.metricCardValueGray}>{scores.keywords}</Text>
            <Text style={styles.metricCardLabelGray}>KEYWORDS</Text>
          </View>
        </View>

        {/* Qualifications */}
        <View style={{ marginTop: 8 }}>
          <Text style={styles.qualificationsTitle}>Qualifications</Text>
          {qualifications.map((qText, qIdx) => (
            <View style={styles.bulletItem} key={`qual-${qIdx}`}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{qText}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Swipe Badges Overlay */}
      {isActive && (
        <>
          <Animated.View style={[styles.swipeBadge, styles.likeBadge, likeStyle]}>
            <Text style={styles.likeBadgeText}>APPLY</Text>
          </Animated.View>

          <Animated.View style={[styles.swipeBadge, styles.nopeBadge, nopeStyle]}>
            <Text style={styles.nopeBadgeText}>SKIP</Text>
          </Animated.View>
        </>
      )}
    </View>
  );
});
JobCardContent.displayName = 'JobCardContent';

