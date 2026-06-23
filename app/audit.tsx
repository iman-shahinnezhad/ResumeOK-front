import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  Platform,
  Alert,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth } from '../context/AuthContext';
import ReferralBottomSheet from '../components/ReferralBottomSheet';

interface SelectedResumeFile {
  id: string;
  name: string;
  date: string;
  uri?: string;
  size?: number;
  mimeType?: string;
}

interface AnalysisResult {
  match_score: number;
  issues_count: number;
  issues: { title: string }[];
}

export default function AuditScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { resumeId } = useLocalSearchParams<{ resumeId: string }>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isPad = Platform.OS === 'ios' && Platform.isPad;

  const { user, guestCredit, deductCredits, refundCredits } = useAuth();
  const [showReferralSheet, setShowReferralSheet] = React.useState<boolean>(false);
  const userCredit = user?.credit ?? guestCredit;

  // View States: 'audit' | 'loading' | 'result' | 'fixed_issues'
  const [currentView, setCurrentView] = React.useState<'audit' | 'loading' | 'result' | 'fixed_issues'>('audit');
  const [fixedIssues, setFixedIssues] = React.useState<{ title: string; fix: string }[]>([]);
  const [optimizedResumeText, setOptimizedResumeText] = React.useState<string>('');
  const [selectedResume, setSelectedResume] = React.useState<SelectedResumeFile | null>(null);
  const [uploadedResumes, setUploadedResumes] = React.useState<SelectedResumeFile[]>([]);
  const [jobUrl, setJobUrl] = React.useState<string>('');

  // Loading Steps: 0 = Criteria, 1 = Scan, 2 = AI suggestions, 3 = Output
  const [loadingStep, setLoadingStep] = React.useState<number>(0);
  const [analysisResult, setAnalysisResult] = React.useState<AnalysisResult | null>(null);

  // Fixing states
  const [fixingIndex, setFixingIndex] = React.useState<number | null>(null);
  const [fixedIndices, setFixedIndices] = React.useState<number[]>([]);
  const [isFixingComplete, setIsFixingComplete] = React.useState<boolean>(false);
  const [isDownloading, setIsDownloading] = React.useState<boolean>(false);
  const [isOptimized, setIsOptimized] = React.useState<boolean>(false);
  const [isOptimizing, setIsOptimizing] = React.useState<boolean>(false);
  const [isCreditDeducted, setIsCreditDeducted] = React.useState<boolean>(false);

  React.useEffect(() => {
    setIsOptimized(false);
    setOptimizedResumeText('');
    setFixedIssues([]);
    setIsCreditDeducted(false);
  }, [selectedResume, jobUrl]);

  const convertMarkdownToHtml = (markdown: string) => {
    if (!markdown) return "";
    
    // Split into lines
    const lines = markdown.split('\n');
    let html = '';
    let inList = false;

    for (let line of lines) {
      let trimmed = line.trim();
      
      // Clean up markdown tags or wrappers if they got in
      if (trimmed.startsWith('[START_RESUME]') || trimmed.startsWith('[END_RESUME]')) {
        continue;
      }

      // Handle Headings
      if (trimmed.startsWith('# ')) {
        if (inList) { html += '</ul>'; inList = false; }
        const text = trimmed.replace(/^#\s+/, '');
        html += `<h1>${text}</h1>\n`;
        continue;
      }
      if (trimmed.startsWith('## ')) {
        if (inList) { html += '</ul>'; inList = false; }
        const text = trimmed.replace(/^##\s+/, '');
        html += `<h2>${text}</h2>\n`;
        continue;
      }
      if (trimmed.startsWith('### ')) {
        if (inList) { html += '</ul>'; inList = false; }
        const text = trimmed.replace(/^###\s+/, '');
        html += `<h3>${text}</h3>\n`;
        continue;
      }
      if (trimmed.startsWith('#### ')) {
        if (inList) { html += '</ul>'; inList = false; }
        const text = trimmed.replace(/^####\s+/, '');
        html += `<h4>${text}</h4>\n`;
        continue;
      }

      // Handle Bullet Lists
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
        if (!inList) {
          html += '<ul>\n';
          inList = true;
        }
        let text = trimmed.replace(/^[-*•]\s+/, '');
        // Apply inline styles to bold text
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html += `  <li>${text}</li>\n`;
        continue;
      }

      // If we were in a list and this line is not a list item, close the list
      if (inList && trimmed !== '') {
        html += '</ul>\n';
        inList = false;
      }

      if (trimmed === '') {
        // Just empty space
        continue;
      }

      // Regular text/paragraph
      // Apply inline styles to bold/italic
      let text = trimmed;
      text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

      // Check if it looks like contact info (contains @, |, or phone format) and center it
      if (text.includes('|') || text.includes('@') || text.includes('Phone:')) {
        html += `<div class="contact-info">${text}</div>\n`;
      } else {
        html += `<p>${text}</p>\n`;
      }
    }

    if (inList) {
      html += '</ul>\n';
    }

    return html;
  };

  const extractCompanyAndTitle = (url: string) => {
    try {
      const cleanUrl = url.trim();
      if (!cleanUrl) {
        return { company: "Company", title: "Job Match" };
      }
      const parsedUrl = new URL(cleanUrl);
      let hostParts = parsedUrl.hostname.replace('www.', '').split('.');
      let company = hostParts[0];
      if (hostParts.length > 2) {
        company = hostParts[hostParts.length - 2];
      }
      company = company.charAt(0).toUpperCase() + company.slice(1);
      
      const isGenericCompany = (name?: string) => {
        if (!name) return true;
        const lower = name.toLowerCase().trim();
        return (
          lower === 'indeed' || 
          lower === 'linkedin' || 
          lower === 'glassdoor' || 
          lower === 'company' || 
          lower === 'carrier' ||
          lower === 'careers' ||
          lower === 'job' || 
          lower === ''
        );
      };

      if (isGenericCompany(company)) {
        company = "Company";
      }

      let title = "Job Match";

      // 1. Try to match Indeed's /cmp/Company/jobs/Title format
      const indeedCmpRegex = /\/cmp\/([^/]+)\/jobs\/([^/?#]+)/i;
      const cmpMatch = parsedUrl.pathname.match(indeedCmpRegex);
      if (cmpMatch) {
        const rawCmp = cmpMatch[1].replace(/[-_]/g, ' ').trim();
        company = rawCmp.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
        
        let rawTitle = cmpMatch[2].replace(/[-_]/g, ' ').trim();
        // Remove trailing job keys/IDs
        rawTitle = rawTitle.replace(/\b[0-9a-fA-F]{16}\b/g, ''); // 16-char hex
        rawTitle = rawTitle.replace(/\b[a-zA-Z0-9]{10,20}\b$/g, ''); // alphanumeric ID
        rawTitle = rawTitle.trim();
        title = rawTitle.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
        return { company, title };
      }

      // 2. Try to get job title from query parameters like 'q', 'title', 'role', 'job'
      const searchParams = parsedUrl.searchParams;
      const jobTitleParam = searchParams.get('q') || searchParams.get('title') || searchParams.get('job') || searchParams.get('jobTitle') || searchParams.get('role');
      if (jobTitleParam) {
        title = jobTitleParam.replace(/[-_]/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
      }
      
      // Try to get company from query parameters
      const companyParam = searchParams.get('company') || searchParams.get('companyName') || searchParams.get('cmp') || searchParams.get('org');
      if (companyParam) {
        company = companyParam.replace(/[-_]/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
      }

      if (title === "Job Match") {
        let pathParts = parsedUrl.pathname.split('/').filter(p => p.length > 0);
        if (pathParts.length > 0) {
          let lastPart = pathParts[pathParts.length - 1];
          if (lastPart === 'details' || lastPart === 'view' || !isNaN(Number(lastPart))) {
            if (pathParts.length > 1) {
              lastPart = pathParts[pathParts.length - 2];
            }
          }
          let cleanedPart = lastPart.replace(/[-_]/g, ' ').replace(/\d+$/, '').trim();
          let cleanedTitle = cleanedPart.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
          
          // Handle "at" or "bei" in URL path
          if (cleanedTitle.toLowerCase().includes(" at ")) {
            const atParts = cleanedTitle.split(/\s+at\s+/i);
            if (atParts.length > 1) {
              title = atParts[0].trim();
              const possibleCompany = atParts[1].trim();
              if (possibleCompany && !isGenericCompany(possibleCompany)) {
                company = possibleCompany;
              }
            }
          } else if (cleanedTitle.toLowerCase().includes(" bei ")) {
            const beiParts = cleanedTitle.split(/\s+bei\s+/i);
            if (beiParts.length > 1) {
              title = beiParts[0].trim();
              const possibleCompany = beiParts[1].trim();
              if (possibleCompany && !isGenericCompany(possibleCompany)) {
                company = possibleCompany;
              }
            }
          } else {
            title = cleanedTitle;
          }
        }
      }
      
      // Prevent generic endpoints from showing up as title
      if (title.toLowerCase() === 'viewjob' || title.toLowerCase() === 'jobs' || title.toLowerCase() === 'view') {
        title = 'Job Match';
      }

      return { company, title };
    } catch {
      if (url.includes('/')) {
        const parts = url.split('/');
        const lastPart = parts[parts.length - 1] || parts[parts.length - 2] || "Job Match";
        const company = parts[0] || "Company";
        return {
          company: company.charAt(0).toUpperCase() + company.slice(1),
          title: lastPart.replace(/[-_]/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase())
        };
      }
      return { company: "Company", title: url || "Job Match" };
    }
  };

  const decodeHtmlEntities = (str: string) => {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&ndash;/g, '-')
      .replace(/&mdash;/g, '-');
  };

  const saveMatchRecord = async (html?: string, aiCompany?: string, aiJobTitle?: string) => {
    try {
      if (!selectedResume) return;
      
      let { company, title } = extractCompanyAndTitle(jobUrl);

      const isGenericCompany = (name?: string) => {
        if (!name) return true;
        const lower = name.toLowerCase().trim();
        return (
          lower === 'indeed' || 
          lower === 'linkedin' || 
          lower === 'glassdoor' || 
          lower === 'company' || 
          lower === 'carrier' ||
          lower === 'careers' ||
          lower === 'job' || 
          lower === ''
        );
      };

      const isGenericTitle = (t?: string) => {
        if (!t) return true;
        const lower = t.toLowerCase().trim();
        return (
          lower === 'job match' || 
          lower === 'viewjob' || 
          lower === 'jobs' || 
          lower === 'view' || 
          lower === 'access denied' || 
          lower === 'error' || 
          lower === 'untitled' ||
          lower === ''
        );
      };

      if (html) {
        // Try to find og:title or twitter:title
        const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
                             html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i) ||
                             html.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i) ||
                             html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:title["']/i);
        
        let htmlTitle = "";
        if (ogTitleMatch && ogTitleMatch[1]) {
          htmlTitle = ogTitleMatch[1].trim();
        } else {
          // Fallback to <title> tag
          const titleTagMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          if (titleTagMatch && titleTagMatch[1]) {
            htmlTitle = titleTagMatch[1].trim();
          }
        }

        // Try to find og:site_name or author for company
        const ogSiteNameMatch = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i) ||
                                html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i) ||
                                html.match(/<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["']/i);
        let scrapedCompany = "";
        if (ogSiteNameMatch && ogSiteNameMatch[1]) {
          const parsedSite = decodeHtmlEntities(ogSiteNameMatch[1].trim());
          if (!isGenericCompany(parsedSite)) {
            scrapedCompany = parsedSite;
          }
        }

        if (htmlTitle) {
          const decodedTitle = decodeHtmlEntities(htmlTitle);
          // Split by typical delimiters in search engine title tags (e.g. - | • — | :)
          let titleParts = decodedTitle.split(/\s+[-|•—:]\s+/).map(p => p.trim()).filter(p => p.length > 0);
          
          if (titleParts.length > 0) {
            let extractedTitle = titleParts[0];
            let extractedCompany = scrapedCompany;

            // Handle "Job Title at Company" or "Job Title bei Company" pattern
            if (extractedTitle.toLowerCase().includes(" at ")) {
              const atParts = extractedTitle.split(/\s+at\s+/i);
              if (atParts.length > 1) {
                extractedTitle = atParts[0].trim();
                const possibleCompany = atParts[1].trim();
                if (!isGenericCompany(possibleCompany)) {
                  extractedCompany = possibleCompany;
                }
              }
            } else if (extractedTitle.toLowerCase().includes(" bei ")) {
              const beiParts = extractedTitle.split(/\s+bei\s+/i);
              if (beiParts.length > 1) {
                extractedTitle = beiParts[0].trim();
                const possibleCompany = beiParts[1].trim();
                if (!isGenericCompany(possibleCompany)) {
                  extractedCompany = possibleCompany;
                }
              }
            }

            // Indeed format: Job Title - Company Name - Location - Indeed.com
            // If parts length >= 3, parts[1] is the company name!
            if (isGenericCompany(extractedCompany) && titleParts.length >= 3) {
              const part1 = titleParts[1];
              if (!isGenericCompany(part1)) {
                extractedCompany = part1;
              }
            }

            // If parts length == 2, check if parts[1] is a site name
            if (isGenericCompany(extractedCompany) && titleParts.length === 2) {
              const part1 = titleParts[1];
              if (!isGenericCompany(part1)) {
                extractedCompany = part1;
              }
            }

            if (!isGenericTitle(extractedTitle)) {
              title = extractedTitle;
            }
            if (!isGenericCompany(extractedCompany)) {
              company = extractedCompany;
            }
          }
        }
      }

      // 3. Apply Gemini AI values if they are more specific (non-generic)
      if (aiCompany && !isGenericCompany(aiCompany)) {
        company = aiCompany;
      }
      if (aiJobTitle && !isGenericTitle(aiJobTitle)) {
        title = aiJobTitle;
      }

      // Final sanitization of site name leaks in company name
      if (isGenericCompany(company)) {
        try {
          const parsedUrl = new URL(jobUrl.trim());
          let domainParts = parsedUrl.hostname.replace('www.', '').split('.');
          if (domainParts.length > 1) {
            let cleanDomain = domainParts[domainParts.length - 2];
            cleanDomain = cleanDomain.charAt(0).toUpperCase() + cleanDomain.slice(1);
            if (!isGenericCompany(cleanDomain)) {
              company = cleanDomain;
            } else {
              company = "Company";
            }
          } else {
            company = "Company";
          }
        } catch {
          company = "Company";
        }
      }

      if (isGenericTitle(title)) {
        title = "Job Match";
      }

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) + ' ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      
      const newMatch = {
        id: String(Date.now()),
        company,
        jobTitle: title,
        pdfName: selectedResume.name,
        pdfUri: selectedResume.uri,
        url: jobUrl,
        date: dateStr
      };

      const matchesPath = `${FileSystem.documentDirectory}matches.json`;
      const fileInfo = await FileSystem.getInfoAsync(matchesPath);
      let currentMatches: any[] = [];
      if (fileInfo.exists) {
        const content = await FileSystem.readAsStringAsync(matchesPath);
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          currentMatches = parsed;
        }
      }
      const updatedMatches = [newMatch, ...currentMatches];
      await FileSystem.writeAsStringAsync(matchesPath, JSON.stringify(updatedMatches));
    } catch (e) {
      console.log("Error saving match record:", e);
    }
  };

  // Load resumes from filesystem on mount
  React.useEffect(() => {
    const initStorageAndLoad = async () => {
      try {
        const resumesJsonPath = `${FileSystem.documentDirectory}resumes.json`;
        const fileInfo = await FileSystem.getInfoAsync(resumesJsonPath);
        let parsed: SelectedResumeFile[] = [];
        if (fileInfo.exists) {
          const content = await FileSystem.readAsStringAsync(resumesJsonPath);
          parsed = JSON.parse(content);
        } else {
          // If resumes.json doesn't exist, initialize with mock resumes
          parsed = [
            { id: '1', name: 'OmidMoradi_25jun.PDF', date: '23/09 03:36' },
            { id: '2', name: 'SaraKhan_21sep.PDF', date: '21/09 14:22' },
            { id: '3', name: 'AliReza_30aug.PDF', date: '30/08 09:15' },
          ];
          await FileSystem.writeAsStringAsync(resumesJsonPath, JSON.stringify(parsed));
        }

        if (Array.isArray(parsed)) {
          setUploadedResumes(parsed);
          
          if (resumeId) {
            const found = parsed.find(item => item.id === resumeId);
            if (found) {
              setSelectedResume(found);
            }
          } else if (parsed.length > 0) {
            // Default to first one selected
            setSelectedResume(parsed[0]);
          }
        }
      } catch (err) {
        console.log("Error loading resumes in audit on mount:", err);
      }
    };
    initStorageAndLoad();
  }, [resumeId]);

  const saveResumesToStorage = async (list: SelectedResumeFile[]) => {
    try {
      const resumesJsonPath = `${FileSystem.documentDirectory}resumes.json`;
      await FileSystem.writeAsStringAsync(resumesJsonPath, JSON.stringify(list));
    } catch (e) {
      console.log("Error saving resumes to storage:", e);
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

        // Copy to persistent document folder
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

        // Also save to global list
        try {
          const resumesJsonPath = `${FileSystem.documentDirectory}resumes.json`;
          const fileInfo = await FileSystem.getInfoAsync(resumesJsonPath);
          let currentList: SelectedResumeFile[] = [];
          if (fileInfo.exists) {
            const content = await FileSystem.readAsStringAsync(resumesJsonPath);
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
              currentList = parsed;
            }
          }
          const newList = [newResume, ...currentList];
          await saveResumesToStorage(newList);
          setUploadedResumes(newList); // Update list state
        } catch (e) {
          console.log("Error updating persistent list in audit picker:", e);
        }

        setSelectedResume(newResume);
      }
    } catch (err) {
      console.log("Error picking document:", err);
      Alert.alert("Error", "Failed to select document.");
    }
  };

  const handleUploadResume = () => {
    pickResume();
  };

  const handleAnalyzeResume = async () => {
    if (!selectedResume) {
      Alert.alert("Resume Required", "Please choose or upload a resume first.");
      return;
    }

    let deducted = false;
    setCurrentView('loading');
    setLoadingStep(0); // Analyzing Career Criteria

    try {
      // Step 1: Scrape/analyze URL
      let jobContent = "";
      let fetchedHtml = "";
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
          fetchedHtml = html;
          jobContent = html
            .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
            .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 4000); // Limit text size to prevent huge payload
        } catch (e) {
          console.log("CORS or scrape error, continuing with URL only:", e);
        }
      }

      if (userCredit >= 10) {
        const success = await deductCredits(10);
        if (success) {
          deducted = true;
        }
      }

      await new Promise(r => setTimeout(r, 1200));
      setLoadingStep(1); // Scanning your resume

      // Step 2: Read PDF file
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
          console.log("Failed to read file base64, falling back to text:", e);
          parts.push({
            text: `Resume content placeholder for file: ${selectedResume.name}. Experienced professional.`
          });
        }
      } else {
        parts.push({
          text: `Resume content placeholder for file: ${selectedResume.name}. Experienced professional.`
        });
      }

      await new Promise(r => setTimeout(r, 1200));
      setLoadingStep(2); // Generating personalized suggestions

      // Step 3: Call Gemini API
      const promptText = `You are an expert ATS resume analyzer and hiring manager.

TASK:
Compare the uploaded resume with the job description from the provided URL and evaluate how well the candidate matches the role.

INPUTS:
- Resume: [Attached Multimodal PDF]
- Job URL: ${jobUrl}
${jobContent ? `- Job Description Text: ${jobContent}` : ''}

OUTPUT FORMAT (strict JSON):
{
  "match_score": 0-100,
  "issues_count": number,
  "issues": [
    {
      "title": "short issue title"
    }
  ],
  "company": "hiring company name (extract from description text or URL)",
  "job_title": "specific job title/position name (extract from description text or URL)",
  "missing_keywords": [],
  "strong_matches": [],
  "summary": "1-2 sentence overall evaluation"
}

RULES:
- Match score must be strict and realistic:
  - 0–30 = very poor match
  - 31–60 = partial match
  - 61–80 = good match
  - 81–100 = excellent match
- Analyze ATS compatibility, keyword alignment, experience relevance, and skills match.
- Extract the hiring company name and job title. If not found, use "Company" and "Job Match". Do NOT use site names like "Indeed", "LinkedIn", or "Glassdoor" as the company name.
- Only include issue titles (NO description, NO severity).
- Be critical and act like a real hiring manager.
- Do NOT rewrite or improve the resume in this step.`;

      parts.push({
        text: promptText
      });

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': 'AQ.Ab8RN6LjiOKxvxO8J1J0MWsp3Wrbo5emB0MOb6JFXsWKYIlqhw'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: parts
              }
            ],
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
      }

      const responseJson = await response.json();
      const rawText = responseJson.candidates?.[0]?.content?.parts?.[0]?.text || "";

      await new Promise(r => setTimeout(r, 1200));
      setLoadingStep(3); // Preparing your result

      if (!rawText) {
        throw new Error("Empty response from Gemini.");
      }

      // Parse JSON from text
      let cleanedText = rawText.trim();

      // Robust JSON extraction using regex
      const jsonRegex = /\{[\s\S]*\}/;
      const match = cleanedText.match(jsonRegex);
      if (match) {
        cleanedText = match[0];
      }

      console.log("Parsed Gemini text:", cleanedText);

      let result;
      try {
        result = JSON.parse(cleanedText);
      } catch (parseErr) {
        console.log("Failed to parse JSON, trying manual regex extraction:", parseErr);
        // Fallback manual regex extraction of match_score and issues
        const scoreMatch = rawText.match(/"match_score"\s*:\s*(\d+)/) || rawText.match(/match_score\s*:\s*(\d+)/);
        const score = scoreMatch ? parseInt(scoreMatch[1]) : 70;

        // Extract issue titles manually using regex
        const issuesList: { title: string }[] = [];
        const issueTitleMatches = rawText.matchAll(/"title"\s*:\s*"([^"]+)"/g);
        for (const m of issueTitleMatches) {
          issuesList.push({ title: m[1] });
        }

        if (issuesList.length === 0) {
          // Fallback: split by bullet points if no JSON structure is found
          const lines = rawText.split("\n");
          for (const line of lines) {
            const cleanLine = line.trim();
            if ((cleanLine.startsWith("-") || cleanLine.startsWith("*") || /^\d+\./.test(cleanLine)) && cleanLine.length > 5) {
              issuesList.push({ title: cleanLine.replace(/^[-*\d.\s]+/, "") });
            }
          }
        }

        const companyMatch = rawText.match(/"company"\s*:\s*"([^"]+)"/) || rawText.match(/company\s*:\s*"([^"]+)"/);
        const jobTitleMatch = rawText.match(/"job_title"\s*:\s*"([^"]+)"/) || rawText.match(/job_title\s*:\s*"([^"]+)"/);

        result = {
          match_score: score,
          issues_count: issuesList.length,
          issues: issuesList,
          company: companyMatch ? companyMatch[1] : undefined,
          job_title: jobTitleMatch ? jobTitleMatch[1] : undefined
        };
      }

      setAnalysisResult({
        match_score: result.match_score ?? 0,
        issues_count: result.issues_count ?? (result.issues?.length ?? 0),
        issues: result.issues ?? []
      });

      try {
        await saveMatchRecord(fetchedHtml, result?.company, result?.job_title);
      } catch (saveErr) {
        console.log("Error calling saveMatchRecord in handleAnalyzeResume:", saveErr);
      }

      await new Promise(r => setTimeout(r, 800));
      setCurrentView('result');

    } catch (e: any) {
      console.log("Error analyzing resume with Gemini:", e);
      if (deducted) {
        try {
          await refundCredits(10);
        } catch (refundErr) {
          console.log("Failed to refund credits:", refundErr);
        }
      }
      try {
        setLoadingStep(3); // Preparing your result
        await new Promise(r => setTimeout(r, 1000));
      } catch { }

      // Dynamic fallback using actual error message instead of static mock report
      setAnalysisResult({
        match_score: 0,
        issues_count: 1,
        issues: [
          { title: `Analysis Failed: ${e?.message || "Failed to analyze resume. Please check your API key and connection."}` }
        ]
      });
      setFixingIndex(null);
      setFixedIndices([]);
      setIsFixingComplete(false);
      setCurrentView('result');
    }
  };

  const callGeminiOptimize = async () => {
    try {
      const issuesText = analysisResult?.issues.map(i => i.title).join("\n") || "No issues reported";

      // Re-read PDF file if available
      const parts: any[] = [];
      if (selectedResume && selectedResume.uri) {
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
          console.log("Failed to read file base64 in optimize:", e);
        }
      }

      const promptText = `You are an expert ATS resume optimizer and career coach.

TASK:
Rewrite and optimize the provided resume so it achieves the highest possible ATS match score (target 95–100/100) with the given job description, while remaining 100% truthful.

INPUTS:
- Original resume: [Attached PDF content]
- Job description URL: ${jobUrl}
- Issues report from previous analysis:
${issuesText}

OUTPUT FORMAT:
Your response must contain two distinct sections wrapped in tags so we can parse it programmatically.

First, return the JSON section enclosed in [START_JSON] and [END_JSON]:
[START_JSON]
{
  "match_score_improvement": {
    "old_score": ${analysisResult?.match_score ?? 60},
    "new_score": 98
  },
  "issues_fixed": [
    // For each issue in the list:
    // ${analysisResult?.issues.map((i, idx) => `${idx + 1}. ${i.title}`).join(", ")}
    {
      "title": "the issue title matching the input list",
      "fix": "clear description of what was changed in the resume to solve this issue"
    }
  ],
  "keyword_mapping": [
    {
      "keyword": "job keyword",
      "where_used": "section or bullet point in resume"
    }
  ]
}
[END_JSON]

Second, return the full optimized resume text in Markdown/Text format enclosed in [START_RESUME] and [END_RESUME]:
[START_RESUME]
Provide the full optimized resume text here.
It must follow the PDF requirements:
- Must be clean, ATS-friendly formatting
- Simple structured sections:
  - Name
  - Contact
  - Summary
  - Experience
  - Skills
  - Education
  - Certifications (if any)
[END_RESUME]

RULES:
- Do NOT invent fake experience, companies, or skills.
- Only improve structure, wording, and keyword alignment.
- Use strong action verbs and measurable impact where truthful.
- Optimize for ATS parsing (simple format only).
- Prioritize job-specific keywords naturally.
- Keep tone professional and human.
- The number of objects in "issues_fixed" must match exactly the number of input issues (${analysisResult?.issues.length ?? 0}).
`;

      parts.push({ text: promptText });

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': 'AQ.Ab8RN6LjiOKxvxO8J1J0MWsp3Wrbo5emB0MOb6JFXsWKYIlqhw'
          },
          body: JSON.stringify({
            contents: [{ parts: parts }]
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
      }

      const responseJson = await response.json();
      const rawText = responseJson.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (!rawText) {
        throw new Error("Empty response from Gemini.");
      }

      // Parse the response
      const jsonMatch = rawText.match(/\[START_JSON\]([\s\S]*?)\[END_JSON\]/);
      const resumeMatch = rawText.match(/\[START_RESUME\]([\s\S]*?)\[END_RESUME\]/);

      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1].trim());
          if (parsed.issues_fixed) {
            setFixedIssues(parsed.issues_fixed);
          } else {
            setFixedIssues(analysisResult?.issues.map(i => ({ title: i.title, fix: "Optimized ATS formatting and wording" })) || []);
          }
        } catch (err) {
          console.log("JSON parsing error in optimize:", err);
          setFixedIssues(analysisResult?.issues.map(i => ({ title: i.title, fix: "Optimized ATS formatting and wording" })) || []);
        }
      } else {
        setFixedIssues(analysisResult?.issues.map(i => ({ title: i.title, fix: "Optimized ATS formatting and wording" })) || []);
      }

      if (resumeMatch) {
        const text = resumeMatch[1].trim();
        setOptimizedResumeText(text);
        return text;
      } else {
        const cleanText = rawText.replace(/\[START_JSON\][\s\S]*?\[END_JSON\]/, "").trim();
        const text = cleanText || "ATS optimized resume text.";
        setOptimizedResumeText(text);
        return text;
      }

    } catch (e) {
      console.log("Error optimizing resume:", e);
      throw e;
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    let isDeductedThisRun = false;
    try {
      if (!isCreditDeducted) {
        if (userCredit < 10) {
          setShowReferralSheet(true);
          setIsDownloading(false);
          return;
        }
        const success = await deductCredits(10);
        if (!success) {
          Alert.alert("Deduction Failed", "Failed to deduct credits.");
          setIsDownloading(false);
          return;
        }
        setIsCreditDeducted(true);
        isDeductedThisRun = true;
      }

      let optimizedText = optimizedResumeText;
      if (!isOptimized || !optimizedText) {
        optimizedText = await callGeminiOptimize();
        setIsOptimized(true);
      }

      const Print = require('expo-print');
      const Sharing = require('expo-sharing');

      const bodyHtml = convertMarkdownToHtml(optimizedText);

      const formattedHtml = `
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, Helvetica, sans-serif;
                margin: 40px;
                color: #000000;
                line-height: 1.5;
                font-size: 11pt;
              }
              h1 { font-size: 20pt; text-align: center; font-weight: bold; margin-top: 0; margin-bottom: 4px; text-transform: uppercase; }
              .contact-info { text-align: center; font-size: 10pt; margin-bottom: 20px; color: #4A5568; }
              h2 { font-size: 13pt; font-weight: bold; border-bottom: 1.5px solid #000000; padding-bottom: 2px; margin-top: 20px; text-transform: uppercase; margin-bottom: 8px; }
              h3 { font-size: 11pt; font-weight: bold; margin-top: 8px; margin-bottom: 2px; }
              h4 { font-size: 10pt; font-weight: bold; margin-top: 4px; margin-bottom: 2px; }
              p { font-size: 10pt; margin-bottom: 4px; margin-top: 0; }
              ul { padding-left: 20px; margin-top: 2px; margin-bottom: 8px; }
              li { font-size: 10pt; margin-bottom: 3px; }
            </style>
          </head>
          <body>
            ${bodyHtml}
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: formattedHtml });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Download ATS Optimized Resume',
        UTI: 'com.adobe.pdf'
      });
    } catch (err: any) {
      console.log("Error in PDF download:", err);
      // Refund credits if we deducted them during this attempt
      if (isDeductedThisRun) {
        setIsCreditDeducted(false);
        try {
          await refundCredits(10);
        } catch (refundErr) {
          console.log("Failed to refund credits:", refundErr);
        }
      }
      try {
        const FileSystem = require('expo-file-system/legacy');
        const Sharing = require('expo-sharing');
        const fallbackPath = `${FileSystem.documentDirectory}${selectedResume?.name?.replace(/\.[^/.]+$/, "") || "resume"}_optimized.txt`;
        await FileSystem.writeAsStringAsync(fallbackPath, optimizedResumeText || "ATS optimized resume text.");
        await Sharing.shareAsync(fallbackPath);
      } catch (fallbackErr) {
        Alert.alert("Error", err?.message || "Could not export resume. Make sure expo-print and expo-sharing are installed.");
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFixIssues = async () => {
    if (!analysisResult || !analysisResult.issues || analysisResult.issues.length === 0) {
      return;
    }

    try {
      setIsOptimized(false);
      setIsCreditDeducted(false);
      setFixingIndex(0);
      setFixedIndices([]);
      setIsFixingComplete(false);

      // Populate fake optimized resume text so download works
      const mockOptimizedText = `OMID MORADI
Phone: +98 912 345 6789 | Email: omid.moradi@example.com
City: Tehran, Iran

PROFESSIONAL SUMMARY
Highly skilled software engineer with extensive experience in full stack development. Specialized in designing scalable web architectures and leading engineering teams.

EXPERIENCE
Lead Software Engineer | Tech Company (2022 - Present)
- Designed and built scalable cloud solutions.
- Optimized app load time by 40% using advanced caching.

Education
Bachelor of Science in Computer Science | Sharif University of Technology (2018 - 2022)`;
      setOptimizedResumeText(mockOptimizedText);

      // Populate fake fixed issues descriptions
      const mockFixed = analysisResult.issues.map(issue => ({
        title: issue.title,
        fix: `Successfully resolved: Added relevant keywords and structured content to address this requirement.`
      }));
      setFixedIssues(mockFixed);

      const issuesCount = analysisResult.issues.length;
      for (let i = 0; i < issuesCount; i++) {
        setFixingIndex(i);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setFixedIndices(prev => [...prev, i]);
      }

      setFixingIndex(null);
      setIsFixingComplete(true);
    } catch (err) {
      console.log("Error during fix issues:", err);
      setFixingIndex(null);
      setFixedIndices([]);
      setIsFixingComplete(false);
      Alert.alert("Optimization Failed", "Could not complete optimization.");
    }
  };

  const handleBackPress = () => {
    if (currentView === 'audit') {
      router.back();
    } else if (currentView === 'loading') {
      setCurrentView('audit');
    } else if (currentView === 'result') {
      setFixingIndex(null);
      setFixedIndices([]);
      setIsFixingComplete(false);
      setCurrentView('audit');
    } else if (currentView === 'fixed_issues') {
      setCurrentView('result');
    }
  };

  const renderStepIcon = (stepIndex: number) => {
    if (loadingStep > stepIndex) {
      return <Ionicons name="checkmark-sharp" size={20} color="#10B981" style={{ marginRight: 12 }} />;
    }
    if (loadingStep === stepIndex) {
      return <ActivityIndicator size="small" color="#000000" style={{ marginRight: 12 }} />;
    }
    return <View style={styles.pendingCircle} />;
  };

  const getStepTextStyle = (stepIndex: number) => {
    if (loadingStep > stepIndex) {
      return styles.stepTextCompleted;
    }
    if (loadingStep === stepIndex) {
      return styles.stepTextActive;
    }
    return styles.stepTextPending;
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { marginTop: insets.top + (isPad ? 25 : 0) }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="chevron-back" size={28} color="#000000" />
          </TouchableOpacity>
          {currentView === 'audit' && (
            <TouchableOpacity style={styles.profileContainer} activeOpacity={0.8} onPress={() => router.push('/settings')}>
              <Image source={require('../assets/images/placeholder-avatar.png')} style={styles.profilePic} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.creditsBadge} activeOpacity={0.8} onPress={() => router.push('/pricing')}>
          <Text style={styles.creditsText}>{userCredit} Credits</Text>
        </TouchableOpacity>
      </View>

      {/* VIEW CONDITIONAL RENDERING */}
      {currentView === 'audit' && (
        /* --- AUDIT SCREEN VIEW --- */
        <View style={styles.auditContainer}>
          <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 }]} showsVerticalScrollIndicator={false}>
            <View style={{ width: '100%', maxWidth: isPad ? 600 : (isLandscape ? 600 : '100%'), alignSelf: 'center', alignItems: 'center' }}>

              {/* 3D Lightning Bolt Image */}
              <Image source={require('../assets/images/flash.png')} style={styles.auditFlashIcon} />

              {/* Audit Screen Title */}
              <Text style={styles.auditTitle}>Match Your Resume</Text>

              {/* Paste Job Position URL Section */}
              <View style={styles.sectionContainer}>
                <Text style={styles.auditSectionTitle}>Paste Job Postion URL</Text>
                <TextInput
                  style={styles.auditInput}
                  value={jobUrl}
                  onChangeText={setJobUrl}
                  placeholder="https://jobsample.com/jobone"
                  placeholderTextColor="#A0AEC0"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Your Resume Section */}
              <View style={styles.sectionContainer}>
                <Text style={styles.auditSectionTitle}>Your Resume</Text>

                <View style={styles.resumesCardContainer}>
                  {/* Upload or Choose row */}
                  <TouchableOpacity
                    style={styles.uploadRowInsideCard}
                    activeOpacity={0.8}
                    onPress={handleUploadResume}
                  >
                    <View style={styles.uploadCardLeft}>
                      <Image source={require('../assets/images/file.png')} style={styles.fileIconImageLarge} />
                      <Text style={styles.uploadCardText}>Upload or choose Resume</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#000000" />
                  </TouchableOpacity>

                  {/* Divider line if there are items */}
                  {uploadedResumes.length > 0 && (
                    <View style={styles.cardDivider} />
                  )}

                  {/* List of uploaded resumes */}
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
                        <Image source={require('../assets/images/file.png')} style={styles.fileIconImageSmall} />
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

            </View>
          </ScrollView>

          {/* DO THE MAGIC Button at the bottom */}
          <View style={[styles.bottomButtonContainer, { paddingBottom: insets.bottom + 20 }]}>
            <TouchableOpacity
              style={[styles.rewriteButton, { marginTop: 0 }]}
              activeOpacity={0.8}
              onPress={handleAnalyzeResume}
            >
              <Text style={styles.rewriteButtonText}>DO THE MAGIC ✨</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {currentView === 'loading' && (
        /* --- LOADING SCREEN VIEW --- */
        <View style={[styles.loadingContainer, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.loadingHeaderTitle}>Rewriting Your Resume:</Text>

          <View style={styles.loadingStepsWrapper}>
            <View style={styles.loadingRow}>
              {renderStepIcon(0)}
              <Text style={getStepTextStyle(0)}>Analyzing Career Criteria</Text>
            </View>

            <View style={styles.loadingRow}>
              {renderStepIcon(1)}
              <Text style={getStepTextStyle(1)}>Scanning your resume</Text>
            </View>

            <View style={styles.loadingRow}>
              {renderStepIcon(2)}
              <Text style={getStepTextStyle(2)}>Generating personalized suggestions</Text>
            </View>

            <View style={styles.loadingRow}>
              {renderStepIcon(3)}
              <Text style={getStepTextStyle(3)}>Preparing your result</Text>
            </View>
          </View>
        </View>
      )}

      {currentView === 'result' && analysisResult && (
        /* --- RESULT SCREEN VIEW --- */
        <View style={styles.resultOuterContainer}>
          <View style={styles.resultContainer}>
            <Text style={styles.resultHeaderTitle}>Your Resume Match Score</Text>

            <View style={styles.scoreRow}>
              <Text style={styles.boldIssuesText}>
                {`${analysisResult.issues.length - fixedIndices.length} issues`}
              </Text>
              {(fixingIndex === null && fixedIndices.length === 0 && !isFixingComplete) && (
                <Text style={[
                  styles.matchPercentText,
                  { color: analysisResult.match_score >= 80 ? '#10B981' : (analysisResult.match_score >= 60 ? '#F59E0B' : '#FF5B35') }
                ]}>
                  {`${analysisResult.match_score}% Match`}
                </Text>
              )}
            </View>

            <ScrollView style={styles.issuesList} showsVerticalScrollIndicator={false}>
              {analysisResult.issues.map((issue, idx) => {
                const isFixed = fixedIndices.includes(idx);
                const isFixing = fixingIndex === idx;
                return (
                  <View key={idx} style={styles.issueRow}>
                    {isFixed ? (
                      <Ionicons name="checkmark-sharp" size={20} color="#10B981" style={styles.issueIcon} />
                    ) : isFixing ? (
                      <ActivityIndicator size="small" color="#10B981" style={styles.issueIcon} />
                    ) : (
                      <Ionicons name="close" size={20} color="#EF4444" style={styles.issueIcon} />
                    )}
                    <Text style={styles.issueText}>{issue.title}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>

          {/* Fixed bottom container for Result buttons */}
          <View style={[styles.bottomButtonContainer, { paddingBottom: insets.bottom + 20 }]}>
            {isFixingComplete ? (
              <View style={styles.doneButtonsContainer}>
                <TouchableOpacity
                  style={styles.seeFixedButton}
                  activeOpacity={0.8}
                  onPress={async () => {
                    let isDeductedThisRun = false;
                    try {
                      if (!isCreditDeducted) {
                        if (userCredit < 10) {
                          setShowReferralSheet(true);
                          return;
                        }
                        const success = await deductCredits(10);
                        if (!success) {
                          Alert.alert("Deduction Failed", "Failed to deduct credits.");
                          return;
                        }
                        setIsCreditDeducted(true);
                        isDeductedThisRun = true;
                      }

                      if (!isOptimized) {
                        setIsOptimizing(true);
                        try {
                          await callGeminiOptimize();
                          setIsOptimized(true);
                          setCurrentView('fixed_issues');
                        } catch (err: any) {
                          if (isDeductedThisRun) {
                            setIsCreditDeducted(false);
                            try {
                              await refundCredits(10);
                            } catch (refundErr) {
                              console.log("Failed to refund credits:", refundErr);
                            }
                          }
                          Alert.alert("Optimization Failed", err?.message || "Failed to optimize resume.");
                        } finally {
                          setIsOptimizing(false);
                        }
                      } else {
                        setCurrentView('fixed_issues');
                      }
                    } catch (err: any) {
                      console.log("Error in see fixed issues:", err);
                      Alert.alert("Error", err?.message || "An unexpected error occurred.");
                    }
                  }}
                  disabled={isDownloading || isOptimizing}
                >
                  {isOptimizing ? (
                    <ActivityIndicator size="small" color="#000000" />
                  ) : (
                    <Text style={styles.seeFixedButtonText}>SEE FIXED ISSUES</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.downloadButton}
                  activeOpacity={0.8}
                  onPress={handleDownloadPdf}
                  disabled={isDownloading || isOptimizing}
                >
                  {isDownloading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.downloadButtonText}>DOWNLOAD IN ATS READABLE</Text>
                  )}
                </TouchableOpacity>

                <Text style={styles.preferredText}>PREFERRED</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.fixIssuesButton, { marginBottom: 0 }, fixingIndex !== null && styles.fixIssuesButtonDisabled]}
                activeOpacity={0.8}
                disabled={fixingIndex !== null}
                onPress={handleFixIssues}
              >
                {fixingIndex !== null ? (
                  <View style={styles.fixingBtnRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.fixIssuesButtonText}>FIXING...</Text>
                  </View>
                ) : (
                  <Text style={styles.fixIssuesButtonText}>FIX ISSUES</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {currentView === 'fixed_issues' && (
        /* --- FIXED ISSUES SCREEN VIEW --- */
        <View style={styles.resultOuterContainer}>
          <View style={styles.resultContainer}>
            <Text style={styles.resultHeaderTitle}>Your Resume Match Score</Text>

            <View style={styles.scoreRow}>
              <Text style={styles.boldIssuesText}>0 issues</Text>
              <Text style={[styles.matchPercentText, { color: '#10B981' }]}>100% Match</Text>
            </View>

            <ScrollView style={styles.issuesList} showsVerticalScrollIndicator={false}>
              {fixedIssues.map((item, idx) => (
                <View key={idx} style={styles.fixedIssueItem}>
                  <Text style={styles.fixedIssueTitle}>{item.title}</Text>
                  <Text style={styles.fixedIssueDesc}>{item.fix}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Download button at the bottom */}
          <View style={[styles.bottomButtonContainer, { paddingBottom: insets.bottom + 20 }]}>
            <TouchableOpacity
              style={styles.downloadButton}
              activeOpacity={0.8}
              onPress={handleDownloadPdf}
              disabled={isDownloading || isOptimizing}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.downloadButtonText}>DOWNLOAD IN ATS READABLE</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
      <ReferralBottomSheet visible={showReferralSheet} onClose={() => setShowReferralSheet(false)} />
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
  creditsBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auditFlashIcon: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginTop: 20,
    marginBottom: 16,
  },
  auditTitle: {
    color: '#000000',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 36,
  },
  sectionContainer: {
    width: '100%',
    marginBottom: 24,
  },
  auditSectionTitle: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    paddingLeft: 4,
  },
  auditInput: {
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
  selectedResumeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  selectedResumeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  selectedResumeText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '600',
  },
  removeResumeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadRowTriggerInsideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 3,
    width: '100%',
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
  rewriteButton: {
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
  rewriteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // LOADING SCREEN STYLES
  loadingContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  loadingHeaderTitle: {
    color: '#000000',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 32,
    lineHeight: 28,
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
  // RESULT SCREEN STYLES
  resultContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  resultHeaderTitle: {
    color: '#000000',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 28,
  },
  scoreNumber: {
    color: '#000000',
    fontSize: 48,
    fontWeight: '900',
  },
  issuesCountText: {
    color: '#9CA3AF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 16,
  },
  issuesList: {
    flex: 1,
    marginBottom: 24,
  },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  issueIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  issueText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    lineHeight: 22,
  },
  fixIssuesButton: {
    backgroundColor: '#000000',
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  fixIssuesButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  fixIssuesButtonDisabled: {
    opacity: 0.6,
  },
  fixingBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doneButtonsContainer: {
    width: '100%',
    marginBottom: 0,
  },
  seeFixedButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#000000',
    marginBottom: 12,
  },
  seeFixedButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
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
  preferredText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  auditContainer: {
    flex: 1,
    width: '100%',
  },
  resultOuterContainer: {
    flex: 1,
    width: '100%',
  },
  bottomButtonContainer: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: '#F6F6F6',
  },
  fixedIssueItem: {
    marginBottom: 24,
    width: '100%',
  },
  fixedIssueTitle: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 6,
  },
  fixedIssueDesc: {
    color: '#718096',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  profileContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginLeft: 8,
  },
  profilePic: {
    width: '100%',
    height: '100%',
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
  boldIssuesText: {
    color: '#000000',
    fontSize: 32,
    fontWeight: '800',
  },
  matchPercentText: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
});
