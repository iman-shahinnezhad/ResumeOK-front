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
  Linking,
  SafeAreaView,
  PanResponder,
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
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { API_URL } from '../context/AuthContext';
import { WebView } from 'react-native-webview';
import { getSession } from '../utils/session';

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pagerHeight, setPagerHeight] = useState(480);
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

    if (direction === 'right' && targetJob) {
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

  useEffect(() => {
    // Load next page of jobs when swiped near the end of loaded listings
    if (currentIndex >= filteredJobs.length - 5 && hasMore && !isFetchingMore && !isLoadingJobs && filteredJobs.length > 0) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchJobsFromAllBoards(nextPage, true, filterQuery, selectedCompanyFilter);
    }
  }, [currentIndex, filteredJobs.length, hasMore, isFetchingMore, isLoadingJobs]);

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
  const webViewRef = useRef<WebView>(null);

  // Load config, resumes, and popular jobs on mount
  useEffect(() => {
    async function initData() {
      try {
        let finalFirstName = '';
        let finalLastName = '';
        let finalEmail = '';

        // Load onboarding profile values first as a default fallback
        const profilePath = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
        const profileInfo = await FileSystem.getInfoAsync(profilePath);
        if (profileInfo.exists) {
          const text = await FileSystem.readAsStringAsync(profilePath);
          const profile = JSON.parse(text);
          if (profile.firstName) finalFirstName = profile.firstName;
          if (profile.lastName) finalLastName = profile.lastName;
          if (profile.email) finalEmail = profile.email;
        }

        // Load greenhouse config and override/merge
        const configPath = `${FileSystem.documentDirectory}greenhouse_config.json`;
        const configInfo = await FileSystem.getInfoAsync(configPath);
        if (configInfo.exists) {
          const text = await FileSystem.readAsStringAsync(configPath);
          const parsed = JSON.parse(text);
          setConfig(parsed);
          if (parsed.email) finalEmail = parsed.email;
          if (parsed.firstName) finalFirstName = parsed.firstName;
          if (parsed.lastName) finalLastName = parsed.lastName;
          if (parsed.phone) setPhone(parsed.phone);
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

          // Pre-process rich HTML content to clean snippets once on fetch
          const processed = data.jobs.map((job: GreenhouseJob) => {
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
    setCurrentIndex(0);
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

  const injectAutofillScript = () => {
    if (!webViewRef.current) return;

    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      resumeBase64: selectedResumeBase64,
      resumeName: selectedResumeName,
      coverLetterText: selectedCoverLetterText,
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
        const payload = ${JSON.stringify(payload)};
        let attempts = 0;
        const maxAttempts = 10;
        
        function sendLog(msg) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message: msg }));
          }
        }

        sendLog('Script loaded on host: ' + window.location.host);

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
            const greenhouseIframe = document.querySelector('iframe[src*="greenhouse.io"]');
            if (greenhouseIframe && greenhouseIframe.src && !window.location.href.includes('embed/job_app')) {
              sendLog('Found Greenhouse iframe. Redirecting top window to: ' + greenhouseIframe.src);
              window.location.href = greenhouseIframe.src;
              return;
            }

            const leverIframe = document.querySelector('iframe[src*="lever.co"]');
            if (leverIframe && leverIframe.src && !window.location.href.includes('embed/job_app')) {
              sendLog('Found Lever iframe. Redirecting top window to: ' + leverIframe.src);
              window.location.href = leverIframe.src;
              return;
            }
          }

          // 1. GREENHOUSE AUTOFILL
          const ghFirstName = document.querySelector('input#first_name');
          const ghLastName = document.querySelector('input#last_name');
          const ghEmail = document.querySelector('input#email');
          const ghPhone = document.querySelector('input#phone');

          sendLog('Greenhouse inputs state: firstName=' + !!ghFirstName + ', lastName=' + !!ghLastName + ', email=' + !!ghEmail + ', phone=' + !!ghPhone);

          if (ghFirstName || ghLastName || window.location.host.includes('greenhouse.io')) {
            if (ghFirstName && !ghFirstName.value) {
              triggerInputChange(ghFirstName, payload.firstName);
              sendLog('Filled Greenhouse first_name: ' + payload.firstName);
            }
            if (ghLastName && !ghLastName.value) {
              triggerInputChange(ghLastName, payload.lastName);
              sendLog('Filled Greenhouse last_name: ' + payload.lastName);
            }
            if (ghEmail && !ghEmail.value) {
              triggerInputChange(ghEmail, payload.email);
              sendLog('Filled Greenhouse email: ' + payload.email);
            }
            if (ghPhone && !ghPhone.value) {
              triggerInputChange(ghPhone, payload.phone);
              sendLog('Filled Greenhouse phone: ' + payload.phone);
            }

            // Cover letter text area
            const ghCLText = document.querySelector('textarea#cover_letter_text') || 
                             document.querySelector('textarea[name="cover_letter"]');
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
          }

          // 2. LEVER AUTOFILL
          const leverName = document.querySelector('input[name="name"]');
          const leverEmail = document.querySelector('input[name="email"]');
          const leverPhone = document.querySelector('input[name="phone"]');

          sendLog('Lever inputs state: name=' + !!leverName + ', email=' + !!leverEmail + ', phone=' + !!leverPhone);

          if (leverName || leverEmail || window.location.host.includes('lever.co')) {
            if (leverName && !leverName.value) {
              triggerInputChange(leverName, payload.firstName + ' ' + payload.lastName);
              sendLog('Filled Lever name.');
            }
            if (leverEmail && !leverEmail.value) {
              triggerInputChange(leverEmail, payload.email);
              sendLog('Filled Lever email.');
            }
            if (leverPhone && !leverPhone.value) {
              triggerInputChange(leverPhone, payload.phone);
              sendLog('Filled Lever phone.');
            }

            // Cover letter text area / comments
            const leverCLText = document.querySelector('textarea[name="comments"]') || 
                                document.querySelector('textarea#additional-information');
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
          }

          // 3. GENERIC FALLBACK FOR OTHER BOARDS
          const genericEmail = document.querySelector('input[type="email"]');
          if (genericEmail && !genericEmail.value) {
            triggerInputChange(genericEmail, payload.email);
            sendLog('Filled generic email.');
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

    webViewRef.current.injectJavaScript(jsCode);
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
      const targetToken = (selectedJob?.boardToken || 'stripe').toLowerCase();

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

      // Check if user has their own Greenhouse API key configured for the target board token
      const hasDirectApiKey = !!(config.jobBoardKey && config.boardToken?.toLowerCase() === targetToken);

      if (hasDirectApiKey) {
        // Submit Application via unified backend endpoint
        console.log("Submitting application parameters:", {
          jobId: selectedJob?.id,
          companySlug: targetToken,
          sourceType: selectedJob?.sourceType || 'greenhouse',
          configBoardToken: config.boardToken,
          hasJobBoardKey: true,
          isKeyAppended: true
        });
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
      } else {
        // External/Other company: launch the in-app Autofill WebView Assistant!
        console.log("Launching in-app Autofill WebView Assistant...");
        const base64Content = await FileSystem.readAsStringAsync(finalResumeUri, { encoding: 'base64' });
        setSelectedResumeBase64(base64Content);
        setSelectedResumeName(finalResumeName);

        // Load cover letters to find the one matching this job or the most recent one
        const coverLettersPath = `${FileSystem.documentDirectory}cover_letters.json`;
        let latestCoverLetterText = '';
        try {
          const clInfo = await FileSystem.getInfoAsync(coverLettersPath);
          if (clInfo.exists) {
            const clContent = await FileSystem.readAsStringAsync(coverLettersPath);
            const clList = JSON.parse(clContent);
            if (Array.isArray(clList) && clList.length > 0) {
              const matchingCl = clList.find((c: any) => 
                (c.company && c.company.toLowerCase() === targetCompany.toLowerCase()) || 
                (c.jobTitle && c.jobTitle.toLowerCase() === selectedJob?.title.toLowerCase())
              );
              if (matchingCl) {
                latestCoverLetterText = matchingCl.coverLetterText;
              } else {
                latestCoverLetterText = clList[0].coverLetterText;
              }
            }
          }
        } catch (err) {
          console.log('Error reading cover letters:', err);
        }
        setSelectedCoverLetterText(latestCoverLetterText);

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
    }
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
      </View>

      {/* Snapping Vertical Card Deck (Tinder Style) */}
      <View
        style={{ flex: 1, paddingHorizontal: 24, paddingBottom: 16 }}
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
        ) : currentIndex >= filteredJobs.length ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="sparkles" size={48} color="#7C3AED" style={{ marginBottom: 12 }} />
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
                />
              </Animated.View>
            )}

            {/* Foreground / Active Card (Moves with gesture) */}
            <Animated.View
              key={`fg-${filteredJobs[currentIndex].id}`}
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
                  likeStyle={likeBadgeStyle}
                  nopeStyle={nopeBadgeStyle}
                />
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
      </View>

      {/* Tinder Actions */}
      {!isLoadingJobs && filteredJobs.length > 0 && currentIndex < filteredJobs.length && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSkip]}
            activeOpacity={0.8}
            onPress={() => swipeCard('left')}
          >
            <Ionicons name="close" size={28} color="#EF4444" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnApply]}
            activeOpacity={0.8}
            onPress={() => swipeCard('right')}
          >
            <Ionicons name="sparkles" size={26} color="#10B981" />
          </TouchableOpacity>
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

      {/* Autofill Assistant WebView Modal */}
      <Modal
        visible={webViewVisible}
        animationType="slide"
        onRequestClose={() => {
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
            source={{ uri: selectedJob?.absolute_url || '' }}
            onLoadEnd={injectAutofillScript}
            onMessage={handleWebViewMessage}
            style={{ flex: 1 }}
            domStorageEnabled={true}
            javaScriptEnabled={true}
            allowFileAccess={true}
            allowFileAccessFromFileURLs={true}
            allowUniversalAccessFromFileURLs={true}
            originWhitelist={['*']}
            mixedContentMode="always"
            startInLoadingState={true}
            renderLoading={() => (
              <ActivityIndicator 
                size="large" 
                color="#7C3AED" 
                style={StyleSheet.absoluteFillObject} 
              />
            )}
          />
          
          <View style={styles.webViewFooter}>
            <Text style={styles.webViewFooterText}>
              ⚡ Autofilled your contact details and resume. Please check for any company-specific questions and tap Submit!
            </Text>
          </View>
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
    flexShrink: 1,
  },
  cardMetaText: {
    color: '#6355D8',
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
    backgroundColor: '#7C3AED',
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
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 28,
    marginTop: 16,
    marginBottom: 8,
  },
  actionBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  actionBtnSkip: {
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  actionBtnApply: {
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  loadingCard: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCardText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7C3AED',
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
  },
  webViewFooterText: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center',
  },
});

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

