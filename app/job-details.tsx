import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Share,
  Linking,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SymbolView } from 'expo-symbols';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { WebView } from 'react-native-webview';
import { API_URL, useAuth } from '../context/AuthContext';
import { getSession } from '../utils/session';
import { calculateJobMatch, JobMatchResult } from '../utils/jobMatch';
import Svg, { Circle } from 'react-native-svg';

interface SelectedResumeFile {
  id: string;
  name: string;
  uri: string;
  date?: string;
  size?: string;
  isDefault?: boolean;
  mimeType?: string;
  isBuilt?: boolean;
}

export default function JobDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, guestCredit, deductCredits, guestId } = useAuth();
  const totalCredits = user?.credit ?? guestCredit ?? 0;
  const [tailoredResumeUri, setTailoredResumeUri] = useState<string>('');
  const [tailoredCoverLetterUri, setTailoredCoverLetterUri] = useState<string>('');

  const [jobData, setJobData] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'company'>('overview');
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Resume & AI Match State
  const [resumesList, setResumesList] = useState<SelectedResumeFile[]>([]);
  const [selectedResume, setSelectedResume] = useState<SelectedResumeFile | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [matchResult, setMatchResult] = useState<JobMatchResult | null>(null);
  const [isCalculatingMatch, setIsCalculatingMatch] = useState(false);

  // Tailor & Apply Modal State
  const [showTailorModal, setShowTailorModal] = useState(false);
  const [isMatchingWithAI, setIsMatchingWithAI] = useState(false);
  const [showMatchResultModal, setShowMatchResultModal] = useState(false);
  const [showResumePreview, setShowResumePreview] = useState(false);
  const [showCoverLetterPreview, setShowCoverLetterPreview] = useState(false);
  const [showDidYouApplyModal, setShowDidYouApplyModal] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const [aiStep, setAiStep] = useState(1);
  const hasOpenedApplyRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (hasOpenedApplyRef.current) {
        hasOpenedApplyRef.current = false;
        // Delay opening the modal to ensure the slide-down animation of the apply page sheet completes fully first
        const timer = setTimeout(() => {
          setShowDidYouApplyModal(true);
        }, 600);
        return () => clearTimeout(timer);
      }
    }, [])
  );

  const stripHtml = (html: string) => {
    if (!html) return '';
    const decoded = html
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
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li>/gi, '• ');
    
    const withoutTags = decoded.replace(/<[^>]*>?/gm, '');
    return withoutTags
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .trim();
  };

  const cleanLocation = (loc: string) => {
    if (!loc) return '';
    const parts = loc.split(',').map(p => p.trim());
    if (parts.length > 1) {
      if (parts[0].toLowerCase().includes('remote')) {
        return parts[1];
      }
      return parts[0];
    }
    return loc;
  };

  const handleStartAiTailoring = async () => {
    if (!selectedResume || !selectedResume.uri) {
      Alert.alert("Resume Required", "Please select or upload a resume first.");
      return;
    }

    setIsMatchingWithAI(true);
    setAiStep(1);

    try {
      // 1. Deduct 2 credits securely
      const success = await deductCredits(2);
      if (!success) {
        setIsMatchingWithAI(false);
        Alert.alert("Match Failed", "Failed to deduct credits. Please purchase more credits.");
        return;
      }

      setAiStep(2);

      // 2. Prepare FormData
      const formData = new FormData();
      const resumeFileObj: any = {
        uri: selectedResume.uri,
        name: selectedResume.name || 'resume.pdf',
        type: selectedResume.mimeType || 'application/pdf'
      };
      formData.append('resume', resumeFileObj);

      // 3. Make POST request to backend
      const session = await getSession();
      const headers: any = {
        'Accept': 'application/json',
      };
      if (session && session.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }

      const matchRes = await fetch(`${API_URL}/api/jobs/${jobData.id}/match`, {
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

      setAiStep(3);

      const tailoredHtml = matchData.tailoredResumeHtml || "";
      const generatedCL = matchData.coverLetter || "";

      setAiStep(4);

      // 4. Generate Tailored Resume PDF
      const userPrefix = (userProfile?.firstName && userProfile?.lastName)
        ? `${userProfile.firstName}_${userProfile.lastName}`
        : userProfile?.firstName
          ? userProfile.firstName
          : 'User';

      const cleanUserPrefix = userPrefix.replace(/[^a-zA-Z0-9]/g, '_');
      const cleanCompanyForFile = companyName.replace(/[^a-zA-Z0-9]/g, '_');
      const cleanTitleForFile = jobTitle.replace(/[^a-zA-Z0-9]/g, '_');
      
      const formattedResumeName = `${cleanUserPrefix}_${cleanCompanyForFile}_${cleanTitleForFile}.pdf`;
      const cleanResumeUri = `${FileSystem.documentDirectory}${formattedResumeName}`;

      const formattedHtml = `
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; color: #2E1A8E; line-height: 1.5; font-size: 11pt; }
              h1, h2, h3 { color: #7C3AED; margin-top: 16px; margin-bottom: 6px; }
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
      setTailoredResumeUri(cleanResumeUri);

      // Save tailored resume back to local Resumes list
      const newResumeEntry: SelectedResumeFile = {
        id: `tailored_${Date.now()}`,
        name: formattedResumeName,
        date: new Date().toLocaleDateString(),
        uri: cleanResumeUri,
        mimeType: 'application/pdf',
        isBuilt: true
      };

      const updatedList = [newResumeEntry, ...resumesList];
      const resumesJsonPath = `${FileSystem.documentDirectory}resumes.json`;
      await FileSystem.writeAsStringAsync(resumesJsonPath, JSON.stringify(updatedList));
      setResumesList(updatedList);
      setSelectedResume(newResumeEntry);

      // 5. Generate Cover Letter PDF
      const formattedCLName = `${cleanUserPrefix}_${cleanCompanyForFile}_CL_${cleanTitleForFile}.pdf`;
      const cleanCLUri = `${FileSystem.documentDirectory}${formattedCLName}`;

      const formattedCLHtml = `
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; margin: 50px; color: #1E293B; line-height: 1.6; font-size: 11pt; }
              .header { margin-bottom: 24px; border-bottom: 2px solid #E2E8F0; padding-bottom: 12px; }
              .name { font-size: 22px; font-weight: bold; color: #0F172A; text-transform: uppercase; }
              .contact { font-size: 12px; color: #64748B; margin-top: 4px; }
              .date { color: #64748B; margin-bottom: 20px; font-weight: 500; }
              .recipient { font-weight: bold; margin-bottom: 16px; color: #0F172A; }
              .body { text-align: justify; white-space: pre-line; }
              .signature { margin-top: 24px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="name">${userProfile?.firstName || 'First'} ${userProfile?.lastName || 'Last'}</div>
              <div class="contact">${userProfile?.email || ''} &bull; ${userProfile?.phone || ''}</div>
            </div>
            <div class="date">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div class="recipient">
              Hiring Committee / Recruitment Team<br/>
              ${companyName}
            </div>
            <p>Dear Hiring Manager,</p>
            <div class="body">${generatedCL}</div>
            <div class="signature">
              Sincerely,<br/><br/>
              <strong>${userProfile?.firstName || 'First'} ${userProfile?.lastName || 'Last'}</strong>
            </div>
          </body>
        </html>
      `;

      const clPrintResult = await Print.printToFileAsync({ html: formattedCLHtml });
      await FileSystem.copyAsync({ from: clPrintResult.uri, to: cleanCLUri });
      setTailoredCoverLetterUri(cleanCLUri);

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
        company: companyName,
        jobTitle: jobTitle,
        date: new Date().toLocaleDateString(),
        coverLetterText: generatedCL,
        jobUrl: jobData?.absolute_url || '',
        resumeName: formattedResumeName
      };

      const updatedLetters = [newLetter, ...currentLetters];
      await FileSystem.writeAsStringAsync(coverLettersPath, JSON.stringify(updatedLetters));

      setIsMatchingWithAI(false);
      setShowMatchResultModal(true);
    } catch (err: any) {
      setIsMatchingWithAI(false);
      Alert.alert("AI Match Failed", err.message || "Failed to tailor resume and cover letter.");
    }
  };

  useEffect(() => {
    async function initJobDetails() {
      setIsLoadingDetails(true);
      try {
        let jobObj: any = null;
        const jobJsonStr = params.jobJson || params.job;
        if (jobJsonStr) {
          try {
            jobObj = JSON.parse(jobJsonStr as string);
          } catch (e) {
            console.log("Error parsing job param:", e);
          }
        }
        if (!jobObj && params.id) {
          jobObj = {
            id: params.id,
            title: params.title || 'Senior Technical Program Manager',
            companyName: params.company || 'Kota',
            location: { name: params.location || 'Dallas, USA' },
            absolute_url: params.url || '',
            content: params.content || '',
            department: params.department || 'Computer Software',
            updated_at: '18 hour ago'
          };
        }
        setJobData(jobObj);

        // Load profile and resumes
        const profilePath = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
        const profileInfo = await FileSystem.getInfoAsync(profilePath);
        let profileObj: any = null;
        if (profileInfo.exists) {
          const profileStr = await FileSystem.readAsStringAsync(profilePath);
          profileObj = JSON.parse(profileStr);
          setUserProfile(profileObj);
        }

        const resumesPath = `${FileSystem.documentDirectory}resumes.json`;
        const resumesInfo = await FileSystem.getInfoAsync(resumesPath);
        let defaultRes: SelectedResumeFile | null = null;
        if (resumesInfo.exists) {
          const resumesStr = await FileSystem.readAsStringAsync(resumesPath);
          const list: SelectedResumeFile[] = JSON.parse(resumesStr);
          setResumesList(list);
          defaultRes = list.find(r => r.isDefault) || list[0] || null;
          setSelectedResume(defaultRes);
        }

        // Calculate initial match score
        if (jobObj && (profileObj || defaultRes)) {
          setIsCalculatingMatch(true);
          const calculated = calculateJobMatch(jobObj.content || '', jobObj.title || '', profileObj);
          setMatchResult(calculated);
          setIsCalculatingMatch(false);
        }
      } catch (err) {
        console.log("Error initializing job details screen:", err);
      } finally {
        setIsLoadingDetails(false);
      }
    }

    initJobDetails();
  }, [params.id, params.job]);

  const cleanAndSummarizeJobText = (htmlText: string) => {
    if (!htmlText) return { summary: '', fullText: '', isLong: false };
    const clean = htmlText.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    if (clean.length <= 400) {
      return { summary: clean, fullText: clean, isLong: false };
    }
    return {
      summary: clean.slice(0, 380) + '...',
      fullText: clean,
      isLong: true
    };
  };

  const handleShareJob = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Share Job Link', 'Report Job Listing'],
          cancelButtonIndex: 0,
          userInterfaceStyle: 'light',
        },
        async (buttonIndex) => {
          if (buttonIndex === 1 && jobData?.absolute_url) {
            await Share.share({
              message: `Check out this position: ${jobData.title} at ${jobData.companyName || 'Company'}\n${jobData.absolute_url}`,
            });
          } else if (buttonIndex === 2) {
            router.push('/report-bug');
          }
        }
      );
    } else {
      if (jobData?.absolute_url) {
        await Share.share({
          message: `Check out this position: ${jobData.title} at ${jobData.companyName || 'Company'}\n${jobData.absolute_url}`,
        });
      }
    }
  };

  const companyName = jobData?.companyName || 'Kota';
  const jobTitle = jobData?.title || 'Senior Staff Technical Program Manger (R5595)';
  const locationName = jobData?.location?.name || 'Dallas, USA';
  const jobDetailsHtml = jobData?.content || '';

  const overallScore = matchResult ? matchResult.overallScore : 68;
  const matchPercent = matchResult ? matchResult.industryScore : 90;
  const skillsPercent = matchResult ? matchResult.skillsScore : 40;
  const resumePercent = matchResult ? matchResult.expLevelScore : 66;

  const handleMarkApplied = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsApplied(true);
      setShowDidYouApplyModal(false);

      const appliedPath = `${FileSystem.documentDirectory}user_applied_jobs.json`;
      const appliedInfo = await FileSystem.getInfoAsync(appliedPath);
      let currentApplied: any[] = [];
      if (appliedInfo.exists) {
        const text = await FileSystem.readAsStringAsync(appliedPath);
        try { currentApplied = JSON.parse(text); } catch (e) {}
      }

      const newEntry = {
        id: jobData?.id || `job-${Date.now()}`,
        title: jobTitle,
        companyName: companyName,
        location: locationName,
        url: jobData?.absolute_url || '',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        timestamp: Date.now(),
        status: 'applied'
      };

      const updatedList = [newEntry, ...currentApplied.filter((j: any) => j.id !== newEntry.id)];
      await FileSystem.writeAsStringAsync(appliedPath, JSON.stringify(updatedList));

      // Sync with online backend
      const userId = user?.id || guestId || 'guest';
      fetch(`${API_URL}/api/user-jobs/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'applied',
          jobId: newEntry.id,
          jobData: newEntry
        })
      }).catch(err => console.log('Backend sync applied error:', err));

      Alert.alert('Applied! 🎉', 'Job marked as applied in your Applications tab.');
    } catch (e) {
      console.log('Error saving applied job:', e);
    }
  };

  const handleMarkRejected = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowDidYouApplyModal(false);

      const skippedPath = `${FileSystem.documentDirectory}user_skipped_jobs.json`;
      const skippedInfo = await FileSystem.getInfoAsync(skippedPath);
      let currentSkipped: any[] = [];
      if (skippedInfo.exists) {
        const text = await FileSystem.readAsStringAsync(skippedPath);
        try { currentSkipped = JSON.parse(text); } catch (e) {}
      }

      const newEntry = {
        id: jobData?.id || `job-${Date.now()}`,
        title: jobTitle,
        companyName: companyName,
        location: locationName,
        url: jobData?.absolute_url || '',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        timestamp: Date.now(),
        status: 'skipped'
      };

      const updatedList = [newEntry, ...currentSkipped.filter((j: any) => j.id !== newEntry.id)];
      await FileSystem.writeAsStringAsync(skippedPath, JSON.stringify(updatedList));

      // Sync with online backend
      const userId = user?.id || guestId || 'guest';
      fetch(`${API_URL}/api/user-jobs/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'skipped',
          jobId: newEntry.id,
          jobData: newEntry
        })
      }).catch(err => console.log('Backend sync skipped error:', err));
    } catch (e) {
      console.log('Error saving skipped job:', e);
    }
  };

  return (
    <View style={styles.container}>
      {/* MOCKUP HEADER BAR */}
      <View style={[styles.headerRow, { paddingTop: insets.top + 4 }]}>
        {/* Left Circular Back Button */}
        <TouchableOpacity
          style={styles.backCircleBtn}
          activeOpacity={0.7}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/jobs');
            }
          }}
        >
          {Platform.OS === 'ios' ? (
            <SymbolView name="chevron.left" size={18} tintColor="#1E293B" resizeMode="scaleAspectFit" />
          ) : (
            <Ionicons name="chevron-back" size={22} color="#1E293B" />
          )}
        </TouchableOpacity>

        {/* Middle Segmented Control (Overview | Company) */}
        <View style={styles.segmentedContainer}>
          <TouchableOpacity
            style={[styles.segmentedTab, activeTab === 'overview' && styles.segmentedTabActive]}
            activeOpacity={0.75}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab('overview');
            }}
          >
            <Text style={[styles.segmentedText, activeTab === 'overview' && styles.segmentedTextActive]}>
              Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentedTab, activeTab === 'company' && styles.segmentedTabActive]}
            activeOpacity={0.75}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab('company');
            }}
          >
            <Text style={[styles.segmentedText, activeTab === 'company' && styles.segmentedTextActive]}>
              Company
            </Text>
          </TouchableOpacity>
        </View>

        {/* Right Credits Pill */}
        <TouchableOpacity
          style={styles.creditsPill}
          activeOpacity={0.75}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/pricing' as any);
          }}
        >
          <Text style={styles.creditsPillText}>{totalCredits}</Text>
          <Text style={styles.creditsSparkleIcon}>✦</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {/* COMPANY & JOB TITLE CARD */}
        <View style={styles.topCardContainer}>
          <View style={styles.companyTopHeaderRow}>
            {/* Violet Company Logo Box */}
            <View style={styles.violetCompanyLogoBox}>
              <Ionicons name="sparkles-outline" size={24} color="#FFFFFF" />
            </View>

            <View style={styles.companyTitleCol}>
              <Text style={styles.companyNameText}>{companyName}</Text>
              <Text style={styles.companySubText}>Computer Software</Text>
            </View>

            {/* Time Pill Badge */}
            <View style={styles.timeBadgePill}>
              <Text style={styles.timeBadgeText}>18 hour ago</Text>
            </View>
          </View>

          {/* Main Job Title */}
          <Text style={styles.mainJobTitleText}>{jobTitle}</Text>

          {/* 3x2 JOB SPECS GRID */}
          <View style={styles.specsGrid}>
            <View style={styles.specItem}>
              <Ionicons name="location-outline" size={15} color="#475569" />
              <Text style={styles.specItemText}>{cleanLocation(locationName)}</Text>
            </View>

            <View style={styles.specItem}>
              <Ionicons name="cash-outline" size={15} color="#475569" />
              <Text style={styles.specItemText}>$50K-$80 Salary</Text>
            </View>

            <View style={styles.specItem}>
              <Ionicons name="home-outline" size={15} color="#475569" />
              <Text style={styles.specItemText}>5+ years exp</Text>
            </View>

            <View style={styles.specItem}>
              <Ionicons name="time-outline" size={15} color="#475569" />
              <Text style={styles.specItemText}>Full Time</Text>
            </View>

            <View style={styles.specItem}>
              <Ionicons name="laptop-outline" size={15} color="#475569" />
              <Text style={styles.specItemText}>In Person</Text>
            </View>

            <View style={styles.specItem}>
              <Ionicons name="time-outline" size={15} color="#475569" />
              <Text style={styles.specItemText}>19 hours ago</Text>
            </View>
          </View>
        </View>

        {activeTab === 'overview' ? (
          <>
            {/* ATS SCORE SECTION */}
            <View style={styles.atsSectionContainer}>
              <View style={styles.atsHeaderRow}>
                <Text style={styles.atsSectionTitle}>ATS Score</Text>
                <Text style={styles.atsScoreFraction}>
                  <Text style={styles.atsScoreValue}>{overallScore}</Text>
                  <Text style={styles.atsScoreTotal}>/100</Text>
                </Text>
              </View>

              {/* Coral/Orange Progress Bar */}
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${overallScore}%` }]} />
              </View>

              {/* 4 METRIC CARDS ROW */}
              <View style={styles.metricCardsRow}>
                <View style={[styles.metricCard, styles.metricCardOrange]}>
                  <Text style={styles.metricCardValueWhite}>{overallScore}%</Text>
                  <Text style={styles.metricCardLabelWhite}>OVERALL</Text>
                </View>

                <View style={[styles.metricCard, styles.metricCardGreen]}>
                  <Text style={styles.metricCardValueGreen}>{matchPercent}%</Text>
                  <Text style={styles.metricCardLabelGreen}>JOB MATCH</Text>
                </View>

                <View style={[styles.metricCard, styles.metricCardGray]}>
                  <Text style={styles.metricCardValueGray}>{skillsPercent}%</Text>
                  <Text style={styles.metricCardLabelGray}>SKILLS</Text>
                </View>

                <View style={[styles.metricCard, styles.metricCardGray]}>
                  <Text style={styles.metricCardValueGray}>{resumePercent}%</Text>
                  <Text style={styles.metricCardLabelGray}>RESUME</Text>
                </View>
              </View>

              {/* SKILLS PILLS GRID (Green matched vs Muted gray) */}
              <View style={styles.skillsPillsContainer}>
                {matchResult?.matchedSkills && matchResult.matchedSkills.length > 0 ? (
                  matchResult.matchedSkills.map((skill, index) => (
                    <View key={`matched-${index}`} style={styles.skillPillGreen}>
                      <Text style={styles.thumbEmoji}>👍</Text>
                      <Text style={styles.skillTextGreen}>{skill}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={{ fontSize: 13, color: '#64748B', fontStyle: 'italic', marginVertical: 4, paddingHorizontal: 4 }}>
                    No matched skills found.
                  </Text>
                )}

                {matchResult?.missingSkills && matchResult.missingSkills.length > 0 ? (
                  matchResult.missingSkills.map((skill, index) => (
                    <View key={`missing-${index}`} style={styles.skillPillGray}>
                      <Text style={styles.skillTextGray}>{skill}</Text>
                    </View>
                  ))
                ) : (
                  null
                )}
              </View>
            </View>

            {/* JOB DESCRIPTION SECTION */}
            <View style={styles.summarySectionContainer}>
              <Text style={styles.jobSummaryTitle}>Job Description</Text>
              <Text style={[styles.jobSummaryBodyText, { lineHeight: 22 }]}>
                {stripHtml(jobDetailsHtml) || 'No job description available.'}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.summarySectionContainer}>
            <Text style={styles.jobSummaryTitle}>About {companyName}</Text>
            <Text style={styles.jobSummaryBodyText}>
              {companyName} is a leading enterprise software company specializing in workflow automation and cloud technology solutions worldwide.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* FLOATING BLACK PILL BUTTON */}
      <View style={[styles.bottomDockBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={styles.blackTailorApplyBtn}
          activeOpacity={0.85}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowTailorModal(true);
          }}
        >
          <Text style={styles.blackTailorApplyBtnText}>Tailor resume & Apply</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showTailorModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTailorModal(false)}
        onDismiss={() => setShowTailorModal(false)}
      >
        <View style={styles.modalOverlayBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowTailorModal(false)}
          />
          <View style={[styles.modalSheetCard, { paddingBottom: insets.bottom + 16 }]}>
            {/* Header with Title and Close Button */}
            <View style={styles.modalSheetHeaderRow}>
              <Text style={styles.modalSheetTitle}>Tailor your to get better result</Text>
              <TouchableOpacity
                style={styles.modalCloseCircleBtn}
                activeOpacity={0.7}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowTailorModal(false);
                }}
              >
                {Platform.OS === 'ios' ? (
                  <SymbolView name="xmark" size={16} tintColor="#1F2937" resizeMode="scaleAspectFit" />
                ) : (
                  <Ionicons name="close" size={20} color="#1F2937" />
                )}
              </TouchableOpacity>
            </View>

            {/* Circular Gauge Diagram */}
            <View style={styles.modalGaugeWrapper}>
              <Svg width={180} height={180} viewBox="0 0 180 180">
                <Circle
                  cx="90"
                  cy="90"
                  r="78"
                  stroke="#CBD5E1"
                  strokeWidth="2"
                  strokeDasharray="4,6"
                  fill="none"
                />
                <Circle
                  cx="90"
                  cy="90"
                  r="66"
                  stroke="#E2E8F0"
                  strokeWidth="12"
                  fill="none"
                />
                <Circle
                  cx="90"
                  cy="90"
                  r="66"
                  stroke="#000000"
                  strokeWidth="12"
                  strokeDasharray={`${2 * Math.PI * 66}`}
                  strokeDashoffset={`${2 * Math.PI * 66 * (1 - overallScore / 100)}`}
                  strokeLinecap="round"
                  fill="none"
                  transform="rotate(-90 90 90)"
                />
              </Svg>
              <View style={styles.modalGaugeCenterCol}>
                <Text style={styles.modalGaugeScoreText}>{overallScore}%</Text>
                <Text style={styles.modalGaugeSubLabel}>Match score</Text>
              </View>
            </View>

            {/* Improvement Section */}
            <View style={styles.modalImprovementSection}>
              <Text style={styles.modalImprovementHeader}>+30% Improve available</Text>
              <View style={styles.modalChipsWrap}>
                <View style={styles.modalGreenChip}>
                  <Text style={styles.modalGreenChipText}>Add Missing Keywords</Text>
                </View>
                <View style={styles.modalGreenChip}>
                  <Text style={styles.modalGreenChipText}>Add Missing Skills</Text>
                </View>
                <View style={styles.modalGreenChip}>
                  <Text style={styles.modalGreenChipText}>Paraphrasing</Text>
                </View>
                <View style={styles.modalGreenChip}>
                  <Text style={styles.modalGreenChipText}>Add Soft Skills</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.applyWithoutCustomizingBtn}
              activeOpacity={0.7}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                hasOpenedApplyRef.current = true;
                setShowTailorModal(false);
                if (jobData?.absolute_url) {
                  router.push({
                    pathname: '/apply-job',
                    params: {
                      url: jobData.absolute_url,
                      title: jobData.title || jobTitle,
                      company: companyName
                    }
                  });
                }
              }}
            >
              <Text style={styles.applyWithoutCustomizingBtnText}>Apply without customizing</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.customizeBlackBtn}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowTailorModal(false);
                const currentCredit = user?.credit ?? guestCredit ?? 0;
                if (currentCredit <= 0) {
                  router.push('/pricing' as any);
                } else {
                  handleStartAiTailoring();
                }
              }}
            >
              <Text style={styles.customizeBlackBtnText}>Customize resume & Cover letter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isMatchingWithAI}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setIsMatchingWithAI(false)}
        onDismiss={() => setIsMatchingWithAI(false)}
      >
        <View style={[styles.container, { paddingTop: insets.top + 10, paddingHorizontal: 20 }]}>
          {/* Header Bar */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backCircleBtn}
              activeOpacity={0.7}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsMatchingWithAI(false);
              }}
            >
              {Platform.OS === 'ios' ? (
                <SymbolView name="chevron.left" size={18} tintColor="#1E293B" resizeMode="scaleAspectFit" />
              ) : (
                <Ionicons name="chevron-back" size={22} color="#1E293B" />
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
              <Text style={styles.creditsSparkleIcon}>✦</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, marginTop: 24 }} showsVerticalScrollIndicator={false}>
            {/* Rewriting Your Resume Section */}
            <View style={styles.progressSectionBlock}>
              <Text style={styles.progressSectionTitle}>Rewriting Your Resume:</Text>
              <View style={styles.progressListCol}>
                <View style={styles.progressStepRow}>
                  {aiStep >= 1 ? (
                    <Ionicons name="checkmark" size={18} color="#16A34A" />
                  ) : aiStep === 0 ? (
                    <View style={{ width: 18, height: 18, justifyContent: 'center', alignItems: 'center' }}>
                      <ActivityIndicator size="small" color="#7C3AED" />
                    </View>
                  ) : (
                    <View style={styles.progressCircleHollow} />
                  )}
                  <Text style={[styles.progressStepText, aiStep >= 1 && styles.progressStepTextActive]}>
                    Analyzing Career Criteria
                  </Text>
                </View>

                <View style={styles.progressStepRow}>
                  {aiStep >= 2 ? (
                    <Ionicons name="checkmark" size={18} color="#16A34A" />
                  ) : aiStep === 1 ? (
                    <View style={{ width: 18, height: 18, justifyContent: 'center', alignItems: 'center' }}>
                      <ActivityIndicator size="small" color="#7C3AED" />
                    </View>
                  ) : (
                    <View style={styles.progressCircleHollow} />
                  )}
                  <Text style={[styles.progressStepText, aiStep >= 2 && styles.progressStepTextActive]}>
                    Scanning your resume
                  </Text>
                </View>

                <View style={styles.progressStepRow}>
                  {aiStep >= 3 ? (
                    <Ionicons name="checkmark" size={18} color="#16A34A" />
                  ) : aiStep === 2 ? (
                    <View style={{ width: 18, height: 18, justifyContent: 'center', alignItems: 'center' }}>
                      <ActivityIndicator size="small" color="#7C3AED" />
                    </View>
                  ) : (
                    <View style={styles.progressCircleHollow} />
                  )}
                  <Text style={[styles.progressStepText, aiStep >= 3 && styles.progressStepTextActive]}>
                    Generating personalized suggestions
                  </Text>
                </View>

                <View style={styles.progressStepRow}>
                  {aiStep >= 4 ? (
                    <Ionicons name="checkmark" size={18} color="#16A34A" />
                  ) : aiStep === 3 ? (
                    <View style={{ width: 18, height: 18, justifyContent: 'center', alignItems: 'center' }}>
                      <ActivityIndicator size="small" color="#7C3AED" />
                    </View>
                  ) : (
                    <View style={styles.progressCircleHollow} />
                  )}
                  <Text style={[styles.progressStepText, aiStep >= 4 && styles.progressStepTextActive]}>
                    Preparing your result
                  </Text>
                </View>
              </View>
            </View>

            {/* Writing Your Cover Letter Section */}
            <View style={[styles.progressSectionBlock, { marginTop: 32 }]}>
              <Text style={styles.progressSectionTitle}>Writing Your Cover Letter:</Text>
              <View style={styles.progressListCol}>
                <View style={styles.progressStepRow}>
                  {aiStep >= 1 ? (
                    <Ionicons name="checkmark" size={18} color="#16A34A" />
                  ) : aiStep === 0 ? (
                    <View style={{ width: 18, height: 18, justifyContent: 'center', alignItems: 'center' }}>
                      <ActivityIndicator size="small" color="#7C3AED" />
                    </View>
                  ) : (
                    <View style={styles.progressCircleHollow} />
                  )}
                  <Text style={[styles.progressStepText, aiStep >= 1 && styles.progressStepTextActive]}>
                    Analyzing Career Criteria
                  </Text>
                </View>

                <View style={styles.progressStepRow}>
                  {aiStep >= 2 ? (
                    <Ionicons name="checkmark" size={18} color="#16A34A" />
                  ) : aiStep === 1 ? (
                    <View style={{ width: 18, height: 18, justifyContent: 'center', alignItems: 'center' }}>
                      <ActivityIndicator size="small" color="#7C3AED" />
                    </View>
                  ) : (
                    <View style={styles.progressCircleHollow} />
                  )}
                  <Text style={[styles.progressStepText, aiStep >= 2 && styles.progressStepTextActive]}>
                    Scanning your resume
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showMatchResultModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowMatchResultModal(false)}
        onDismiss={() => setShowMatchResultModal(false)}
      >
        <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
          {/* Header Bar */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backCircleBtn}
              activeOpacity={0.7}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowMatchResultModal(false);
              }}
            >
              {Platform.OS === 'ios' ? (
                <SymbolView name="chevron.left" size={18} tintColor="#1E293B" resizeMode="scaleAspectFit" />
              ) : (
                <Ionicons name="chevron-back" size={22} color="#1E293B" />
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
              <Text style={styles.creditsSparkleIcon}>✦</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 130 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Top Match Score Circle Gauge */}
            <View style={styles.modalGaugeWrapper}>
              <Svg width={200} height={200} viewBox="0 0 200 200">
                <Circle
                  cx="100"
                  cy="100"
                  r="86"
                  stroke="#CBD5E1"
                  strokeWidth="2"
                  strokeDasharray="4,6"
                  fill="none"
                />
                <Circle
                  cx="100"
                  cy="100"
                  r="74"
                  stroke="#E2E8F0"
                  strokeWidth="14"
                  fill="none"
                />
                <Circle
                  cx="100"
                  cy="100"
                  r="74"
                  stroke="#000000"
                  strokeWidth="14"
                  strokeDasharray={`${2 * Math.PI * 74}`}
                  strokeDashoffset={`${2 * Math.PI * 74 * 0.01}`}
                  strokeLinecap="round"
                  fill="none"
                  transform="rotate(-90 100 100)"
                />
              </Svg>
              <View style={styles.modalGaugeCenterCol}>
                <Text style={styles.modalResultScoreText}>99%</Text>
                <Text style={styles.modalResultScoreSub}>Match score</Text>
              </View>
            </View>

            {/* Title & Subtitle */}
            <Text style={styles.issuesFixedTitle}>7 issues Fixed</Text>
            <Text style={styles.issuesFixedSubtitle}>
              Awesome! Your score jumped{'\n'}from 68% to 99%
            </Text>

            {/* Horizontal Side-by-Side Documents Section */}
            <View style={styles.documentsRowContainer}>
              {/* Tailored Resume Column */}
              <View style={styles.documentCol}>
                <View style={[styles.documentPreviewCard, { padding: tailoredResumeUri ? 0 : 16, overflow: 'hidden' }]}>
                  {tailoredResumeUri ? (
                    <WebView
                      source={{ uri: tailoredResumeUri }}
                      style={{ flex: 1 }}
                      scrollEnabled={false}
                      scalesPageToFit={true}
                      originWhitelist={['*']}
                      allowFileAccess={true}
                      allowUniversalAccessFromFileURLs={true}
                    />
                  ) : (
                    <>
                      <Text style={styles.docHeaderName}>{`${userProfile?.firstName || 'FIRST'} ${userProfile?.lastName || 'LAST'}`.toUpperCase()}</Text>
                      <Text style={styles.docHeaderSub} numberOfLines={1}>{jobTitle}</Text>

                      <Text style={styles.docSectionTitle}>DETAILS</Text>
                      <Text style={styles.docLineText} numberOfLines={1}>• {userProfile?.phone || '0(09) 1234 5678'}</Text>
                      <Text style={styles.docLineText} numberOfLines={1}>• {userProfile?.email || 'email@example.com'}</Text>

                      <Text style={styles.docSectionTitle}>PROFILE</Text>
                      <Text style={styles.docParagraphText} numberOfLines={3}>
                        {userProfile?.summary || 'Highly motivated professional seeking to contribute to company goals...'}
                      </Text>

                      <Text style={styles.docSectionTitle}>WORK EXPERIENCE</Text>
                      <Text style={styles.docSubHead} numberOfLines={1}>
                        {userProfile?.workExperience?.[0]?.role || userProfile?.workExperience?.[0]?.jobTitle || 'Job Title'}
                      </Text>
                      <Text style={styles.docParagraphText} numberOfLines={1}>
                        {userProfile?.workExperience?.[0]?.company || 'Company'} / {userProfile?.workExperience?.[0]?.duration || '2020 - Current'}
                      </Text>

                      <Text style={styles.docSectionTitle}>SKILLS</Text>
                      <Text style={styles.docLineText} numberOfLines={1}>
                        {userProfile?.skills && Array.isArray(userProfile.skills) 
                          ? userProfile.skills.slice(0, 3).join(', ') 
                          : (typeof userProfile?.skills === 'string' ? userProfile.skills : 'Skill 1, Skill 2, Skill 3')}
                      </Text>
                    </>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.viewDocBtnPill}
                  activeOpacity={0.8}
                  onPress={async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (tailoredResumeUri) {
                      try {
                        await Print.printAsync({ uri: tailoredResumeUri });
                      } catch (e) {
                        console.log('Error opening resume PDF:', e);
                        if (await Sharing.isAvailableAsync()) {
                          await Sharing.shareAsync(tailoredResumeUri);
                        }
                      }
                    } else {
                      Alert.alert("Error", "No tailored resume PDF file found.");
                    }
                  }}
                >
                  <Ionicons name="eye-outline" size={16} color="#0F172A" />
                  <Text style={styles.viewDocBtnText}>View resume</Text>
                </TouchableOpacity>
              </View>

              {/* Tailored Cover Letter Column */}
              <View style={styles.documentCol}>
                <View style={[styles.documentPreviewCard, { padding: tailoredCoverLetterUri ? 0 : 16, overflow: 'hidden' }]}>
                  {tailoredCoverLetterUri ? (
                    <WebView
                      source={{ uri: tailoredCoverLetterUri }}
                      style={{ flex: 1 }}
                      scrollEnabled={false}
                      scalesPageToFit={true}
                      originWhitelist={['*']}
                      allowFileAccess={true}
                      allowUniversalAccessFromFileURLs={true}
                    />
                  ) : (
                    <>
                      <Text style={styles.docHeaderName}>{`${userProfile?.firstName || 'FIRST'} ${userProfile?.lastName || 'LAST'}`.toUpperCase()}</Text>
                      <Text style={styles.docHeaderSub} numberOfLines={1}>{jobTitle}</Text>

                      <Text style={styles.docSectionTitle}>DETAILS</Text>
                      <Text style={styles.docLineText} numberOfLines={1}>• {userProfile?.phone || '0(09) 1234 5678'}</Text>
                      <Text style={styles.docLineText} numberOfLines={1}>• {userProfile?.email || 'email@example.com'}</Text>

                      <Text style={styles.docSectionTitle}>PROFILE</Text>
                      <Text style={styles.docParagraphText} numberOfLines={3}>
                        Dear Hiring Manager, I am writing to express my strong enthusiasm for the {jobTitle} position at {companyName}...
                      </Text>

                      <Text style={styles.docSectionTitle}>WORK EXPERIENCE</Text>
                      <Text style={styles.docSubHead} numberOfLines={1}>
                        {userProfile?.workExperience?.[0]?.role || userProfile?.workExperience?.[0]?.jobTitle || 'Job Title'}
                      </Text>
                      <Text style={styles.docParagraphText} numberOfLines={1}>
                        {userProfile?.workExperience?.[0]?.company || 'Company'} / {userProfile?.workExperience?.[0]?.duration || '2020 - Current'}
                      </Text>

                      <Text style={styles.docSectionTitle}>EDUCATION</Text>
                      <Text style={styles.docLineText} numberOfLines={1}>
                        {userProfile?.education?.[0]?.degree || userProfile?.education?.[0]?.study || 'Diploma / training'}
                      </Text>
                    </>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.viewDocBtnPill}
                  activeOpacity={0.8}
                  onPress={async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (tailoredCoverLetterUri) {
                      try {
                        await Print.printAsync({ uri: tailoredCoverLetterUri });
                      } catch (e) {
                        console.log('Error opening cover letter PDF:', e);
                        if (await Sharing.isAvailableAsync()) {
                          await Sharing.shareAsync(tailoredCoverLetterUri);
                        }
                      }
                    } else {
                      Alert.alert("Error", "No tailored cover letter PDF file found.");
                    }
                  }}
                >
                  <Ionicons name="eye-outline" size={16} color="#0F172A" />
                  <Text style={styles.viewDocBtnText}>View cover letter</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Bottom Floating Black Button: Apply */}
          <View style={[styles.bottomDockBar, { paddingBottom: insets.bottom + 8 }]}>
            <TouchableOpacity
              style={styles.blackTailorApplyBtn}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                hasOpenedApplyRef.current = true;
                setShowMatchResultModal(false);
                if (jobData?.absolute_url) {
                  router.push({
                    pathname: '/apply-job',
                    params: {
                      url: jobData.absolute_url,
                      title: jobData.title || jobTitle,
                      company: companyName
                    }
                  });
                }
              }}
            >
              <Text style={styles.blackTailorApplyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>


        </View>
      </Modal>

      <Modal
        visible={showDidYouApplyModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDidYouApplyModal(false)}
        onDismiss={() => setShowDidYouApplyModal(false)}
      >
        <View style={styles.modalOverlayBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowDidYouApplyModal(false)}
          />
          <View style={[styles.modalSheetCard, { paddingBottom: insets.bottom + 16 }]}>
            {/* Header with Title and Close Button */}
            <View style={styles.modalSheetHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.didYouApplyTitle}>Did you apply?</Text>
                <Text style={styles.didYouApplySubtitle}>
                  If you applied, we flagged it to keep track of the job.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalCloseCircleBtn}
                activeOpacity={0.7}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowDidYouApplyModal(false);
                }}
              >
                {Platform.OS === 'ios' ? (
                  <SymbolView name="xmark" size={16} tintColor="#1F2937" resizeMode="scaleAspectFit" />
                ) : (
                  <Ionicons name="close" size={20} color="#1F2937" />
                )}
              </TouchableOpacity>
            </View>

            {/* Job Summary Box */}
            <View style={styles.jobSummaryBoxRow}>
              <View style={styles.violetCompanyLogoBox}>
                <Ionicons name="sparkles-outline" size={24} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.jobSummaryBoxCompany}>{companyName}</Text>
                <Text style={styles.jobSummaryBoxTitle} numberOfLines={1}>
                  {jobTitle}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.yesAppliedBlackBtn}
              activeOpacity={0.85}
              onPress={handleMarkApplied}
            >
              <Text style={styles.yesAppliedBlackBtnText}>Yes, I applied</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.noDidntWhiteBtn}
              activeOpacity={0.85}
              onPress={handleMarkRejected}
            >
              <Text style={styles.noDidntWhiteBtnText}>No, I didn’t</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


    </View>
  );
}

