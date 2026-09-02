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

const cleanJsCodeForInjection = (js: string) => js;

export default function ApplyJobScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    url: string;
    title?: string;
    company?: string;
    resumeUri?: string;
    clUri?: string;
  }>();
  const webViewRef = useRef<WebView>(null);

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [autofillCount, setAutofillCount] = useState(0);
  const [resumeBase64, setResumeBase64] = useState<string>('');
  const [resumeName, setResumeName] = useState<string>('');
  const [coverLetterText, setCoverLetterText] = useState<string>('');
  const [coverLetterBase64, setCoverLetterBase64] = useState<string>('');
  const [coverLetterPdfName, setCoverLetterPdfName] = useState<string>('Cover_Letter.pdf');
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

        // 1. Load Resume (Direct param or smart match in resumes.json)
        if (params.resumeUri) {
          try {
            const b64 = await FileSystem.readAsStringAsync(params.resumeUri, { encoding: 'base64' });
            setResumeBase64(b64);
            const pName = params.resumeUri.split('/').pop() || 'resume.pdf';
            setResumeName(pName);
          } catch(e) {}
        } else {
          const resumesPath = `${FileSystem.documentDirectory}resumes.json`;
          const resumesInfo = await FileSystem.getInfoAsync(resumesPath);
          if (resumesInfo.exists) {
            const resumesContent = await FileSystem.readAsStringAsync(resumesPath);
            const parsedResumes = JSON.parse(resumesContent);
            if (Array.isArray(parsedResumes) && parsedResumes.length > 0) {
              const targetCompany = (companyName || '').toLowerCase().trim();
              const targetTitle = (jobTitle || '').toLowerCase().trim();
              const companyWords = targetCompany.split(/[^a-zA-Z0-9]/).filter(w => w.length > 2);
              const titleWords = targetTitle.split(/[^a-zA-Z0-9]/).filter(w => w.length > 2);

              let matchedResume = parsedResumes.find(r => {
                const rComp = (r.companyName || '').toLowerCase();
                const rTitle = (r.jobTitle || '').toLowerCase();
                const rName = (r.name || '').toLowerCase();

                if (targetCompany && rComp && rComp === targetCompany) return true;
                if (targetTitle && rTitle && rTitle === targetTitle) return true;
                if (targetCompany && rName.includes(targetCompany)) return true;
                if (targetTitle && rName.includes(targetTitle)) return true;

                if (companyWords.some(w => rName.includes(w) || rComp.includes(w))) return true;
                if (titleWords.some(w => rName.includes(w) || rTitle.includes(w))) return true;

                return false;
              });

              if (!matchedResume) {
                matchedResume = parsedResumes.find(r => r.isDefault) || parsedResumes[0];
              }

              if (matchedResume && matchedResume.uri) {
                const fileBase64 = await FileSystem.readAsStringAsync(matchedResume.uri, { encoding: 'base64' });
                setResumeBase64(fileBase64);
                setResumeName(matchedResume.name || 'resume.pdf');
              }
            }
          }
        }

        // 2. Load Cover Letter (Direct param or smart match in cover_letters.json)
        if (params.clUri) {
          try {
            const clB64 = await FileSystem.readAsStringAsync(params.clUri, { encoding: 'base64' });
            setCoverLetterBase64(clB64);
            const cName = params.clUri.split('/').pop() || 'Cover_Letter.pdf';
            setCoverLetterPdfName(cName);
          } catch(e) {}
        }

        const coverLettersPath = `${FileSystem.documentDirectory}cover_letters.json`;
        const coverLettersInfo = await FileSystem.getInfoAsync(coverLettersPath);
        if (coverLettersInfo.exists) {
          const clContent = await FileSystem.readAsStringAsync(coverLettersPath);
          const parsedCLs = JSON.parse(clContent);
          if (Array.isArray(parsedCLs) && parsedCLs.length > 0) {
            const targetCompany = (companyName || '').toLowerCase().trim();
            const targetTitle = (jobTitle || '').toLowerCase().trim();
            const companyWords = targetCompany.split(/[^a-zA-Z0-9]/).filter(w => w.length > 2);
            const titleWords = targetTitle.split(/[^a-zA-Z0-9]/).filter(w => w.length > 2);

            let matchedCL = parsedCLs.find(cl => {
              const cComp = (cl.company || '').toLowerCase();
              const cTitle = (cl.jobTitle || '').toLowerCase();

              if (targetCompany && cComp && cComp === targetCompany) return true;
              if (targetTitle && cTitle && cTitle === targetTitle) return true;
              if (companyWords.some(w => cComp.includes(w))) return true;
              if (titleWords.some(w => cTitle.includes(w))) return true;

              return false;
            });

            if (!matchedCL) {
              matchedCL = parsedCLs[0];
            }

            if (matchedCL) {
              if (matchedCL.coverLetterText) {
                setCoverLetterText(matchedCL.coverLetterText);
              }
              if (matchedCL.pdfUri && !params.clUri) {
                try {
                  const b64 = await FileSystem.readAsStringAsync(matchedCL.pdfUri, { encoding: 'base64' });
                  setCoverLetterBase64(b64);
                  if (matchedCL.pdfName) setCoverLetterPdfName(matchedCL.pdfName);
                } catch(e) {}
              }
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

    const fullNameCombined = (profileData.fullName || profileData.name || profileData.userName || '').trim();
    const nameParts = fullNameCombined ? fullNameCombined.split(' ') : [];
    const extractedFirstName = profileData.firstName || profileData.givenName || (nameParts.length > 0 ? nameParts[0] : '');
    const extractedLastName = profileData.lastName || profileData.familyName || profileData.surname || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');

    const payload = {
      firstName: (extractedFirstName || '').trim(),
      lastName: (extractedLastName || '').trim(),
      email: (profileData.email || profileData.emailAddress || profileData.contactEmail || '').trim(),
      phone: (profileData.phone || profileData.phoneNumber || profileData.mobile || profileData.cell || profileData.telephone || '').trim(),
      linkedinUrl: (profileData.linkedinUrl || profileData.linkedin || profileData.linkedIn || '').trim(),
      portfolioUrl: (profileData.portfolioUrl || profileData.portfolio || profileData.website || profileData.url || '').trim(),
      city: (profileData.city || profileData.location || profileData.address || '').trim(),
      country: (profileData.country || 'United States').trim(),
      resumeBase64: (resumeBase64 || '').trim(),
      resumeName: (resumeName || 'resume.pdf').trim(),
      coverLetterText: (coverLetterText || '').trim(),
      coverLetterBase64: (coverLetterBase64 || '').trim(),
      coverLetterPdfName: (coverLetterPdfName || 'Cover_Letter.pdf').trim(),
      currentJobTitle: (currentExp?.jobTitle || profileData.jobTitle || profileData.role || '').trim(),
      currentEmployer: (currentExp?.companyName || profileData.companyName || '').trim(),
      workStartDate: (currentExp?.startDate || '').trim(),
      workEndDate: (currentExp?.endDate || '').trim(),
      educationSchool: (currentEdu?.schoolName || profileData.schoolName || '').trim(),
      degree: (currentEdu?.degree || profileData.degree || '').trim(),
      discipline: (currentEdu?.fieldOfStudy || currentEdu?.degree || '').trim(),
      eduStartDate: (currentEdu?.startDate || '').trim(),
      eduEndDate: (currentEdu?.endDate || '').trim(),
    };

    const payloadStr = encodeURIComponent(JSON.stringify(payload));
    return `
      (function() {
        if (window.__autofillRan && window.__runAutofill) {
          window.__runAutofill();
          return;
        }
        window.__autofillRan = true;

        const payload = JSON.parse(decodeURIComponent("${payloadStr}"));
        let attempts = 0;

        function base64ToBlob(b64Data, contentType) {
          contentType = contentType || 'application/pdf';
          try {
            const byteCharacters = atob(b64Data);
            const byteArrays = [];
            for (let offset = 0; offset < byteCharacters.length; offset += 512) {
              const slice = byteCharacters.slice(offset, offset + 512);
              const byteNumbers = new Array(slice.length);
              for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
              }
              byteArrays.push(new Uint8Array(byteNumbers));
            }
            return new Blob(byteArrays, { type: contentType });
          } catch(e) {
            return null;
          }
        }

        function postMsg(msgObj) {
          try {
            const str = JSON.stringify(msgObj);
            if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(str);
            if (window.parent && window.parent !== window) window.parent.postMessage(str, '*');
          } catch (e) {}
        }

        function sendLog(msg) { postMsg({ type: 'log', message: msg }); }
        function sendSuccess(count) { postMsg({ type: 'AUTOFILL_SUCCESS', count: count }); }
        function sendError(err) { postMsg({ type: 'AUTOFILL_ERROR', error: String(err) }); }

        if (window === window.top && !window.__hasAutofillProxy) {
          window.__hasAutofillProxy = true;
          window.addEventListener('message', function(e) {
            try {
              if (window.ReactNativeWebView && typeof e.data === 'string') {
                const parsed = JSON.parse(e.data);
                if (parsed.type === 'log' || parsed.type === 'AUTOFILL_SUCCESS' || parsed.type === 'AUTOFILL_ERROR') {
                  window.ReactNativeWebView.postMessage(e.data);
                }
              }
            } catch (err) {}
          });
        }

        function setNativeValue(el, val) {
          if (!el || !val) return;
          if (el.tagName === 'SELECT') {
            const opts = Array.from(el.options || []);
            const vLower = String(val).toLowerCase();
            const match = opts.find(o => (o.value || '').toLowerCase() === vLower || (o.text || '').toLowerCase().includes(vLower));
            if (match) {
              el.value = match.value;
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }
            return;
          }
          try {
            const proto = Object.getPrototypeOf(el);
            const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set || Object.getOwnPropertyDescriptor(el, 'value')?.set;
            if (setter) setter.call(el, val);
            else el.value = val;
          } catch (e) {
            el.value = val;
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.blur();
        }

        function findInputs(doc, selectors, keywords) {
          const set = new Set();
          if (!doc) return [];
          if (selectors) {
            try {
              doc.querySelectorAll(selectors).forEach(e => {
                if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.tagName)) set.add(e);
              });
            } catch(e) {}
          }
          if (keywords && keywords.length > 0) {
            try {
              doc.querySelectorAll('label').forEach(lbl => {
                const txt = (lbl.innerText || lbl.textContent || '').toLowerCase();
                if (keywords.some(k => txt.includes(k))) {
                  const htmlFor = lbl.getAttribute('for');
                  if (htmlFor) {
                    const el = doc.getElementById(htmlFor);
                    if (el) set.add(el);
                  }
                  const child = lbl.querySelector('input, textarea, select');
                  if (child) set.add(child);
                  let sib = lbl.nextElementSibling;
                  if (sib) {
                    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(sib.tagName)) set.add(sib);
                    else {
                      const c = sib.querySelector('input, textarea, select');
                      if (c) set.add(c);
                    }
                  }
                }
              });
            } catch(e) {}
            try {
              doc.querySelectorAll('input, textarea, select').forEach(e => {
                const attr = ((e.getAttribute('name')||'') + ' ' + (e.getAttribute('id')||'') + ' ' + (e.getAttribute('placeholder')||'') + ' ' + (e.getAttribute('autocomplete')||'') + ' ' + (e.getAttribute('aria-label')||'')).toLowerCase();
                if (keywords.some(k => attr.includes(k))) set.add(e);
              });
            } catch(e) {}
          }
          return Array.from(set);
        }

        function runAutofill() {
          attempts++;
          try {
            const host = window.location.host;
            const isATS = host.includes('greenhouse.io') || host.includes('lever.co');
            
            if (!isATS) {
              const iframes = Array.from(document.querySelectorAll('iframe'));
              for (let i = 0; i < iframes.length; i++) {
                const iframe = iframes[i];
                const src = iframe.src || '';
                if (src && (src.includes('greenhouse.io') || src.includes('lever.co') || src.includes('gh_jid'))) {
                  if (!window.location.href.includes('embed/job_app')) {
                    sendLog('Found ATS iframe on ' + host + '. Redirecting top window to: ' + src);
                    try { window.top.location.href = src; } catch(e) { window.location.href = src; }
                    return;
                  }
                }
              }
            }

            let filled = 0;
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
              if (ghCLFile && (payload.coverLetterBase64 || payload.coverLetterText) && (!ghCLFile.files || !ghCLFile.files.length)) {
                try {
                  let blob = null;
                  let fileName = payload.coverLetterPdfName || 'Cover_Letter.pdf';
                  let mimeType = 'application/pdf';

                  if (payload.coverLetterBase64) {
                    blob = base64ToBlob(payload.coverLetterBase64, 'application/pdf');
                  }
                  if (!blob && payload.coverLetterText) {
                    blob = new Blob([payload.coverLetterText], { type: 'text/plain' });
                    fileName = 'Cover_Letter.txt';
                    mimeType = 'text/plain';
                  }

                  if (blob) {
                    const file = new File([blob], fileName, { type: mimeType });
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
                  }
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
              if (leverCLFile && (payload.coverLetterBase64 || payload.coverLetterText) && (!leverCLFile.files || !leverCLFile.files.length)) {
                try {
                  let blob = null;
                  let fileName = payload.coverLetterPdfName || 'Cover_Letter.pdf';
                  let mimeType = 'application/pdf';

                  if (payload.coverLetterBase64) {
                    blob = base64ToBlob(payload.coverLetterBase64, 'application/pdf');
                  }
                  if (!blob && payload.coverLetterText) {
                    blob = new Blob([payload.coverLetterText], { type: 'text/plain' });
                    fileName = 'Cover_Letter.txt';
                    mimeType = 'text/plain';
                  }

                  if (blob) {
                    const file = new File([blob], fileName, { type: mimeType });
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
                  }
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

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://188.166.164.115:3030';
  const [isAutofilling, setIsAutofilling] = useState(false);

  const handleTriggerAutofill = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (webViewRef.current && profileData) {
      setIsAutofilling(true);
      const experiences = profileData.workExperiences || profileData.experiences || [];
      const currentExp = experiences.length > 0 ? experiences[0] : null;

      const educations = profileData.educations || profileData.education || [];
      const currentEdu = educations.length > 0 ? educations[0] : null;

      const fn = (profileData.firstName || '').trim();
      const ln = (profileData.lastName || '').trim();
      const full = `${fn} ${ln}`.trim();
      const em = (profileData.email || profileData.emailAddress || '').trim();
      const ph = (profileData.phone || profileData.phoneNumber || '').trim();
      const li = (profileData.linkedinUrl || profileData.linkedin || '').trim();
      const po = (profileData.portfolioUrl || profileData.portfolio || '').trim();
      const ci = (profileData.city || profileData.location || '').trim();

      const sch = (currentEdu?.schoolName || profileData.schoolName || '').trim();
      const deg = (currentEdu?.degree || profileData.degree || '').trim();
      const dis = (currentEdu?.fieldOfStudy || currentEdu?.degree || profileData.discipline || '').trim();
      const edStart = (currentEdu?.startDate || '').trim();
      const edEnd = (currentEdu?.endDate || '').trim();

      const emp = (currentExp?.companyName || profileData.companyName || '').trim();
      const tit = (currentExp?.jobTitle || profileData.jobTitle || profileData.role || '').trim();
      const wkStart = (currentExp?.startDate || '').trim();
      const wkEnd = (currentExp?.endDate || '').trim();

      const gen = (profileData.gender || profileData.sex || '').trim();
      const race = (profileData.race || profileData.ethnicity || '').trim();
      const vet = (profileData.veteranStatus || profileData.veteran || '').trim();
      const disab = (profileData.disabilityStatus || profileData.disability || '').trim();

      setDebugLogs(prev => [...prev, `[Purple Button] Instant autofill script injecting: fn="${fn}" em="${em}"`]);

      const purpleJs = `
        (function() {
          function setVal(el, v) {
            if (!el || !v) return;
            try {
              const proto = Object.getPrototypeOf(el);
              const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set || Object.getOwnPropertyDescriptor(el, 'value')?.set;
              if (setter) setter.call(el, v); else el.value = v;
            } catch(e) { el.value = v; }
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }

          const docs = [document];
          document.querySelectorAll('iframe').forEach(f => {
            try { if (f.contentDocument) docs.push(f.contentDocument); } catch(e) {}
          });

          docs.forEach(doc => {
            if ("${fn}") {
              doc.querySelectorAll('input[name*="first" i], input[id*="first" i], input[autocomplete="given-name"]').forEach(e => setVal(e, "${fn}"));
            }
            if ("${ln}") {
              doc.querySelectorAll('input[name*="last" i], input[id*="last" i], input[autocomplete="family-name"]').forEach(e => setVal(e, "${ln}"));
            }
            if ("${full}") {
              doc.querySelectorAll('input[name="name" i], input[id="name" i]').forEach(e => setVal(e, "${full}"));
            }
            if ("${em}") {
              doc.querySelectorAll('input[type="email" i], input[name*="email" i], input[id*="email" i]').forEach(e => setVal(e, "${em}"));
            }
            if ("${ph}") {
              doc.querySelectorAll('input[type="tel" i], input[name*="phone" i], input[id*="phone" i], input[name*="mobile" i]').forEach(e => setVal(e, "${ph}"));
            }
            if ("${li}") {
              doc.querySelectorAll('input[name*="linkedin" i], input[id*="linkedin" i]').forEach(e => setVal(e, "${li}"));
            }
            if ("${po}") {
              doc.querySelectorAll('input[name*="website" i], input[name*="portfolio" i], input[id*="website" i]').forEach(e => setVal(e, "${po}"));
            }
            if ("${ci}") {
              doc.querySelectorAll('input[name*="city" i], input[id*="city" i], input[name*="location" i]').forEach(e => setVal(e, "${ci}"));
            }
            // School / University
            if ("${sch}") {
              doc.querySelectorAll('input[name*="school" i], input[name*="university" i], input[id*="school" i]').forEach(e => setVal(e, "${sch}"));
            }
            // Degree
            if ("${deg}") {
              doc.querySelectorAll('input[name*="degree" i], input[id*="degree" i]').forEach(e => setVal(e, "${deg}"));
            }
            // Discipline / Field of Study
            if ("${dis}") {
              doc.querySelectorAll('input[name*="discipline" i], input[name*="major" i], input[name*="field" i]').forEach(e => setVal(e, "${dis}"));
            }
            // Edu Start Date
            if ("${edStart}") {
              doc.querySelectorAll('input[name*="start" i][name*="school" i], input[name*="start" i][name*="edu" i]').forEach(e => setVal(e, "${edStart}"));
            }
            // Edu End Date
            if ("${edEnd}") {
              doc.querySelectorAll('input[name*="end" i][name*="school" i], input[name*="end" i][name*="edu" i], input[name*="grad" i]').forEach(e => setVal(e, "${edEnd}"));
            }
            // Current Employer
            if ("${emp}") {
              doc.querySelectorAll('input[name*="company" i], input[name*="employer" i], input[id*="company" i], input[name*="org" i]').forEach(e => setVal(e, "${emp}"));
            }
            // Current Job Title
            if ("${tit}") {
              doc.querySelectorAll('input[name*="title" i], input[id*="title" i], input[name*="position" i]').forEach(e => setVal(e, "${tit}"));
            }
            // Work Start Date
            if ("${wkStart}") {
              doc.querySelectorAll('input[name*="start" i][name*="work" i], input[name*="start" i][name*="job" i]').forEach(e => setVal(e, "${wkStart}"));
            }
            // Work End Date
            if ("${wkEnd}") {
              doc.querySelectorAll('input[name*="end" i][name*="work" i], input[name*="end" i][name*="job" i]').forEach(e => setVal(e, "${wkEnd}"));
            }
            // Gender
            if ("${gen}") {
              const gVal = "${gen}".toLowerCase();
              doc.querySelectorAll('select[name*="gender" i], select[id*="gender" i], select[name*="sex" i]').forEach(s => {
                const opts = Array.from(s.options || []);
                const match = opts.find(o => (o.value || '').toLowerCase().includes(gVal) || (o.text || '').toLowerCase().includes(gVal));
                if (match) { s.value = match.value; s.dispatchEvent(new Event('change', { bubbles: true })); }
              });
            }
            // Race / Ethnicity
            if ("${race}") {
              const rVal = "${race}".toLowerCase();
              doc.querySelectorAll('select[name*="race" i], select[name*="ethnicity" i], select[id*="race" i]').forEach(s => {
                const opts = Array.from(s.options || []);
                const match = opts.find(o => (o.value || '').toLowerCase().includes(rVal) || (o.text || '').toLowerCase().includes(rVal));
                if (match) { s.value = match.value; s.dispatchEvent(new Event('change', { bubbles: true })); }
              });
            }
            // Veteran Status
            if ("${vet}") {
              const vVal = "${vet}".toLowerCase();
              doc.querySelectorAll('select[name*="veteran" i], select[id*="veteran" i]').forEach(s => {
                const opts = Array.from(s.options || []);
                const match = opts.find(o => (o.value || '').toLowerCase().includes(vVal) || (o.text || '').toLowerCase().includes(vVal));
                if (match) { s.value = match.value; s.dispatchEvent(new Event('change', { bubbles: true })); }
              });
            }
            // Disability Status
            if ("${disab}") {
              const dVal = "${disab}".toLowerCase();
              doc.querySelectorAll('select[name*="disability" i], select[id*="disability" i]').forEach(s => {
                const opts = Array.from(s.options || []);
                const match = opts.find(o => (o.value || '').toLowerCase().includes(dVal) || (o.text || '').toLowerCase().includes(dVal));
                if (match) { s.value = match.value; s.dispatchEvent(new Event('change', { bubbles: true })); }
              });
            }

            // Cover Letter Text Autofill
            const clRawText = "${(coverLetterText || '').trim().replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}";
            if (clRawText) {
              doc.querySelectorAll('textarea#cover_letter_text, textarea[name*="cover" i], textarea[id*="cover" i], textarea[name="comments"], textarea[name*="additional" i]').forEach(ta => {
                if (!ta.value) {
                  setVal(ta, clRawText);
                }
              });
            }

            // Cover Letter File Auto-Attachment (PDF first, fallback TXT)
            const clPdfB64 = "${(coverLetterBase64 || '').trim()}";
            const clPdfName = "${(coverLetterPdfName || 'Cover_Letter.pdf').trim()}";
            if (clPdfB64 || clRawText) {
              try {
                const attachCLInput = function(inp, fileObj) {
                  const dtCL = new DataTransfer();
                  dtCL.items.add(fileObj);
                  try {
                    const prototypeFilesSetter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(inp), 'files')?.set;
                    if (prototypeFilesSetter) prototypeFilesSetter.call(inp, dtCL.files);
                    else inp.files = dtCL.files;
                  } catch(e) { inp.files = dtCL.files; }
                  inp.dispatchEvent(new Event('change', { bubbles: true }));
                  inp.dispatchEvent(new Event('input', { bubbles: true }));
                };

                doc.querySelectorAll('input[type="file"][name*="cover" i], input[type="file"][id*="cover" i]').forEach(inp => {
                  if (!inp.files || !inp.files.length) {
                    if (clPdfB64) {
                      fetch("data:application/pdf;base64," + clPdfB64)
                        .then(r => r.blob())
                        .then(blob => {
                          if (blob) {
                            const clFile = new File([blob], clPdfName, { type: 'application/pdf' });
                            attachCLInput(inp, clFile);
                          }
                        }).catch(function(){});
                    } else if (clRawText) {
                      const clBlob = new Blob([clRawText], { type: 'text/plain' });
                      const clFile = new File([clBlob], 'Cover_Letter.txt', { type: 'text/plain' });
                      attachCLInput(inp, clFile);
                    }
                  }
                });
              } catch(e) {}
            }

            // Instant PDF Resume Auto-Attachment via WebKit DOM Blob
            if ("${(resumeBase64 || '').trim()}") {
              try {
                fetch("data:application/pdf;base64," + "${(resumeBase64 || '').trim()}")
                  .then(r => r.blob())
                  .then(blob => {
                    if (blob) {
                      const resFile = new File([blob], "${(resumeName || 'Resume.pdf').trim()}", { type: 'application/pdf' });
                      const dt = new DataTransfer();
                      dt.items.add(resFile);
                      doc.querySelectorAll('input[type="file"]').forEach(inp => {
                        const n = (inp.name || inp.id || '').toLowerCase();
                        if (n.includes('resume') || n.includes('cv') || (!n.includes('cover') && !inp.files.length)) {
                          try {
                            const prototypeFilesSetter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(inp), 'files')?.set;
                            if (prototypeFilesSetter) prototypeFilesSetter.call(inp, dt.files);
                            else inp.files = dt.files;
                          } catch(e) { inp.files = dt.files; }
                          inp.dispatchEvent(new Event('change', { bubbles: true }));
                          inp.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                      });
                    }
                  }).catch(function(){});
              } catch(e) {}
            }
          });
        })();
        true;
      `;

      webViewRef.current.injectJavaScript(cleanJsCodeForInjection(purpleJs));
      setTimeout(() => {
        setIsAutofilling(false);
      }, 2000);
    } else {
      setIsAutofilling(false);
      setDebugLogs(prev => [...prev, `[Manual] Error: webViewRef=${!!webViewRef.current} profileData=${!!profileData}`]);
      Alert.alert('Profile Empty', 'Please complete your onboarding profile first to use 1-Click Autofill.');
    }
  };

  const handleInjectSingleField = (fieldName: 'name' | 'email' | 'phone', val: string, label: string) => {
    Haptics.selectionAsync();
    if (val) {
      Clipboard.setStringAsync(val);
    }
    if (webViewRef.current && profileData) {
      setDebugLogs(prev => [...prev, `[1-Tap Fill] Injecting ${label}: "${val}"`]);
      const fn = (profileData.firstName || '').trim();
      const ln = (profileData.lastName || '').trim();
      const full = `${fn} ${ln}`.trim();
      const em = (profileData.email || '').trim();
      const ph = (profileData.phone || profileData.phoneNumber || '').trim();

      let singleJs = '';
      if (fieldName === 'name') {
        singleJs = `
          (function() {
            function setVal(el, v) {
              if (!el || !v) return;
              try {
                const proto = Object.getPrototypeOf(el);
                const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set || Object.getOwnPropertyDescriptor(el, 'value')?.set;
                if (setter) setter.call(el, v); else el.value = v;
              } catch(e) { el.value = v; }
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }
            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) { setVal(active, "${full}"); }
            document.querySelectorAll('input[name*="first" i], input[id*="first" i], input[autocomplete="given-name"]').forEach(e => setVal(e, "${fn}"));
            document.querySelectorAll('input[name*="last" i], input[id*="last" i], input[autocomplete="family-name"]').forEach(e => setVal(e, "${ln}"));
            document.querySelectorAll('input[name="name" i], input[id="name" i]').forEach(e => setVal(e, "${full}"));
          })();
          true;
        `;
      } else if (fieldName === 'email') {
        singleJs = `
          (function() {
            function setVal(el, v) {
              if (!el || !v) return;
              try {
                const proto = Object.getPrototypeOf(el);
                const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set || Object.getOwnPropertyDescriptor(el, 'value')?.set;
                if (setter) setter.call(el, v); else el.value = v;
              } catch(e) { el.value = v; }
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }
            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) { setVal(active, "${em}"); }
            document.querySelectorAll('input[type="email" i], input[name*="email" i], input[id*="email" i]').forEach(e => setVal(e, "${em}"));
          })();
          true;
        `;
      } else if (fieldName === 'phone') {
        singleJs = `
          (function() {
            function setVal(el, v) {
              if (!el || !v) return;
              try {
                const proto = Object.getPrototypeOf(el);
                const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set || Object.getOwnPropertyDescriptor(el, 'value')?.set;
                if (setter) setter.call(el, v); else el.value = v;
              } catch(e) { el.value = v; }
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }
            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) { setVal(active, "${ph}"); }
            document.querySelectorAll('input[type="tel" i], input[name*="phone" i], input[id*="phone" i], input[name*="mobile" i]').forEach(e => setVal(e, "${ph}"));
          })();
          true;
        `;
      }

      if (singleJs) {
        webViewRef.current.injectJavaScript(cleanJsCodeForInjection(singleJs));
      }
    }
  };
  const getDirectAtsUrl = (url: string) => {
    if (!url) return url;
    const ghJidMatch = url.match(/gh_jid=([0-9]+)/i);
    if (ghJidMatch && ghJidMatch[1]) {
      return `https://boards.greenhouse.io/embed/job_app?token=${ghJidMatch[1]}`;
    }
    return url;
  };

  const targetUri = getDirectAtsUrl(jobUrl);

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close-outline" size={24} color="#374151" />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle} numberOfLines={1}>{jobTitle || 'Job Application'}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{companyName || 'Company'}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity style={styles.reloadBtn} onPress={() => webViewRef.current?.reload()}>
            <Ionicons name="reload-outline" size={18} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.reloadBtn, showDebug && { backgroundColor: '#FEE2E2' }]} 
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
          source={{ uri: targetUri }}
          onLoadStart={() => {
            setLoading(true);
            setDebugLogs(prev => [...prev, `[WebView] Load started: ${targetUri}`]);
          }}
          onLoadEnd={() => {
            setLoading(false);
            setDebugLogs(prev => [...prev, '[WebView] Page loaded. Tap "1-Click Autofill Form" button to fill fields.']);
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
          setSupportMultipleWindows={false}
          onShouldStartLoadWithRequest={() => true}
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
          style={[styles.autofillBtn, isAutofilling && { opacity: 0.85 }]}
          activeOpacity={0.85}
          disabled={isAutofilling}
          onPress={handleTriggerAutofill}
        >
          {isAutofilling ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.autofillBtnText}>Attaching Resume & Filling...</Text>
            </>
          ) : (
            <>
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
            </>
          )}
        </TouchableOpacity>

        {/* Quick Copy Chips */}
        {profileData && (
          <View style={styles.quickChipsRow}>
            {profileData.email ? (
              <TouchableOpacity
                style={styles.chipBtn}
                onPress={() => handleInjectSingleField('email', profileData.email, 'Email')}
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
                onPress={() => handleInjectSingleField('phone', profileData.phone, 'Phone')}
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
                onPress={() => handleInjectSingleField('name', `${profileData.firstName} ${profileData.lastName || ''}`, 'Name')}
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
