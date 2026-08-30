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
  ScrollView,
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

const cleanJsCodeForInjection = (js: string) => {
  const noComments = js.replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  return noComments.replace(/[\r\n]+/g, ' ');
};

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
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

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

    const experiences = profileData.workExperiences || profileData.experiences || [];
    const currentExp = experiences.length > 0 ? experiences[0] : null;

    const educations = profileData.educations || profileData.education || [];
    const currentEdu = educations.length > 0 ? educations[0] : null;

    const payload = {
      firstName: (profileData.firstName || '').trim(),
      lastName: (profileData.lastName || '').trim(),
      email: (profileData.email || '').trim(),
      phone: (profileData.phone || profileData.phoneNumber || profileData.mobile || '').trim(),
      linkedinUrl: (profileData.linkedinUrl || profileData.linkedin || '').trim(),
      portfolioUrl: (profileData.portfolioUrl || profileData.portfolio || profileData.website || '').trim(),
      city: (profileData.city || '').trim(),
      country: (profileData.country || 'United States').trim(),
      resumeBase64: '',
      resumeName: resumeName,
      coverLetterText: coverLetterText,
      currentJobTitle: (currentExp?.jobTitle || profileData.jobTitle || profileData.role || '').trim(),
      currentEmployer: (currentExp?.companyName || '').trim(),
      workStartDate: (currentExp?.startDate || '').trim(),
      workEndDate: (currentExp?.endDate || '').trim(),
      educationSchool: (currentEdu?.schoolName || '').trim(),
      degree: (currentEdu?.degree || '').trim(),
      discipline: (currentEdu?.fieldOfStudy || currentEdu?.degree || '').trim(),
      eduStartDate: (currentEdu?.startDate || '').trim(),
      eduEndDate: (currentEdu?.endDate || '').trim(),
    };

    return `
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

          if (labelKeywords && labelKeywords.length > 0) {
            document.querySelectorAll('label').forEach(label => {
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

        function tryAutofill() {
          attempts++;
          try {
            let filled = 0;

            const isLever = window.location.host.includes('lever.co') || !!document.querySelector('form[action*="lever.co"]');
            const isGreenhouse = window.location.host.includes('greenhouse.io') || !!document.querySelector('form#application_form') || !!document.querySelector('form[action*="greenhouse.io"]');

            sendLog('tryAutofill attempts=' + attempts + ' isGreenhouse=' + isGreenhouse + ' isLever=' + isLever + ' host=' + window.location.host);

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
                setNativeValue(el, payload.currentJobTitle);
                filled++;
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
                setNativeValue(el, payload.currentEmployer);
                filled++;
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
                setNativeValue(el, payload.educationSchool);
                filled++;
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
                  filled++;
                }
              } else if (el.tagName === 'INPUT' && !el.value) {
                setNativeValue(el, payload.degree);
                filled++;
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
                  filled++;
                }
              } else if (el.tagName === 'INPUT' && !el.value) {
                setNativeValue(el, payload.discipline);
                filled++;
              }
            });
          }

          if (payload.workStartDate) {
            const els = findInputs('input[name*="start" i][name*="job" i], input[name*="start" i][name*="work" i]', ['job start', 'work start', 'employment start'], ['start date', 'start year']);
            els.forEach(el => {
              if (!el.value) {
                setNativeValue(el, payload.workStartDate);
                filled++;
              }
            });
          }
          if (payload.workEndDate) {
            const els = findInputs('input[name*="end" i][name*="job" i], input[name*="end" i][name*="work" i]', ['job end', 'work end', 'employment end'], ['end date', 'end year']);
            els.forEach(el => {
              if (!el.value) {
                setNativeValue(el, payload.workEndDate);
                filled++;
              }
            });
          }
          if (payload.eduStartDate) {
            const els = findInputs('input[name*="start" i][name*="school" i], input[name*="start" i][name*="edu" i]', ['school start', 'education start', 'degree start'], ['start date', 'start year']);
            els.forEach(el => {
              if (!el.value) {
                setNativeValue(el, payload.eduStartDate);
                filled++;
              }
            });
          }
          if (payload.eduEndDate) {
            const els = findInputs('input[name*="end" i][name*="school" i], input[name*="end" i][name*="edu" i], input[name*="grad" i]', ['school end', 'education end', 'graduation', 'degree end'], ['end date', 'end year', 'graduation date']);
            els.forEach(el => {
              if (!el.value) {
                setNativeValue(el, payload.eduEndDate);
                filled++;
              }
            });
          }

          if (filled > 0) {
              sendSuccess(filled);
            }
          } catch(e) {
            sendError(e instanceof Error ? e.message : String(e));
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
      setDebugLogs(prev => [...prev, '[Manual] Triggering autofill injection manually...']);
      webViewRef.current.injectJavaScript(`
        (function() {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message: 'DIAGNOSTIC TEST DIAL SUCCESSFUL' }));
          }
        })();
        true;
      `);
      webViewRef.current.injectJavaScript(cleanJsCodeForInjection(getAutofillJS()));
    } else {
      setDebugLogs(prev => [...prev, `[Manual] Error: webViewRef=${!!webViewRef.current} profileData=${!!profileData}`]);
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

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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

          <TouchableOpacity
            style={[styles.reloadBtn, showDebug && { backgroundColor: '#FEE2E2' }]}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowDebug(!showDebug);
            }}
          >
            {Platform.OS === 'ios' ? (
              <SymbolView name="ladybug" size={18} tintColor={showDebug ? '#EF4444' : '#6B7280'} resizeMode="scaleAspectFit" />
            ) : (
              <Ionicons name="bug-outline" size={20} color={showDebug ? '#EF4444' : '#6B7280'} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* In-App Application WebView */}
      <View style={{ flex: 1 }}>
        <WebView
          ref={webViewRef}
          source={{ uri: jobUrl }}
          onLoadStart={() => {
            setLoading(true);
            setDebugLogs(prev => [...prev, `[WebView] Load started: ${jobUrl}`]);
          }}
          onLoadEnd={() => {
            setLoading(false);
            setDebugLogs(prev => [...prev, '[WebView] Load completed. Scheduling auto-inject in 1200ms...']);
            // Auto-inject fields once page finishes loading
            setTimeout(() => {
              if (webViewRef.current && profileData) {
                setDebugLogs(prev => [...prev, '[WebView] Injecting script automatically...']);
                webViewRef.current.injectJavaScript(cleanJsCodeForInjection(getAutofillJS()));
              } else {
                setDebugLogs(prev => [...prev, `[WebView] Skip auto-inject: webViewRef=${!!webViewRef.current} profileData=${!!profileData}`]);
              }
            }, 1200);
          }}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'AUTOFILL_SUCCESS' && data.count > 0) {
                setAutofillCount(data.count);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setDebugLogs(prev => [...prev, `[Success] Autofilled ${data.count} fields!`]);
              } else if (data.type === 'log') {
                console.log('\x1b[33m[WebView Log]\x1b[0m', data.message);
                setDebugLogs(prev => [...prev, `[Log] ${data.message}`]);
              } else if (data.type === 'AUTOFILL_ERROR') {
                console.log('\x1b[31m[WebView Error]\x1b[0m', data.error);
                setDebugLogs(prev => [...prev, `[Error] ${data.error}`]);
              }
            } catch (e) {
              setDebugLogs(prev => [...prev, `[Parse Error] Failed to parse message: ${e instanceof Error ? e.message : String(e)}`]);
            }
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          injectedJavaScriptForMainFrameOnly={false}
          injectedJavaScript={cleanJsCodeForInjection(getAutofillJS())}
          style={{ flex: 1 }}
        />

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#7C3AED" />
            <Text style={styles.loadingText}>Opening Application Page...</Text>
          </View>
        )}

        {showDebug && (
          <View style={styles.debugPanel}>
            <View style={styles.debugHeader}>
              <Text style={styles.debugTitle}>Debug Logs ({debugLogs.length})</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity onPress={() => setDebugLogs([])}>
                  <Text style={styles.debugActionText}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowDebug(false)}>
                  <Text style={styles.debugActionText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView style={styles.debugScroll} contentContainerStyle={{ padding: 10 }}>
              {debugLogs.length === 0 ? (
                <Text style={styles.debugEmptyText}>No logs captured yet.</Text>
              ) : (
                debugLogs.map((log, idx) => (
                  <Text key={idx} style={[
                    styles.debugLogLine,
                    log.includes('[Error]') && { color: '#EF4444' },
                    log.includes('[Success]') && { color: '#10B981' },
                    log.includes('[Manual]') && { color: '#3B82F6' }
                  ]}>
                    {log}
                  </Text>
                ))
              )}
            </ScrollView>
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
            {resumeBase64 ? (
              <TouchableOpacity
                style={styles.chipBtn}
                onPress={async () => {
                  try {
                    const Sharing = require('expo-sharing');
                    const targetPath = `${FileSystem.documentDirectory}${resumeName || 'resume.pdf'}`;
                    const exists = await FileSystem.getInfoAsync(targetPath);
                    if (!exists.exists) {
                      await FileSystem.writeAsStringAsync(targetPath, resumeBase64, { encoding: 'base64' });
                    }
                    await Sharing.shareAsync(targetPath, {
                      mimeType: 'application/pdf',
                      dialogTitle: 'Save Resume to Files'
                    });
                  } catch (e) {
                    console.log('Error sharing resume:', e);
                  }
                }}
              >
                {Platform.OS === 'ios' ? (
                  <SymbolView name="square.and.arrow.up" size={13} tintColor="#4B5563" resizeMode="scaleAspectFit" />
                ) : (
                  <Ionicons name="share-social-outline" size={13} color="#4B5563" />
                )}
                <Text style={styles.chipText}>Resume</Text>
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
  debugPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    zIndex: 9999,
  },
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  debugTitle: {
    color: '#F9FAFB',
    fontSize: 13,
    fontWeight: '700',
  },
  debugActionText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  debugScroll: {
    flex: 1,
  },
  debugEmptyText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontStyle: 'italic',
  },
  debugLogLine: {
    color: '#D1D5DB',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    marginBottom: 4,
  },
});