interface JobCardContentProps {
  item: GreenhouseJob;
  isActive: boolean;
  likeStyle?: any;
  nopeStyle?: any;
}

const JobCardContent = React.memo(({ item, isActive, likeStyle, nopeStyle }: JobCardContentProps) => {

  const dept = item.departments?.[0]?.name || "General";
  const office = item.location.name || "Remote";
  const companyName = item.companyName || "COMPANY";
  const snippet = (item as any).cleanSnippet || "";

  return (
    <View style={styles.premiumCard}>
      <LinearGradient
        colors={['#FFFFFF', '#F9FAFB']}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.cardHeader}>
        <View style={styles.companyTagLarge}>
          <Text style={styles.companyTagTextLarge}>{companyName}</Text>
        </View>
      </View>

      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

      <View style={styles.cardMetaRow}>
        <View style={styles.cardMetaBadge}>
          <Ionicons name="briefcase" size={14} color="#6355D8" />
          <Text style={styles.cardMetaText} numberOfLines={1} ellipsizeMode="tail">{dept}</Text>
        </View>
        <View style={[styles.cardMetaBadge, { marginLeft: 8 }]}>
          <Ionicons name="location" size={14} color="#6355D8" />
          <Text style={styles.cardMetaText} numberOfLines={1} ellipsizeMode="tail">{office}</Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <Text style={styles.cardSectionHeading}>Description Overview</Text>
      <View style={styles.cardSnippetContainer}>
        <Text style={styles.cardSnippetText}>{snippet}</Text>
      </View>

      {/* Swipe Badge Overlays (Tinder-style stamps) */}
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

