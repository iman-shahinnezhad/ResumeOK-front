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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../context/AuthContext';

interface SelectedResumeFile {
  id: string;
  name: string;
  date: string;
  uri?: string;
  size?: number;
  mimeType?: string;
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
  const { user, guestCredit, refreshCredits } = useAuth();
  const userCredit = user?.credit ?? guestCredit;

  const [activeTab, setActiveTab] = useState<'resume' | 'cover-letter'>('resume');
  const [resumes, setResumes] = useState<SelectedResumeFile[]>([]);
  const [coverLetters, setCoverLetters] = useState<SavedCoverLetter[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshCredits();
      await loadData();
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
      await Sharing.shareAsync(item.uri, {
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
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert("Copied", "Cover letter copied to clipboard!");
    } catch (e) {
      console.log("Failed to copy cover letter text:", e);
      Alert.alert("Error", "Failed to copy text to clipboard.");
    }
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

  const renderResumeItem = ({ item }: { item: SelectedResumeFile }) => (
    <TouchableOpacity
      style={styles.gridItem}
      activeOpacity={0.7}
      onPress={() => handleResumePress(item)}
      onLongPress={() => handleDeleteResume(item)}
    >
      <View style={styles.folderIconContainer}>
        <Ionicons name="folder" size={64} color="#4B5563" />
        <TouchableOpacity 
          style={styles.deleteBadge} 
          activeOpacity={0.8}
          onPress={() => handleDeleteResume(item)}
        >
          <Ionicons name="close-circle" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
      <Text style={styles.fileNameText} numberOfLines={2}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

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
      <View style={[styles.header, { marginTop: insets.top }]}>
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

        <TouchableOpacity
          style={styles.creditsBadge}
          activeOpacity={0.8}
          onPress={() => router.push('/pricing')}
        >
          <Text style={styles.creditsText}>{userCredit} Credits</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs Row */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'resume' && styles.tabButtonActive]}
          activeOpacity={0.9}
          onPress={() => setActiveTab('resume')}
        >
          <Text style={[styles.tabText, activeTab === 'resume' && styles.tabTextActive]}>
            Resume
          </Text>
          {activeTab === 'resume' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'cover-letter' && styles.tabButtonActive]}
          activeOpacity={0.9}
          onPress={() => setActiveTab('cover-letter')}
        >
          <Text style={[styles.tabText, activeTab === 'cover-letter' && styles.tabTextActive]}>
            Cover letter
          </Text>
          {activeTab === 'cover-letter' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Content Section */}
      {activeTab === 'resume' ? (
        resumes.length === 0 ? (
          <ScrollView
            contentContainerStyle={styles.emptyContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <Ionicons name="folder-open-outline" size={80} color="#A0AEC0" />
            <Text style={styles.emptyTitle}>No Resumes yet</Text>
            <Text style={styles.emptySubtitle}>
              Upload a resume or build one step-by-step using our editor.
            </Text>
            <TouchableOpacity
              style={styles.actionButton}
              activeOpacity={0.8}
              onPress={() => router.push('/build-resume')}
            >
              <Text style={styles.actionButtonText}>Build Resume ✨</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <FlatList
            data={resumes}
            keyExtractor={(item) => item.id}
            renderItem={renderResumeItem}
            numColumns={3}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )
      ) : (
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
      )}

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
    backgroundColor: '#F6F6F6',
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
  // Grid View Styles for Resumes
  gridContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
  },
  gridRow: {
    justifyContent: 'flex-start',
  },
  gridItem: {
    width: '30%',
    marginHorizontal: '1.6%',
    alignItems: 'center',
    marginBottom: 24,
  },
  folderIconContainer: {
    position: 'relative',
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  deleteBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  fileNameText: {
    fontSize: 12,
    color: '#2D3748',
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 4,
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
});