const styles = StyleSheet.create({
  paperSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 12,
  },
  paperName: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 4,
  },
  paperTitle: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  paperContactRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  paperContactText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  paperContactDivider: {
    color: '#94A3B8',
    fontSize: 12,
  },
  paperDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
    width: '100%',
  },
  paperSectionHeader: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 18,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 4,
  },
  paperBodyText: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
  },
  paperSubHead: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  paperDurationText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  paperCompanyText: {
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#F8FAFC',
  },
  backCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  segmentedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBECEE',
    borderRadius: 25,
    padding: 3,
    width: 170,
  },
  segmentedTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentedTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  creditsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  creditsPillText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  creditsSparkleIcon: {
    fontSize: 15,
    color: '#FF5722',
    fontWeight: '700',
  },
  topCardContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  companyTopHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  violetCompanyLogoBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#6D28D9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyTitleCol: {
    flex: 1,
    marginLeft: 12,
  },
  companyNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  companySubText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  timeBadgePill: {
    backgroundColor: 'rgba(226, 232, 240, 0.75)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  mainJobTitleText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 28,
    marginBottom: 18,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
    columnGap: 16,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  specItemText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  atsSectionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  atsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  atsSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  atsScoreFraction: {
    fontSize: 14,
  },
  atsScoreValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  atsScoreTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94A3B8',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF4500',
    borderRadius: 4,
  },
  metricCardsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
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
  skillsPillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillPillGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  thumbEmoji: {
    fontSize: 11,
  },
  skillTextGreen: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  skillPillGray: {
    backgroundColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skillTextGray: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  summarySectionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  jobSummaryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  jobSummarySalutation: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  jobSummaryBodyText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#475569',
  },
  bottomDockBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  blackTailorApplyBtn: {
    backgroundColor: '#000000',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  blackTailorApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalSheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalSheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 12,
  },
  modalCloseCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalGaugeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    position: 'relative',
  },
  modalGaugeCenterCol: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalGaugeScoreText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalGaugeSubLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  modalImprovementSection: {
    marginVertical: 14,
  },
  modalImprovementHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#16A34A',
    marginBottom: 10,
  },
  modalChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalGreenChip: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  modalGreenChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  applyWithoutCustomizingBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  applyWithoutCustomizingBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
  customizeBlackBtn: {
    backgroundColor: '#000000',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 8,
  },
  customizeBlackBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  progressSectionBlock: {
    marginBottom: 10,
  },
  progressSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
  },
  progressListCol: {
    gap: 16,
  },
  progressStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressCircleHollow: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
  },
  progressStepText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#475569',
  },
  progressStepTextActive: {
    fontWeight: '700',
    color: '#16A34A',
  },
  modalResultScoreText: {
    fontSize: 44,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalResultScoreSub: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  issuesFixedTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  issuesFixedSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  documentsRowContainer: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 4,
  },
  documentCol: {
    flex: 1,
    alignItems: 'center',
  },
  documentPreviewCard: {
    width: '100%',
    height: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  docHeaderName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  docHeaderSub: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  docSectionTitle: {
    fontSize: 8,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 6,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  docLineText: {
    fontSize: 7,
    color: '#475569',
    lineHeight: 10,
  },
  docSubHead: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  docParagraphText: {
    fontSize: 7,
    color: '#64748B',
    lineHeight: 10,
  },
  viewDocBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  viewDocBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  didYouApplyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  didYouApplySubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
    lineHeight: 18,
    marginRight: 10,
  },
  jobSummaryBoxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 14,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  jobSummaryBoxCompany: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  jobSummaryBoxTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  yesAppliedBlackBtn: {
    backgroundColor: '#000000',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  yesAppliedBlackBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  noDidntWhiteBtn: {
    backgroundColor: '#FFFFFF',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#000000',
    marginBottom: 8,
  },
  noDidntWhiteBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
});
