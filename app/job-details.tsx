import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { WebView } from 'react-native-webview';
import { API_URL } from '../context/AuthContext';
import { getSession } from '../utils/session';
import { calculateJobMatch, JobMatchResult } from '../utils/jobMatch';

interface SelectedResumeFile {
  id: string;
  name: string;
  date: string;
  uri?: string;
  size?: number;
  mimeType?: string;
  isBuilt?: boolean;
}

export default function JobDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();

  // Active top tab (Overview or Company)
  const [activeTab, setActiveTab] = useState<'overview' | 'company'>('overview');

  // Job state parsed from params or storage
  const [jobData, setJobData] = useState<any>(null);
  const [jobDetailsHtml, setJobDetailsHtml] = useState<string>('');
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(true);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [showFullDescription, setShowFullDescription] = useState<boolean>(false);

  // User Profile & Match Result
  const [userProfile, setUserProfile] = useState<any>(null);
  const [matchResult, setMatchResult] = useState<JobMatchResult | null>(null);

  // Resumes list & default resume selection
  const [resumesList, setResumesList] = useState<SelectedResumeFile[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');

  // AI Matching state
  const [isMatchingWithAI, setIsMatchingWithAI] = useState<boolean>(false);
  const [previewResumeUri, setPreviewResumeUri] = useState<string>('');
  const [previewResumeName, setPreviewResumeName] = useState<string>('');
  const [previewResumeHtml, setPreviewResumeHtml] = useState<string>('');
  const [previewCoverLetter, setPreviewCoverLetter] = useState<string>('');
  const [showMatchPreviewModal, setShowMatchPreviewModal] = useState<boolean>(false);
  const [previewTab, setPreviewTab] = useState<'cover_letter' | 'resume'>('resume');

  // AutoFill & WebView state
  const webViewRef = useRef<any>(null);
  const [showWebViewModal, setShowWebViewModal] = useState<boolean>(false);
  const [autofillPayload, setAutofillPayload] = useState<any>(null);
  const [isPreparingAutoFill, setIsPreparingAutoFill] = useState<boolean>(false);

  useEffect(() => {
    loadJobDetailsAndProfile();
  }, [params.id, params.jobJson]);

  const loadJobDetailsAndProfile = async () => {
    setIsLoadingDetails(true);
    try {
      let currentJob: any = null;

      // 1. Try parsing passed jobJson param first
      if (params.jobJson && typeof params.jobJson === 'string') {
        try {
          currentJob = JSON.parse(params.jobJson);
        } catch (e) {}
      }

      // 2. Fallback to storage if jobJson not passed
      if (!currentJob && params.id) {
        const storedPath = `${FileSystem.documentDirectory}cached_current_job.json`;
        const info = await FileSystem.getInfoAsync(storedPath);
        if (info.exists) {
          const text = await FileSystem.readAsStringAsync(storedPath);
          currentJob = JSON.parse(text);
        }
      }

      setJobData(currentJob);

      // 3. Load User Onboarding Profile
      const profilePath = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
      const profileInfo = await FileSystem.getInfoAsync(profilePath);
      let profile: any = null;
      if (profileInfo.exists) {
        const text = await FileSystem.readAsStringAsync(profilePath);
        profile = JSON.parse(text);
        setUserProfile(profile);
      }

      // 4. Load Resumes & Default Resume Selection
      const resumesPath = `${FileSystem.documentDirectory}resumes.json`;
      const resumesInfo = await FileSystem.getInfoAsync(resumesPath);
      if (resumesInfo.exists) {
        const content = await FileSystem.readAsStringAsync(resumesPath);
        const parsedResumes = JSON.parse(content);
        if (Array.isArray(parsedResumes)) {
          const valid = parsedResumes.filter((r: any) => r.uri);
          setResumesList(valid);
          if (valid.length > 0) {
            const defaultItem = valid.find((r: any) => r.isDefault) || valid[0];
            setSelectedResumeId(String(defaultItem.id));
          }
        }
      }

      // 5. Fetch full HTML job content if available
      let bodyHtml = currentJob?.content || currentJob?.description || '';

      if (currentJob?.id && currentJob?.boardToken && (!bodyHtml || bodyHtml.length < 50)) {
        try {
          const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${currentJob.boardToken}/jobs/${currentJob.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.content) {
              bodyHtml = data.content;
            }
          }
        } catch (e) {
          console.log('Error fetching greenhouse job content:', e);
        }
      }

      setJobDetailsHtml(bodyHtml);

      // 6. Calculate local Match Scores
      const plainText = stripHtml(bodyHtml || '');
      const match = calculateJobMatch(plainText, currentJob?.title || '', profile);
      setMatchResult(match);

    } catch (e) {
      console.log('Error loading job details:', e);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleStartAiMatch = async () => {
    if (!jobData) {
      Alert.alert('Error', 'No job selected.');
      return;
    }
    if (!selectedResumeId) {
      Alert.alert('Resume Required', 'Please set a default resume in your profile first.');
      return;
    }
    const baseResume = resumesList.find(r => String(r.id) === String(selectedResumeId));
    if (!baseResume || !baseResume.uri) {
      Alert.alert('Error', 'Selected resume file is invalid.');
      return;
    }

    setIsMatchingWithAI(true);

    try {
      const targetCompany = jobData?.companyName || 'Company';
      const jobTitle = jobData?.title || 'Position';

      const formData = new FormData();
      const resumeFileObj: any = {
        uri: baseResume.uri,
        name: baseResume.name,
        type: baseResume.mimeType || 'application/pdf',
      };
      formData.append('resume', resumeFileObj);

      const session = await getSession();
      const headers: any = { Accept: 'application/json' };
      if (session && session.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }

      const matchRes = await fetch(`${API_URL}/api/jobs/${jobData.id}/match`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!matchRes.ok) {
        const errText = await matchRes.text();
        throw new Error(`Server match failed: ${matchRes.status} - ${errText}`);
      }

      const matchData = await matchRes.json();
      if (!matchData.success) {
        throw new Error(matchData.error || 'Failed to analyze match from server.');
      }

      const tailoredHtml = matchData.tailoredResumeHtml || '';
      const generatedCL = matchData.coverLetter || '';

      const firstName = userProfile?.firstName || '';
      const lastName = userProfile?.lastName || '';
      const userPrefix = (firstName && lastName)
        ? `${firstName}_${lastName}`
        : firstName ? firstName : 'User';

      const cleanUserPrefix = userPrefix.replace(/[^a-zA-Z0-9]/g, '_');
      const cleanCompany = targetCompany.replace(/[^a-zA-Z0-9]/g, '_');
      const cleanTitle = jobTitle.replace(/[^a-zA-Z0-9]/g, '_');

      const formattedResumeName = `${cleanUserPrefix}_${cleanCompany}_${cleanTitle}.pdf`;
      const cleanResumeUri = `${FileSystem.documentDirectory}${formattedResumeName}`;

      const formattedHtml = `
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; color: #1E293B; line-height: 1.5; font-size: 11pt; }
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
        isBuilt: true,
      };

      const updatedList = [newResumeEntry, ...resumesList];
      const resumesJsonPath = `${FileSystem.documentDirectory}resumes.json`;
      await FileSystem.writeAsStringAsync(resumesJsonPath, JSON.stringify(updatedList));
      setResumesList(updatedList);
      setSelectedResumeId(newResumeEntry.id);

      setIsMatchingWithAI(false);
      // Auto open preview popup modal
      setShowMatchPreviewModal(true);

    } catch (err: any) {
      setIsMatchingWithAI(false);
      Alert.alert('AI Match Failed', err.message || 'Failed to tailor resume and cover letter.');
    }
  };

  const handleViewTailoredResume = async () => {
    if (previewResumeUri) {
      try {
        await Print.printAsync({ uri: previewResumeUri });
      } catch (e) {
        console.log('Error printing/viewing PDF:', e);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(previewResumeUri);
        }
      }
    } else {
      Alert.alert('Resume Preview', 'No tailored resume file found.');
    }
  };

  const handleShareJob = async () => {
    if (jobData?.absolute_url) {
      await Share.share({
        message: `Check out this job position: ${jobData.title} at ${jobData.companyName || 'Company'}\n${jobData.absolute_url}`,
      });
    }
  };

  const companyName = jobData?.companyName || 'COMPANY';
  const jobTitle = jobData?.title || 'Position';
  const locationName = jobData?.location?.name || 'United States';

  return (
    <View style={styles.container}>
      {/* TOP NAVIGATION HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#000000" />
        </TouchableOpacity>

        {/* Overview & Company Segmented Tabs */}
        <View style={styles.segmentedTabContainer}>
          <TouchableOpacity
            style={[styles.segmentedTabBtn, activeTab === 'overview' && styles.segmentedTabBtnActive]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.segmentedTabText, activeTab === 'overview' && styles.segmentedTabTextActive]}>
              Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentedTabBtn, activeTab === 'company' && styles.segmentedTabBtnActive]}
            onPress={() => setActiveTab('company')}
          >
            <Text style={[styles.segmentedTabText, activeTab === 'company' && styles.segmentedTabTextActive]}>
              Company
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.shareBtn} activeOpacity={0.8} onPress={handleShareJob}>
          <Ionicons name="share-outline" size={22} color="#000000" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {/* HERO JOB CARD */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.companyIconCircle}>
              <Text style={styles.companyIconInitial}>{companyName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.heroCompanyName}>{companyName}</Text>
              <Text style={styles.heroCompanySubText}>Information Technology • Software</Text>
            </View>
            <View style={styles.postedBadge}>
              <Text style={styles.postedBadgeText}>1 week ago</Text>
            </View>
          </View>

          <Text style={styles.heroJobTitle}>{jobTitle}</Text>

          {/* Info Tags */}
          <View style={styles.infoTagsRow}>
            <View style={styles.infoTag}>
              <Ionicons name="location-outline" size={14} color="#475569" />
              <Text style={styles.infoTagText}>{locationName}</Text>
            </View>

            <View style={styles.infoTag}>
              <Ionicons name="home-outline" size={14} color="#475569" />
              <Text style={styles.infoTagText}>Remote</Text>
            </View>

            <View style={styles.infoTag}>
              <Ionicons name="briefcase-outline" size={14} color="#475569" />
              <Text style={styles.infoTagText}>Mid-Senior Level</Text>
            </View>

            <View style={styles.infoTag}>
              <Ionicons name="time-outline" size={14} color="#475569" />
              <Text style={styles.infoTagText}>Full-time</Text>
            </View>
          </View>
        </View>

        {activeTab === 'overview' ? (
          <>
            {/* MATCH SCORE CARDS SECTION */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionHeaderTitle}>Match Score</Text>

              <View style={styles.scoreGrid}>
                {/* Overall Match Card */}
                <View style={[styles.scoreCard, styles.scoreCardHighlight]}>
                  <Text style={styles.scoreValueHighlight}>{matchResult?.overallScore || 78}%</Text>
                  <View style={styles.scoreBadgeHighlight}>
                    <Text style={styles.scoreBadgeTextHighlight}>MATCH</Text>
                  </View>
                </View>

                {/* Exp Level Card */}
                <View style={styles.scoreCard}>
                  <Text style={styles.scoreValueText}>{matchResult?.expLevelScore || 90}%</Text>
                  <Text style={styles.scoreLabelText}>Exp. Level</Text>
                </View>

                {/* Skill Score Card */}
                <View style={styles.scoreCard}>
                  <Text style={styles.scoreValueText}>{matchResult?.skillsScore || 83}%</Text>
                  <Text style={styles.scoreLabelText}>Skill</Text>
                </View>

                {/* Industry Exp Card */}
                <View style={styles.scoreCard}>
                  <Text style={styles.scoreValueText}>{matchResult?.industryScore || 75}%</Text>
                  <Text style={styles.scoreLabelText}>Industry Exp.</Text>
                </View>
              </View>
            </View>

            {/* SKILLS BREAKDOWN SECTION */}
            <View style={styles.sectionContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={styles.sectionHeaderTitle}>Skills Analysis</Text>
                <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '500' }}>👍 Represents skills you have</Text>
              </View>

              <View style={styles.skillsPillsWrapper}>
                {/* Matched skills (Green pills) */}
                {matchResult?.matchedSkills.map((skill, idx) => (
                  <View key={`matched-${idx}`} style={styles.matchedSkillPill}>
                    <Text style={{ fontSize: 12 }}>👍</Text>
                    <Text style={styles.matchedSkillText}>{skill}</Text>
                  </View>
                ))}

                {/* Missing skills (Outline pills) */}
                {matchResult?.missingSkills.map((skill, idx) => (
                  <View key={`missing-${idx}`} style={styles.missingSkillPill}>
                    <Text style={styles.missingSkillText}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* DEFAULT RESUME & MATCH AI SECTION */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionHeaderTitle}>Resume & AI Tailoring</Text>

              {/* Default Resume Card */}
              <View style={styles.defaultResumeCard}>
                <View style={styles.defaultResumeHeaderRow}>
                  <View style={styles.defaultBadgePill}>
                    <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                    <Text style={styles.defaultBadgeText}>Default Resume</Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => router.push('/resumes')}
                  >
                    <Text style={styles.changeResumeLinkText}>Change in Profile →</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.defaultResumeFileRow}>
                  <Ionicons name="document-text" size={20} color="#7C3AED" />
                  <Text style={styles.defaultResumeFileName} numberOfLines={1}>
                    {resumesList.find(r => String(r.id) === String(selectedResumeId))?.name || resumesList[0]?.name || 'Default Resume'}
                  </Text>
                </View>
              </View>

              {/* Match Resume & Cover Letter Button */}
              <TouchableOpacity
                style={[styles.matchAiBtn, isMatchingWithAI && styles.matchAiBtnDisabled]}
                activeOpacity={0.8}
                onPress={handleStartAiMatch}
                disabled={isMatchingWithAI}
              >
                {isMatchingWithAI ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.matchAiBtnText}>Match Resume and Cover Letter</Text>
                    <Ionicons name="sparkles" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </>
                )}
              </TouchableOpacity>

              {/* AI Matched Documents section (if generated) */}
              {previewResumeUri && previewCoverLetter ? (
                <View style={{ marginTop: 16 }}>
                  <Text style={styles.previewLinksTitle}>AI Matched Documents</Text>
                  <View style={styles.previewLinksRow}>
                    <TouchableOpacity
                      style={styles.previewLinkBtn}
                      activeOpacity={0.8}
                      onPress={() => {
                        setPreviewTab('resume');
                        setShowMatchPreviewModal(true);
                      }}
                    >
                      <Ionicons name="document-text" size={18} color="#7C3AED" />
                      <Text style={styles.previewLinkBtnText} numberOfLines={1}>
                        Tailored Resume
                      </Text>
                      <Ionicons name="eye-outline" size={16} color="#6B7280" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.previewLinkBtn}
                      activeOpacity={0.8}
                      onPress={() => {
                        setPreviewTab('cover_letter');
                        setShowMatchPreviewModal(true);
                      }}
                    >
                      <Ionicons name="mail" size={18} color="#7C3AED" />
                      <Text style={styles.previewLinkBtnText} numberOfLines={1}>
                        Cover Letter
                      </Text>
                      <Ionicons name="eye-outline" size={16} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
            </View>

            {/* JOB DESCRIPTION BODY */}
            <View style={styles.sectionContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={styles.sectionHeaderTitle}>Job Summary</Text>
                <View style={styles.summaryBadge}>
                  <Ionicons name="sparkles" size={12} color="#7C3AED" />
                  <Text style={styles.summaryBadgeText}>Condensed</Text>
                </View>
              </View>

              {isLoadingDetails ? (
                <ActivityIndicator size="small" color="#7C3AED" style={{ marginVertical: 20 }} />
              ) : (() => {
                const parsed = cleanAndSummarizeJobText(jobDetailsHtml);
                return (
                  <View>
                    <Text style={styles.jobDescriptionBodyText}>
                      {showFullDescription ? parsed.fullText : parsed.summary}
                    </Text>

                    {parsed.isLong && (
                      <TouchableOpacity
                        style={styles.showMoreBtn}
                        activeOpacity={0.8}
                        onPress={() => setShowFullDescription(!showFullDescription)}
                      >
                        <Text style={styles.showMoreBtnText}>
                          {showFullDescription ? 'Show Less ↑' : 'Read Full Description ↓'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })()}
            </View>
          </>
        ) : (
          /* COMPANY TAB CONTENT */
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeaderTitle}>About {companyName}</Text>
            <View style={styles.companyInfoCard}>
              <View style={styles.companyInfoRow}>
                <Ionicons name="location-outline" size={18} color="#7C3AED" />
                <Text style={styles.companyInfoText}>{locationName}</Text>
              </View>

              <View style={styles.companyInfoRow}>
                <Ionicons name="people-outline" size={18} color="#7C3AED" />
                <Text style={styles.companyInfoText}>1,000 - 5,000 employees</Text>
              </View>

              <View style={styles.companyInfoRow}>
                <Ionicons name="globe-outline" size={18} color="#7C3AED" />
                <TouchableOpacity onPress={() => jobData?.absolute_url && Linking.openURL(jobData.absolute_url)}>
                  <Text style={styles.companyLinkText}>{jobData?.absolute_url || 'https://company.careers'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* FLOATING STICKY BOTTOM BAR */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={styles.heartBtn}
          activeOpacity={0.8}
          onPress={() => setIsSaved(!isSaved)}
        >
          <Ionicons name={isSaved ? "heart" : "heart-outline"} size={24} color={isSaved ? "#DC2626" : "#000000"} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.applyNowBtn}
          activeOpacity={0.8}
          onPress={() => {
            if (jobData?.absolute_url) {
              Linking.openURL(jobData.absolute_url);
            } else {
              Alert.alert('Apply', 'Redirecting to application board...');
            }
          }}
        >
          <Text style={styles.applyNowBtnText}>APPLY NOW</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>

      {/* PREVIEW POPUP MODAL (Clean single popup!) */}
      <Modal
        visible={showMatchPreviewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMatchPreviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>AI Generated Document</Text>
              <TouchableOpacity onPress={() => setShowMatchPreviewModal(false)}>
                <Ionicons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            {/* Segmented Modal Tabs */}
            <View style={styles.inlineTabRow}>
              <TouchableOpacity
                style={[styles.inlineTabBtn, previewTab === 'resume' && styles.inlineTabBtnActive]}
                onPress={() => setPreviewTab('resume')}
              >
                <Ionicons name="document-text" size={16} color={previewTab === 'resume' ? '#7C3AED' : '#64748B'} />
                <Text style={[styles.inlineTabText, previewTab === 'resume' && styles.inlineTabTextActive]}>
                  Tailored Resume
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.inlineTabBtn, previewTab === 'cover_letter' && styles.inlineTabBtnActive]}
                onPress={() => setPreviewTab('cover_letter')}
              >
                <Ionicons name="mail" size={16} color={previewTab === 'cover_letter' ? '#7C3AED' : '#64748B'} />
                <Text style={[styles.inlineTabText, previewTab === 'cover_letter' && styles.inlineTabTextActive]}>
                  Cover Letter
                </Text>
              </TouchableOpacity>
            </View>

            {/* Modal Body Preview */}
            <View style={{ flex: 1, marginTop: 10 }}>
              {previewTab === 'resume' ? (
                <View style={{ flex: 1 }}>
                  <View style={styles.inlinePreviewHeader}>
                    <Text style={styles.inlinePreviewTitleText} numberOfLines={1}>
                      {previewResumeName}
                    </Text>
                    <TouchableOpacity style={styles.openPdfHeaderBtn} onPress={handleViewTailoredResume}>
                      <Ionicons name="open-outline" size={14} color="#7C3AED" />
                      <Text style={styles.openPdfHeaderBtnText}>Full PDF</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <WebView
                      originWhitelist={['*']}
                      source={{ html: previewResumeHtml }}
                      style={{ flex: 1 }}
                      scalesPageToFit={true}
                    />
                  </View>
                </View>
              ) : (
                <View style={{ flex: 1 }}>
                  <View style={styles.inlinePreviewHeader}>
                    <Text style={styles.inlinePreviewTitleText}>Matched Cover Letter</Text>
                    <TouchableOpacity
                      style={styles.copyBtn}
                      onPress={() => Alert.alert('Copied!', 'Cover Letter copied to clipboard.')}
                    >
                      <Ionicons name="copy-outline" size={14} color="#7C3AED" />
                      <Text style={styles.copyBtnText}>Copy Text</Text>
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    style={styles.modalCoverLetterInput}
                    multiline={true}
                    value={previewCoverLetter}
                    onChangeText={setPreviewCoverLetter}
                    textAlignVertical="top"
                  />
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function cleanAndSummarizeJobText(html: string): { summary: string; fullText: string; isLong: boolean } {
  if (!html) {
    return {
      summary: 'Detailed description for this role is available on the employer application board.',
      fullText: '',
      isLong: false,
    };
  }

  let text = html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();

  const boilerplateKeywords = [
    'equal opportunity employer',
    'export-controlled technology',
    'all qualified applicants will receive consideration',
    'without regard to race, color, religion',
    'e-verify',
    'accommodations for applicants with disabilities',
    'employer may decline to proceed',
  ];

  const paragraphs = text.split(/\n\s*\n/).filter(p => {
    const pLower = p.toLowerCase().trim();
    if (pLower.length < 15) return false;
    return !boilerplateKeywords.some(kw => pLower.includes(kw));
  });

  const cleanedFullText = paragraphs.join('\n\n');

  let summaryParagraphs: string[] = [];
  let currentLength = 0;

  for (const p of paragraphs) {
    summaryParagraphs.push(p);
    currentLength += p.length;
    if (currentLength >= 350 || summaryParagraphs.length >= 3) break;
  }

  const summary = summaryParagraphs.join('\n\n');
  const isLong = cleanedFullText.length > summary.length + 50;

  return {
    summary: summary || cleanedFullText || text,
    fullText: cleanedFullText || text,
    isLong,
  };
}

function stripHtml(html: string) {
  if (!html) return '';
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    padding: 3,
  },
  segmentedTabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 17,
  },
  segmentedTabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentedTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentedTabTextActive: {
    color: '#000000',
    fontWeight: '700',
  },

  heroCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  companyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyIconInitial: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  heroCompanyName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  heroCompanySubText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  postedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  postedBadgeText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  heroJobTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 28,
    marginBottom: 14,
  },
  infoTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  infoTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },

  sectionContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginTop: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },

  scoreGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  scoreCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scoreCardHighlight: {
    backgroundColor: '#ECFDF5',
    borderColor: '#6EE7B7',
  },
  scoreValueHighlight: {
    fontSize: 22,
    fontWeight: '900',
    color: '#047857',
  },
  scoreBadgeHighlight: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  scoreBadgeTextHighlight: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  scoreValueText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  scoreLabelText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },

  skillsPillsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  matchedSkillPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  matchedSkillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  missingSkillPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  missingSkillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  summaryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
  },
  showMoreBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  showMoreBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7C3AED',
  },

  defaultResumeCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  defaultResumeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
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
    color: '#7C3AED',
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

  matchAiBtn: {
    backgroundColor: '#7C3AED',
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchAiBtnDisabled: {
    opacity: 0.7,
  },
  matchAiBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
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

  jobDescriptionBodyText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#334155',
  },

  companyInfoCard: {
    gap: 12,
  },
  companyInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  companyInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  companyLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7C3AED',
    textDecorationLine: 'underline',
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 5,
  },
  heartBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyNowBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyNowBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    height: '82%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  inlineTabRow: {
    flexDirection: 'row',
    gap: 8,
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
    backgroundColor: '#F3E8FF',
    borderColor: '#7C3AED',
  },
  inlineTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  inlineTabTextActive: {
    color: '#7C3AED',
  },
  inlinePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  inlinePreviewTitleText: {
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
    color: '#7C3AED',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  modalCoverLetterInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    lineHeight: 20,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
});
