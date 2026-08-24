import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  FlatList,
  Platform,
  Alert,
  ActionSheetIOS,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth } from '../../context/AuthContext';
import { copyToClipboard } from '../../utils/clipboard';

interface ResumeItem {
  id: string;
  name: string;
  uri?: string;
  date: string;
  size?: string;
  isDefault?: boolean;
}

interface SavedCoverLetter {
  id: string;
  company: string;
  jobTitle: string;
  date: string;
  coverLetterText: string;
  analysisText?: string;
  jobUrl?: string;
  resumeName: string;
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user, guestCredit, refreshCredits } = useAuth();
  const userCredit = user?.credit ?? guestCredit;

  const safeTop = Math.max(insets.top + 12, 54);
  const safeBottom = insets.bottom > 0 ? insets.bottom + 64 : 76;

  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [coverLetters, setCoverLetters] = useState<SavedCoverLetter[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'resumes' | 'cover-letters'>('resumes');

  // Sliding tab animation
  const slideAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: activeSubTab === 'resumes' ? 0 : width / 2,
      tension: 42,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [activeSubTab, width]);

  // Detail Modal States
  const [selectedLetter, setSelectedLetter] = useState<SavedCoverLetter | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const loadData = async () => {
    // 1. Load Resumes
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
        // Fallback checks from onboarding profile
        const profilePath = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
        const profileInfo = await FileSystem.getInfoAsync(profilePath);
        if (profileInfo.exists) {
          const pText = await FileSystem.readAsStringAsync(profilePath);
          const pData = JSON.parse(pText);
          if (pData.resumeFile) {
            const fallback: ResumeItem[] = [
              {
                id: '1',
                name: pData.resumeFile.name || 'Resume.pdf',
                uri: pData.resumeFile.uri,
                date: '25 Jun',
                isDefault: true,
              }
            ];
            setResumes(fallback);
            await FileSystem.writeAsStringAsync(resumesJsonPath, JSON.stringify(fallback));
          } else {
            setResumes([]);
          }
        } else {
          setResumes([]);
        }
      }
    } catch (e) {
      console.log('Error loading resumes in home:', e);
    }

    // 2. Load Cover Letters
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
      console.log('Error loading cover letters in home:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    try {
      await refreshCredits();
    } catch (err) {
      console.log('Error refreshing credits:', err);
    }
    setRefreshing(false);
  }, [refreshCredits]);

  const handleBuildResume = () => {
    router.push('/build-resume');
  };

  const handleUploadResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const isFirst = resumes.length === 0;
        const newResume: ResumeItem = {
          id: Date.now().toString(),
          name: asset.name || 'My_Resume.pdf',
          uri: asset.uri,
          date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
          size: asset.size ? `${(asset.size / 1024 / 1024).toFixed(1)} MB` : undefined,
          isDefault: isFirst,
        };
        const updated = [newResume, ...resumes];
        await saveResumesList(updated);
      }
    } catch (e) {
      console.log('Document picker error:', e);
      // Fallback demo file if cancel/error on simulator/TestFlight
      const isFirst = resumes.length === 0;
      const demoResume: ResumeItem = {
        id: Date.now().toString(),
        name: 'OmidMoradi_25jun.PDF',
        date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        isDefault: isFirst,
      };
      saveResumesList([demoResume, ...resumes]);
    }
  };

  const saveResumesList = async (list: ResumeItem[]) => {
    try {
      const path = `${FileSystem.documentDirectory}resumes.json`;
      await FileSystem.writeAsStringAsync(path, JSON.stringify(list));
      setResumes(list);

      // Sync default resume with onboarding profile
      const defaultItem = list.find((r) => r.isDefault);
      if (defaultItem) {
        const profilePath = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
        const profileInfo = await FileSystem.getInfoAsync(profilePath);
        let profileData: any = {};
        if (profileInfo.exists) {
          const pText = await FileSystem.readAsStringAsync(profilePath);
          profileData = JSON.parse(pText);
        }
        const updatedProfile = {
          ...profileData,
          defaultResumeId: defaultItem.id,
          defaultResumeFile: defaultItem,
          resumeFile: defaultItem.uri ? {
            name: defaultItem.name,
            uri: defaultItem.uri,
            size: defaultItem.size ? Math.round(parseFloat(defaultItem.size) * 1024 * 1024) : undefined,
          } : null,
        };
        await FileSystem.writeAsStringAsync(profilePath, JSON.stringify(updatedProfile));
      }
    } catch (e) {
      console.log('Error saving resumes list:', e);
    }
  };

  const handleSetDefault = (id: string) => {
    const updated = resumes.map((r) => ({
      ...r,
      isDefault: r.id === id,
    }));
    saveResumesList(updated);
  };

  const handleDeleteResume = async (item: ResumeItem) => {
    Alert.alert(
      'Delete Resume',
      `Are you sure you want to delete ${item.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = resumes.filter((r) => r.id !== item.id);
            setResumes(updated);
            const resumesJsonPath = `${FileSystem.documentDirectory}resumes.json`;
            await FileSystem.writeAsStringAsync(resumesJsonPath, JSON.stringify(updated));

            // If default resume was deleted, make another one default
            if (item.isDefault && updated.length > 0) {
              handleSetDefault(updated[0].id);
            } else if (updated.length === 0) {
              // Clear profile default resume
              const profilePath = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
              const profileInfo = await FileSystem.getInfoAsync(profilePath);
              if (profileInfo.exists) {
                const pText = await FileSystem.readAsStringAsync(profilePath);
                const pData = JSON.parse(pText);
                delete pData.defaultResumeId;
                delete pData.defaultResumeFile;
                delete pData.resumeFile;
                await FileSystem.writeAsStringAsync(profilePath, JSON.stringify(pData));
              }
            }
          },
        },
      ]
    );
  };

  const handleShareResume = async (item: ResumeItem) => {
    try {
      if (item.uri) {
        const Sharing = require('expo-sharing');
        const isAvailable = await Sharing.isAvailableAsync().catch(() => false);
        if (isAvailable) {
          await Sharing.shareAsync(item.uri);
        } else {
          Alert.alert('Share Resume', `File URI: ${item.uri}`);
        }
      } else {
        Alert.alert('Resume', `Viewing details for ${item.name}`);
      }
    } catch (e) {
      console.log('Error sharing resume:', e);
      Alert.alert('Error', 'Could not open share sheet for this file.');
    }
  };

  const handleResumeMenu = (item: ResumeItem, index: number) => {
    const options = item.isDefault
      ? ['View / Share', 'Delete', 'Cancel']
      : ['Set as Default', 'View / Share', 'Delete', 'Cancel'];

    const showMenu = () => {
      Alert.alert(
        item.name,
        item.isDefault ? 'Default resume for job applications' : undefined,
        [
          ...(!item.isDefault
            ? [{ text: 'Set as Default', onPress: () => handleSetDefault(item.id) }]
            : []),
          { text: 'View / Share', onPress: () => handleShareResume(item) },
          { text: 'Delete', style: 'destructive', onPress: () => handleDeleteResume(item) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex: item.isDefault ? 1 : 2,
          cancelButtonIndex: item.isDefault ? 2 : 3,
          title: item.name,
          message: item.isDefault ? 'Default resume for job applications' : undefined,
        },
        (buttonIndex) => {
          if (!item.isDefault) {
            if (buttonIndex === 0) handleSetDefault(item.id);
            else if (buttonIndex === 1) handleShareResume(item);
            else if (buttonIndex === 2) handleDeleteResume(item);
          } else {
            if (buttonIndex === 0) handleShareResume(item);
            else if (buttonIndex === 1) handleDeleteResume(item);
          }
        }
      );
    } else {
      showMenu();
    }
  };

  const handleCopyCoverLetterText = async (text: string) => {
    await copyToClipboard(text, 'Cover letter copied to clipboard!');
  };

  const handleDeleteCoverLetter = async (item: SavedCoverLetter) => {
    Alert.alert(
      'Delete Cover Letter',
      `Are you sure you want to delete this cover letter?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = coverLetters.filter((c) => c.id !== item.id);
            setCoverLetters(updated);
            const coverLettersPath = `${FileSystem.documentDirectory}cover_letters.json`;
            await FileSystem.writeAsStringAsync(coverLettersPath, JSON.stringify(updated));
          },
        },
      ]
    );
  };

  const handleCoverLetterMenu = (item: SavedCoverLetter) => {
    const options = ['View Details', 'Copy Text', 'Delete', 'Cancel'];

    const showMenu = () => {
      Alert.alert(
        `${item.company} | ${item.jobTitle}`,
        undefined,
        [
          { text: 'View Details', onPress: () => openCoverLetterDetails(item) },
          { text: 'Copy Text', onPress: () => handleCopyCoverLetterText(item.coverLetterText) },
          { text: 'Delete', style: 'destructive', onPress: () => handleDeleteCoverLetter(item) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex: 2,
          cancelButtonIndex: 3,
          title: `${item.company} | ${item.jobTitle}`,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) openCoverLetterDetails(item);
          else if (buttonIndex === 1) handleCopyCoverLetterText(item.coverLetterText);
          else if (buttonIndex === 2) handleDeleteCoverLetter(item);
        }
      );
    } else {
      showMenu();
    }
  };

  const handleDownloadCoverLetterPdf = async (text: string) => {
    setIsDownloading(true);
    try {
      const Print = require('expo-print');
      const Sharing = require('expo-sharing');

      const formattedParagraphs = text
        .split('\n')
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
        .map((p) => `<p>${p}</p>`)
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
        UTI: 'com.adobe.pdf',
      });
    } catch (err: any) {
      console.log('Error in PDF download:', err);
      Alert.alert('Error', err?.message || 'Could not export cover letter PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  const openCoverLetterDetails = (letter: SavedCoverLetter) => {
    setSelectedLetter(letter);
    setModalVisible(true);
  };

  const renderResumeItem = ({ item, index }: { item: ResumeItem; index: number }) => (
    <View style={styles.resumeCard}>
      <View style={styles.folderIconBox}>
        <Ionicons name="folder" size={24} color="#64748B" />
      </View>

      <View style={styles.resumeInfoContainer}>
        <Text style={styles.resumeNameText} numberOfLines={1}>
          {item.name}
        </Text>
        {item.isDefault && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultBadgeText}>Default</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.menuDotsBtn}
        activeOpacity={0.7}
        onPress={() => handleResumeMenu(item, index)}
      >
        <Ionicons name="ellipsis-vertical" size={18} color="#94A3B8" />
      </TouchableOpacity>
    </View>
  );

  const renderCoverLetterItem = ({ item }: { item: SavedCoverLetter }) => (
    <TouchableOpacity
      style={styles.resumeCard}
      activeOpacity={0.9}
      onPress={() => openCoverLetterDetails(item)}
    >
      <View style={[styles.folderIconBox, { backgroundColor: '#EFF6FF' }]}>
        <Ionicons name="sparkles" size={20} color="#3B82F6" />
      </View>

      <View style={styles.resumeInfoContainer}>
        <Text style={styles.resumeNameText} numberOfLines={1}>
          {item.company} | {item.jobTitle}
        </Text>
        <Text style={styles.coverLetterMetaText}>
          Generated: {item.date} • Resume: {item.resumeName}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.menuDotsBtn}
        activeOpacity={0.7}
        onPress={() => handleCoverLetterMenu(item)}
      >
        <Ionicons name="ellipsis-vertical" size={18} color="#94A3B8" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* HEADER CONTAINER */}
      <View style={[styles.headerContainer, { paddingTop: insets.top > 0 ? insets.top + 8 : 40 }]}>
        {/* Top Row: Credit Badge */}
        <View style={styles.topHeaderRow}>
          <View />
          <TouchableOpacity
            style={styles.creditsBadge}
            activeOpacity={0.8}
            onPress={() => router.push('/pricing' as any)}
          >
            <Text style={styles.creditsText}>{userCredit}</Text>
            <Image
              source={require('../../assets/images/header-icon.png')}
              style={{ width: 14, height: 14, marginLeft: 4, resizeMode: 'contain' }}
            />
          </TouchableOpacity>
        </View>

        {/* Bottom Row: Full Width Sub-tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabButton, activeSubTab === 'resumes' && styles.tabButtonActive]}
            activeOpacity={0.8}
            onPress={() => setActiveSubTab('resumes')}
          >
            <Text style={[styles.tabButtonText, activeSubTab === 'resumes' && styles.tabButtonTextActive]}>
              Resumes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeSubTab === 'cover-letters' && styles.tabButtonActive]}
            activeOpacity={0.8}
            onPress={() => setActiveSubTab('cover-letters')}
          >
            <Text style={[styles.tabButtonText, activeSubTab === 'cover-letters' && styles.tabButtonTextActive]}>
              Cover letter
            </Text>
          </TouchableOpacity>

          <Animated.View
            style={[
              styles.animatedUnderline,
              {
                width: width / 2,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          />
        </View>
      </View>

      {/* SUB-TAB CONTENTS */}
      <View style={styles.tabContentArea}>
        {activeSubTab === 'resumes' ? (
          resumes.length === 0 ? (
            <ScrollView
              contentContainerStyle={styles.emptyContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
              <Image
                source={require('../../assets/images/resume-new.png')}
                style={styles.emptyStateImage}
              />
            </ScrollView>
          ) : (
            <FlatList
              data={resumes}
              keyExtractor={(item, index) => item.id || String(index)}
              renderItem={renderResumeItem}
              contentContainerStyle={styles.listContentContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            />
          )
        ) : coverLetters.length === 0 ? (
          <ScrollView
            contentContainerStyle={styles.emptyLettersContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            <Ionicons name="sparkles-outline" size={72} color="#CBD5E1" />
            <Text style={styles.emptyLettersTitle}>No Cover Letters yet</Text>
            <Text style={styles.emptyLettersSubtitle}>
              Submit tailored cover letters for jobs and they will be listed here.
            </Text>
          </ScrollView>
        ) : (
          <FlatList
            data={coverLetters}
            keyExtractor={(item, index) => item.id || String(index)}
            renderItem={renderCoverLetterItem}
            contentContainerStyle={styles.listContentContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
        )}
      </View>

      {/* BOTTOM BUTTONS */}
      <View style={[styles.bottomButtonsFooter, { paddingBottom: safeBottom }]}>
        <TouchableOpacity
          style={styles.uploadButton}
          activeOpacity={0.8}
          onPress={handleUploadResume}
        >
          <Text style={styles.uploadButtonText}>Upload resume</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buildButton}
          activeOpacity={0.8}
          onPress={handleBuildResume}
        >
          <Text style={styles.buildButtonText}>Start building a resume</Text>
        </TouchableOpacity>
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
              <View style={{ flex: 1, marginRight: 8 }}>
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
              <Text style={styles.coverLetterBody}>{selectedLetter?.coverLetterText}</Text>

              {selectedLetter?.analysisText ? (
                <View style={styles.modalAnalysisContainer}>
                  <Text style={styles.modalLabel}>AI Recruiter Insights</Text>
                  <Text style={styles.analysisBody}>{selectedLetter?.analysisText}</Text>
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalFooterButtonCopy}
                activeOpacity={0.8}
                onPress={() =>
                  selectedLetter && handleCopyCoverLetterText(selectedLetter.coverLetterText)
                }
              >
                <Ionicons name="copy-outline" size={16} color="#000000" style={{ marginRight: 6 }} />
                <Text style={styles.modalFooterButtonTextCopy}>COPY</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalFooterButtonDownload}
                activeOpacity={0.8}
                disabled={isDownloading}
                onPress={() =>
                  selectedLetter && handleDownloadCoverLetterPdf(selectedLetter.coverLetterText)
                }
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
  headerContainer: {
    backgroundColor: '#F8F9FA',
    zIndex: 10,
  },
  topHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    height: 48,
  },
  creditsBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
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
  tabsRow: {
    flexDirection: 'row',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginTop: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 14,
    paddingBottom: 14,
  },
  tabButtonActive: {},
  animatedUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2,
    backgroundColor: '#000000',
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#737373',
  },
  tabButtonTextActive: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  tabContentArea: {
    flex: 1,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 120,
  },
  emptyStateImage: {
    width: 280,
    height: 280,
    resizeMode: 'contain',
    alignSelf: 'center',
  },
  listContentContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  resumeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  folderIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resumeInfoContainer: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  resumeNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  defaultBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#2563EB',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    fontStyle: 'italic',
  },
  menuDotsBtn: {
    padding: 6,
  },
  coverLetterMetaText: {
    fontSize: 11,
    color: '#64748B',
  },
  emptyLettersContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 120,
  },
  emptyLettersTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyLettersSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  bottomButtonsFooter: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  uploadButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  buildButton: {
    backgroundColor: '#000000',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  buildButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '85%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },
  modalHeaderSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  coverLetterBody: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 24,
  },
  modalAnalysisContainer: {
    marginTop: 8,
  },
  analysisBody: {
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 22,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  modalFooterButtonCopy: {
    flex: 1,
    flexDirection: 'row',
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFooterButtonTextCopy: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  modalFooterButtonDownload: {
    flex: 1,
    flexDirection: 'row',
    height: 52,
    borderRadius: 26,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFooterButtonTextDownload: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
