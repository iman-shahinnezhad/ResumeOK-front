import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SymbolView } from 'expo-symbols';
import { BlurView } from 'expo-blur';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ApplyJobScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ url: string; title?: string; company?: string }>();
  const webViewRef = useRef<WebView>(null);

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [autofillCount, setAutofillCount] = useState(0);
  const [resumeBase64, setResumeBase64] = useState<string>('');
  const [resumeName, setResumeName] = useState<string>('');
  const [coverLetterText, setCoverLetterText] = useState<string>('');

  const jobUrl = params.url || 'https://google.com';
  const jobTitle = params.title || 'Job Application';
  const companyName = params.company || '';

  // Load User Profile Data for Form Filling
  useEffect(() => {
    async function loadProfile() {
      try {
        const path = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
        const info = await FileSystem.getInfoAsync(path);
        if (info.exists) {
          const content = await FileSystem.readAsStringAsync(path);
          setProfileData(JSON.parse(content));
        }

        // Load resumes
        const resumesPath = `${FileSystem.documentDirectory}resumes.json`;
        const resumesInfo = await FileSystem.getInfoAsync(resumesPath);
        if (resumesInfo.exists) {
          const resumesContent = await FileSystem.readAsStringAsync(resumesPath);
          const parsedResumes = JSON.parse(resumesContent);
          if (Array.isArray(parsedResumes) && parsedResumes.length > 0) {
            const defaultResume = parsedResumes.find(r => r.isDefault) || parsedResumes[0];
            if (defaultResume && defaultResume.uri) {
              const fileBase64 = await FileSystem.readAsStringAsync(defaultResume.uri, { encoding: 'base64' });
              setResumeBase64(fileBase64);
              setResumeName(defaultResume.name || 'resume.pdf');
            }
          }
        }

        // Load cover letters
        const coverLettersPath = `${FileSystem.documentDirectory}cover_letters.json`;
        const coverLettersInfo = await FileSystem.getInfoAsync(coverLettersPath);
        if (coverLettersInfo.exists) {
          const clContent = await FileSystem.readAsStringAsync(coverLettersPath);
          const parsedCLs = JSON.parse(clContent);
          if (Array.isArray(parsedCLs) && parsedCLs.length > 0) {
            const targetCompany = (companyName || '').toLowerCase().trim();
            const targetTitle = (jobTitle || '').toLowerCase().trim();
            let matchedCL = parsedCLs.find(cl => 
              (cl.company && cl.company.toLowerCase().trim() === targetCompany) ||
              (cl.jobTitle && cl.jobTitle.toLowerCase().trim() === targetTitle)
            );
            if (!matchedCL) {
              matchedCL = parsedCLs[0];
            }
            if (matchedCL && matchedCL.coverLetterText) {
              setCoverLetterText(matchedCL.coverLetterText);
            }
          }
        }
      } catch (err) {
        console.log('Error loading profile for autofill:', err);
      }
    }
    loadProfile();
  }, [companyName, jobTitle]);

  // Form Autofill JavaScript Injection Code
  const getAutofillJS = () => {
    if (!profileData) return '';

    const payload = {
      firstName: (profileData.firstName || '').replace(/'/g, "\\'"),
      lastName: (profileData.lastName || '').replace(/'/g, "\\'"),
      email: (profileData.email || '').replace(/'/g, "\\'"),
      phone: (profileData.phone || profileData.phoneNumber || profileData.mobile || '').replace(/'/g, "\\'"),
      linkedinUrl: (profileData.linkedinUrl || profileData.linkedin || '').replace(/'/g, "\\'"),
      portfolioUrl: (profileData.portfolioUrl || profileData.portfolio || profileData.website || '').replace(/'/g, "\\'"),
      city: (profileData.city || '').replace(/'/g, "\\'"),
      country: (profileData.country || 'United States').replace(/'/g, "\\'"),
      resumeBase64: resumeBase64,
      resumeName: resumeName,
      coverLetterText: coverLetterText,
    };

    return `
      (function() {
        const payload = ${JSON.stringify(payload)};
        let attempts = 0;
        const maxAttempts = 10;

        function sendLog(msg) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message: msg }));
          }
        }

        function base64ToBlob(base64, mimeType) {
          const byteCharacters = atob(base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          return new Blob([byteArray], { type: mimeType });
        }

        function setNativeValue(element, value) {
          if (!element || !value) return;
          
          if (element.tagName === 'SELECT') {
            const options = Array.from(element.options);
            const valLower = value.toLowerCase();
            let matchedOption = options.find(opt => opt.value.toLowerCase() === valLower || opt.text.toLowerCase().includes(valLower));
            if (matchedOption) {
              element.value = matchedOption.value;
              element.dispatchEvent(new Event('change', { bubbles: true }));
            }
            return;
          }

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
          element.blur();
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
          const labels = Array.from(document.querySelectorAll('label'));
          for (const label of labels) {
            const labelText = label.innerText.toLowerCase();
            if (labelKeywords.some(kw => labelText.includes(kw))) {
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
            }
          }
          if (placeholderKeywords) {
            document.querySelectorAll('input, textarea').forEach(el => {
              const ph = (el.getAttribute('placeholder') || '').toLowerCase();
              if (placeholderKeywords.some(kw => ph.includes(kw))) {
                found.add(el);
              }
            });
          }
          return Array.from(found);
        }

        function tryAutofill() {
          attempts++;
          try {
            let filled = 0;

            const isLever = window.location.host.includes('lever.co') || document.querySelector('input[name="name"]') || document.querySelector('input[name="email"]');
            const isGreenhouse = window.location.host.includes('greenhouse.io') || document.querySelector('form#application_form') || document.querySelector('input#first_name');

            if (isGreenhouse) {
              // First Name
              if (payload.firstName) {
                const els = findInputs('input[name*="first" i], input[id*="first" i], input[autocomplete="given-name"]', ['first name', 'given name'], ['first name', 'given name']);
                els.forEach(el => {
                  if (!el.value) {
                    setNativeValue(el, payload.firstName);
                    filled++;
                  }
                });
              }

              // Last Name
              if (payload.lastName) {
                const els = findInputs('input[name*="last" i], input[id*="last" i], input[autocomplete="family-name"]', ['last name', 'surname', 'family name'], ['last name', 'surname', 'family name']);
                els.forEach(el => {
                  if (!el.value) {
                    setNativeValue(el, payload.lastName);
                    filled++;
                  }
                });
              }

              // Email
              if (payload.email) {
                const els = findInputs('input[type="email" i], input[name*="email" i], input[id*="email" i], input[autocomplete="email"]', ['email', 'e-mail'], ['email', 'e-mail']);
                els.forEach(el => {
                  if (!el.value) {
                    setNativeValue(el, payload.email);
                    filled++;
                  }
                });
              }

              // Phone
              if (payload.phone) {
                const els = findInputs('input[type="tel" i], input[name*="phone" i], input[id*="phone" i], input[name*="mobile" i]', ['phone', 'telephone', 'mobile', 'cell', 'number'], ['phone', 'telephone', 'mobile', 'cell', 'number']);
                els.forEach(el => {
                  if (!el.value) {
                    setNativeValue(el, payload.phone);
                    filled++;
                  }
                });
              }

              // LinkedIn
              if (payload.linkedinUrl) {
                const els = findInputs('input[name*="linkedin" i], input[id*="linkedin" i], input[name*="link" i]', ['linkedin'], ['linkedin']);
                els.forEach(el => {
                  if (!el.value) {
                    setNativeValue(el, payload.linkedinUrl);
                    filled++;
                  }
                });
              }

              // Portfolio
              if (payload.portfolioUrl) {
                const els = findInputs('input[name*="website" i], input[name*="portfolio" i], input[id*="website" i], input[name*="url" i]', ['portfolio', 'website', 'url', 'personal link'], ['portfolio', 'website', 'url']);
                els.forEach(el => {
                  if (!el.value) {
                    setNativeValue(el, payload.portfolioUrl);
                    filled++;
                  }
                });
              }

              // City
              if (payload.city) {
                const els = findInputs('input[name*="location" i], input[name*="city" i], input[id*="location" i]', ['location', 'city', 'address', 'living in'], ['location', 'city', 'address']);
                els.forEach(el => {
                  if (!el.value) {
                    setNativeValue(el, payload.city);
                    filled++;
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
                      filled++;
                    }
                  } else if (el.tagName === 'INPUT' && !el.value) {
                    setNativeValue(el, payload.country);
                    filled++;
                  }
                });
              }

              // Cover letter text area
              const ghCLText = document.querySelector('textarea#cover_letter_text') || 
                               document.querySelector('textarea[name="cover_letter"]') ||
                               document.querySelector('textarea[id*="cover" i]');
              if (ghCLText && payload.coverLetterText && !ghCLText.value) {
                setNativeValue(ghCLText, payload.coverLetterText);
                filled++;
              }

              // Resume upload logic
              const fileInput = document.querySelector('input[type="file"][id="resume_file"]') || 
                                document.querySelector('input[type="file"][name="resume"]') ||
                                document.querySelector('input[type="file"]');
              if (fileInput && payload.resumeBase64 && (!fileInput.files || !fileInput.files.length)) {
                try {
                  const blob = base64ToBlob(payload.resumeBase64, 'application/pdf');
                  const file = new File([blob], payload.resumeName || 'resume.pdf', { type: 'application/pdf' });
                  const dataTransfer = new DataTransfer();
                  dataTransfer.items.add(file);
                  
                  const filesSetter = Object.getOwnPropertyDescriptor(fileInput, 'files')?.set;
                  const prototype = Object.getPrototypeOf(fileInput);
                  const prototypeFilesSetter = Object.getOwnPropertyDescriptor(prototype, 'files')?.set;
                  if (prototypeFilesSetter) {
                    prototypeFilesSetter.call(fileInput, dataTransfer.files);
                  } else {
                    fileInput.files = dataTransfer.files;
                  }
                  
                  fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                  filled++;
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
                  
                  const filesSetter = Object.getOwnPropertyDescriptor(ghCLFile, 'files')?.set;
                  const prototype = Object.getPrototypeOf(ghCLFile);
                  const prototypeFilesSetter = Object.getOwnPropertyDescriptor(prototype, 'files')?.set;
                  if (prototypeFilesSetter) {
                    prototypeFilesSetter.call(ghCLFile, dataTransfer.files);
                  } else {
                    ghCLFile.files = dataTransfer.files;
                  }
                  
                  ghCLFile.dispatchEvent(new Event('change', { bubbles: true }));
                  filled++;
                } catch(e) {
                  sendLog('Failed to attach cover letter to Greenhouse: ' + e.message);
                }
              }
            } else if (isLever) {
              // Full Name
              if (payload.firstName || payload.lastName) {
                const fullNameText = (payload.firstName + ' ' + payload.lastName).trim();
                const els = findInputs('input[name="name"]', ['full name', 'your name', 'complete name'], ['full name', 'name']);
                els.forEach(el => {
                  if (!el.value) {
                    setNativeValue(el, fullNameText);
                    filled++;
                  }
                });
              }

              // Email
              if (payload.email) {
                const els = findInputs('input[name="email"]', ['email', 'e-mail'], ['email']);
                els.forEach(el => {
                  if (!el.value) {
                    setNativeValue(el, payload.email);
                    filled++;
                  }
                });
              }

              // Phone
              if (payload.phone) {
                const els = findInputs('input[name="phone"]', ['phone', 'mobile', 'telephone'], ['phone', 'mobile']);
                els.forEach(el => {
                  if (!el.value) {
                    setNativeValue(el, payload.phone);
                    filled++;
                  }
                });
              }

              // LinkedIn
              if (payload.linkedinUrl) {
                const els = findInputs('input[name*="linkedin" i], input[name="urls[LinkedIn]"]', ['linkedin'], ['linkedin']);
                els.forEach(el => {
                  if (!el.value) {
                    setNativeValue(el, payload.linkedinUrl);
                    filled++;
                  }
                });
              }

              // Portfolio
              if (payload.portfolioUrl) {
                const els = findInputs('input[name*="portfolio" i], input[name*="website" i], input[name="urls[Portfolio]"]', ['portfolio', 'website'], ['portfolio', 'website']);
                els.forEach(el => {
                  if (!el.value) {
                    setNativeValue(el, payload.portfolioUrl);
                    filled++;
                  }
                });
              }

              // Cover letter text area / comments
              const leverCLText = document.querySelector('textarea[name="comments"]') || 
                                  document.querySelector('textarea#additional-information') ||
                                  document.querySelector('textarea[name*="additional" i]');
              if (leverCLText && payload.coverLetterText && !leverCLText.value) {
                setNativeValue(leverCLText, payload.coverLetterText);
                filled++;
              }

              // Resume upload logic
              const fileInput = document.querySelector('input[type="file"][id="resume-upload-input"]') || 
                                document.querySelector('input[type="file"]');
              if (fileInput && payload.resumeBase64 && (!fileInput.files || !fileInput.files.length)) {
                try {
                  const blob = base64ToBlob(payload.resumeBase64, 'application/pdf');
                  const file = new File([blob], payload.resumeName || 'resume.pdf', { type: 'application/pdf' });
                  const dataTransfer = new DataTransfer();
                  dataTransfer.items.add(file);
                  
                  const filesSetter = Object.getOwnPropertyDescriptor(fileInput, 'files')?.set;
                  const prototype = Object.getPrototypeOf(fileInput);
                  const prototypeFilesSetter = Object.getOwnPropertyDescriptor(prototype, 'files')?.set;
                  if (prototypeFilesSetter) {
                    prototypeFilesSetter.call(fileInput, dataTransfer.files);
                  } else {
                    fileInput.files = dataTransfer.files;
                  }
                  
                  fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                  filled++;
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
                  
                  const filesSetter = Object.getOwnPropertyDescriptor(leverCLFile, 'files')?.set;
                  const prototype = Object.getPrototypeOf(leverCLFile);
                  const prototypeFilesSetter = Object.getOwnPropertyDescriptor(prototype, 'files')?.set;
                  if (prototypeFilesSetter) {
                    prototypeFilesSetter.call(leverCLFile, dataTransfer.files);
                  } else {
                    leverCLFile.files = dataTransfer.files;
                  }
                  
                  leverCLFile.dispatchEvent(new Event('change', { bubbles: true }));
                  filled++;
                } catch(e) {
                  sendLog('Failed to attach cover letter to Lever: ' + e.message);
                }
              }
            } else {
              if (payload.firstName) {
                findInputs('input[name*="first" i], input[id*="first" i]', ['first name'], ['first name']).forEach(el => {
                  if (!el.value) {
                    setNativeValue(el, payload.firstName);
                    filled++;
                  }
                });
              }
              if (payload.lastName) {
                findInputs('input[name*="last" i], input[id*="last" i]', ['last name'], ['last name']).forEach(el => {
                  if (!el.value) {
                    setNativeValue(el, payload.lastName);
                    filled++;
                  }
                });
              }
              if (payload.email) {
                findInputs('input[type="email" i], input[name*="email" i]', ['email'], ['email']).forEach(el => {
                  if (!el.value) {
                    setNativeValue(el, payload.email);
                    filled++;
                  }
                });
              }
              if (payload.phone) {
                findInputs('input[type="tel" i], input[name*="phone" i]', ['phone', 'mobile'], ['phone', 'mobile']).forEach(el => {
                  if (!el.value) {
                    setNativeValue(el, payload.phone);
                    filled++;
                  }
                });
              }
            }

            if (filled > 0) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'AUTOFILL_SUCCESS', count: filled }));
            }
          } catch(e) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'AUTOFILL_ERROR', error: e.message }));
          }

          if (attempts >= maxAttempts) {
            clearInterval(autofillInterval);
          }
        }

        const autofillInterval = setInterval(tryAutofill, 500);
        tryAutofill();
      })();
      true;
    `;
  };

  const handleTriggerAutofill = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (webViewRef.current && profileData) {
      webViewRef.current.injectJavaScript(getAutofillJS());
    } else {
      Alert.alert('Profile Empty', 'Please complete your onboarding profile first to use 1-Click Autofill.');
    }
  };

  const handleCopyText = async (text: string, label: string) => {
    Haptics.selectionAsync();
    if (text) {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied!', `${label} copied to clipboard.`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.closeBtn}
          activeOpacity={0.7}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          {Platform.OS === 'ios' ? (
            <SymbolView name="xmark" size={18} tintColor="#1F2937" resizeMode="scaleAspectFit" />
          ) : (
            <Ionicons name="close" size={24} color="#1F2937" />
          )}
        </TouchableOpacity>

        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle} numberOfLines={1}>{jobTitle}</Text>
          {companyName ? <Text style={styles.headerSubtitle} numberOfLines={1}>{companyName}</Text> : null}
        </View>

        <TouchableOpacity
          style={styles.reloadBtn}
          activeOpacity={0.7}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            webViewRef.current?.reload();
          }}
        >
          {Platform.OS === 'ios' ? (
            <SymbolView name="arrow.clockwise" size={18} tintColor="#6B7280" resizeMode="scaleAspectFit" />
          ) : (
            <Ionicons name="refresh" size={20} color="#6B7280" />
          )}
        </TouchableOpacity>
      </View>

      {/* In-App Application WebView */}
      <View style={{ flex: 1 }}>
        <WebView
          ref={webViewRef}
          source={{ uri: jobUrl }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => {
            setLoading(false);
            // Auto-inject fields once page finishes loading
            setTimeout(() => {
              if (webViewRef.current && profileData) {
                webViewRef.current.injectJavaScript(getAutofillJS());
              }
            }, 1200);
          }}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'AUTOFILL_SUCCESS' && data.count > 0) {
                setAutofillCount(data.count);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            } catch (e) {}
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          style={{ flex: 1 }}
        />

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#7C3AED" />
            <Text style={styles.loadingText}>Opening Application Page...</Text>
          </View>
        )}
      </View>

      {/* Floating Bottom Autofill Toolbar */}
      <BlurView intensity={Platform.OS === 'ios' ? 80 : 100} tint="light" style={[styles.bottomToolbar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={styles.autofillBtn}
          activeOpacity={0.85}
          onPress={handleTriggerAutofill}
        >
          <View style={styles.autofillIconWrap}>
            {Platform.OS === 'ios' ? (
              <SymbolView name="sparkles" size={18} tintColor="#FFFFFF" resizeMode="scaleAspectFit" />
            ) : (
              <Ionicons name="sparkles" size={18} color="#FFFFFF" />
            )}
          </View>
          <Text style={styles.autofillBtnText}>
            {autofillCount > 0 ? `Autofilled ${autofillCount} Fields` : '1-Click Autofill Form'}
          </Text>
        </TouchableOpacity>

        {/* Quick Copy Chips */}
        {profileData && (
          <View style={styles.quickChipsRow}>
            {profileData.email ? (
              <TouchableOpacity
                style={styles.chipBtn}
                onPress={() => handleCopyText(profileData.email, 'Email')}
              >
                {Platform.OS === 'ios' ? (
                  <SymbolView name="doc.on.doc" size={13} tintColor="#4B5563" resizeMode="scaleAspectFit" />
                ) : (
                  <Ionicons name="copy-outline" size={13} color="#4B5563" />
                )}
                <Text style={styles.chipText}>Email</Text>
              </TouchableOpacity>
            ) : null}

            {profileData.phone ? (
              <TouchableOpacity
                style={styles.chipBtn}
                onPress={() => handleCopyText(profileData.phone, 'Phone')}
              >
                {Platform.OS === 'ios' ? (
                  <SymbolView name="doc.on.doc" size={13} tintColor="#4B5563" resizeMode="scaleAspectFit" />
                ) : (
                  <Ionicons name="copy-outline" size={13} color="#4B5563" />
                )}
                <Text style={styles.chipText}>Phone</Text>
              </TouchableOpacity>
            ) : null}

            {profileData.firstName ? (
              <TouchableOpacity
                style={styles.chipBtn}
                onPress={() => handleCopyText(`${profileData.firstName} ${profileData.lastName || ''}`, 'Full Name')}
              >
                {Platform.OS === 'ios' ? (
                  <SymbolView name="doc.on.doc" size={13} tintColor="#4B5563" resizeMode="scaleAspectFit" />
                ) : (
                  <Ionicons name="copy-outline" size={13} color="#4B5563" />
                )}
                <Text style={styles.chipText}>Name</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reloadBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleCol: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  bottomToolbar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  autofillBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  autofillIconWrap: {
    marginRight: 8,
  },
  autofillBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  quickChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 8,
  },
  chipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
});
