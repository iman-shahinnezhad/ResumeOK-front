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

import { API_URL, useAuth } from '../context/AuthContext';

const cleanJsCodeForInjection = (js: string) => js;

async function fetchBase64FromUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        if (dataUrl && dataUrl.includes(',')) {
          resolve(dataUrl.split(',')[1]);
        } else {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.log('Failed to fetch base64 from server url:', url, e);
    return null;
  }
}

export default function ApplyJobScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, guestId } = useAuth();
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

  const jobUrl = params.url || 'https://google.com';
  const jobTitle = params.title || 'Job Application';
  const companyName = params.company || '';

  // Load User Profile Data & Server PDF Files for Form Filling
  useEffect(() => {
    async function loadProfile() {
      try {
        const path = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
        const info = await FileSystem.getInfoAsync(path);
        if (info.exists) {
          const content = await FileSystem.readAsStringAsync(path);
          setProfileData(JSON.parse(content));
        }

        const targetUserId = user?.id || guestId;

        // 1. PRIMARY: Fetch user resumes & cover letters directly from MongoDB Backend Server
        if (targetUserId) {
          try {
            const serverRes = await fetch(`${API_URL}/api/user/${targetUserId}/documents`);
            if (serverRes.ok) {
              const serverData = await serverRes.json();
              if (serverData.success) {
                const targetCompany = (companyName || '').toLowerCase().trim();
                const targetTitle = (jobTitle || '').toLowerCase().trim();
                const companyWords = targetCompany.split(/[^a-zA-Z0-9]/).filter(w => w.length > 2);
                const titleWords = targetTitle.split(/[^a-zA-Z0-9]/).filter(w => w.length > 2);

                // A. Match tailored resume from backend MongoDB
                const serverResumes = serverData.resumes || [];
                let matchedServerRes = serverResumes.find((r: any) => {
                  const rComp = (r.companyName || '').toLowerCase();
                  const rTitle = (r.jobTitle || '').toLowerCase();
                  const rName = (r.fileName || '').toLowerCase();

                  if (targetCompany && rComp && rComp === targetCompany) return true;
                  if (targetTitle && rTitle && rTitle === targetTitle) return true;
                  if (targetCompany && rName.includes(targetCompany)) return true;
                  if (targetTitle && rName.includes(targetTitle)) return true;

                  if (companyWords.some(w => rName.includes(w) || rComp.includes(w))) return true;
                  if (titleWords.some(w => rName.includes(w) || rTitle.includes(w))) return true;

                  return false;
                });

                if (!matchedServerRes && serverResumes.length > 0) {
                  matchedServerRes = serverResumes.find((r: any) => r.isDefault) || serverResumes[serverResumes.length - 1];
                }

                if (matchedServerRes && matchedServerRes.url) {
                  const b64 = await fetchBase64FromUrl(matchedServerRes.url);
                  if (b64) {
                    setResumeBase64(b64);
                    setResumeName(matchedServerRes.fileName || 'resume.pdf');
                  }
                }

                // B. Match tailored cover letter from backend MongoDB
                const serverCLs = serverData.coverLetters || [];
                let matchedServerCL = serverCLs.find((cl: any) => {
                  const cComp = (cl.companyName || '').toLowerCase();
                  const cTitle = (cl.jobTitle || '').toLowerCase();
                  const cName = (cl.fileName || '').toLowerCase();

                  if (targetCompany && cComp && cComp === targetCompany) return true;
                  if (targetTitle && cTitle && cTitle === targetTitle) return true;
                  if (companyWords.some(w => cName.includes(w) || cComp.includes(w))) return true;
                  if (titleWords.some(w => cName.includes(w) || cTitle.includes(w))) return true;

                  return false;
                });

                if (!matchedServerCL && serverCLs.length > 0) {
                  matchedServerCL = serverCLs[serverCLs.length - 1];
                }

                if (matchedServerCL) {
                  if (matchedServerCL.coverLetterText) {
                    setCoverLetterText(matchedServerCL.coverLetterText);
                  }
                  if (matchedServerCL.url) {
                    const clB64 = await fetchBase64FromUrl(matchedServerCL.url);
                    if (clB64) {
                      setCoverLetterBase64(clB64);
                      setCoverLetterPdfName(matchedServerCL.fileName || 'Cover_Letter.pdf');
                    }
                  }
                }
              }
            }
          } catch (serverErr) {
            console.log('Error fetching user documents from MongoDB backend:', serverErr);
          }
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

              let loadedB64 = '';
              let loadedName = 'resume.pdf';

              if (matchedResume && matchedResume.uri) {
                try {
                  const fInfo = await FileSystem.getInfoAsync(matchedResume.uri);
                  if (fInfo.exists) {
                    loadedB64 = await FileSystem.readAsStringAsync(matchedResume.uri, { encoding: 'base64' });
                    loadedName = matchedResume.name || 'resume.pdf';
                  }
                } catch (e) {}
              }

              // Fallback to default or first valid resume if matched resume couldn't be read
              if (!loadedB64) {
                for (const r of parsedResumes) {
                  if (r && r.uri) {
                    try {
                      const fInfo = await FileSystem.getInfoAsync(r.uri);
                      if (fInfo.exists) {
                        loadedB64 = await FileSystem.readAsStringAsync(r.uri, { encoding: 'base64' });
                        loadedName = r.name || 'resume.pdf';
                        break;
                      }
                    } catch (e) {}
                  }
                }
              }

              if (loadedB64) {
                setResumeBase64(loadedB64);
                setResumeName(loadedName);
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

            let loadedCLB64 = '';
            let loadedCLName = 'Cover_Letter.pdf';
            let loadedCLText = '';

            if (matchedCL) {
              if (matchedCL.coverLetterText) {
                loadedCLText = matchedCL.coverLetterText;
              }
              if (matchedCL.pdfUri && !params.clUri) {
                try {
                  const fInfo = await FileSystem.getInfoAsync(matchedCL.pdfUri);
                  if (fInfo.exists) {
                    loadedCLB64 = await FileSystem.readAsStringAsync(matchedCL.pdfUri, { encoding: 'base64' });
                    loadedCLName = matchedCL.pdfName || 'Cover_Letter.pdf';
                  }
                } catch(e) {}
              }
            }

            if (!loadedCLB64 && !loadedCLText) {
              for (const cl of parsedCLs) {
                if (cl) {
                  if (cl.coverLetterText && !loadedCLText) loadedCLText = cl.coverLetterText;
                  if (cl.pdfUri && !loadedCLB64 && !params.clUri) {
                    try {
                      const fInfo = await FileSystem.getInfoAsync(cl.pdfUri);
                      if (fInfo.exists) {
                        loadedCLB64 = await FileSystem.readAsStringAsync(cl.pdfUri, { encoding: 'base64' });
                        loadedCLName = cl.pdfName || 'Cover_Letter.pdf';
                        break;
                      }
                    } catch(e) {}
                  }
                }
              }
            }

            if (loadedCLText) setCoverLetterText(loadedCLText);
            if (loadedCLB64) {
              setCoverLetterBase64(loadedCLB64);
              setCoverLetterPdfName(loadedCLName);
            }
          }
        }
      } catch (err) {
        console.log('Error loading profile for autofill:', err);
      }
    }
    loadProfile();
  }, [companyName, jobTitle]);

  // Auto-inject when profile or base64 files finish loading asynchronously
  useEffect(() => {
    if (profileData && webViewRef.current) {
      const js = getAutofillJS();
      if (js) {
        webViewRef.current.injectJavaScript(cleanJsCodeForInjection(js));
      }
    }
  }, [profileData, resumeBase64, coverLetterBase64, coverLetterText]);

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

    const skillsList = Array.isArray(profileData.skills) ? profileData.skills : [];
    const toolsList = Array.isArray(profileData.tools) ? profileData.tools : (profileData.technicalSkills || []);
    const languagesList = (profileData.languages || []).map((l: any) => typeof l === 'string' ? l : l.name || '').filter(Boolean);
    const projectsList = profileData.projects || [];
    const formattedProjectsText = projectsList.map((p: any) => (p.projectName || p.name || '') + (p.description ? ': ' + p.description : '')).filter(Boolean).join('\n');

    const payload = {
      firstName: (extractedFirstName || '').trim(),
      lastName: (extractedLastName || '').trim(),
      fullName: (fullNameCombined || '').trim(),
      email: (profileData.email || profileData.emailAddress || profileData.contactEmail || '').trim(),
      phone: (profileData.phone || profileData.phoneNumber || profileData.mobile || profileData.cell || profileData.telephone || profileData.phone_number || profileData.contactPhone || '').trim(),
      gender: (profileData.gender || profileData.sex || 'Male').trim(),
      ethnicity: (profileData.ethnicity || profileData.race || '').trim(),
      disability: (profileData.disability || profileData.disabilityStatus || '').trim(),
      citizenship: (profileData.citizenship || profileData.workAuthorization || profileData.visaStatus || '').trim(),
      dob: (profileData.dob || profileData.dateOfBirth || '').trim(),
      linkedinUrl: (profileData.linkedinUrl || profileData.linkedin || profileData.linkedIn || '').trim(),
      githubUrl: (profileData.githubUrl || profileData.github || '').trim(),
      portfolioUrl: (profileData.portfolioUrl || profileData.portfolio || profileData.website || profileData.url || '').trim(),
      city: (profileData.city || profileData.location || profileData.address || '').trim(),
      country: (profileData.country || profileData.countryName || profileData.nationality || 'United States').trim(),
      summary: (profileData.summary || profileData.bio || '').trim(),
      skills: skillsList.join(', '),
      tools: toolsList.join(', '),
      languages: languagesList.join(', '),
      projects: formattedProjectsText,
      resumeBase64: (resumeBase64 || '').trim(),
      resumeName: (resumeName || 'resume.pdf').trim(),
      coverLetterText: (coverLetterText || '').trim(),
      coverLetterBase64: (coverLetterBase64 || '').trim(),
      coverLetterPdfName: (coverLetterPdfName || 'Cover_Letter.pdf').trim(),
      currentJobTitle: (currentExp?.jobTitle || profileData.jobTitle || profileData.role || '').trim(),
      currentEmployer: (currentExp?.companyName || profileData.companyName || '').trim(),
      workStartDate: (currentExp?.startDate || '').trim(),
      workEndDate: (currentExp?.endDate || '').trim(),
      workDescription: (currentExp?.description || currentExp?.jobDescription || '').trim(),
      educationSchool: (currentEdu?.schoolName || profileData.schoolName || '').trim(),
      degree: (currentEdu?.degree || profileData.degree || '').trim(),
      discipline: (currentEdu?.fieldOfStudy || currentEdu?.degree || '').trim(),
      eduStartDate: (currentEdu?.startDate || '').trim(),
      eduEndDate: (currentEdu?.endDate || '').trim(),
    };

    const payloadStr = encodeURIComponent(JSON.stringify(payload));
    return `
      (function() {
        window.__payload = JSON.parse(decodeURIComponent("${payloadStr}"));
        if (window.__autofillRan && window.__runAutofill) {
          window.__runAutofill();
          return;
        }
        window.__autofillRan = true;

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

        function attachFileToInput(fileInput, b64Data, fileName, mimeType) {
          if (!fileInput || !b64Data) return false;
          try {
            const blob = base64ToBlob(b64Data, mimeType);
            if (!blob) return false;
            const file = new File([blob], fileName || 'document.pdf', { type: mimeType });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            
            const prototype = Object.getPrototypeOf(fileInput);
            const filesSetter = Object.getOwnPropertyDescriptor(prototype, 'files')?.set || Object.getOwnPropertyDescriptor(fileInput, 'files')?.set;
            if (filesSetter) {
              filesSetter.call(fileInput, dataTransfer.files);
            } else {
              fileInput.files = dataTransfer.files;
            }
            
            fileInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            fileInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));

            const parent = fileInput.closest('.dropzone, [class*="drop" i], [class*="upload" i], label') || fileInput.parentElement;
            if (parent) {
              parent.dispatchEvent(new Event('change', { bubbles: true }));
              parent.dispatchEvent(new Event('input', { bubbles: true }));
            }
            return true;
          } catch(e) {
            return false;
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
          if (!el || val === undefined || val === null || val === '') return;
          const valStr = String(val).trim();
          if (!valStr) return;

          if (el.tagName === 'SELECT') {
            const opts = Array.from(el.options || []);
            const vLower = valStr.toLowerCase();
            
            const aliasesDict = {
              'united states': ['us', 'usa', 'united states of america', 'u.s.', 'u.s.a.'],
              'us': ['united states', 'usa', 'united states of america'],
              'usa': ['united states', 'us', 'united states of america'],
              'united kingdom': ['uk', 'gb', 'gbr', 'great britain', 'england'],
              'uk': ['united kingdom', 'gb', 'gbr', 'great britain'],
              'canada': ['ca', 'can'],
              'ca': ['canada', 'can'],
              'germany': ['de', 'deu', 'deutschland'],
              'france': ['fr', 'fra'],
              'india': ['in', 'ind'],
              'australia': ['au', 'aus'],
              'male': ['male', 'men', 'man', 'm'],
              'female': ['female', 'women', 'woman', 'f'],
              'non-binary': ['non-binary', 'nonbinary', 'other']
            };

            const aliases = aliasesDict[vLower] ? [vLower, ...aliasesDict[vLower]] : [vLower];

            let match = opts.find(o => {
              const oVal = (o.value || '').toLowerCase().trim();
              const oTxt = (o.text || '').toLowerCase().trim();
              return aliases.some(a => oVal === a || oTxt === a);
            });

            if (!match) {
              match = opts.find(o => {
                const oVal = (o.value || '').toLowerCase().trim();
                const oTxt = (o.text || '').toLowerCase().trim();
                return aliases.some(a => (oTxt.length > 1 && oTxt.includes(a)) || (oVal.length > 1 && oVal.includes(a)));
              });
            }

            if (match) {
              el.value = match.value;
              el.dispatchEvent(new Event('change', { bubbles: true }));
              el.dispatchEvent(new Event('input', { bubbles: true }));
            }
            return;
          }

          try {
            const proto = Object.getPrototypeOf(el);
            const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set || Object.getOwnPropertyDescriptor(el, 'value')?.set;
            if (setter) setter.call(el, valStr);
            else el.value = valStr;
          } catch (e) {
            el.value = valStr;
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
          const payload = window.__payload || {};
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
            const isGreenhouse = host.includes('greenhouse.io') || document.querySelector('form#application_form, #grnhse_app');
            const isLever = host.includes('lever.co') || document.querySelector('form#application-form');

            if (isGreenhouse) {
              // First Name
              if (payload.firstName) {
                findInputs('input[name*="first" i], input[id*="first" i]', ['first name'], ['first name']).forEach(el => {
                  if (!el.value) { setNativeValue(el, payload.firstName); filled++; }
                });
              }
              // Last Name
              if (payload.lastName) {
                findInputs('input[name*="last" i], input[id*="last" i]', ['last name'], ['last name']).forEach(el => {
                  if (!el.value) { setNativeValue(el, payload.lastName); filled++; }
                });
              }
              // Email
              if (payload.email) {
                findInputs('input[type="email" i], input[name*="email" i]', ['email'], ['email']).forEach(el => {
                  if (!el.value) { setNativeValue(el, payload.email); filled++; }
                });
              }
              // Phone
              if (payload.phone) {
                findInputs(document, 'input[type="tel" i], input[name*="phone" i], input[id*="phone" i], input[name*="mobile" i], input[id*="mobile" i]', ['phone', 'mobile', 'telephone'], ['phone', 'mobile']).forEach(el => {
                  if (!el.value) { setNativeValue(el, payload.phone); filled++; }
                });
              }
              // LinkedIn
              if (payload.linkedinUrl) {
                findInputs(document, 'input[name*="linkedin" i], input[id*="linkedin" i]', ['linkedin'], ['linkedin']).forEach(el => {
                  if (!el.value) { setNativeValue(el, payload.linkedinUrl); filled++; }
                });
              }
              // Portfolio
              if (payload.portfolioUrl) {
                findInputs(document, 'input[name*="portfolio" i], input[name*="website" i]', ['portfolio', 'website'], ['portfolio', 'website']).forEach(el => {
                  if (!el.value) { setNativeValue(el, payload.portfolioUrl); filled++; }
                });
              }
              // City
              if (payload.city) {
                findInputs(document, 'input[name*="city" i], input[id*="city" i], input[name*="location" i]', ['city', 'location'], ['city', 'location']).forEach(el => {
                  if (!el.value) { setNativeValue(el, payload.city); filled++; }
                });
              }

              // Country
              if (payload.country) {
                findInputs(document, 'select[name*="country" i], select[id*="country" i], input[name*="country" i], input[id*="country" i]', ['country'], ['country']).forEach(el => {
                  if (el.tagName === 'SELECT' || (el.tagName === 'INPUT' && !el.value)) {
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
                findInputs(document, 'input[type="tel" i], input[name*="phone" i], input[id*="phone" i], input[name*="mobile" i], input[id*="mobile" i], input[name*="tel" i], input[id*="tel" i], input[autocomplete*="tel" i]', ['phone', 'mobile', 'telephone', 'contact number'], ['phone', 'mobile', 'tel']).forEach(el => {
                  if (!el.value) {
                    setNativeValue(el, payload.phone);
                    filled++;
                  }
                });
              }
              if (payload.country) {
                findInputs(document, 'select[name*="country" i], select[id*="country" i], input[name*="country" i], input[id*="country" i], select[autocomplete*="country" i], input[autocomplete*="country" i]', ['country', 'nation', 'location country'], ['country']).forEach(el => {
                  if (el.tagName === 'SELECT' || (el.tagName === 'INPUT' && !el.value)) {
                    setNativeValue(el, payload.country);
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
            const els = findInputs(document, 'input[name*="end" i][name*="school" i], input[name*="end" i][name*="edu" i], input[name*="grad" i]', ['school end', 'education end', 'graduation', 'degree end'], ['end date', 'end year', 'graduation date']);
            els.forEach(el => {
              if (!el.value) {
                setNativeValue(el, payload.eduEndDate);
                filled++;
              }
            });
          }

          // 5. Fill Gender, Ethnicity, Disability, Citizenship, GitHub, DOB, Summary, Skills, Twitter, Description
          if (payload.gender) {
            const gLower = payload.gender.toLowerCase().trim();
            let targetTerms = ['male', 'men', 'man'];
            if (gLower.includes('female') || gLower === 'women' || gLower === 'woman' || gLower === 'f') {
              targetTerms = ['female', 'women', 'woman'];
            } else if (gLower.includes('non') || gLower.includes('other')) {
              targetTerms = ['non-binary', 'nonbinary', 'other', 'another'];
            } else if (gLower.includes('prefer') || gLower.includes('decline')) {
              targetTerms = ['prefer not', 'decline', 'choose not'];
            }

            const selects = findInputs(document, 'select[name*="gender" i], select[id*="gender" i], select[name*="sex" i], select[id*="sex" i]', ['gender', 'sex'], ['gender', 'sex']);
            selects.forEach(el => {
              if (el.tagName === 'SELECT') {
                setNativeValue(el, payload.gender);
                filled++;
              }
            });

            try {
              document.querySelectorAll('input[type="radio"], [role="radio"], button, label').forEach(inp => {
                const attr = ((inp.getAttribute('name')||'') + ' ' + (inp.getAttribute('id')||'') + ' ' + (inp.getAttribute('value')||'') + ' ' + (inp.getAttribute('aria-label')||'')).toLowerCase();
                const parentTxt = (inp.parentElement ? inp.parentElement.innerText || inp.parentElement.textContent || '' : '').toLowerCase();
                if (attr.includes('gender') || attr.includes('sex') || parentTxt.includes('gender') || parentTxt.includes('sex')) {
                  if (targetTerms.some(term => attr.includes(term) || parentTxt.includes(term))) {
                    if (inp.tagName === 'INPUT' && !(inp as HTMLInputElement).checked) {
                      (inp as HTMLInputElement).checked = true;
                      inp.dispatchEvent(new Event('change', { bubbles: true }));
                      inp.dispatchEvent(new Event('click', { bubbles: true }));
                      filled++;
                    } else if (inp.getAttribute('role') === 'radio' && inp.getAttribute('aria-checked') !== 'true') {
                      inp.dispatchEvent(new Event('click', { bubbles: true }));
                      filled++;
                    }
                  }
                }
              });
            } catch(e) {}
          }

          if (payload.ethnicity) {
            const els = findInputs(document, 'select[name*="race" i], select[id*="race" i], select[name*="ethnicity" i], select[id*="ethnicity" i], input[name*="race" i], input[name*="ethnicity" i]', ['race', 'ethnicity'], ['race', 'ethnicity']);
            els.forEach(el => {
              setNativeValue(el, payload.ethnicity);
              filled++;
            });
          }

          if (payload.disability) {
            const els = findInputs(document, 'select[name*="disability" i], select[id*="disability" i], input[name*="disability" i], input[id*="disability" i]', ['disability'], ['disability']);
            els.forEach(el => {
              setNativeValue(el, payload.disability);
              filled++;
            });
          }

          if (payload.citizenship) {
            const els = findInputs(document, 'select[name*="citizenship" i], select[name*="visa" i], select[name*="sponsor" i], select[name*="authorized" i], input[name*="citizenship" i], input[name*="visa" i], input[name*="sponsor" i], input[name*="authorized" i]', ['citizenship', 'visa', 'sponsorship', 'authorized'], ['citizenship', 'visa']);
            els.forEach(el => {
              setNativeValue(el, payload.citizenship);
              filled++;
            });
          }

          if (payload.githubUrl) {
            const els = findInputs(document, 'input[name*="github" i], input[id*="github" i], input[name="urls[GitHub]"]', ['github'], ['github']);
            els.forEach(el => {
              if (!el.value) {
                setNativeValue(el, payload.githubUrl);
                filled++;
              }
            });
          }

          if (payload.dob) {
            const els = findInputs(document, 'input[type="date"], input[name*="dob" i], input[id*="dob" i], input[name*="birth" i]', ['date of birth', 'dob', 'birthdate'], ['birth', 'dob']);
            els.forEach(el => {
              if (!el.value) {
                setNativeValue(el, payload.dob);
                filled++;
              }
            });
          }

          if (payload.summary) {
            const els = findInputs(document, 'textarea[name*="summary" i], textarea[id*="summary" i], textarea[name*="bio" i], textarea[id*="bio" i]', ['summary', 'bio', 'about yourself'], ['summary', 'bio']);
            els.forEach(el => {
              if (!el.value) {
                setNativeValue(el, payload.summary);
                filled++;
              }
            });
          }

          if (payload.skills) {
            const els = findInputs(document, 'input[name*="skill" i], textarea[name*="skill" i], input[id*="skill" i], textarea[id*="skill" i]', ['skills', 'key skills'], ['skill']);
            els.forEach(el => {
              if (!el.value) {
                setNativeValue(el, payload.skills);
                filled++;
              }
            });
          }

          if (payload.tools) {
            const els = findInputs(document, 'input[name*="tool" i], textarea[name*="tool" i], input[id*="tool" i], textarea[id*="tool" i], input[name*="software" i], textarea[name*="software" i], input[name*="technology" i], textarea[name*="technology" i]', ['tools', 'software', 'technologies', 'stack'], ['tool', 'software']);
            els.forEach(el => {
              if (!el.value) {
                setNativeValue(el, payload.tools);
                filled++;
              }
            });
          }

          if (payload.languages) {
            const els = findInputs(document, 'input[name*="language" i], select[name*="language" i], textarea[name*="language" i], input[id*="language" i], select[id*="language" i]', ['languages', 'language', 'spoken language'], ['language']);
            els.forEach(el => {
              if (el.tagName === 'SELECT') {
                setNativeValue(el, payload.languages);
                filled++;
              } else if (!el.value) {
                setNativeValue(el, payload.languages);
                filled++;
              }
            });
          }

          if (payload.projects) {
            const els = findInputs(document, 'input[name*="project" i], textarea[name*="project" i], input[id*="project" i], textarea[id*="project" i]', ['projects', 'key projects', 'project summary'], ['project']);
            els.forEach(el => {
              if (!el.value) {
                setNativeValue(el, payload.projects);
                filled++;
              }
            });
          }

          if (payload.twitterUrl) {
            const els = findInputs(document, 'input[name*="twitter" i], input[id*="twitter" i], input[name="urls[Twitter]"]', ['twitter'], ['twitter']);
            els.forEach(el => {
              if (!el.value) {
                setNativeValue(el, payload.twitterUrl);
                filled++;
              }
            });
          }

          if (payload.workDescription) {
            const els = findInputs(document, 'textarea[name*="description" i], textarea[id*="description" i], textarea[name*="responsibilit" i]', ['job description', 'responsibilities', 'work summary'], ['description', 'responsibility']);
            els.forEach(el => {
              if (!el.value) {
                setNativeValue(el, payload.workDescription);
                filled++;
              }
            });
          }// Universal Resume & Cover Letter Attachment for all forms
          if (payload.resumeBase64) {
            try {
              const resInputs = document.querySelectorAll('input[type="file"]');
              resInputs.forEach(inp => {
                const attr = ((inp.getAttribute('name')||'') + ' ' + (inp.getAttribute('id')||'') + ' ' + (inp.getAttribute('aria-label')||'')).toLowerCase();
                if (attr.includes('resume') || attr.includes('cv') || (!attr.includes('cover') && (!inp.files || !inp.files.length))) {
                  const blob = base64ToBlob(payload.resumeBase64, 'application/pdf');
                  if (blob) {
                    const file = new File([blob], payload.resumeName || 'resume.pdf', { type: 'application/pdf' });
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    try {
                      const prototypeFilesSetter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(inp), 'files')?.set;
                      if (prototypeFilesSetter) prototypeFilesSetter.call(inp, dt.files);
                      else inp.files = dt.files;
                    } catch(e) { inp.files = dt.files; }
                    inp.dispatchEvent(new Event('change', { bubbles: true }));
                    inp.dispatchEvent(new Event('input', { bubbles: true }));
                    filled++;
                  }
                }
              });
            } catch(e) {}
          }

          if (payload.coverLetterBase64 || payload.coverLetterText) {
            try {
              if (payload.coverLetterText) {
                document.querySelectorAll('textarea#cover_letter_text, textarea[name*="cover" i], textarea[id*="cover" i], textarea[name="comments"], textarea[name*="additional" i]').forEach(ta => {
                  if (!ta.value) {
                    setNativeValue(ta, payload.coverLetterText);
                    filled++;
                  }
                });
              }

              document.querySelectorAll('input[type="file"][name*="cover" i], input[type="file"][id*="cover" i]').forEach(inp => {
                if (!inp.files || !inp.files.length) {
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
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    try {
                      const prototypeFilesSetter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(inp), 'files')?.set;
                      if (prototypeFilesSetter) prototypeFilesSetter.call(inp, dt.files);
                      else inp.files = dt.files;
                    } catch(e) { inp.files = dt.files; }
                    inp.dispatchEvent(new Event('change', { bubbles: true }));
                    inp.dispatchEvent(new Event('input', { bubbles: true }));
                    filled++;
                  }
                }
              });
            } catch(e) {}
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

            function b64ToBlobSync(b64, mime) {
              try {
                const chars = atob(b64);
                const bytes = new Uint8Array(chars.length);
                for (let i = 0; i < chars.length; i++) bytes[i] = chars.charCodeAt(i);
                return new Blob([bytes], { type: mime || 'application/pdf' });
              } catch(e) { return null; }
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
                  inp.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                  inp.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                };

                doc.querySelectorAll('input[type="file"][name*="cover" i], input[type="file"][id*="cover" i]').forEach(inp => {
                  if (!inp.files || !inp.files.length) {
                    if (clPdfB64) {
                      const blob = b64ToBlobSync(clPdfB64, 'application/pdf');
                      if (blob) {
                        const clFile = new File([blob], clPdfName, { type: 'application/pdf' });
                        attachCLInput(inp, clFile);
                      }
                    } else if (clRawText) {
                      const clBlob = new Blob([clRawText], { type: 'text/plain' });
                      const clFile = new File([clBlob], 'Cover_Letter.txt', { type: 'text/plain' });
                      attachCLInput(inp, clFile);
                    }
                  }
                });
              } catch(e) {}
            }

            // Instant PDF Resume Auto-Attachment via Synchronous Blob
            const resB64 = "${(resumeBase64 || '').trim()}";
            const resName = "${(resumeName || 'Resume.pdf').trim()}";
            if (resB64) {
              try {
                const blob = b64ToBlobSync(resB64, 'application/pdf');
                if (blob) {
                  const resFile = new File([blob], resName, { type: 'application/pdf' });
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
                      inp.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                      inp.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                    }
                  });
                }
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
      Alert.alert('Profile Empty', 'Please complete your onboarding profile first to use Autofill with Applydesk.');
    }
  };

  const handleInjectSingleField = (fieldName: 'name' | 'email' | 'phone', val: string, label: string) => {
    Haptics.selectionAsync();
    if (val) {
      Clipboard.setStringAsync(val);
    }
    if (webViewRef.current && profileData) {
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
        </View>
      </View>

      {/* In-App Application WebView */}
      <View style={{ flex: 1 }}>
        <WebView
          ref={webViewRef}
          source={{ uri: targetUri }}
          onLoadStart={() => {
            setLoading(false);
          }}
          onLoadEnd={() => {
            setLoading(false);
            if (webViewRef.current) {
              setTimeout(() => {
                const js = getAutofillJS();
                if (js) {
                  webViewRef.current?.injectJavaScript(cleanJsCodeForInjection(js));
                }
              }, 500);
            }
          }}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'AUTOFILL_SUCCESS' && data.count > 0) {
                setAutofillCount(data.count);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } else if (data.type === 'log') {
                console.log('\x1b[33m[WebView Log]\x1b[0m', data.message);
              } else if (data.type === 'AUTOFILL_ERROR') {
                console.log('\x1b[31m[WebView Error]\x1b[0m', data.error);
              }
            } catch (e) { }
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
            <ActivityIndicator size="large" color="#000000" />
            <Text style={styles.loadingText}>Opening Application Page...</Text>
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
                {autofillCount > 0 ? `Autofilled ${autofillCount} Fields` : 'Autofill with Applydesk'}
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
    ...StyleSheet.absoluteFill,
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
    backgroundColor: '#000000',
    borderRadius: 16,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    shadowColor: '#000000',
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
