import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Modal,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system/legacy';
import { copyToClipboard } from '../../utils/clipboard';
import { useAuth } from '../../context/AuthContext';

interface SelectedResumeFile {
  id: string;
  name: string;
  date: string;
  uri?: string;
  size?: number;
  mimeType?: string;
  isBuilt?: boolean;
}

interface SavedCoverLetter {
  id: string;
  company: string;
  jobTitle: string;
  date: string;
  coverLetterText: string;
  analysisText: string;
  jobUrl: string;
  resumeName: string;
}

export default function Library() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isPad = Platform.OS === 'ios' && Platform.isPad;
  const { user, guestCredit, refreshCredits } = useAuth();
  const userCredit = user?.credit ?? guestCredit;

  const [activeTab, setActiveTab] = useState<'resume' | 'cover-letter' | 'build-resume' | 'applied-jobs'>('resume');
  const [resumes, setResumes] = useState<SelectedResumeFile[]>([]);
  const [coverLetters, setCoverLetters] = useState<SavedCoverLetter[]>([]);
  const [appliedJobs, setAppliedJobs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const uploadedResumesList = resumes.filter(r => !r.isBuilt);
  const builtResumesList = resumes.filter(r => r.isBuilt);

  // Detail Modal States
  const [selectedLetter, setSelectedLetter] = useState<SavedCoverLetter | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const loadData = async () => {
    // Load Resumes
    try {
      const resumesJsonPath = `${FileSystem.documentDirectory}resumes.json`;
      const fileInfo = await FileSystem.getInfoAsync(resumesJsonPath);
      if (fileInfo.exists) {
        const content = await FileSystem.readAsStringAsync(resumesJsonPath);
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          setResumes(parsed);
        }
      } else {
        setResumes([]);
      }
    } catch (e) {
      console.log("Error loading resumes in library:", e);
    }

    // Load Cover Letters
    try {
      const coverLettersPath = `${FileSystem.documentDirectory}cover_letters.json`;
      const fileInfo = await FileSystem.getInfoAsync(coverLettersPath);
      if (fileInfo.exists) {
        const content = await FileSystem.readAsStringAsync(coverLettersPath);
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          setCoverLetters(parsed);
        }
      } else {
        setCoverLetters([]);
      }
    } catch (e) {
      console.log("Error loading cover letters in library:", e);
    }

    // Load Applied Jobs
    try {
      const appliedPath = `${FileSystem.documentDirectory}applied_jobs.json`;
      const fileInfo = await FileSystem.getInfoAsync(appliedPath);
      if (fileInfo.exists) {
        const content = await FileSystem.readAsStringAsync(appliedPath);
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          setAppliedJobs(parsed);
        }
      } else {
        setAppliedJobs([]);
      }
    } catch (e) {
      console.log("Error loading applied jobs in library:", e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const encodeBase64 = (input: string): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let str = input;
    let output = '';
    for (let block = 0, charCode, i = 0, map = chars;
         str.charAt(i | 0) || (map = '=', i % 1);
         output += map.charAt(63 & block >> 8 - i % 1 * 8)) {
      charCode = str.charCodeAt(i += 3/4);
      if (charCode > 0xFF) {
        throw new Error("'btoa' failed");
      }
      block = block << 8 | charCode;
    }
    return output;
  };

  const syncGreenhouseStatuses = async (currentList: any[]) => {
    try {
      const configPath = `${FileSystem.documentDirectory}greenhouse_config.json`;
      const configInfo = await FileSystem.getInfoAsync(configPath);
      if (!configInfo.exists) return currentList;

      const configText = await FileSystem.readAsStringAsync(configPath);
      const config = JSON.parse(configText);
      
      if (!config.harvestKey || !config.email) {
        return currentList;
      }

      const authHeader = `Basic ${encodeBase64(config.harvestKey + ":")}`;
      const res = await fetch(
        `https://harvest.greenhouse.io/v3/candidates?email=${encodeURIComponent(config.email)}`,
        {
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json'
          }
        }
      );

      if (!res.ok) {
        return currentList;
      }

      const candidates = await res.json();
      if (!Array.isArray(candidates) || candidates.length === 0) {
        return currentList;
      }

      const apiStatuses: Record<string, { status: string; stage: string }> = {};
      for (const cand of candidates) {
        if (cand.applications && Array.isArray(cand.applications)) {
          for (const app of cand.applications) {
            const status = app.status || 'active';
            const stage = app.current_stage?.name || 'Application Review';
            if (app.jobs && Array.isArray(app.jobs)) {
              for (const j of app.jobs) {
                apiStatuses[String(j.id)] = { status, stage };
              }
            }
          }
        }
      }

      let changed = false;
      const updatedList = currentList.map(item => {
        const match = apiStatuses[item.jobId];
        if (match) {
          if (item.status !== match.status || item.currentStage !== match.stage) {
            changed = true;
            return {
              ...item,
              status: match.status,
              currentStage: match.stage
            };
          }
        }
        return item;
      });

      if (changed) {
        const appliedPath = `${FileSystem.documentDirectory}applied_jobs.json`;
        await FileSystem.writeAsStringAsync(appliedPath, JSON.stringify(updatedList));
        return updatedList;
      }
    } catch (err) {
      console.log("Error syncing Greenhouse statuses:", err);
    }
    return currentList;
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshCredits();
      await loadData();

      // Sync applied jobs
      const appliedPath = `${FileSystem.documentDirectory}applied_jobs.json`;
      const appliedInfo = await FileSystem.getInfoAsync(appliedPath);
      if (appliedInfo.exists) {
        const text = await FileSystem.readAsStringAsync(appliedPath);
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          const synced = await syncGreenhouseStatuses(parsed);
          setAppliedJobs(synced);
        }
      }
    } catch (err) {
      console.log("Error refreshing library:", err);
    } finally {
      setRefreshing(false);
    }
  }, [refreshCredits]);


  const handleShareResume = async (item: SelectedResumeFile) => {
    if (!item.uri) {
      Alert.alert("File Not Found", "This resume does not have a valid file path.");
      return;
    }
    try {
      const Sharing = require('expo-sharing');
      const fileInfo = await FileSystem.getInfoAsync(item.uri);
      if (!fileInfo.exists) {
        Alert.alert("File Not Found", "The resume file does not exist on your device.");
        return;
      }

      // Copy to cache directory with clean name for sharing sheet beauty
      const cleanSharePath = `${FileSystem.cacheDirectory}${item.name}`;
      try {
        const cacheInfo = await FileSystem.getInfoAsync(cleanSharePath);
        if (cacheInfo.exists) {
          await FileSystem.deleteAsync(cleanSharePath, { idempotent: true });
        }
      } catch (e) {
        console.log("Error cleaning up cached share file in library:", e);
      }
      await FileSystem.copyAsync({
        from: item.uri,
        to: cleanSharePath
      });

      await Sharing.shareAsync(cleanSharePath, {
        mimeType: 'application/pdf',
        dialogTitle: `Download ${item.name}`,
        UTI: 'com.adobe.pdf'
      });
    } catch (err) {
      console.log("Error sharing resume:", err);
      Alert.alert("Error", "Could not share or download this resume.");
    }
  };

  const handleDeleteResume = (item: SelectedResumeFile) => {
    Alert.alert(
      "Delete Resume",
      `Are you sure you want to delete "${item.name}"? This will remove it from all matching tools.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (item.uri) {
                const info = await FileSystem.getInfoAsync(item.uri);
                if (info.exists) {
                  await FileSystem.deleteAsync(item.uri, { idempotent: true });
                }
              }
              const resumesJsonPath = `${FileSystem.documentDirectory}resumes.json`;
              const filtered = resumes.filter(r => r.id !== item.id);
              await FileSystem.writeAsStringAsync(resumesJsonPath, JSON.stringify(filtered));
              setResumes(filtered);
            } catch (err) {
              console.log("Error deleting resume:", err);
            }
          }
        }
      ]
    );
  };

  const handleResumePress = (item: SelectedResumeFile) => {
    Alert.alert(
      item.name,
      "What action would you like to perform?",
      [
        {
          text: "Share / Download PDF",
          onPress: () => handleShareResume(item)
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDeleteResume(item)
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
  };

  const handleDeleteCoverLetter = (id: string) => {
    Alert.alert(
      "Delete Cover Letter",
      "Are you sure you want to delete this cover letter from your library?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const coverLettersPath = `${FileSystem.documentDirectory}cover_letters.json`;
              const filtered = coverLetters.filter(item => item.id !== id);
              await FileSystem.writeAsStringAsync(coverLettersPath, JSON.stringify(filtered));
              setCoverLetters(filtered);
              if (selectedLetter?.id === id) {
                setModalVisible(false);
                setSelectedLetter(null);
              }
            } catch (err) {
              console.log("Error deleting cover letter:", err);
            }
          }
        }
      ]
    );
  };

  const handleCopyCoverLetterText = async (text: string) => {
    await copyToClipboard(text, "Cover letter copied to clipboard!");
  };

  const handleDownloadCoverLetterPdf = async (text: string) => {
    setIsDownloading(true);
    try {
      const Print = require('expo-print');
      const Sharing = require('expo-sharing');

      const formattedParagraphs = text
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .map(p => `<p>${p}</p>`)
        .join('\n');

      const formattedHtml = `
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, Helvetica, sans-serif;
                margin: 50px 60px;
                color: #000000;
                line-height: 1.6;
                font-size: 11.5pt;
              }
              p {
                margin-bottom: 18px;
                text-align: justify;
              }
            </style>
          </head>
          <body>
            ${formattedParagraphs}
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: formattedHtml });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Download Cover Letter',
        UTI: 'com.adobe.pdf'
      });
    } catch (err: any) {
      console.log("Error in PDF download:", err);
      Alert.alert("Error", err?.message || "Could not export cover letter PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  const openCoverLetterDetails = (item: SavedCoverLetter) => {
    setSelectedLetter(item);
    setModalVisible(true);
  };

  const handleDeleteAppliedJob = (id: string) => {
    Alert.alert(
      "Remove Tracking",
      "Are you sure you want to remove this job from your tracking list?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const appliedPath = `${FileSystem.documentDirectory}applied_jobs.json`;
              const filtered = appliedJobs.filter(item => item.id !== id);
              await FileSystem.writeAsStringAsync(appliedPath, JSON.stringify(filtered));
              setAppliedJobs(filtered);
            } catch (err) {
              console.log("Error deleting applied job:", err);
            }
          }
        }
      ]
    );
  };

  const renderAppliedJobItem = ({ item }: { item: any }) => {
    // Badges based on status
    let badgeBg = '#E0F2FE'; // light blue
    let badgeText = '#0369A1';
    let statusLabel = item.status.toUpperCase();

    if (item.status === 'hired') {
      badgeBg = '#D1FAE5'; // light green
      badgeText = '#065F46';
      statusLabel = 'HIRED 🥳';
    } else if (item.status === 'rejected') {
      badgeBg = '#FEE2E2'; // light red
      badgeText = '#991B1B';
      statusLabel = 'REJECTED';
    } else if (item.status === 'active') {
      badgeBg = '#F5F3FF'; // light purple
      badgeText = '#5B21B6';
      statusLabel = 'ACTIVE';
    }

    return (
      <View style={styles.appliedJobCard}>
        <View style={styles.appliedJobHeader}>
          <View style={styles.appliedJobInfo}>
            <Text style={styles.appliedJobTitle} numberOfLines={1}>{item.jobTitle}</Text>
            <Text style={styles.appliedJobCompany}>{item.companyName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.statusBadgeText, { color: badgeText }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.appliedJobFooter}>
          <View style={{ flex: 1 }}>
            <Text style={styles.appliedJobMetaText}>
              Stage: <Text style={{ fontWeight: '700', color: '#2E1A8E' }}>{item.currentStage || 'Application Review'}</Text>
            </Text>
            <Text style={styles.appliedJobDateText}>Applied: {item.date}</Text>
            <Text style={styles.appliedJobResumeText} numberOfLines={1}>Resume: {item.resumeName}</Text>
          </View>

          <TouchableOpacity
            style={styles.deleteAppBtn}
            activeOpacity={0.8}
            onPress={() => handleDeleteAppliedJob(item.id)}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderResumeItem = ({ item }: { item: SelectedResumeFile }) => {
    let indicatorColor = '#4B5563'; // default Slate
    if (item.name.toLowerCase().includes('executive')) {
      indicatorColor = '#1E293B';
    } else if (item.name.toLowerCase().includes('creative')) {
      indicatorColor = '#3B2E9B';
    } else if (item.name.toLowerCase().includes('elegant')) {
      indicatorColor = '#7C2D12';
    }

    return (
      <TouchableOpacity
        style={styles.resumeCard}
        activeOpacity={0.8}
        onPress={() => handleResumePress(item)}
      >
        <View style={styles.resumeCardLeft}>
          <View style={[styles.resumeIconWrapper, { backgroundColor: indicatorColor + '15' }]}>
            <Ionicons name="document-text" size={24} color={indicatorColor} />
          </View>
          <View style={styles.resumeTextWrapper}>
            <Text style={styles.resumeTitle} numberOfLines={1}>
              {item.name.replace(/_built\.pdf$/, '').replace(/_Resume\.pdf$/, '').replace(/_/g, ' ')}
            </Text>
            <Text style={styles.resumeDate}>Generated: {item.date}</Text>
            <Text style={styles.resumeMime} numberOfLines={1}>{item.name}</Text>
          </View>
        </View>

        <View style={styles.resumeCardRight}>
          <TouchableOpacity
            style={styles.cardShareButton}
            activeOpacity={0.8}
            onPress={() => handleShareResume(item)}
          >
            <Ionicons name="share-social-outline" size={16} color="#007AFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cardShareButton, { marginLeft: 8 }]}
            activeOpacity={0.8}
            onPress={() => handleDeleteResume(item)}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCoverLetterItem = ({ item }: { item: SavedCoverLetter }) => (
    <TouchableOpacity
      style={styles.coverLetterCard}
      activeOpacity={0.8}
      onPress={() => openCoverLetterDetails(item)}
    >
      <View style={styles.coverCardLeft}>
        <View style={styles.coverIconWrapper}>
          <Ionicons name="sparkles" size={18} color="#007AFF" />
        </View>
        <View style={styles.coverTextWrapper}>
          <Text style={styles.coverTitle} numberOfLines={1}>
            {item.company} | {item.jobTitle}
          </Text>
          <Text style={styles.coverDate}>Generated: {item.date}</Text>
          <Text style={styles.coverSubtitle} numberOfLines={1}>
            Resume: {item.resumeName}
          </Text>
        </View>
      </View>
      <View style={styles.coverCardRight}>
        <TouchableOpacity
          style={styles.cardCopyButton}
          activeOpacity={0.8}
          onPress={() => handleCopyCoverLetterText(item.coverLetterText)}
        >
          <Ionicons name="copy-outline" size={16} color="#000000" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.cardCopyButton, { marginLeft: 8 }]}
          activeOpacity={0.8}
          onPress={() => handleDeleteCoverLetter(item.id)}
        >
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { marginTop: insets.top + (isPad ? 25 : 0) }]}>
        <TouchableOpacity
          style={styles.profileContainer}
          activeOpacity={0.8}
          onPress={() => router.push('/settings')}
        >
          <Image
            source={require('../../assets/images/placeholder-avatar.png')}
            style={styles.profilePic}
          />
        </TouchableOpacity>

        {isPad && (
          <View style={styles.topNavCapsule}>
            <TouchableOpacity
              style={styles.topNavItem}
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={styles.topNavText}>Resume</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.topNavItem}
              onPress={() => router.replace('/(tabs)/cover-letter')}
            >
              <Text style={styles.topNavText}>Cover Letter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.topNavItem, styles.topNavItemActive]}
              onPress={() => router.replace('/(tabs)/library')}
            >
              <Text style={[styles.topNavText, styles.topNavTextActive]}>Your Doc</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.creditsBadge}
          activeOpacity={0.8}
          onPress={() => router.push('/pricing')}
        >
          <Text style={styles.creditsText}>{userCredit} Credits</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, width: '100%', maxWidth: isPad ? 600 : (isLandscape ? 600 : '100%'), alignSelf: 'center' }}>
        {/* Tabs Row */}
        <View style={{ height: 48, marginBottom: 16 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabsScrollView}
            contentContainerStyle={styles.tabsContainer}
          >
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'resume' && styles.tabButtonActive]}
              activeOpacity={0.9}
              onPress={() => setActiveTab('resume')}
            >
              <Text style={[styles.tabText, activeTab === 'resume' && styles.tabTextActive]}>
                Resumes
              </Text>
              {activeTab === 'resume' && <View style={styles.activeIndicator} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'cover-letter' && styles.tabButtonActive]}
              activeOpacity={0.9}
              onPress={() => setActiveTab('cover-letter')}
            >
              <Text style={[styles.tabText, activeTab === 'cover-letter' && styles.tabTextActive]}>
                Cover letters
              </Text>
              {activeTab === 'cover-letter' && <View style={styles.activeIndicator} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'build-resume' && styles.tabButtonActive]}
              activeOpacity={0.9}
              onPress={() => setActiveTab('build-resume')}
            >
              <Text style={[styles.tabText, activeTab === 'build-resume' && styles.tabTextActive]}>
                Build Resume
              </Text>
              {activeTab === 'build-resume' && <View style={styles.activeIndicator} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'applied-jobs' && styles.tabButtonActive]}
              activeOpacity={0.9}
              onPress={() => setActiveTab('applied-jobs')}
            >
              <Text style={[styles.tabText, activeTab === 'applied-jobs' && styles.tabTextActive]}>
                Applied Jobs
              </Text>
              {activeTab === 'applied-jobs' && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Content Section */}
        {activeTab === 'resume' ? (
          uploadedResumesList.length === 0 ? (
            <ScrollView
              contentContainerStyle={styles.emptyContainer}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            >
              <Ionicons name="folder-open-outline" size={80} color="#A0AEC0" />
              <Text style={styles.emptyTitle}>No Resumes yet</Text>
              <Text style={styles.emptySubtitle}>
                Upload or select a resume in the Match Resume tool to start auditing.
              </Text>
              <TouchableOpacity
                style={styles.actionButton}
                activeOpacity={0.8}
                onPress={() => router.push('/audit')}
              >
                <Text style={styles.actionButtonText}>Match Resume ✨</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <FlatList
              data={uploadedResumesList}
              keyExtractor={(item) => item.id}
              renderItem={renderResumeItem}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            />
          )
        ) : activeTab === 'cover-letter' ? (
          coverLetters.length === 0 ? (
            <ScrollView
              contentContainerStyle={styles.emptyContainer}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            >
              <Ionicons name="document-text-outline" size={80} color="#A0AEC0" />
              <Text style={styles.emptyTitle}>No Cover Letters yet</Text>
              <Text style={styles.emptySubtitle}>
                Paste a job description URL and generate professional cover letters instantly.
              </Text>
              <TouchableOpacity
                style={styles.actionButton}
                activeOpacity={0.8}
                onPress={() => router.push('/(tabs)/cover-letter')}
              >
                <Text style={styles.actionButtonText}>Write Cover Letter ✨</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <FlatList
              data={coverLetters}
              keyExtractor={(item) => item.id}
              renderItem={renderCoverLetterItem}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            />
          )
        ) : activeTab === 'applied-jobs' ? (
          appliedJobs.length === 0 ? (
            <ScrollView
              contentContainerStyle={styles.emptyContainer}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            >
              <Ionicons name="briefcase-outline" size={80} color="#A0AEC0" />
              <Text style={styles.emptyTitle}>No Applied Jobs yet</Text>
              <Text style={styles.emptySubtitle}>
                Find Greenhouse jobs in the search tool and submit your applications to track them here.
              </Text>
              <TouchableOpacity
                style={styles.actionButton}
                activeOpacity={0.8}
                onPress={() => router.push('/jobs' as any)}
              >
                <Text style={styles.actionButtonText}>Find Jobs 💼</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <FlatList
              data={appliedJobs}
              keyExtractor={(item) => item.id}
              renderItem={renderAppliedJobItem}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            />
          )
        ) : (
          /* Build Resume Tab Panel */
          <ScrollView
            style={styles.buildTabContainer}
            contentContainerStyle={styles.buildTabContent}
            showsVerticalScrollIndicator={false}
          >
            {builtResumesList.length > 0 ? (
              <View style={{ width: '100%' }}>
                <Text style={styles.sectionHeading}>Your Built Resumes</Text>
                <View style={{ marginBottom: 16 }}>
                  {builtResumesList.map((item) => (
                    <View key={item.id} style={{ marginBottom: 8 }}>
                      {renderResumeItem({ item })}
                    </View>
                  ))}
                </View>
                
                <TouchableOpacity
                  style={styles.buildAnotherBtn}
                  activeOpacity={0.8}
                  onPress={() => router.push('/build-resume')}
                >
                  <Text style={styles.buildAnotherBtnText}>Build Another Resume ✨</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ width: '100%' }}>
                <LinearGradient
                  colors={['#4F46E5', '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroCard}
                >
                  <View style={styles.heroCardLeft}>
                    <View style={styles.heroBadge}>
                      <Ionicons name="sparkles" size={10} color="#FBBF24" style={{ marginRight: 4 }} />
                      <Text style={styles.heroBadgeText}>FREE & UNLIMITED</Text>
                    </View>
                    <Text style={styles.heroTitle}>Create Your Dream Resume</Text>
                    <Text style={styles.heroSubtitle}>
                      100% offline, private, and credit-free resume builder.
                    </Text>
                    <TouchableOpacity
                      style={styles.heroStartBtn}
                      activeOpacity={0.9}
                      onPress={() => router.push('/build-resume')}
                    >
                      <Text style={styles.heroStartBtnText}>Start Building Now</Text>
                      <Ionicons name="arrow-forward" size={16} color="#4F46E5" style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.heroCardRight}>
                    <Ionicons name="document-text" size={72} color="rgba(255,255,255,0.25)" />
                  </View>
                </LinearGradient>

                <Text style={styles.sectionHeading}>Available Template Layouts</Text>

                <View style={styles.templatesShowcaseGrid}>
                  <View style={styles.templateShowcaseCard}>
                    <View style={[styles.templateShowcaseMini, { borderColor: '#475569' }]}>
                      <View style={[styles.templateMiniHeader, { backgroundColor: '#475569' }]} />
                      <View style={styles.templateMiniRow}>
                        <View style={[styles.templateMiniLine, { width: '30%', height: 4, backgroundColor: '#CBD5E1', marginRight: 4 }]} />
                        <View style={[styles.templateMiniLine, { width: '60%', height: 4, backgroundColor: '#CBD5E1' }]} />
                      </View>
                      <View style={styles.templateMiniRow}>
                        <View style={[styles.templateMiniLine, { width: '40%', height: 4, backgroundColor: '#E2E8F0', marginRight: 4 }]} />
                        <View style={[styles.templateMiniLine, { width: '50%', height: 4, backgroundColor: '#E2E8F0' }]} />
                      </View>
                    </View>
                    <Text style={styles.templateShowcaseTitle}>Modern Slate</Text>
                    <Text style={styles.templateShowcaseDesc}>Clean split-column layout with slate highlights</Text>
                  </View>

                  <View style={styles.templateShowcaseCard}>
                    <View style={[styles.templateShowcaseMini, { borderColor: '#1E293B' }]}>
                      <View style={[styles.templateMiniHeader, { backgroundColor: '#1E293B', height: 16 }]} />
                      <View style={[styles.templateMiniRow, { justifyContent: 'center' }]}>
                        <View style={[styles.templateMiniLine, { width: '50%', height: 5, backgroundColor: '#CBD5E1' }]} />
                      </View>
                      <View style={styles.templateMiniRow}>
                        <View style={[styles.templateMiniLine, { width: '80%', height: 4, backgroundColor: '#E2E8F0' }]} />
                      </View>
                      <View style={styles.templateMiniRow}>
                        <View style={[styles.templateMiniLine, { width: '70%', height: 4, backgroundColor: '#E2E8F0' }]} />
                      </View>
                    </View>
                    <Text style={styles.templateShowcaseTitle}>Executive Classic</Text>
                    <Text style={styles.templateShowcaseDesc}>Timeless centered design for leadership roles</Text>
                  </View>

                  <View style={styles.templateShowcaseCard}>
                    <View style={[styles.templateShowcaseMini, { borderColor: '#1E1B4B' }]}>
                      <View style={styles.templateMiniCols}>
                        <View style={[styles.templateMiniLeftCol, { backgroundColor: '#1E1B4B', width: '25%' }]} />
                        <View style={[styles.templateMiniRightCol, { width: '75%', padding: 4 }]}>
                          <View style={[styles.templateMiniLine, { width: '80%', height: 4, backgroundColor: '#CBD5E1', marginBottom: 4 }]} />
                          <View style={[styles.templateMiniLine, { width: '60%', height: 3, backgroundColor: '#E2E8F0', marginBottom: 4 }]} />
                          <View style={[styles.templateMiniLine, { width: '70%', height: 3, backgroundColor: '#E2E8F0' }]} />
                        </View>
                      </View>
                    </View>
                    <Text style={styles.templateShowcaseTitle}>Creative Columns</Text>
                    <Text style={styles.templateShowcaseDesc}>Vibrant and bold layout with a navy sidebar</Text>
                  </View>

                  <View style={styles.templateShowcaseCard}>
                    <View style={[styles.templateShowcaseMini, { borderColor: '#7C2D12' }]}>
                      <View style={[styles.templateMiniHeader, { backgroundColor: '#FDF8F6', height: 12, borderBottomWidth: 1, borderBottomColor: '#7C2D12' }]} />
                      <View style={styles.templateMiniRow}>
                        <View style={[styles.templateMiniLine, { width: '35%', height: 4, backgroundColor: '#F97316' }]} />
                      </View>
                      <View style={styles.templateMiniRow}>
                        <View style={[styles.templateMiniLine, { width: '85%', height: 4, backgroundColor: '#CBD5E1' }]} />
                      </View>
                      <View style={styles.templateMiniRow}>
                        <View style={[styles.templateMiniLine, { width: '80%', height: 4, backgroundColor: '#E2E8F0' }]} />
                      </View>
                    </View>
                    <Text style={styles.templateShowcaseTitle}>Elegant Warm</Text>
                    <Text style={styles.templateShowcaseDesc}>Warm styling with sophisticated editorial fonts</Text>
                  </View>
                </View>

                <View style={styles.featuresListContainer}>
                  <Text style={styles.sectionHeading}>Why Build With Us?</Text>
                  <View style={styles.featureItem}>
                    <View style={styles.featureIconBox}>
                      <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                    </View>
                    <View style={styles.featureTextBox}>
                      <Text style={styles.featureTitle}>100% Private</Text>
                      <Text style={styles.featureDesc}>All data remains securely stored on your local device.</Text>
                    </View>
                  </View>
                  <View style={styles.featureItem}>
                    <View style={styles.featureIconBox}>
                      <Ionicons name="image" size={20} color="#F59E0B" />
                    </View>
                    <View style={styles.featureTextBox}>
                      <Text style={styles.featureTitle}>Profile Image Support</Text>
                      <Text style={styles.featureDesc}>Easily upload your photo to be beautifully embedded into layouts.</Text>
                    </View>
                  </View>
                  <View style={styles.featureItem}>
                    <View style={styles.featureIconBox}>
                      <Ionicons name="share-social" size={20} color="#3B82F6" />
                    </View>
                    <View style={styles.featureTextBox}>
                      <Text style={styles.featureTitle}>Instant PDF Sharing</Text>
                      <Text style={styles.featureDesc}>Export high-resolution PDFs directly to print or share instantly.</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Cover Letter Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalHeaderTitle} numberOfLines={1}>
                  {selectedLetter?.company}
                </Text>
                <Text style={styles.modalHeaderSubtitle} numberOfLines={1}>
                  {selectedLetter?.jobTitle}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                activeOpacity={0.8}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalLabel}>Cover Letter Text</Text>
              <Text style={styles.coverLetterBody}>
                {selectedLetter?.coverLetterText}
              </Text>

              {selectedLetter?.analysisText ? (
                <View style={styles.modalAnalysisContainer}>
                  <Text style={styles.modalLabel}>AI Recruiter Insights</Text>
                  <Text style={styles.analysisBody}>
                    {selectedLetter?.analysisText}
                  </Text>
                </View>
              ) : null}
            </ScrollView>

            {/* Modal Bottom Buttons */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalFooterButtonCopy}
                activeOpacity={0.8}
                onPress={() => selectedLetter && handleCopyCoverLetterText(selectedLetter.coverLetterText)}
              >
                <Ionicons name="copy-outline" size={16} color="#000000" style={{ marginRight: 6 }} />
                <Text style={styles.modalFooterButtonTextCopy}>COPY</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalFooterButtonDownload}
                activeOpacity={0.8}
                disabled={isDownloading}
                onPress={() => selectedLetter && handleDownloadCoverLetterPdf(selectedLetter.coverLetterText)}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.modalFooterButtonTextDownload}>DOWNLOAD</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  tabsScrollView: {
    maxHeight: 50,
  },
  appliedJobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  appliedJobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 12,
    marginBottom: 12,
  },
  appliedJobInfo: {
    flex: 1,
    marginRight: 12,
  },
  appliedJobTitle: {
    color: '#2E1A8E',
    fontSize: 16,
    fontWeight: '800',
  },
  appliedJobCompany: {
    color: '#6355D8',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  appliedJobFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  appliedJobMetaText: {
    color: '#6B7280',
    fontSize: 13,
  },
  appliedJobDateText: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 4,
  },
  appliedJobResumeText: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
  },
  deleteAppBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buildAnotherBtn: {
    backgroundColor: '#000000',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  buildAnotherBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    zIndex: 10,
  },
  profileContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#EAEAEA',
  },
  profilePic: {
    width: '100%',
    height: '100%',
  },
  creditsBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EAEAEA',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  creditsText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: '#E2E8F0',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    position: 'relative',
  },
  tabButtonActive: {},
  tabText: {
    fontSize: 16,
    color: '#718096',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#000000',
    fontWeight: '800',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -1.5,
    width: 80,
    height: 3,
    backgroundColor: '#000000',
    borderRadius: 1.5,
  },
  // Resume Card Styles
  resumeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  resumeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  resumeIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resumeTextWrapper: {
    flex: 1,
  },
  resumeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  resumeDate: {
    fontSize: 11,
    color: '#718096',
    fontWeight: '500',
    marginBottom: 2,
  },
  resumeMime: {
    fontSize: 11,
    color: '#A0AEC0',
    fontWeight: '500',
  },
  resumeCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardShareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // List View Styles for Cover Letters
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 100,
  },
  coverLetterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  coverCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  coverIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  coverTextWrapper: {
    flex: 1,
  },
  coverTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  coverDate: {
    fontSize: 11,
    color: '#718096',
    fontWeight: '500',
    marginBottom: 2,
  },
  coverSubtitle: {
    fontSize: 11,
    color: '#A0AEC0',
    fontWeight: '500',
  },
  coverCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardCopyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Empty State Styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 120,
  },
  emptyTitle: {
    color: '#000000',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#718096',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: '#000000',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
  },
  modalHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
  },
  modalHeaderSubtitle: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '600',
    marginTop: 2,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  modalScrollContent: {
    paddingBottom: 40,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  coverLetterBody: {
    fontSize: 14,
    lineHeight: 22,
    color: '#2D3748',
    fontWeight: '500',
    marginBottom: 24,
  },
  modalAnalysisContainer: {
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
    paddingTop: 20,
  },
  analysisBody: {
    fontSize: 13,
    lineHeight: 20,
    color: '#4A5568',
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
  },
  modalFooterButtonCopy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    paddingVertical: 14,
    marginRight: 12,
  },
  modalFooterButtonTextCopy: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
  modalFooterButtonDownload: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: 24,
    paddingVertical: 14,
  },
  modalFooterButtonTextDownload: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  // Build tab styles
  buildTabContainer: {
    flex: 1,
  },
  buildTabContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 120,
  },
  heroCard: {
    borderRadius: 28,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
  heroCardLeft: {
    flex: 1,
    marginRight: 16,
  },
  heroCardRight: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 16,
  },
  heroStartBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  heroStartBtnText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 16,
    marginTop: 8,
  },
  templatesShowcaseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  templateShowcaseCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  templateShowcaseMini: {
    width: '100%',
    height: 90,
    borderWidth: 1.5,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    marginBottom: 10,
    padding: 6,
  },
  templateMiniHeader: {
    height: 10,
    borderRadius: 4,
    marginBottom: 8,
    width: '100%',
  },
  templateMiniRow: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'center',
  },
  templateMiniLine: {
    borderRadius: 2,
  },
  templateMiniCols: {
    flexDirection: 'row',
    height: '100%',
  },
  templateMiniLeftCol: {
    height: '100%',
    borderRadius: 4,
  },
  templateMiniRightCol: {
    flex: 1,
  },
  templateShowcaseTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  templateShowcaseDesc: {
    fontSize: 10,
    color: '#718096',
    lineHeight: 13,
    fontWeight: '500',
  },
  featuresListContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    padding: 20,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  featureIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  featureTextBox: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: '#718096',
    lineHeight: 16,
    fontWeight: '500',
  },
  topNavCapsule: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 24,
    padding: 4,
    alignItems: 'center',
  },
  topNavItem: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topNavItemActive: {
    backgroundColor: '#FFFFFF',
  },
  topNavText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '600',
  },
  topNavTextActive: {
    color: '#007AFF',
    fontWeight: '700',
  },
});
