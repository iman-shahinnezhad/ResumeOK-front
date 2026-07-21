import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useCallback } from 'react';
import {
  Alert,
  Image,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';

const getFriendlyErrorMessage = (error: any) => {
  const msg = error?.message || '';
  if (msg.includes('Network request failed') || msg.includes('Failed to fetch') || msg.includes('network')) {
    return 'Network request failed. Please check your internet connection and try again.';
  }
  return msg || 'An unexpected error occurred. Please try again.';
};
import { copyToClipboard } from '../../utils/clipboard';
import { useAuth, API_URL } from '../../context/AuthContext';
import ReferralBottomSheet from '../../components/ReferralBottomSheet';

function cleanMarkdown(text: string): string {
  if (!text) return '';
  return text
    // Replace markdown headings (e.g. ### Header) with clean text
    .replace(/^#+\s+(.*)$/gm, '$1')
    // Remove triple asterisks/bold markers
    .replace(/\*\*\*/g, '')
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    // Replace bullet points like "* " or "- " with unicode bullet "• "
    .replace(/^\s*[-*+]\s+/gm, '• ')
    // Replace any remaining single asterisks (italics or remnants)
    .replace(/\*/g, '')
    .trim();
}

interface JobMatch {
  id: string;
  company: string;
  jobTitle: string;
  pdfName: string;
  pdfUri?: string;
  url: string;
  date: string;
}

interface SelectedResumeFile {
  id: string;
  name: string;
  date: string;
  uri?: string;
  size?: number;
  mimeType?: string;
}

export default function CoverLetterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isPad = Platform.OS === 'ios' && Platform.isPad;
  const { user, guestCredit, deductCredits, refundCredits, refreshCredits } = useAuth();
  const userCredit = user?.credit ?? guestCredit;

  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // View States: 'list' | 'generator' | 'loading' | 'result'
  const [currentView, setCurrentView] = useState<'list' | 'generator' | 'loading' | 'result'>('list');
  const [selectedResume, setSelectedResume] = useState<SelectedResumeFile | null>(null);
  const [uploadedResumes, setUploadedResumes] = useState<SelectedResumeFile[]>([]);
  const [jobUrl, setJobUrl] = useState<string>('');
  const [generatedCoverLetterText, setGeneratedCoverLetterText] = useState<string>('');
  const [showReferralSheet, setShowReferralSheet] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const [coverLetterAnalysis, setCoverLetterAnalysis] = useState<string>('');

  // Reload matches & resumes list on screen focus
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        setGeneratedCoverLetterText('');
        setCoverLetterAnalysis('');
        // Load matches
        try {
          const matchesPath = `${FileSystem.documentDirectory}matches.json`;
          const fileInfo = await FileSystem.getInfoAsync(matchesPath);
          let loadedMatches: JobMatch[] = [];
          if (fileInfo.exists) {
            const content = await FileSystem.readAsStringAsync(matchesPath);
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
              loadedMatches = parsed;
              setMatches(parsed);
            }
          } else {
            setMatches([]);
          }

          // If empty matches list, go directly to generator view
          if (loadedMatches.length === 0) {
            setCurrentView('generator');
          }
        } catch (e) {
          console.log("Error loading matches on focus:", e);
        }

        // Load resumes
        try {
          const resumesJsonPath = `${FileSystem.documentDirectory}resumes.json`;
          const fileInfo = await FileSystem.getInfoAsync(resumesJsonPath);
          if (fileInfo.exists) {
            const content = await FileSystem.readAsStringAsync(resumesJsonPath);
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setUploadedResumes(parsed);
              setSelectedResume(prev => prev || parsed[0]);
            }
          }
        } catch (e) {
          console.log("Error loading resumes on focus:", e);
        }
      };
      loadData();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshCredits();
      
      // Refresh matches
      const matchesPath = `${FileSystem.documentDirectory}matches.json`;
      const matchesInfo = await FileSystem.getInfoAsync(matchesPath);
      if (matchesInfo.exists) {
        const content = await FileSystem.readAsStringAsync(matchesPath);
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          setMatches(parsed);
        }
      } else {
        setMatches([]);
      }

      // Refresh resumes
      const resumesJsonPath = `${FileSystem.documentDirectory}resumes.json`;
      const resumesInfo = await FileSystem.getInfoAsync(resumesJsonPath);
      if (resumesInfo.exists) {
        const content = await FileSystem.readAsStringAsync(resumesJsonPath);
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setUploadedResumes(parsed);
          setSelectedResume(prev => {
            const stillExists = parsed.find(r => r.id === prev?.id);
            return stillExists || parsed[0];
          });
        } else {
          setUploadedResumes([]);
          setSelectedResume(null);
        }
      } else {
        setUploadedResumes([]);
        setSelectedResume(null);
      }
    } catch (e) {
      console.log("Error refreshing cover letter screen:", e);
    } finally {
      setRefreshing(false);
    }
  }, [refreshCredits]);

  const saveResumesToStorage = async (list: SelectedResumeFile[]) => {
    try {
      const resumesJsonPath = `${FileSystem.documentDirectory}resumes.json`;
      await FileSystem.writeAsStringAsync(resumesJsonPath, JSON.stringify(list));
    } catch (e) {
      console.log("Error saving resumes to storage in cover-letter:", e);
    }
  };

  const pickResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const dateStr = new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit'
        }) + ' ' + new Date().toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit'
        });

        const resumesDir = `${FileSystem.documentDirectory}resumes/`;
        const dirInfo = await FileSystem.getInfoAsync(resumesDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(resumesDir, { intermediates: true });
        }
        const localPath = `${resumesDir}${Date.now()}_${file.name}`;
        await FileSystem.copyAsync({
          from: file.uri,
          to: localPath
        });

        const newResume: SelectedResumeFile = {
          id: String(Date.now()),
          name: file.name,
          date: dateStr,
          uri: localPath,
          size: file.size,
          mimeType: file.mimeType || 'application/pdf',
        };

        const newList = [newResume, ...uploadedResumes];
        await saveResumesToStorage(newList);
        setUploadedResumes(newList);
        setSelectedResume(newResume);
      }
    } catch (err) {
      console.log("Error picking document in cover-letter:", err);
      Alert.alert("Error", "Failed to select document.");
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!selectedResume) {
      Alert.alert("Resume Required", "Please choose or upload a resume first.");
      return;
    }

    if (userCredit < 1) {
      setShowReferralSheet(true);
      return;
    }

    setIsGenerating(true);
    setLoadingStep(0); // Analyzing Career Criteria
    setCurrentView('loading');

    let deducted = false;
    try {
      const success = await deductCredits(1);
      if (!success) {
        Alert.alert("Deduction Failed", "Failed to deduct credits.");
        setCurrentView('generator');
        setIsGenerating(false);
        return;
      }
      deducted = true;

      // Wait 1.2 seconds in Step 0
      await new Promise(r => setTimeout(r, 1200));
      setLoadingStep(1); // Scanning your resume

      // Scrape Job Description
      let jobContent = "";
      if (jobUrl) {
        try {
          const response = await fetch(jobUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
            }
          });
          const html = await response.text();
          jobContent = html
            .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
            .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 4000);
        } catch (e) {
          console.log("Scraping failed, continuing with URL only:", e);
        }
      }

      // Read Resume PDF base64
      const parts: any[] = [];
      if (selectedResume.uri) {
        try {
          const base64Data = await FileSystem.readAsStringAsync(selectedResume.uri, {
            encoding: 'base64',
          });
          parts.push({
            inlineData: {
              mimeType: selectedResume.mimeType || 'application/pdf',
              data: base64Data
            }
          });
        } catch (e) {
          console.log("Failed to read resume PDF base64:", e);
        }
      }

      if (parts.length === 0) {
        parts.push({
          text: `Resume context placeholder for file: ${selectedResume.name}.`
        });
      }

      const promptText = `I want you to act as an experienced recruiter and hiring manager.

I will provide:
1. The job posting URL
2. My resume

Your tasks:
* Analyze the job description carefully and identify the company's needs, responsibilities, required skills, and the type of candidate they are looking for.
* Analyze my resume and find the strongest connections between my experience and this specific role.
* Write a personalized cover letter that feels like it was written by a real person, not AI.

Requirements for the cover letter:
* Do not use generic phrases like "I am thrilled to apply" or "I believe I am the perfect candidate."
* Make it conversational, natural, and professional.
* Show genuine interest in the company and role.
* Mention specific details from the job description to prove it is customized.
* Highlight relevant achievements and experiences from my resume.
* Focus on the value I can bring to the company.
* Keep the tone confident but humble.
* Avoid exaggerated claims or buzzwords.
* Make it sound like a human with real experience wrote it.
* Keep it around 250–400 words unless the role requires a different length.
* IMPORTANT: Do not use any markdown formatting symbols such as bolding (**), headings (###), or asterisks (*) for lists in your entire response. Keep all text plain and professionally formatted with standard spacing.

After writing the cover letter, also provide:
1. A short explanation of why this version matches the role.
2. 3 key points from my background that I should mention during an interview.
3. Any weaknesses or missing skills compared to the job description and how I can address them.

Job URL:
${jobUrl}

Job Description Content:
${jobContent || "No description content available, please analyze based on the Job URL."}

My Resume:
[Attached PDF/Text resume content]

OUTPUT FORMAT:
To help us parse your response, please enclose the sections in specific tags as follows:

[START_COVER_LETTER]
(Write the actual Cover Letter here. Do not include any markdown headers, tags or comments inside.)
[END_COVER_LETTER]

[START_ANALYSIS]
(Write the additional details here: Match explanation, 3 key interview points, and weaknesses & how to address them. DO NOT use markdown characters like ###, **, *, or ***. Use simple, clean text layout and plain bullet points like • if needed.)
[END_ANALYSIS]
`;
      parts.push({ text: promptText });

      const response = await fetch(
        `${API_URL}/api/ai/generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{ parts: parts }]
          })
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const responseJson = await response.json();
      const rawText = responseJson.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (!rawText) {
        throw new Error("Empty response from Gemini.");
      }

      let coverLetter = rawText;
      let analysis = "";

      const coverLetterMatch = rawText.match(/\[START_COVER_LETTER\]([\s\S]*?)\[END_COVER_LETTER\]/);
      const analysisMatch = rawText.match(/\[START_ANALYSIS\]([\s\S]*?)\[END_ANALYSIS\]/);

      if (coverLetterMatch) {
        coverLetter = coverLetterMatch[1].trim();
      } else {
        // Fallback: clean up START/END if present
        coverLetter = rawText
          .replace(/\[START_COVER_LETTER\]/g, "")
          .replace(/\[END_COVER_LETTER\]/g, "")
          .replace(/\[START_ANALYSIS\][\s\S]*?\[END_ANALYSIS\]/g, "")
          .trim();
      }

      if (analysisMatch) {
        analysis = analysisMatch[1].trim();
      }

      const cleanedCoverLetter = cleanMarkdown(coverLetter);
      const cleanedAnalysis = cleanMarkdown(analysis);

      // Try to parse company/title from jobUrl
      let company = "Custom Job";
      let title = "Position";
      if (jobUrl) {
        try {
          const existingMatch = matches.find(m => m.url === jobUrl);
          if (existingMatch) {
            company = existingMatch.company;
            title = existingMatch.jobTitle;
          } else {
            const cleanUrl = jobUrl.replace(/https?:\/\/(www\.)?/, '');
            const parts = cleanUrl.split('/');
            if (parts.length > 0) {
              const domain = parts[0].split('.')[0];
              company = domain.charAt(0).toUpperCase() + domain.slice(1);
            }
            if (parts.length > 1) {
              for (let i = 1; i < parts.length; i++) {
                if (parts[i].includes('-') || parts[i].length > 5) {
                  const rawTitle = parts[i]
                    .split(/[-_?&]/)[0]
                    .replace(/%20/g, ' ')
                    .trim();
                  if (rawTitle.length > 0) {
                    title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
                    break;
                  }
                }
              }
            }
          }
        } catch (urlErr) {
          console.log("Failed to parse URL for company name:", urlErr);
        }
      }

      // Save cover letter to cover_letters.json
      try {
        const coverLettersPath = `${FileSystem.documentDirectory}cover_letters.json`;
        const fileInfo = await FileSystem.getInfoAsync(coverLettersPath);
        let currentLetters: any[] = [];
        if (fileInfo.exists) {
          const content = await FileSystem.readAsStringAsync(coverLettersPath);
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            currentLetters = parsed;
          }
        }
        
        const dateStr = new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit'
        }) + ' ' + new Date().toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit'
        });

        const newLetter = {
          id: Date.now().toString(),
          company,
          jobTitle: title,
          date: dateStr,
          coverLetterText: cleanedCoverLetter,
          analysisText: cleanedAnalysis,
          jobUrl,
          resumeName: selectedResume.name
        };

        const updatedLetters = [newLetter, ...currentLetters];
        await FileSystem.writeAsStringAsync(coverLettersPath, JSON.stringify(updatedLetters));
      } catch (saveErr) {
        console.log("Failed to save cover letter to history:", saveErr);
      }

      setGeneratedCoverLetterText(cleanedCoverLetter);
      setCoverLetterAnalysis(cleanedAnalysis);
      setCurrentView('result');
    } catch (e: any) {
      console.log("Error generating cover letter:", e);
      if (deducted) {
        try {
          await refundCredits(1);
        } catch (refundErr) {
          console.log("Failed to refund credits:", refundErr);
        }
      }
      Alert.alert("Generation Failed", getFriendlyErrorMessage(e));
      setCurrentView('generator');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const Print = require('expo-print');
      const Sharing = require('expo-sharing');

      // Convert newlines in cover letter text to HTML paragraph tags
      const formattedParagraphs = generatedCoverLetterText
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

  const handleCopyText = async () => {
    await copyToClipboard(generatedCoverLetterText, "Cover letter copied to clipboard!");
  };

  const handleItemPress = (item: JobMatch) => {
    // Pre-fill fields and show generator screen
    setJobUrl(item.url);
    const matchedResume = uploadedResumes.find(r => r.name === item.pdfName || r.uri === item.pdfUri);
    if (matchedResume) {
      setSelectedResume(matchedResume);
    }
    setCurrentView('generator');
  };

  const handleBackPress = () => {
    if (currentView === 'generator') {
      setCurrentView('list');
    } else if (currentView === 'result' || currentView === 'loading') {
      setCurrentView('generator');
    }
  };

  const renderItem = ({ item }: { item: JobMatch }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => handleItemPress(item)}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.company} | {item.jobTitle}
          </Text>
          <Text style={styles.cardDate}>{item.date}</Text>
        </View>

        <View style={styles.cardBottomRow}>
          <View style={styles.pdfInfoContainer}>
            <Ionicons name="folder" size={16} color="#4B5563" style={{ marginRight: 6 }} />
            <Text style={styles.pdfNameText} numberOfLines={1}>
              {item.pdfName}
            </Text>
          </View>

          <View style={styles.circleArrow}>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSteps = (isResult: boolean) => {
    return (
      <View style={styles.loadingStepsWrapper}>
        <View style={styles.loadingRow}>
          <Ionicons name="checkmark-sharp" size={20} color="#10B981" style={{ marginRight: 12 }} />
          <Text style={styles.stepTextCompleted}>Analyzing Career Criteria</Text>
        </View>

        <View style={styles.loadingRow}>
          {isResult ? (
            <Ionicons name="checkmark-sharp" size={20} color="#10B981" style={{ marginRight: 12 }} />
          ) : loadingStep === 1 ? (
            <ActivityIndicator size="small" color="#000000" style={{ marginRight: 12 }} />
          ) : (
            <View style={styles.pendingCircle} />
          )}
          <Text style={isResult ? styles.stepTextCompleted : (loadingStep === 1 ? styles.stepTextActive : styles.stepTextPending)}>
            Scanning your resume
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { marginTop: insets.top + (isPad ? 25 : 0) }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {(currentView === 'generator' && matches.length > 0) && (
            <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
              <Ionicons name="chevron-back" size={28} color="#000000" />
            </TouchableOpacity>
          )}
          {currentView === 'result' && (
            <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
              <Ionicons name="chevron-back" size={28} color="#000000" />
            </TouchableOpacity>
          )}
          {currentView === 'loading' && (
            <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
              <Ionicons name="chevron-back" size={28} color="#000000" />
            </TouchableOpacity>
          )}
          {(currentView === 'list' || (currentView === 'generator' && matches.length === 0)) && (
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
          )}
        </View>

        {isPad && (
          <View style={styles.topNavCapsule}>
            <TouchableOpacity
              style={styles.topNavItem}
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={styles.topNavText}>Resume</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.topNavItem, styles.topNavItemActive]}
              onPress={() => router.replace('/(tabs)/cover-letter')}
            >
              <Text style={[styles.topNavText, styles.topNavTextActive]}>Cover Letter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.topNavItem}
              onPress={() => router.replace('/(tabs)/library')}
            >
              <Text style={styles.topNavText}>Your Doc</Text>
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

      <View style={{ flex: 1, width: '100%', maxWidth: isPad ? 600 : '100%', alignSelf: 'center' }}>
        {/* --- LIST VIEW --- */}
        {currentView === 'list' && (
          <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>Write Cover Letter</Text>
          
          <FlatList
            data={matches}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListHeaderComponent={
              <TouchableOpacity
                style={styles.customBanner}
                activeOpacity={0.8}
                onPress={() => {
                  setJobUrl('');
                  setCurrentView('generator');
                }}
              >
                <View style={styles.customBannerLeft}>
                  <View style={styles.bannerIconWrapper}>
                    <Ionicons name="sparkles" size={20} color="#007AFF" />
                  </View>
                  <View style={styles.bannerTextWrapper}>
                    <Text style={styles.bannerTitle}>Write Custom Cover Letter</Text>
                    <Text style={styles.bannerSubtitle}>Input job URL & select resume manually</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#A0AEC0" />
              </TouchableOpacity>
            }
          />
        </View>
      )}

      {/* --- GENERATOR VIEW --- */}
      {currentView === 'generator' && (
        <View style={styles.generatorContainer}>
          <ScrollView
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <Text style={styles.pageTitle}>Write Cover Letter</Text>

            {/* Paste Job Position URL Section */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Paste Job Postion URL</Text>
              <TextInput
                style={styles.input}
                value={jobUrl}
                onChangeText={setJobUrl}
                placeholder="https://jobsample.com/jobone"
                placeholderTextColor="#A0AEC0"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Resume Selection Section */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Or You Have Upload it</Text>

              <View style={styles.resumesCardContainer}>
                {/* Upload row */}
                <TouchableOpacity
                  style={styles.uploadRowInsideCard}
                  activeOpacity={0.8}
                  onPress={pickResume}
                >
                  <View style={styles.uploadCardLeft}>
                    <Image source={require('../../assets/images/file.png')} style={styles.fileIconImageLarge} />
                    <Text style={styles.uploadCardText}>Upload or choose Resume</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#000000" />
                </TouchableOpacity>

                {/* Divider line if files are present */}
                {uploadedResumes.length > 0 && (
                  <View style={styles.cardDivider} />
                )}

                {/* List of resumes */}
                {uploadedResumes.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.resumeListItem,
                      selectedResume?.id === item.id && styles.resumeListItemSelected
                    ]}
                    activeOpacity={0.7}
                    onPress={() => setSelectedResume(item)}
                  >
                    <View style={styles.resumeListItemLeft}>
                      <Image source={require('../../assets/images/file.png')} style={styles.fileIconImageSmall} />
                      <Text style={[
                        styles.resumeListItemText,
                        selectedResume?.id === item.id && styles.resumeListItemTextSelected
                      ]} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </View>
                    <View style={styles.resumeListItemRight}>
                      {selectedResume?.id === item.id ? (
                        <Ionicons name="checkmark-circle" size={18} color="#007AFF" />
                      ) : (
                        <Text style={styles.resumeListItemDate}>{item.date}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Bottom write button */}
          <View style={[styles.bottomButtonContainer, { paddingBottom: insets.bottom + 85 }]}>
            <TouchableOpacity
              style={[
                styles.magicButton,
                (!jobUrl.trim() || !selectedResume) && styles.magicButtonDisabled
              ]}
              activeOpacity={0.8}
              disabled={!jobUrl.trim() || !selectedResume || isGenerating}
              onPress={handleGenerateCoverLetter}
            >
              <Text style={styles.magicButtonText}>WRITE COVER LETTER ✨</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* --- LOADING VIEW --- */}
      {currentView === 'loading' && (
        <View style={styles.loadingWrapperContainer}>
          <Text style={styles.loadingHeaderTitle}>Writing Your Cover Letter:</Text>
          {renderSteps(false)}
        </View>
      )}

      {/* --- RESULT VIEW --- */}
      {currentView === 'result' && (
        <View style={styles.resultOuterContainer}>
          <Text style={styles.loadingHeaderTitle}>Writing Your Cover Letter:</Text>
          {renderSteps(true)}

          <View style={styles.horizontalDivider} />

          <View style={styles.resultTitleRow}>
            <Text style={styles.loadingHeaderTitle}>Your Cover Letter</Text>
            <TouchableOpacity style={styles.copyButton} activeOpacity={0.8} onPress={handleCopyText}>
              <Ionicons name="copy-outline" size={16} color="#000000" />
              <Text style={styles.copyButtonText}>COPY</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.resultTextContainer} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.coverLetterText}>{generatedCoverLetterText}</Text>
            
            {coverLetterAnalysis !== "" && (
              <View style={styles.analysisContainer}>
                <Text style={styles.analysisTitle}>AI Recruiter Insights</Text>
                <Text style={styles.analysisText}>{coverLetterAnalysis}</Text>
              </View>
            )}
          </ScrollView>

          <View style={[styles.bottomButtonContainer, { paddingBottom: insets.bottom + 85 }]}>
            <TouchableOpacity
              style={styles.downloadButton}
              activeOpacity={0.8}
              onPress={handleDownloadPdf}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.downloadButtonText}>DOWNLOAD</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
      </View>

      <ReferralBottomSheet visible={showReferralSheet} onClose={() => setShowReferralSheet(false)} />
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
    paddingVertical: 12,
    zIndex: 10,
    paddingHorizontal: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
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
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000000',
    marginTop: 20,
    marginBottom: 20,
    lineHeight: 38,
    textAlign: 'center',
  },
  customBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  customBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  bannerIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EBF5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  bannerTextWrapper: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 100,
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  cardContent: {
    width: '100%',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
    marginRight: 8,
  },
  cardDate: {
    fontSize: 12,
    color: '#737373',
    fontWeight: '500',
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pdfInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  pdfNameText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  circleArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // GENERATOR STYLES
  generatorContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  sectionContainer: {
    width: '100%',
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    paddingLeft: 4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    paddingVertical: 16,
    paddingHorizontal: 20,
    color: '#000000',
    fontSize: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  resumesCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
    width: '100%',
  },
  uploadRowInsideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  uploadCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileIconImageLarge: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
    marginRight: 16,
  },
  fileIconImageSmall: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
    marginRight: 12,
  },
  uploadCardText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 20,
    marginVertical: 4,
  },
  resumeListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  resumeListItemSelected: {
    backgroundColor: '#F8FAFC',
  },
  resumeListItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  resumeListItemText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  resumeListItemTextSelected: {
    fontWeight: '700',
    color: '#007AFF',
  },
  resumeListItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resumeListItemDate: {
    color: '#A0AEC0',
    fontSize: 12,
    fontWeight: '500',
  },
  bottomButtonContainer: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: '#F8F9FA',
  },
  magicButton: {
    backgroundColor: '#000000',
    borderRadius: 30,
    paddingVertical: 18,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  magicButtonDisabled: {
    backgroundColor: '#A0AEC0',
    shadowOpacity: 0.05,
    elevation: 1,
  },
  magicButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  
  // LOADING / STEPS STYLES
  loadingWrapperContainer: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  loadingHeaderTitle: {
    color: '#000000',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },
  loadingStepsWrapper: {
    marginTop: 10,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  pendingCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#9CA3AF',
    marginRight: 12,
  },
  stepTextCompleted: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
  },
  stepTextActive: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  stepTextPending: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '500',
  },

  // RESULT VIEW STYLES
  resultOuterContainer: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  horizontalDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  resultTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  copyButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  resultTextContainer: {
    flex: 1,
    marginBottom: 16,
  },
  coverLetterText: {
    color: '#2D3748',
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
  },
  analysisContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    padding: 20,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  analysisTitle: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  analysisText: {
    color: '#4A5568',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  downloadButton: {
    backgroundColor: '#000000',
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
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
