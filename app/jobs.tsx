import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { API_URL } from '../context/AuthContext';

const POPULAR_GREENHOUSE_COMPANIES = ['stripe', 'dropbox', 'deliveroo', 'vimeo', 'amplitude'];
const POPULAR_LEVER_COMPANIES = ['kinsta', 'aircall', 'palantir'];

interface SelectedResumeFile {
  id: string;
  name: string;
  date: string;
  uri?: string;
  size?: number;
  mimeType?: string;
  isBuilt?: boolean;
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
  canApplyDirectly?: boolean;
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [pagerHeight, setPagerHeight] = useState(480);

  // Animated scroll position tracker
  const scrollY = useRef(new Animated.Value(0)).current;

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

  // Load config, resumes, and popular jobs on mount
  useEffect(() => {
    async function initData() {
      try {
        const configPath = `${FileSystem.documentDirectory}greenhouse_config.json`;
        const configInfo = await FileSystem.getInfoAsync(configPath);
        if (configInfo.exists) {
          const text = await FileSystem.readAsStringAsync(configPath);
          const parsed = JSON.parse(text);
          setConfig(parsed);
          if (parsed.email) setEmail(parsed.email);
          if (parsed.firstName) setFirstName(parsed.firstName);
          if (parsed.lastName) setLastName(parsed.lastName);
          if (parsed.phone) setPhone(parsed.phone);
        }

        // Load resumes
        const resumesPath = `${FileSystem.documentDirectory}resumes.json`;
        const resumesInfo = await FileSystem.getInfoAsync(resumesPath);
        if (resumesInfo.exists) {
          const content = await FileSystem.readAsStringAsync(resumesPath);
          const parsedResumes = JSON.parse(content);
          if (Array.isArray(parsedResumes)) {
            const valid = parsedResumes.filter(r => r.uri);
            setResumesList(valid);
            if (valid.length > 0) {
              setSelectedResumeId(valid[0].id);
            }
          }
        }

      } catch (e) {
        console.log("Error initializing jobs screen:", e);
      }
    }
    initData();
  }, []);

  const fetchJobsFromAllBoards = async (pageToFetch = 1, append = false, queryStr = filterQuery, companyStr = selectedCompanyFilter) => {
    if (pageToFetch === 1) {
      setIsLoadingJobs(true);
    } else {
      setIsFetchingMore(true);
    }
    console.log(`Fetching jobs from backend aggregator: page=${pageToFetch}, q=${queryStr}, company=${companyStr}`);
    try {
      const qParam = queryStr.trim() ? `&q=${encodeURIComponent(queryStr.trim())}` : '';
      const companyParam = companyStr && companyStr !== 'ALL' ? `&company=${encodeURIComponent(companyStr)}` : '';
      const response = await fetch(`${API_URL}/api/jobs?limit=50&page=${pageToFetch}${qParam}${companyParam}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.jobs)) {
          console.log(`Successfully fetched ${data.jobs.length} jobs for page ${pageToFetch}`);
          
          if (data.jobs.length < 50) {
            setHasMore(false);
          } else {
            setHasMore(true);
          }

          if (append) {
            setAllJobs(prev => {
              const existingIds = new Set(prev.map(j => j.id));
              const newJobs = data.jobs.filter(j => !existingIds.has(j.id));
              const combined = [...prev, ...newJobs];
              setFilteredJobs(combined);
              return combined;
            });
          } else {
            setAllJobs(data.jobs);
            setFilteredJobs(data.jobs);
            setCurrentPage(1);
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

  // Debounced search and company filter effect (server-side query)
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchJobsFromAllBoards(1, false, filterQuery, selectedCompanyFilter);
    }, 450); // 450ms debounce to prevent flooding search requests

    return () => clearTimeout(delayDebounce);
  }, [filterQuery, selectedCompanyFilter]);

  // Reset active card index when filtered list changes
  useEffect(() => {
    setActiveIndex(0);
    scrollY.setValue(0);
  }, [filteredJobs]);

  const viewJobDetails = (job: GreenhouseJob) => {
    setSelectedJob(job);
    setJobDetailsHtml(job.content || "No description provided.");
  };

  const stripHtml = (html: string) => {
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
  };

  // Pure JavaScript base64 encoder
  const encodeBase64 = (input: string): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let str = input;
    let output = '';
    for (let block = 0, charCode, i = 0, map = chars;
         str.charAt(i | 0) || (map = '=', i % 1);
         output += map.charAt(63 & block >> 8 - i % 1 * 8)) {
      charCode = str.charCodeAt(i += 3/4);
      if (charCode > 0xFF) {
        throw new Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
      }
      block = block << 8 | charCode;
    }
    return output;
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
      let finalResumeUri = baseResume.uri;
      let finalResumeName = baseResume.name;

      const targetCompany = selectedJob?.companyName || 'COMPANY';
      const targetToken = selectedJob?.boardToken || 'stripe';
      const isLever = selectedJob?.sourceType === 'lever';

      if (tailorResume) {
        // Step 1: Tailor resume to job description via Gemini API
        console.log("Tailoring resume to job description...");
        const base64Resume = await FileSystem.readAsStringAsync(baseResume.uri, {
          encoding: 'base64',
        });

        const promptText = `
Here is a job description for a "${selectedJob?.title}" position at "${targetCompany}":
[JOB_DESCRIPTION]
${stripHtml(jobDetailsHtml)}
[END_JOB_DESCRIPTION]

Please rewrite and tailor my attached resume to match this job description. Optimize keywords and achievement phrasing naturally.
Output the tailored resume strictly in clean HTML format (start with <div> and end with </div>). Do NOT wrap in \`\`\`html or markdown formatters. Use clean structure.
`;

        const geminiRes = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-goog-api-key': 'AQ.Ab8RN6LjiOKxvxO8J1J0MWsp3Wrbo5emB0MOb6JFXsWKYIlqhw'
            },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { inlineData: { mimeType: 'application/pdf', data: base64Resume } },
                  { text: promptText }
                ]
              }]
            })
          }
        );

        if (!geminiRes.ok) {
          throw new Error("Failed to tailor resume with AI. Please try again.");
        }

        const geminiData = await geminiRes.json();
        const tailoredBody = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const cleanBody = tailoredBody.replace(/```html/gi, '').replace(/```/gi, '').trim();

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
              ${cleanBody}
            </body>
          </html>
        `;

        const printResult = await Print.printToFileAsync({ html: formattedHtml });
        finalResumeUri = printResult.uri;
        finalResumeName = `${selectedJob?.title.replace(/[^a-zA-Z0-9]/g, '_')}_Tailored_Resume.pdf`;

        // Save tailored resume back to local Resumes list
        const newResumeEntry: SelectedResumeFile = {
          id: `tailored_${Date.now()}`,
          name: finalResumeName,
          date: new Date().toLocaleDateString(),
          uri: finalResumeUri,
          mimeType: 'application/pdf',
          isBuilt: true
        };

        const updatedList = [newResumeEntry, ...resumesList];
        const resumesJsonPath = `${FileSystem.documentDirectory}resumes.json`;
        await FileSystem.writeAsStringAsync(resumesJsonPath, JSON.stringify(updatedList));
        setResumesList(updatedList);
        setSelectedResumeId(newResumeEntry.id);
      }

      // Step 2: Submit Application via unified backend endpoint
      console.log("Submitting application to backend...");
      const formData = new FormData();
      formData.append('jobId', String(selectedJob?.id));
      formData.append('companySlug', targetToken);
      formData.append('sourceType', selectedJob?.sourceType || 'greenhouse');
      formData.append('firstName', firstName);
      formData.append('lastName', lastName);
      formData.append('email', email);
      if (phone) formData.append('phone', phone);
      if (config.jobBoardKey && config.boardToken === targetToken) {
        formData.append('jobBoardKey', config.jobBoardKey);
      }

      const resumeFileObj: any = {
        uri: finalResumeUri,
        name: finalResumeName,
        type: 'application/pdf'
      };
      formData.append('resume', resumeFileObj);

      const postResponse = await fetch(`${API_URL}/api/jobs/apply`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
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

      // Step 3: Log application locally in applied_jobs.json
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
        tailorResume 
          ? "Your resume has been tailored with AI and successfully applied! You can view it under the Your Doc tab."
          : "Your application has been successfully submitted! Track its status in Your Doc tab.",
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
    } catch (err: any) {
      console.log("Error applying to job:", err);
      Alert.alert("Application Error", err.message || "Failed to submit application.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onScrollEnd = (e: any) => {
    const yOffset = e.nativeEvent.contentOffset.y;
    const index = Math.round(yOffset / pagerHeight);
    setActiveIndex(index);

    // Fetch the next page of 50 jobs when user scrolls near the end of the loaded list
    if (index >= filteredJobs.length - 5 && hasMore && !isFetchingMore && !isLoadingJobs) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchJobsFromAllBoards(nextPage, true, filterQuery, selectedCompanyFilter);
    }
  };

  const renderJobCardItemAnimated = ({ item, index }: { item: GreenhouseJob, index: number }) => {
    const dept = item.departments?.[0]?.name || "General";
    const office = item.location.name || "Remote";
    const companyName = item.companyName || "COMPANY";
    const rawDescription = stripHtml(item.content || "");
    const snippet = rawDescription.length > 285 
      ? rawDescription.slice(0, 285) + "..." 
      : rawDescription;

    const inputRange = [
      (index - 1) * pagerHeight,
      index * pagerHeight,
      (index + 1) * pagerHeight
    ];

    // Sticky Card Stack calculation:
    // When scrollY goes past this item, we translate it down to cancel out scroll, making it sticky!
    const translateY = scrollY.interpolate({
      inputRange,
      outputRange: [0, 0, pagerHeight],
      extrapolate: 'clamp'
    });

    // Fade the covered card out cleanly to 0 opacity once it is fully swiped away,
    // this prevents subpixel corner border lines/shadows of the covered card from peeking out!
    const opacity = scrollY.interpolate({
      inputRange: [
        (index - 1) * pagerHeight,
        index * pagerHeight,
        (index + 0.98) * pagerHeight,
        (index + 1) * pagerHeight
      ],
      outputRange: [0, 1, 1, 0],
      extrapolate: 'clamp'
    });

    return (
      <Animated.View style={[
        styles.jobCardContainer, 
        { height: pagerHeight, transform: [{ translateY }], opacity }
      ]}>
        <View style={styles.premiumCard}>
          <LinearGradient
            colors={['#FFFFFF', '#F9FAFB']}
            style={StyleSheet.absoluteFillObject}
          />
          
          <View style={styles.cardHeader}>
            <View style={styles.companyTagLarge}>
              <Text style={styles.companyTagTextLarge}>{companyName}</Text>
            </View>
            <Text style={styles.deckIndicatorText}>
              {index + 1} / {filteredJobs.length}
            </Text>
          </View>

          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

          <View style={styles.cardMetaRow}>
            <View style={styles.cardMetaBadge}>
              <Ionicons name="briefcase" size={14} color="#6355D8" />
              <Text style={styles.cardMetaText} numberOfLines={1}>{dept}</Text>
            </View>
            <View style={[styles.cardMetaBadge, { marginLeft: 8 }]}>
              <Ionicons name="location" size={14} color="#6355D8" />
              <Text style={styles.cardMetaText} numberOfLines={1}>{office}</Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          <Text style={styles.cardSectionHeading}>Description Overview</Text>
          <View style={styles.cardSnippetContainer}>
            <Text style={styles.cardSnippetText}>{snippet}</Text>
          </View>

          <View style={styles.cardFooter}>
            <TouchableOpacity
              style={styles.premiumApplyBtn}
              activeOpacity={0.8}
              onPress={() => viewJobDetails(item)}
            >
              <Text style={styles.premiumApplyBtnText}>View Details & Apply</Text>
              <Ionicons name="sparkles" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F3F4F6', '#FFFFFF']} style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <View style={[styles.header, { marginTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Greenhouse & Lever Jobs</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search and Filters area */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 8 }}>
        {/* Role Search Bar */}
        <View style={styles.searchCard}>
          <Text style={styles.searchLabel}>Find Your Next Role</Text>
          <View style={styles.searchBarRow}>
            <TextInput
              style={styles.searchBarInput}
              placeholder="e.g. Developer, Designer, Manager..."
              placeholderTextColor="rgba(0,0,0,0.3)"
              value={filterQuery}
              onChangeText={setFilterQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Company Filter Pills */}
        <View style={{ marginBottom: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {['ALL', ...POPULAR_GREENHOUSE_COMPANIES.map(c => c.toUpperCase()), ...POPULAR_LEVER_COMPANIES.map(c => c.toUpperCase())].map((company) => {
              const isSelected = selectedCompanyFilter === company;
              return (
                <TouchableOpacity
                  key={company}
                  style={[
                    styles.companyPill,
                    isSelected ? styles.companyPillActive : undefined
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedCompanyFilter(company)}
                >
                  <Text style={[
                    styles.companyPillText,
                    isSelected ? styles.companyPillTextActive : undefined
                  ]}>
                    {company}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Snapping Vertical Card Deck */}
      <View 
        style={{ flex: 1, paddingHorizontal: 24, paddingBottom: 24 }}
        onLayout={(e) => setPagerHeight(e.nativeEvent.layout.height)}
      >
        {isLoadingJobs ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#7C3AED" />
          </View>
        ) : filteredJobs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No matching jobs found</Text>
          </View>
        ) : (
          <Animated.FlatList
            data={filteredJobs}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderJobCardItemAnimated}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            snapToInterval={pagerHeight}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum={true}
            scrollEventThrottle={16}
            onMomentumScrollEnd={onScrollEnd}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
          />
        )}
      </View>

      {/* Details & Apply Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={selectedJob !== null}
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

                  <Text style={styles.sectionHeading}>Quick Apply Form</Text>
                  
                  {firstName && lastName && email && !isEditingContact ? (
                    <View style={styles.contactSummaryCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.contactSummaryName}>{firstName} {lastName}</Text>
                        <Text style={styles.contactSummaryEmail}>{email} {phone ? `• ${phone}` : ''}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.editContactBtn}
                        onPress={() => setIsEditingContact(true)}
                      >
                        <Ionicons name="create-outline" size={16} color="#7C3AED" style={{ marginRight: 4 }} />
                        <Text style={styles.editContactBtnText}>Edit Info</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View>
                      <TextInput
                        style={styles.formInput}
                        placeholder="First Name"
                        placeholderTextColor="rgba(0,0,0,0.3)"
                        value={firstName}
                        onChangeText={setFirstName}
                      />

                      <TextInput
                        style={styles.formInput}
                        placeholder="Last Name"
                        placeholderTextColor="rgba(0,0,0,0.3)"
                        value={lastName}
                        onChangeText={setLastName}
                      />

                      <TextInput
                        style={styles.formInput}
                        placeholder="Email Address"
                        placeholderTextColor="rgba(0,0,0,0.3)"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />

                      <TextInput
                        style={styles.formInput}
                        placeholder="Phone Number"
                        placeholderTextColor="rgba(0,0,0,0.3)"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                      />
                      {firstName && lastName && email && (
                        <TouchableOpacity
                          style={styles.saveContactEditBtn}
                          onPress={() => setIsEditingContact(false)}
                        >
                          <Text style={styles.saveContactEditBtnText}>Done Editing</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  <Text style={styles.inputLabel}>Select Resume to Apply</Text>
                  {resumesList.length === 0 ? (
                    <Text style={styles.noResumesWarning}>
                      No resumes found. Please generate or import a resume PDF first.
                    </Text>
                  ) : (
                    <View style={styles.dropdownContainer}>
                      {resumesList.map((r) => {
                        const isSelected = r.id === selectedResumeId;
                        return (
                          <TouchableOpacity
                            key={r.id}
                            style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                            onPress={() => setSelectedResumeId(r.id)}
                          >
                            <Ionicons
                              name={isSelected ? "checkbox" : "square-outline"}
                              size={18}
                              color={isSelected ? "#7C3AED" : "#6B7280"}
                              style={{ marginRight: 8 }}
                            />
                            <Text
                              style={[styles.dropdownText, isSelected && styles.dropdownTextSelected]}
                              numberOfLines={1}
                            >
                              {r.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  <View style={styles.switchRow}>
                    <View style={{ flex: 1, marginRight: 16 }}>
                      <Text style={styles.switchLabel}>AI Tailor Resume first ✨</Text>
                      <Text style={styles.switchDesc}>
                        Uses Gemini AI to automatically rewrite bullet points and keyword-match the resume to this description before submitting.
                      </Text>
                    </View>
                    <Switch
                      value={tailorResume}
                      onValueChange={setTailorResume}
                      trackColor={{ false: '#D1D5DB', true: '#C084FC' }}
                      thumbColor={tailorResume ? '#7C3AED' : '#F3F4F6'}
                    />
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              {selectedJob?.canApplyDirectly !== false ? (
                <TouchableOpacity
                  style={[styles.modalSubmitBtn, (isSubmitting || resumesList.length === 0) && styles.modalSubmitBtnDisabled]}
                  onPress={handleApply}
                  disabled={isSubmitting || resumesList.length === 0}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.modalSubmitBtnText}>
                        {tailorResume ? "Tailor & Apply Now" : "Apply Now"}
                      </Text>
                      <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.modalSubmitBtn}
                  onPress={() => {
                    if (selectedJob?.absolute_url) {
                      Linking.openURL(selectedJob.absolute_url).catch((err) =>
                        console.error("Failed to open application link:", err)
                      );
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
    color: '#2E1A8E',
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
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
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
    color: '#2E1A8E',
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
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    flex: 1,
  },
  cardMetaText: {
    color: '#6355D8',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
    flex: 1,
  },
  cardDivider: {
    height: 1.5,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  cardSectionHeading: {
    color: '#2E1A8E',
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
    backgroundColor: '#7C3AED',
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C3AED',
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
    color: '#2E1A8E',
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
    color: '#2E1A8E',
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
    color: '#2E1A8E',
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
    backgroundColor: '#F5F3FF',
  },
  dropdownText: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  dropdownTextSelected: {
    color: '#7C3AED',
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
    backgroundColor: '#7C3AED',
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
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editContactBtnText: {
    color: '#7C3AED',
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
});
