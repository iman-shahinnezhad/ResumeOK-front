import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  Linking,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
  Easing,
  Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import * as FileSystem from 'expo-file-system/legacy';
import Svg, { Path, G, Circle } from 'react-native-svg';
import Slider from '@react-native-community/slider';
import { useAuth, API_URL } from '../context/AuthContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import * as StoreReview from 'expo-store-review';
import * as Notifications from 'expo-notifications';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { City, Country } from 'country-state-city';
import { parsePdfResumeText } from '../utils/pdfParser';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');



const CATEGORIES_DATA = [
  {
    name: 'Software & Engineering',
    icon: 'code-slash-outline',
    roles: [
      'Software Engineer',
      'Frontend Engineer',
      'Backend Engineer',
      'Full stack Engineer',
      'Mobile Engineer',
      'iOS Engineer',
      'Android Engineer',
      'DevOps Engineer',
      'Systems Architect',
      'Software Architect',
      'Site Reliability Engineer',
      'Cloud Engineer',
      'Data Engineer',
      'Embedded Engineer',
      'Firmware Engineer',
      'ML Engineer',
      'QA Engineer',
      'Blockchain Engineer',
      'Game Engineer',
      'Developer Relations',
      'Support Engineer',
      'Sales Engineer',
      'Security Analyst'
    ]
  },
  {
    name: 'Design & UX',
    icon: 'color-palette-outline',
    roles: [
      'Product Designer',
      'UI/UX Designer',
      'UX Researcher',
      'Graphic Designer',
      'Interaction Designer',
      'Visual Designer',
      'Brand Designer',
      'Motion Designer',
      'Web Designer',
      'Art Director',
      'UX Writer',
      'Illustrator',
      '3D Artist'
    ]
  },
  {
    name: 'Marketing',
    icon: 'megaphone-outline',
    roles: [
      'Growth Marketer',
      'SEO Specialist',
      'Content Strategist',
      'Social Media Manager',
      'Marketing Manager',
      'Digital Marketing Specialist',
      'Brand Manager',
      'Copywriter',
      'Email Marketing Specialist',
      'Public Relations Specialist'
    ]
  },
  {
    name: 'Product & Project',
    icon: 'cube-outline',
    roles: [
      'Product Manager',
      'Product Owner',
      'Technical Product Manager',
      'Associate Product Manager',
      'Product Operations',
      'Project Manager',
      'Scrum Master',
      'Agile Coach'
    ]
  },
  {
    name: 'Data & AI',
    icon: 'analytics-outline',
    roles: [
      'Data Scientist',
      'Data Analyst',
      'Business Intelligence Analyst',
      'Machine Learning Engineer',
      'AI Researcher',
      'Data Architect',
      'Database Administrator',
      'AI Product Manager'
    ]
  },
  {
    name: 'Sales & Success',
    icon: 'trending-up-outline',
    roles: [
      'Account Executive',
      'Business Development Rep',
      'Sales Manager',
      'Sales Operations',
      'Customer Success Manager',
      'Account Manager'
    ]
  },
  {
    name: 'Security',
    icon: 'shield-checkmark-outline',
    roles: [
      'Security Analyst',
      'Penetration Tester',
      'Security Architect',
      'Security Engineer',
      'CISO',
      'Compliance Analyst'
    ]
  },
  {
    name: 'Consulting & Business',
    icon: 'people-outline',
    roles: [
      'Management Consultant',
      'Strategy Consultant',
      'IT Consultant',
      'Business Analyst'
    ]
  },
  {
    name: 'Human Resources',
    icon: 'person-add-outline',
    roles: [
      'HR Manager',
      'HR Generalist',
      'Talent Acquisition Specialist',
      'Technical Recruiter',
      'HR Coordinator'
    ]
  },
  {
    name: 'Customer Support',
    icon: 'headset-outline',
    roles: [
      'Customer Support Specialist',
      'Customer Support Manager',
      'Technical Support Specialist',
      'Support Engineer'
    ]
  },
  {
    name: 'Engineering (Other)',
    icon: 'build-outline',
    roles: [
      'Hardware Engineer',
      'Mechanical Engineer',
      'Electrical Engineer',
      'Civil Engineer',
      'Chemical Engineer',
      'Robotics Engineer'
    ]
  },
  {
    name: 'Finance',
    icon: 'cash-outline',
    roles: [
      'Financial Analyst',
      'Accountant',
      'Controller',
      'Investment Analyst',
      'Portfolio Manager'
    ]
  },
  {
    name: 'Legal',
    icon: 'briefcase-outline',
    roles: [
      'Legal Counsel',
      'Compliance Officer',
      'Paralegal'
    ]
  },
  {
    name: 'Healthcare & Medical',
    icon: 'medical-outline',
    roles: [
      'Medical Advisor',
      'Health Analyst',
      'Clinical Research Associate'
    ]
  }
];

const INTERESTS_DATA = [
  { label: 'Flexible Hours', emoji: '⏱️' },
  { label: 'Innovative Tech', emoji: '🧠' },
  { label: 'Cool Startup', emoji: '😎' },
  { label: 'Job stability', emoji: '🧘' },
  { label: 'Challenging Work', emoji: '🔥' },
  { label: 'High salary', emoji: '💸' },
  { label: 'Company culture', emoji: '👥' },
  { label: 'Remote work', emoji: '✈️' },
  { label: 'Career growth', emoji: '🚀' }
];

const CHALLENGES_LIST = [
  'Not applying enough',
  'Can’t land interviews',
  'Not ready yet',
  'Lack of great job offers'
];

const EXPERIENCE_LIST = [
  'Internship',
  'Entry level & Graduate',
  'Junior (1-2 years)',
  'Mid Level (3-5 years)',
  'Senior (6-9 years)',
  'Expert & Leadership (10+ years)'
];

const HEAR_ABOUT_LIST = [
  'Friend / Family',
  'App Store',
  'Tiktok',
  'Instagram',
  'AI Response',
  'Other'
];



function AppleNativeButton({
  onPress,
  disabled,
  style,
  children,
}: {
  onPress?: () => void;
  disabled?: boolean;
  style?: any;
  children: React.ReactNode;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!disabled) {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
      }
      Animated.spring(scaleAnim, {
        toValue: 0.96,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
    }
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, guestId, isLoggedIn, user } = useAuth();

  // Navigation Flow Steps
  const [step, _setStep] = useState<
    'intro' | 'welcome' | 'referral' | 'engineered' | 'name' | 'email' | 'jobs' | 'interests' | 'challenge' | 'location' | 'experience' | 'salary' | 'hearAbout' | 'rateUs' | 'notifications' | 'upload' | 'loading'
  >('intro');
  const [loading, setLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [roleQuery, setRoleQuery] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const dockBottomStyle = keyboardHeight > 0
    ? { bottom: keyboardHeight, paddingBottom: 12 }
    : { bottom: 0, paddingBottom: insets.bottom + 12 };



  // Autofill user profile data if available from Google / Apple / session (ignoring generic fallback strings)
  useEffect(() => {
    if (user) {
      if (user.email && !user.email.includes('user@gmail.com') && !user.email.includes('user@apple.com') && !email) {
        setEmail(user.email);
      }
      if (user.name && user.name !== 'Google User' && user.name !== 'Apple User') {
        const parts = user.name.trim().split(' ');
        if (parts.length > 0 && !firstName) setFirstName(parts[0]);
        if (parts.length > 1 && !lastName) setLastName(parts.slice(1).join(' '));
      }
    }
  }, [user]);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacity = slideAnim.interpolate({
    inputRange: [-40, 0, 40],
    outputRange: [0, 1, 0],
  });

  const setStep = (nextStep: typeof step | ((prev: typeof step) => typeof step)) => {
    const resolvedNextStep = typeof nextStep === 'function' ? nextStep(step) : nextStep;

    if (resolvedNextStep === 'loading' || step === 'loading') {
      _setStep(resolvedNextStep);
      return;
    }

    const STEP_ORDER = [
      'intro', 'welcome', 'referral', 'engineered', 'name', 'email', 'interests', 'jobs',
      'experience', 'location', 'salary', 'challenge', 'hearAbout', 'rateUs',
      'notifications', 'referral', 'upload'
    ];

    const currentIndex = STEP_ORDER.indexOf(step);
    const nextIndex = STEP_ORDER.indexOf(resolvedNextStep);

    if (currentIndex !== -1 && nextIndex !== -1 && currentIndex !== nextIndex) {
      const direction = nextIndex > currentIndex ? 'forward' : 'backward';
      const startValue = direction === 'forward' ? 40 : -40; // Shorter 40px shift distance for much smoother transitions

      slideAnim.setValue(startValue);
      _setStep(resolvedNextStep);

      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250, // Snappier 250ms duration
        useNativeDriver: true,
        easing: Easing.out(Easing.ease)
      }).start();
    } else {
      _setStep(resolvedNextStep);
    }
  };

  // Referral State
  const [referralCode, setReferralCode] = useState('');
  const [showIRated, setShowIRated] = useState(false);
  const [showIEnabled, setShowIEnabled] = useState(false);
  const referralInputRef = useRef<TextInput>(null);
  const nameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const cityInputRef = useRef<TextInput>(null);

  // Focus input fields after step transition completes to prevent keyboard layout animation stutter
  useEffect(() => {
    const timer = setTimeout(() => {
      if (step === 'name') {
        nameInputRef.current?.focus();
      } else if (step === 'email') {
        emailInputRef.current?.focus();
      } else if (step === 'location') {
        cityInputRef.current?.focus();
      } else if (step === 'referral') {
        referralInputRef.current?.focus();
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [step]);

  // Profile data states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null);
  const [citySearch, setCitySearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [citySearchResults, setCitySearchResults] = useState<string[]>([]);
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const [selectedExperience, setSelectedExperience] = useState<string | null>(null);
  const [minSalary, setMinSalary] = useState(120000);
  const [maxSalary, setMaxSalary] = useState(320000);
  const [selectedHearAbout, setSelectedHearAbout] = useState<string | null>(null);
  const [selectedResume, setSelectedResume] = useState<{ name: string; uri: string; size?: number } | null>(null);

  // Accordion status mapping category name to expanded boolean
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Slide carousel state
  const [activeSlide, setActiveSlide] = useState(0);

  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Worldwide Live & Package City Autocomplete Search Effect (country-state-city npm package)
  useEffect(() => {
    const query = citySearch.trim();
    if (query.length < 2) {
      setCitySearchResults([]);
      setIsSearchingCity(false);
      return;
    }

    setIsSearchingCity(true);

    // 1. Fast local package search from country-state-city npm package
    const queryLower = query.toLowerCase();
    const packageMatches: string[] = [];
    try {
      const allCities = City.getAllCities();
      for (let i = 0; i < allCities.length && packageMatches.length < 15; i++) {
        const c = allCities[i];
        if (c.name.toLowerCase().startsWith(queryLower) || c.name.toLowerCase().includes(queryLower)) {
          const countryObj = Country.getCountryByCode(c.countryCode);
          const countryName = countryObj ? countryObj.name : c.countryCode;
          let formatted = c.stateCode ? `${c.name}, ${c.stateCode}, ${countryName}` : `${c.name}, ${countryName}`;
          if (!packageMatches.includes(formatted)) {
            packageMatches.push(formatted);
          }
        }
      }
    } catch (e) {
      console.log('Package city filter error:', e);
    }

    if (packageMatches.length > 0) {
      setCitySearchResults(packageMatches);
    }

    // 2. Fetch live OpenStreetMap Photon results with 300ms debounce
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10`
        );
        if (response.ok) {
          const data = await response.json();
          const remoteResults: string[] = [];
          if (data && data.features) {
            data.features.forEach((f: any) => {
              const props = f.properties || {};
              const name = props.name;
              const state = props.state || props.county;
              const country = props.country;

              if (name) {
                let formatted = name;
                if (state && state !== name) formatted += `, ${state}`;
                if (country) formatted += `, ${country}`;
                if (!remoteResults.includes(formatted)) {
                  remoteResults.push(formatted);
                }
              }
            });
          }

          if (remoteResults.length > 0) {
            setCitySearchResults(remoteResults);
          }
        }
      } catch (err) {
        console.log('Remote city search fetch error:', err);
      } finally {
        setIsSearchingCity(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [citySearch]);

  // Dropdown is CLOSED initially when query length is < 2
  const displayedCities = citySearch.trim().length >= 2 ? citySearchResults : [];

  useEffect(() => {
    if (step !== 'rateUs') setShowIRated(false);
    if (step !== 'notifications') setShowIEnabled(false);
  }, [step]);

  // Spinning Loader Animation Refs
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scrollX1 = useRef(new Animated.Value(0)).current;
  const scrollX2 = useRef(new Animated.Value(-700)).current;
  const scrollX3 = useRef(new Animated.Value(0)).current;

  // Trigger horizontal logo ticker animations with different speeds/directions
  useEffect(() => {
    let anim1: Animated.CompositeAnimation | null = null;
    let anim2: Animated.CompositeAnimation | null = null;
    let anim3: Animated.CompositeAnimation | null = null;

    if (step === 'engineered') {
      scrollX1.setValue(0);
      scrollX2.setValue(-650);
      scrollX3.setValue(0);

      // Row 1 (scrolls left)
      anim1 = Animated.loop(
        Animated.timing(scrollX1, {
          toValue: -900,
          duration: 26000,
          easing: Easing.linear,
          useNativeDriver: true,
          isInteraction: false,
        })
      );
      anim1.start();

      // Row 2 (scrolls right)
      anim2 = Animated.loop(
        Animated.timing(scrollX2, {
          toValue: 0,
          duration: 24000,
          easing: Easing.linear,
          useNativeDriver: true,
          isInteraction: false,
        })
      );
      anim2.start();

      // Row 3 (scrolls left)
      anim3 = Animated.loop(
        Animated.timing(scrollX3, {
          toValue: -900,
          duration: 22000,
          easing: Easing.linear,
          useNativeDriver: true,
          isInteraction: false,
        })
      );
      anim3.start();
    }

    return () => {
      if (anim1) anim1.stop();
      if (anim2) anim2.stop();
      if (anim3) anim3.stop();
    };
  }, [step]);

  // Trigger spinning loop and automatic redirect on loading step mount
  useEffect(() => {
    if (step === 'loading') {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true
        })
      ).start();

      const timer = setTimeout(() => {
        finishOnboarding();
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [step]);

  const spinRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const handlePickResume = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
        copyToCacheDirectory: true
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        setSelectedResume({
          name: file.name,
          uri: file.uri,
          size: file.size
        });

        setIsParsing(true);
        let parsingFailed = false;

        // Optional PDF Auto-Fill: Extract text & pre-fill profile fields
        try {
          if (file.uri) {
            const rawContent = await FileSystem.readAsStringAsync(file.uri, {
              encoding: FileSystem.EncodingType.Base64
            });
            if (rawContent && rawContent.length > 10) {
              let parsed: any = null;
              const backendEndpoints = [
                `${API_URL}/api/parse-resume`,
                'http://localhost:3000/api/parse-resume',
                'http://127.0.0.1:3000/api/parse-resume',
                'http://188.166.164.115:3030/api/parse-resume'
              ];

              for (const endpoint of backendEndpoints) {
                try {
                  const apiRes = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ base64Data: rawContent, fileName: file.name })
                  });
                  if (apiRes.ok) {
                    const apiData = await apiRes.json();
                    if (apiData.success && apiData.parsed) {
                      parsed = apiData.parsed;
                      break;
                    }
                  }
                } catch (err) {}
              }

              if (!parsed || (!parsed.fullName && !parsed.email)) {
                try {
                  parsed = await parsePdfResumeText(rawContent, file.name);
                } catch (pdfErr) {
                  console.log("Local PDF parser error:", pdfErr);
                }
              }

              if (parsed && (parsed.firstName || parsed.lastName || parsed.fullName || parsed.email)) {
                console.log('\n===============================================================');
                console.log('📄 🚀 HIGH-ACCURACY RESUME PARSED PERSONAL DATA LOG 🚀 📄');
                console.log('===============================================================');
                console.log('📛 Full Name:', parsed.fullName || 'Not detected');
                console.log('👤 First Name:', parsed.firstName || 'Not detected');
                console.log('👤 Last Name:', parsed.lastName || 'Not detected');
                console.log('📧 Email:', parsed.email || 'Not detected');
                console.log('📞 Phone:', parsed.phone || 'Not detected');
                console.log('📍 Location:', parsed.location || 'Not detected');
                console.log('🔗 LinkedIn:', parsed.linkedinUrl || 'Not detected');
                console.log('🌐 Portfolio:', parsed.portfolioUrl || 'Not detected');
                console.log('💼 Target Role / Job Title:', parsed.targetRole || 'Not detected');
                console.log('⭐ Experience Level:', parsed.experienceLevel || 'Not detected');
                console.log('🛠️ Skills Extracted (' + (parsed.skills?.length || 0) + '):', parsed.skills ? parsed.skills.join(', ') : 'None');
                console.log('💼 Work Experiences Count:', parsed.workExperiences ? parsed.workExperiences.length : 0);
                if (parsed.workExperiences && parsed.workExperiences.length > 0) {
                  console.log('💼 Work Experiences List:', JSON.stringify(parsed.workExperiences, null, 2));
                }
                console.log('🎓 Education Count:', parsed.education ? parsed.education.length : 0);
                if (parsed.education && parsed.education.length > 0) {
                  console.log('🎓 Education List:', JSON.stringify(parsed.education, null, 2));
                }
                console.log('===============================================================\n');

                if (parsed.firstName) setFirstName(parsed.firstName);
                if (parsed.lastName) setLastName(parsed.lastName);
                if (parsed.email) setEmail(parsed.email);
                if (parsed.targetRole) setSelectedRoles([parsed.targetRole]);
                if (parsed.experienceLevel) setSelectedExperience(parsed.experienceLevel);
                if (parsed.skills && parsed.skills.length > 0) {
                  setSelectedInterests(parsed.skills.slice(0, 5));
                }

                // Auto-save user onboarding profile & resume builder fields from parsed PDF
                try {
                  const formattedExperiences = (parsed.workExperiences || []).map((exp: any, idx: number) => ({
                    id: String(idx + 1),
                    jobTitle: exp.title || exp.jobTitle || 'Professional Role',
                    companyName: exp.company || exp.companyName || 'Company',
                    city: exp.location || exp.city || 'City',
                    startDate: exp.dates?.split('—')[0]?.trim() || exp.dates?.split('-')[0]?.trim() || '2021',
                    endDate: exp.dates?.split('—')[1]?.trim() || exp.dates?.split('-')[1]?.trim() || 'Present',
                    jobDescription: exp.description || '',
                    description: exp.description || ''
                  }));

                  const formattedEducations = (parsed.education || []).map((edu: any, idx: number) => ({
                    id: String(idx + 1),
                    schoolName: edu.school || edu.schoolName || 'University',
                    degree: edu.degree || 'Degree',
                    fieldOfStudy: edu.degree || 'Field of Study',
                    city: edu.location || edu.city || 'City',
                    startDate: edu.year?.split('—')[0]?.trim() || edu.year?.split('-')[0]?.trim() || '2019',
                    endDate: edu.year?.split('—')[1]?.trim() || edu.year?.split('-')[1]?.trim() || '2022',
                    description: '',
                    gpa: ''
                  }));

                  const formattedLanguages = (parsed.languages || []).map((lang: any, idx: number) => {
                    if (typeof lang === 'string') {
                      return { id: String(idx + 1), name: lang, proficiency: 'Professional' };
                    }
                    return { id: String(idx + 1), name: lang.name || 'English', proficiency: lang.proficiency || 'Professional' };
                  });

                  const formattedProjects = (parsed.projects || []).map((proj: any, idx: number) => ({
                    id: String(idx + 1),
                    projectName: proj.name || proj.projectName || proj.title || `Project ${idx + 1}`,
                    role: proj.role || parsed.targetRole || 'Contributor',
                    description: proj.description || '',
                    technologies: Array.isArray(proj.technologies) ? proj.technologies : (parsed.skills?.slice(0, 3) || []),
                    projectType: 'Company / Individual',
                    startDate: '2022',
                    endDate: 'Present',
                    currentlyWorking: true,
                    projectUrl: proj.link || proj.projectUrl || '',
                    repository: proj.link || ''
                  }));

                  const autoProfile = {
                    firstName: parsed.firstName || (parsed.fullName ? parsed.fullName.split(' ')[0] : 'User'),
                    lastName: parsed.lastName || (parsed.fullName ? parsed.fullName.split(' ').slice(1).join(' ') : ''),
                    jobTitle: parsed.targetRole || '',
                    role: parsed.targetRole || '',
                    email: parsed.email || email || 'user@example.com',
                    phone: parsed.phone || '',
                    phoneNumber: parsed.phone || '',
                    mobile: parsed.phone || '',
                    city: parsed.location || 'United States',
                    website: parsed.portfolioUrl || parsed.linkedinUrl || '',
                    linkedinUrl: parsed.linkedinUrl || '',
                    portfolioUrl: parsed.portfolioUrl || '',
                    roles: [parsed.targetRole || 'Professional'],
                    interests: parsed.skills && parsed.skills.length > 0 ? parsed.skills.slice(0, 5) : ['Career growth', 'High salary', 'Remote work'],
                    challenges: 'Finding relevant positions',
                    experience: parsed.experienceLevel || '3+ years',
                    expectedSalary: { min: 100000, max: 180000 },
                    hearAbout: 'Google Search',
                    skills: parsed.skills && parsed.skills.length > 0 ? parsed.skills : [],
                    softSkills: parsed.softSkills || ['Communication', 'Problem Solving', 'Leadership'],
                    languages: formattedLanguages.length > 0 ? formattedLanguages : [
                      { id: '1', name: 'English', proficiency: 'Fluent' }
                    ],
                    projects: formattedProjects,
                    experiences: formattedExperiences,
                    workExperiences: formattedExperiences,
                    educations: formattedEducations,
                    education: formattedEducations,
                    summary: `${parsed.targetRole || 'Professional'} with ${parsed.experienceYears || 5}+ years of experience in ${parsed.skills?.slice(0, 3).join(', ') || 'field'}.`
                  };

                  const profilePath = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
                  await FileSystem.writeAsStringAsync(profilePath, JSON.stringify(autoProfile, null, 2));

                  const builderPath = `${FileSystem.documentDirectory}resume_builder_form_data.json`;
                  await FileSystem.writeAsStringAsync(builderPath, JSON.stringify(autoProfile, null, 2));

                  // Save PDF as default resume in resumes.json
                  const resumesPath = `${FileSystem.documentDirectory}resumes.json`;
                  const newResumeItem = {
                    id: `resume-${Date.now()}`,
                    name: file.name,
                    uri: file.uri,
                    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    size: file.size ? `${(file.size / 1024).toFixed(0)} KB` : '120 KB',
                    isDefault: true
                  };
                  await FileSystem.writeAsStringAsync(resumesPath, JSON.stringify([newResumeItem], null, 2));
                  console.log('⚡ Profile Auto-Filled & Saved silently to local storage!');
                } catch (saveErr) {
                  console.log('Error auto-saving profile from PDF:', saveErr);
                  parsingFailed = true;
                }
              } else {
                parsingFailed = true;
              }
            } else {
              parsingFailed = true;
            }
          } else {
            parsingFailed = true;
          }
        } catch (parseErr) {
          console.log("PDF parse info:", parseErr);
          parsingFailed = true;
        } finally {
          setIsParsing(false);
          if (parsingFailed) {
            Alert.alert(
              "Notice",
              "We couldn't extract details from your resume file. Don't worry, you can fill in your details manually.",
              [{ text: "Continue", onPress: () => setStep('name') }]
            );
          } else {
            setStep('name');
          }
        }
      }
    } catch (err) {
      console.log('Error picking document:', err);
    }
  };

  const handleRateApp = async () => {
    try {
      if (await StoreReview.isAvailableAsync()) {
        await StoreReview.requestReview();
      }
    } catch (err) {
      console.log('Store review error:', err);
    }

    // Fallback to App Store review page direct URL scheme
    setTimeout(() => {
      const appStoreUrl = 'itms-apps://apps.apple.com/app/id6783382482?action=write-review';
      Linking.canOpenURL(appStoreUrl).then((supported) => {
        if (supported) {
          Linking.openURL(appStoreUrl).catch(() => {});
        } else {
          Linking.openURL('https://apps.apple.com/app/apple-store/id6783382482?action=write-review').catch(() => {});
        }
      }).catch(() => {
        Linking.openURL('https://apps.apple.com/app/apple-store/id6783382482?action=write-review').catch(() => {});
      });
    }, 400);

    setTimeout(() => {
      setShowIRated(true);
    }, 1500);
  };

  const handleRequestNotifications = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      console.log('Notification permission status:', status);
    } catch (err) {
      console.log('Error requesting notification permission:', err);
    }

    // After 1.2 seconds, reveal "I enabled!" button
    setTimeout(() => {
      setShowIEnabled(true);
    }, 1200);
  };

  // Google Sign-In Setup
  const rawIosId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const rawWebId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '251783276638-rj2c7ntblcmfe7guo9pnvfjpib41d0qi.apps.googleusercontent.com';
  const validIosClientId = (rawIosId && !rawIosId.includes('your_google')) ? rawIosId : rawWebId;

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'resumeok',
  });

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: rawWebId,
    iosClientId: validIosClientId,
    webClientId: rawWebId,
    redirectUri,
  });

  useEffect(() => {
    if (response?.type === 'success' && response.authentication?.accessToken) {
      handleGoogleLogin(response.authentication.accessToken);
    }
  }, [response]);

  const handleGooglePress = async () => {
    setLoading(true);
    try {
      if (request) {
        const res = await promptAsync().catch(() => null);
        if (res?.type === 'success' && res.authentication?.accessToken) {
          await handleGoogleLogin(res.authentication.accessToken);
          return;
        }
      }
    } catch (e) {
      console.log('Google login prompt notice:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (accessToken: string) => {
    setLoading(true);
    try {
      const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!userInfoResponse.ok) {
        throw new Error('Could not fetch user profile from Google');
      }

      const googleUser = await userInfoResponse.json();
      if (!googleUser || (!googleUser.email && !googleUser.id)) {
        throw new Error('Google did not return valid user profile data');
      }

      const emailVal = googleUser.email || '';
      const nameVal = googleUser.name || `${googleUser.given_name || ''} ${googleUser.family_name || ''}`.trim() || '';

      let sessionUser = {
        id: 'google_' + (googleUser.id || Math.random().toString(36).substring(2, 10)),
        name: nameVal || 'User',
        email: emailVal || 'user@gmail.com',
        avatar: googleUser.picture || null,
        plan: 'Free' as const,
        credit: 20,
      };
      let sessionToken = 'google_token_' + Date.now();

      try {
        const authRes = await fetch(`${API_URL}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: emailVal,
            name: nameVal,
            avatar: googleUser.picture,
            googleId: googleUser.id || 'google_' + Date.now(),
          }),
        });

        if (authRes.ok) {
          const data = await authRes.json();
          if (data.success && data.token) {
            sessionUser = data.user;
            sessionToken = data.token;
          }
        }
      } catch (serverErr) {
        console.log('Backend sync notice:', serverErr);
      }

      await login({
        user: sessionUser,
        accessToken: sessionToken,
      });

      // Autofill actual Google user names and email
      const givenName = googleUser.given_name || (googleUser.name ? googleUser.name.split(' ')[0] : '');
      const familyName = googleUser.family_name || (googleUser.name ? googleUser.name.split(' ').slice(1).join(' ') : '');

      if (givenName) setFirstName(givenName);
      if (familyName) setLastName(familyName);
      if (emailVal) setEmail(emailVal);

      // Only advance to engineered step on successful Google authentication!
      setStep('engineered');
    } catch (err: any) {
      console.log('Google auth error:', err);
      Alert.alert('Google Sign-In Error', err.message || 'Could not complete Google sign-in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    try {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Not Supported', 'Apple Sign-In is not supported on this device.');
        return;
      }

      setLoading(true);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        try {
          const authRes = await fetch(`${API_URL}/api/auth/apple`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              identityToken: credential.identityToken,
              name: credential.fullName ? {
                firstName: credential.fullName.givenName || '',
                lastName: credential.fullName.familyName || '',
              } : undefined,
            }),
          });

          if (authRes.ok) {
            const data = await authRes.json();
            if (data.success && data.token) {
              await login({
                user: data.user,
                accessToken: data.token,
              });

              if (credential.fullName?.givenName) setFirstName(credential.fullName.givenName);
              if (credential.fullName?.familyName) setLastName(credential.fullName.familyName);
              if (credential.email) setEmail(credential.email);

              setStep('engineered');
              return;
            }
          }
        } catch (serverErr) {
          console.log("Server auth failed, proceeding with local session:", serverErr);
        }

        // Fallback local session if server is offline/unreachable
        const localUser = {
          id: 'apple_' + (credential.user || Math.random().toString(36).substring(2, 10)),
          name: credential.fullName?.givenName ? `${credential.fullName.givenName} ${credential.fullName.familyName || ''}`.trim() : 'Apple User',
          email: credential.email || 'user@apple.com',
          avatar: null,
          plan: 'Free' as const,
          credit: 20,
        };

        await login({
          user: localUser,
          accessToken: 'local_apple_token_' + Date.now(),
        });

        if (credential.fullName?.givenName) setFirstName(credential.fullName.givenName);
        if (credential.fullName?.familyName) setLastName(credential.fullName.familyName);
        if (credential.email) setEmail(credential.email);

        setStep('engineered');
      }
    } catch (err: any) {
      const isCanceled = err?.code === 'ERR_REQUEST_CANCELED' || err?.code === '1001' || (err?.message && err.message.toLowerCase().includes('cancel'));
      if (!isCanceled) {
        console.error('Apple login error:', err);
        Alert.alert('Apple Sign-In Error', err.message || 'An error occurred during Apple sign-in.');
      } else {
        console.log('User canceled Apple login.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReferralSubmit = async () => {
    if (!referralCode.trim()) {
      setStep('loading');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/guest/${guestId}/referral`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralCode: referralCode.trim().toUpperCase() })
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert("Success", "Referral code applied successfully!");
        setStep('loading');
      } else {
        Alert.alert("Error", data.error || "This referral code is invalid.");
      }
    } catch (error) {
      Alert.alert("Error", "Network connection issue. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const saveProfileData = async () => {
    try {
      const path = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
      
      let existingProfile: any = {};
      try {
        const info = await FileSystem.getInfoAsync(path);
        if (info.exists) {
          const content = await FileSystem.readAsStringAsync(path);
          existingProfile = JSON.parse(content);
        }
      } catch (readErr) {
        console.log('No existing onboarding profile to merge:', readErr);
      }

      const mainRole = selectedRoles[0] || existingProfile.jobTitle || existingProfile.role || '';

      const profile = {
        ...existingProfile,
        firstName: firstName.trim() || existingProfile.firstName || '',
        lastName: lastName.trim() || existingProfile.lastName || '',
        email: email.trim() || existingProfile.email || '',
        jobTitle: mainRole,
        role: mainRole,
        roles: selectedRoles.length > 0 ? selectedRoles : (existingProfile.roles || [mainRole]),
        skills: existingProfile.skills && existingProfile.skills.length > 0 ? existingProfile.skills : selectedRoles,
        interests: selectedInterests.length > 0 ? selectedInterests : (existingProfile.interests || []),
        challenge: selectedChallenge || existingProfile.challenge || '',
        city: selectedCity || existingProfile.city || '',
        experience: selectedExperience || existingProfile.experience || '',
        expectedSalary: { 
          min: minSalary || existingProfile.expectedSalary?.min || 100000, 
          max: maxSalary || existingProfile.expectedSalary?.max || 180000 
        },
        hearAbout: selectedHearAbout || existingProfile.hearAbout || '',
        resumeFile: selectedResume ? {
          name: selectedResume.name,
          uri: selectedResume.uri,
          size: selectedResume.size
        } : (existingProfile.resumeFile || null)
      };

      await FileSystem.writeAsStringAsync(path, JSON.stringify(profile, null, 2));
      await FileSystem.writeAsStringAsync(`${FileSystem.documentDirectory}resume_builder_form_data.json`, JSON.stringify(profile, null, 2));
      await FileSystem.writeAsStringAsync(`${FileSystem.documentDirectory}onboarding_completed.txt`, "true");

      // Save resume to resumes.json if selected
      if (selectedResume) {
        const resumesPath = `${FileSystem.documentDirectory}resumes.json`;
        let resumesList: any[] = [];
        try {
          const resumesInfo = await FileSystem.getInfoAsync(resumesPath);
          if (resumesInfo.exists) {
            const content = await FileSystem.readAsStringAsync(resumesPath);
            resumesList = JSON.parse(content);
          }
        } catch (err) {
          console.log('Error reading resumes from storage in onboarding:', err);
        }

        // Avoid adding duplicate URIs
        const exists = resumesList.some((r: any) => r.uri === selectedResume.uri);
        if (!exists) {
          const newResumeEntry = {
            id: `onboarding-${Date.now()}`,
            name: selectedResume.name,
            date: new Date().toLocaleDateString('en-US', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            }),
            uri: selectedResume.uri,
            size: selectedResume.size,
            mimeType: 'application/pdf',
            isBuilt: false
          };
          resumesList.push(newResumeEntry);
          await FileSystem.writeAsStringAsync(resumesPath, JSON.stringify(resumesList));
        }
      }

      const session = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}session.json`);
      if (session.exists) {
        const text = await FileSystem.readAsStringAsync(`${FileSystem.documentDirectory}session.json`);
        const parsed = JSON.parse(text);
        if (parsed.accessToken) {
          await fetch(`${API_URL}/api/auth/update`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${parsed.accessToken}`
            },
            body: JSON.stringify({
              name: `${firstName.trim()} ${lastName.trim()}`.trim()
            })
          });
        }
      }
    } catch (e) {
      console.error('Failed to save profile onboarding details:', e);
    }
  };

  const finishOnboarding = async () => {
    await saveProfileData();
    try {
      await FileSystem.writeAsStringAsync(FileSystem.documentDirectory + 'has_seen_onboarding.txt', 'true');
      await FileSystem.writeAsStringAsync(FileSystem.documentDirectory + 'has_seen_referral.txt', 'true');
    } catch (e) {
      console.error(e);
    }
    router.replace('/(tabs)');
  };

  const handleBack = () => {
    if (step === 'welcome') setStep('intro');
    else if (step === 'engineered') setStep('welcome');
    else if (step === 'upload') setStep('engineered');
    else if (step === 'name') setStep('upload');
    else if (step === 'email') setStep('name');
    else if (step === 'interests') setStep('email');
    else if (step === 'jobs') setStep('interests');
    else if (step === 'experience') setStep('jobs');
    else if (step === 'location') setStep('experience');
    else if (step === 'salary') setStep('location');
    else if (step === 'challenge') setStep('salary');
    else if (step === 'hearAbout') setStep('challenge');
    else if (step === 'rateUs') setStep('hearAbout');
    else if (step === 'notifications') setStep('rateUs');
    else if (step === 'referral') setStep('notifications');
  };

  const toggleCategory = (catName: string) => {
    if (expandedCategory === catName) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(catName);
    }
  };

  const toggleRoleSelection = (role: string) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(prev => prev.filter(r => r !== role));
    } else {
      setSelectedRoles(prev => [...prev, role]);
    }
  };

  const toggleInterestSelection = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(prev => prev.filter(i => i !== interest));
    } else {
      setSelectedInterests(prev => [...prev, interest]);
    }
  };

  const handleScroll = (event: any) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / (width - 48));
    setActiveSlide(index);
  };

  const renderReferralDashes = () => {
    const chars = referralCode.padEnd(6, ' ').split('');
    return (
      <TouchableOpacity
        style={styles.dashesRow}
        activeOpacity={0.8}
        onPress={() => referralInputRef.current?.focus()}
      >
        {chars.map((char, index) => (
          <View key={index} style={styles.dashBox}>
            <Text style={styles.dashText}>{char === ' ' ? '_' : char}</Text>
          </View>
        ))}
      </TouchableOpacity>
    );
  };



  // Questionnaire navigation metrics (14 visible steps before loading screen)
  const totalSteps = 14;
  const currentProgressStep =
    step === 'engineered' ? 1
      : step === 'upload' ? 2
        : step === 'name' ? 3
          : step === 'email' ? 4
            : step === 'interests' ? 5
              : step === 'jobs' ? 6
                : step === 'experience' ? 7
                  : step === 'location' ? 8
                    : step === 'salary' ? 9
                      : step === 'challenge' ? 10
                        : step === 'hearAbout' ? 11
                          : step === 'rateUs' ? 12
                            : step === 'notifications' ? 13
                              : 14;
  const progressPercentage = (currentProgressStep / totalSteps) * 100;

  const isNameValid = firstName.trim().length > 0 && lastName.trim().length > 0;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isReferralValid = referralCode.trim().length === 6;
  const allPredefinedRoles = CATEGORIES_DATA.flatMap(c => c.roles);
  const customSelectedRoles = selectedRoles.filter(role => !allPredefinedRoles.includes(role));

  const isJobsValid = selectedRoles.length >= 3;
  const isInterestsValid = selectedInterests.length >= 3;
  const isChallengeValid = selectedChallenge !== null;
  const isLocationValid = selectedCity !== null;
  const isExperienceValid = selectedExperience !== null;
  const isHearAboutValid = selectedHearAbout !== null;

  return (
    <View style={styles.container}>
      {(step === 'intro' || step === 'welcome') ? (
        <>
          <Image
            source={require('../assets/images/onboarding.png')}
            style={styles.backgroundImage}
            resizeMode="cover"
          />
          <View style={styles.overlay} />
        </>
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#FFFFFF' }]} />
      )}

      {/* Dynamic Header Progress Bar */}
      {step !== 'intro' && step !== 'welcome' && step !== 'loading' && (
        <View style={[styles.headerContainer, { marginTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#000000" />
          </TouchableOpacity>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
          </View>
        </View>
      )}

      <Animated.View style={{ flex: 1, width: '100%', opacity, transform: [{ translateX: slideAnim }] }}>

        {step === 'intro' && (
          <View style={[styles.inner, { paddingTop: insets.top + 15, paddingBottom: insets.bottom + 30 }]}>
            <View style={styles.laurelContainer}>
              <Image
                source={require('../assets/images/customer-info.png')}
                style={styles.laurelImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.centerTextContainer}>
              <Text style={[styles.largeTitleText, styles.staircase1]}>10X</Text>
              <Text style={[styles.largeTitleText, styles.staircase2]}>FASTER</Text>
              <Text style={[styles.largeTitleText, styles.staircase3]}>INTERVIEW</Text>
              <View style={styles.subTitleBlock}>
                <Text style={[styles.mediumTitleText, styles.staircase4]}>WITH</Text>
                <Text style={[styles.mediumTitleText, styles.staircase5]}>TAILORED</Text>
                <Text style={[styles.mediumTitleText, styles.staircase6]}>RESUME</Text>
              </View>
            </View>

            <AppleNativeButton
              style={styles.continueBtn}
              onPress={() => setStep('welcome')}
            >
              <Text style={styles.continueBtnText}>Continue</Text>
            </AppleNativeButton>
          </View>
        )}

        {step === 'welcome' && (
          <View style={[styles.inner, { paddingTop: insets.top + 30, paddingBottom: insets.bottom + 30 }]}>
            <View style={styles.welcomeHeader}>
              <Text style={styles.welcomeTitle}>WELCOME</Text>
            </View>

            <View style={styles.bottomControls}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="large" style={{ marginBottom: 40 }} />
              ) : (
                <View style={styles.authBtnContainer}>
                  <TouchableOpacity
                    style={styles.authBtn}
                    activeOpacity={0.85}
                    onPress={handleAppleLogin}
                  >
                    <Ionicons name="logo-apple" size={22} color="#000000" style={styles.authBtnIcon} />
                    <Text style={styles.authBtnText}>Continue with Apple</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.authBtn, { marginTop: 14 }]}
                    activeOpacity={0.85}
                    onPress={handleGooglePress}
                  >
                    <Image source={require('../assets/images/google-logo.png')} style={styles.googleIconImage} resizeMode="contain" />
                    <Text style={styles.authBtnText}>Continue with Google</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.skipBtnLink} onPress={() => setStep('engineered')}>
                    <Text style={styles.skipBtnText}>Skip for now</Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={styles.termsText}>
                By continuing you agree to our{' '}
                <Text
                  style={styles.termsUnderline}
                  onPress={() => Linking.openURL('https://pixflow.net/pixflow-app-user-agreement/')}
                >
                  Terms of Services
                </Text>{' '}
                &{' '}
                <Text
                  style={styles.termsUnderline}
                  onPress={() => Linking.openURL('https://pixflow.net/pixflow-resumeok-app-privacy-policy/')}
                >
                  Privacy Policy.
                </Text>
              </Text>
            </View>
          </View>
        )}

        {step === 'referral' && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'android' ? 'height' : undefined}
            style={styles.keyboardContainer}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={[styles.questionInner, { paddingBottom: insets.bottom + 120 }]}>
                <View style={styles.questionHeadingContainer}>
                  <Text style={styles.questionTitle}>Do you have a referral{"\n"}code?</Text>
                </View>

                <TextInput
                  ref={referralInputRef}
                  style={styles.hiddenTextInput}
                  maxLength={6}
                  value={referralCode}
                  onChangeText={(t) => setReferralCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  keyboardType="default"
                  autoCapitalize="characters"
                  autoCorrect={false}
                />

                <View style={{ width: '100%', alignItems: 'center', marginTop: 15 }}>
                  {renderReferralDashes()}
                </View>

                <View style={styles.referralMiddleArea}>
                  <Image
                    source={require('../assets/images/referral.png')}
                    style={styles.laptopAsset}
                    resizeMode="contain"
                  />
                </View>

                <View style={[styles.fixedBottomDock, dockBottomStyle]}>
                  <TouchableOpacity style={styles.skipBtnLinkBlack} onPress={() => setStep('loading')}>
                    <Text style={[styles.skipBtnTextBlack, { textDecorationLine: 'none' }]}>Skip for now</Text>
                  </TouchableOpacity>

                  <AppleNativeButton
                    style={[styles.actionBtnBlack, !isReferralValid ? styles.actionBtnDisabled : null]}
                    disabled={!isReferralValid || loading}
                    onPress={handleReferralSubmit}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.actionBtnTextWhite}>Continue</Text>
                    )}
                  </AppleNativeButton>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        )}

        {step === 'engineered' && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'android' ? 'height' : undefined}
            style={styles.keyboardContainer}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={[styles.questionInner, { paddingHorizontal: 0, paddingBottom: insets.bottom + 90 }]}>
                <View style={[styles.engineeredHeadingContainer, { paddingHorizontal: 24 }]}>
                  <Text style={styles.engineeredHeadingSub}>More than AI.</Text>
                  <Text style={styles.engineeredHeadingMain}>Engineered</Text>
                  <Text style={styles.engineeredHeadingSub}>{"for today's hiring process."}</Text>
                </View>

                <View style={styles.engineeredLoopContainer}>
                  {/* Row 1 */}
                  <View style={styles.tickerRow}>
                    <Animated.View style={[styles.tickerWrapper, { transform: [{ translateX: scrollX1 }] }]}>
                      <Image
                        source={require('../assets/images/Engineered2.png')}
                        style={styles.tickerImage}
                        resizeMode="contain"
                      />
                      <Image
                        source={require('../assets/images/Engineered2.png')}
                        style={styles.tickerImage}
                        resizeMode="contain"
                      />
                    </Animated.View>
                  </View>

                  {/* Row 2 */}
                  <View style={styles.tickerRow}>
                    <Animated.View style={[styles.tickerWrapper, { transform: [{ translateX: scrollX2 }] }]}>
                      <Image
                        source={require('../assets/images/Engineered1.png')}
                        style={styles.tickerImage1}
                        resizeMode="contain"
                      />
                      <Image
                        source={require('../assets/images/Engineered1.png')}
                        style={styles.tickerImage1}
                        resizeMode="contain"
                      />
                    </Animated.View>
                  </View>

                  {/* Row 3 */}
                  <View style={styles.tickerRow}>
                    <Animated.View style={[styles.tickerWrapper, { transform: [{ translateX: scrollX3 }] }]}>
                      <Image
                        source={require('../assets/images/Engineered3.png')}
                        style={styles.tickerImage}
                        resizeMode="contain"
                      />
                      <Image
                        source={require('../assets/images/Engineered3.png')}
                        style={styles.tickerImage}
                        resizeMode="contain"
                      />
                    </Animated.View>
                  </View>
                </View>

                <View style={styles.companiesPillContainer}>
                  <View style={styles.companiesPill}>
                    <Text style={styles.companiesPillText}>+1200 Companies</Text>
                  </View>
                </View>

                <View style={[styles.fixedBottomDock, dockBottomStyle]}>
                  <AppleNativeButton
                    style={styles.actionBtnBlack}
                    onPress={() => setStep('upload')}
                  >
                    <Text style={styles.actionBtnTextWhite}>Continue</Text>
                  </AppleNativeButton>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        )}

        {step === 'name' && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'android' ? 'height' : undefined}
            style={styles.keyboardContainer}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={[styles.questionInner, { paddingBottom: insets.bottom + 30 }]}>
                <View style={styles.questionHeadingContainer}>
                  <Text style={styles.questionTitle}>What should we{"\n"}call you?</Text>
                </View>

                <View style={styles.inputCenteringGroup}>
                  <TextInput
                    ref={nameInputRef}
                    style={styles.nameTextInput}
                    placeholder="First Name"
                    placeholderTextColor="rgba(0,0,0,0.25)"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                  <TextInput
                    style={[styles.nameTextInput, { marginTop: 25 }]}
                    placeholder="Last Name"
                    placeholderTextColor="rgba(0,0,0,0.25)"
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>

                <View style={[styles.fixedBottomDock, dockBottomStyle]}>
                  <AppleNativeButton
                    style={[styles.actionBtnBlack, !isNameValid ? styles.actionBtnDisabled : null]}
                    disabled={!isNameValid}
                    onPress={() => setStep('email')}
                  >
                    <Text style={styles.actionBtnTextWhite}>Continue</Text>
                  </AppleNativeButton>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        )}

        {step === 'email' && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'android' ? 'height' : undefined}
            style={styles.keyboardContainer}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={[styles.questionInner, { paddingBottom: insets.bottom + 30 }]}>
                <View style={styles.questionHeadingContainer}>
                  <Text style={styles.questionTitle}>{"What's the best work"}{"\n"}email to reach you?</Text>
                </View>

                <View style={styles.inputCenteringGroup}>
                  <TextInput
                    ref={emailInputRef}
                    style={styles.nameTextInput}
                    placeholder="name@company.com"
                    placeholderTextColor="rgba(0,0,0,0.25)"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={[styles.fixedBottomDock, dockBottomStyle]}>
                  <AppleNativeButton
                    style={[styles.actionBtnBlack, !isEmailValid ? styles.actionBtnDisabled : null]}
                    disabled={!isEmailValid}
                    onPress={() => setStep('interests')}
                  >
                    <Text style={styles.actionBtnTextWhite}>Continue</Text>
                  </AppleNativeButton>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        )}

        {step === 'jobs' && (
          <View style={styles.keyboardContainer}>
            <View style={[styles.questionInner, { paddingBottom: 0 }]}>
              <View style={styles.questionHeadingContainer}>
                <Text style={styles.questionTitle}>What job are you{"\n"}targeting?</Text>
                <Text style={styles.questionSubtitle}>We calibrate your matches, Select at least 3 roles.</Text>
              </View>

              <View style={styles.searchBarContainer}>
                <Ionicons name="search" size={20} color="#94A3B8" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchBarInput}
                  placeholder="Search or type custom role..."
                  placeholderTextColor="#94A3B8"
                  value={roleQuery}
                  onChangeText={setRoleQuery}
                  autoCapitalize="words"
                />
                {roleQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setRoleQuery('')}>
                    <Ionicons name="close-circle" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              {roleQuery.trim().length > 0 && !allPredefinedRoles.some(r => r.toLowerCase() === roleQuery.trim().toLowerCase()) && !selectedRoles.some(r => r.toLowerCase() === roleQuery.trim().toLowerCase()) && (
                <TouchableOpacity
                  style={styles.addCustomRoleRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    const newRole = roleQuery.trim();
                    if (newRole && !selectedRoles.includes(newRole)) {
                      setSelectedRoles(prev => [...prev, newRole]);
                    }
                    setRoleQuery('');
                  }}
                >
                  <Ionicons name="add-circle" size={22} color="#007AFF" style={{ marginRight: 8 }} />
                  <Text style={styles.addCustomRoleText}>
                    Add "<Text style={{ fontWeight: '600' }}>{roleQuery.trim()}</Text>" as custom role
                  </Text>
                </TouchableOpacity>
              )}

              <ScrollView
                style={styles.accordionScrollView}
                contentContainerStyle={styles.accordionScrollContent}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                scrollEventThrottle={16}
                bounces={true}
                overScrollMode="always"
              >
                {/* 1. Custom Roles Section */}
                {customSelectedRoles.length > 0 && (
                  <View style={[styles.accordionSection, { borderBottomColor: '#007AFF', borderBottomWidth: 1.5 }]}>
                    <View style={styles.accordionHeader}>
                      <View style={styles.accordionHeaderLeft}>
                        <Ionicons name="star" size={20} color="#007AFF" style={{ marginRight: 10 }} />
                        <View>
                          <Text style={[styles.accordionCategoryTitle, { color: '#007AFF' }]}>Custom Roles</Text>
                          <Text style={styles.accordionCategorySubtitle}>
                            {customSelectedRoles.length} Custom {customSelectedRoles.length === 1 ? 'Role' : 'Roles'} Selected
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={[styles.accordionContent, { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 8 }]}>
                      {customSelectedRoles.map((role) => (
                        <TouchableOpacity
                          key={role}
                          style={[styles.roleBadge, styles.roleBadgeSelected, { borderColor: '#007AFF', flexDirection: 'row', alignItems: 'center' }]}
                          activeOpacity={0.8}
                          onPress={() => toggleRoleSelection(role)}
                        >
                          <Text style={[styles.roleBadgeText, styles.roleBadgeTextSelected, { color: '#FFFFFF' }]}>
                            {role}
                          </Text>
                          <Ionicons name="close-circle" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* 2. Predefined Categories */}
                {CATEGORIES_DATA.map((category) => {
                  const filteredRoles = category.roles.filter(role =>
                    role.toLowerCase().includes(roleQuery.toLowerCase())
                  );

                  if (roleQuery && filteredRoles.length === 0) return null;

                  const isExpanded = roleQuery ? true : (expandedCategory === category.name);
                  const selectedInCategory = filteredRoles.filter(role => selectedRoles.includes(role)).length;

                  return (
                    <View key={category.name} style={styles.accordionSection}>
                      <TouchableOpacity
                        style={styles.accordionHeader}
                        activeOpacity={0.7}
                        onPress={() => toggleCategory(category.name)}
                      >
                        <View style={styles.accordionHeaderLeft}>
                          <Ionicons name={category.icon as any} size={20} color="#000000" style={{ marginRight: 10 }} />
                          <View>
                            <Text style={styles.accordionCategoryTitle}>{category.name}</Text>
                            <Text style={styles.accordionCategorySubtitle}>
                              {filteredRoles.length} {filteredRoles.length === 1 ? 'Role' : 'Roles'}
                              {selectedInCategory > 0 ? ` (${selectedInCategory} Selected)` : ''}
                            </Text>
                          </View>
                        </View>
                        {!roleQuery && (
                          <Ionicons
                            name={isExpanded ? "chevron-up" : "chevron-down"}
                            size={18}
                            color="#000000"
                          />
                        )}
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={styles.accordionContent}>
                          {filteredRoles.map((role) => {
                            const isSelected = selectedRoles.includes(role);
                            return (
                              <TouchableOpacity
                                key={role}
                                style={[
                                  styles.roleBadge,
                                  isSelected ? styles.roleBadgeSelected : null
                                ]}
                                activeOpacity={0.8}
                                onPress={() => toggleRoleSelection(role)}
                              >
                                <Text style={[
                                  styles.roleBadgeText,
                                  isSelected ? styles.roleBadgeTextSelected : null
                                ]}>
                                  {role}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>

              <View style={[styles.fixedBottomDock, dockBottomStyle]}>
                <AppleNativeButton
                  style={[styles.actionBtnBlack, !isJobsValid ? styles.actionBtnDisabled : null]}
                  disabled={!isJobsValid}
                  onPress={() => setStep('experience')}
                >
                  <Text style={styles.actionBtnTextWhite}>
                    {selectedRoles.length > 0
                      ? `Continue With (${selectedRoles.length} Roles)`
                      : 'Continue'
                    }
                  </Text>
                </AppleNativeButton>
              </View>
            </View>
          </View>
        )}

        {step === 'interests' && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'android' ? 'height' : undefined}
            style={styles.keyboardContainer}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={[styles.questionInner, { paddingBottom: insets.bottom + 30 }]}>
                <View style={styles.questionHeadingContainer}>
                  <Text style={styles.questionTitle}>{"What's most important"}{"\n"}in your next job?</Text>
                  <Text style={styles.questionSubtitle}>We calibrate your matches, Select 3 Interests.</Text>
                </View>

                <View style={styles.interestsGridOuter}>
                  <View style={styles.interestsGrid}>
                    {INTERESTS_DATA.map((item) => {
                      const isSelected = selectedInterests.includes(item.label);
                      return (
                        <TouchableOpacity
                          key={item.label}
                          style={[
                            styles.interestBadge,
                            isSelected ? styles.interestBadgeSelected : null
                          ]}
                          activeOpacity={0.8}
                          onPress={() => toggleInterestSelection(item.label)}
                        >
                          <Text style={styles.interestBadgeEmoji}>{item.emoji}</Text>
                          <Text style={[
                            styles.interestBadgeText,
                            isSelected ? styles.interestBadgeTextSelected : null
                          ]}>
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={[styles.fixedBottomDock, dockBottomStyle]}>
                  <AppleNativeButton
                    style={[styles.actionBtnBlack, !isInterestsValid ? styles.actionBtnDisabled : null]}
                    disabled={!isInterestsValid}
                    onPress={() => setStep('jobs')}
                  >
                    <Text style={styles.actionBtnTextWhite}>Continue</Text>
                  </AppleNativeButton>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        )}

        {step === 'challenge' && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'android' ? 'height' : undefined}
            style={styles.keyboardContainer}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={[styles.questionInner, { paddingBottom: insets.bottom + 30 }]}>
                <View style={styles.questionHeadingContainer}>
                  <Text style={styles.questionTitle}>What is your biggest{"\n"}challenge?</Text>
                  <Text style={styles.questionSubtitle}>We will help you overcome it.</Text>
                </View>

                <View style={styles.optionsListGroup}>
                  {CHALLENGES_LIST.map((opt) => {
                    const isSelected = selectedChallenge === opt;
                    return (
                      <TouchableOpacity
                        key={opt}
                        style={[
                          styles.radioItemBox,
                          isSelected ? styles.radioItemBoxSelected : null
                        ]}
                        activeOpacity={0.8}
                        onPress={() => setSelectedChallenge(opt)}
                      >
                        <Text style={[
                          styles.radioItemText,
                          isSelected ? styles.radioItemTextSelected : null
                        ]}>{opt}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={[styles.fixedBottomDock, dockBottomStyle]}>
                  <AppleNativeButton
                    style={[styles.actionBtnBlack, !isChallengeValid ? styles.actionBtnDisabled : null]}
                    disabled={!isChallengeValid}
                    onPress={() => setStep('hearAbout')}
                  >
                    <Text style={styles.actionBtnTextWhite}>Continue</Text>
                  </AppleNativeButton>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        )}

        {step === 'location' && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'android' ? 'height' : undefined}
            style={styles.keyboardContainer}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={[styles.questionInner, { paddingBottom: insets.bottom + 30 }]}>
                <View style={styles.questionHeadingContainer}>
                  <Text style={styles.questionTitle}>Where do you want to work?</Text>
                  <Text style={styles.questionSubtitle}>{"Don't worry, you can change it later."}</Text>
                </View>

                <View style={styles.locationContainer}>
                  {selectedCity ? (
                    <View style={styles.selectedCityPill}>
                      <Text style={styles.selectedCityText}>{selectedCity}</Text>
                      <TouchableOpacity onPress={() => setSelectedCity(null)} style={{ position: 'absolute', right: 10, top: 15 }}>
                        <Ionicons name="close-circle" size={20} color="rgba(0,0,0,0.4)" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ width: '100%', alignItems: 'flex-start' }}>
                      <View style={styles.citySearchInputWrapper}>
                        <TextInput
                          ref={cityInputRef}
                          style={styles.citySearchInput}
                          placeholder="Search for a city..."
                          placeholderTextColor="rgba(0,0,0,0.3)"
                          value={citySearch}
                          onChangeText={setCitySearch}
                        />
                        {isSearchingCity && (
                          <ActivityIndicator
                            size="small"
                            color="#000000"
                            style={styles.citySearchSpinner}
                          />
                        )}
                      </View>

                      {displayedCities.length > 0 && (
                        <ScrollView
                          style={styles.suggestionsContainer}
                          nestedScrollEnabled={true}
                          keyboardShouldPersistTaps="handled"
                          showsVerticalScrollIndicator={false}
                        >
                          {displayedCities.map((c, idx) => (
                            <TouchableOpacity
                              key={`${c}-${idx}`}
                              style={styles.suggestionItem}
                              onPress={() => {
                                setSelectedCity(c);
                                setCitySearch('');
                              }}
                            >
                              <Ionicons name="location-outline" size={16} color="#666666" style={{ marginRight: 8 }} />
                              <Text style={styles.suggestionText}>{c}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  )}
                </View>

                <View style={[styles.fixedBottomDock, dockBottomStyle]}>
                  <AppleNativeButton
                    style={[styles.actionBtnBlack, !isLocationValid ? styles.actionBtnDisabled : null]}
                    disabled={!isLocationValid}
                    onPress={() => setStep('salary')}
                  >
                    <Text style={styles.actionBtnTextWhite}>Continue</Text>
                  </AppleNativeButton>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        )}

        {step === 'experience' && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'android' ? 'height' : undefined}
            style={styles.keyboardContainer}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={[styles.questionInner, { paddingBottom: insets.bottom + 30 }]}>
                <View style={styles.questionHeadingContainer}>
                  <Text style={[styles.questionTitle, { paddingBottom: 80 }]}>How much experience{"\n"}do you have?</Text>
                </View>

                <View style={styles.optionsListGroup}>
                  {EXPERIENCE_LIST.map((opt) => {
                    const isSelected = selectedExperience === opt;
                    return (
                      <TouchableOpacity
                        key={opt}
                        style={[
                          styles.radioItemBox,
                          isSelected ? styles.radioItemBoxSelected : null
                        ]}
                        activeOpacity={0.8}
                        onPress={() => setSelectedExperience(opt)}
                      >
                        <Text style={[
                          styles.radioItemText,
                          isSelected ? styles.radioItemTextSelected : null
                        ]}>{opt}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={[styles.fixedBottomDock, dockBottomStyle]}>
                  <AppleNativeButton
                    style={[styles.actionBtnBlack, !isExperienceValid ? styles.actionBtnDisabled : null]}
                    disabled={!isExperienceValid}
                    onPress={() => setStep('location')}
                  >
                    <Text style={styles.actionBtnTextWhite}>Continue</Text>
                  </AppleNativeButton>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        )}

        {step === 'salary' && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'android' ? 'height' : undefined}
            style={styles.keyboardContainer}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={[styles.questionInner, { paddingBottom: insets.bottom + 30 }]}>
                <View style={styles.questionHeadingContainer}>
                  <Text style={styles.questionTitle}>Expected salary range?</Text>
                </View>

                <View style={styles.salarySlidersArea}>
                  <View style={styles.sliderGroup}>
                    <View style={styles.sliderLabelRow}>
                      <Text style={styles.sliderTitle}>Minimum Salary</Text>
                      <Text style={styles.sliderValue}>${minSalary.toLocaleString()}</Text>
                    </View>
                    <Slider
                      style={styles.sliderBar}
                      minimumValue={0}
                      maximumValue={300000}
                      step={5000}
                      value={minSalary}
                      onValueChange={setMinSalary}
                      minimumTrackTintColor="#007AFF"
                      maximumTrackTintColor="#EAEAEA"
                      thumbTintColor="#FFFFFF"
                    />
                  </View>

                  <View style={[styles.sliderGroup, { marginTop: 40 }]}>
                    <View style={styles.sliderLabelRow}>
                      <Text style={styles.sliderTitle}>Maximum Salary</Text>
                      <Text style={styles.sliderValue}>${maxSalary.toLocaleString()}</Text>
                    </View>
                    <Slider
                      style={styles.sliderBar}
                      minimumValue={100000}
                      maximumValue={500000}
                      step={5000}
                      value={maxSalary}
                      onValueChange={setMaxSalary}
                      minimumTrackTintColor="#007AFF"
                      maximumTrackTintColor="#EAEAEA"
                      thumbTintColor="#FFFFFF"
                    />
                  </View>
                </View>

                <View style={[styles.fixedBottomDock, dockBottomStyle]}>
                  <AppleNativeButton
                    style={styles.actionBtnBlack}
                    onPress={() => setStep('challenge')}
                  >
                    <Text style={styles.actionBtnTextWhite}>Continue</Text>
                  </AppleNativeButton>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        )}

        {step === 'hearAbout' && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'android' ? 'height' : undefined}
            style={styles.keyboardContainer}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={[styles.questionInner, { paddingBottom: insets.bottom + 30 }]}>
                <View style={styles.questionHeadingContainer}>
                  <Text style={[styles.questionTitle, { paddingBottom: 68 }]}>How did you hear{"\n"}about ResumeOK?</Text>
                </View>

                <View style={styles.optionsListGroup}>
                  {HEAR_ABOUT_LIST.map((opt) => {
                    const isSelected = selectedHearAbout === opt;
                    return (
                      <TouchableOpacity
                        key={opt}
                        style={[
                          styles.radioItemBox,
                          isSelected ? styles.radioItemBoxSelected : null
                        ]}
                        activeOpacity={0.8}
                        onPress={() => setSelectedHearAbout(opt)}
                      >
                        <Text style={[
                          styles.radioItemText,
                          isSelected ? styles.radioItemTextSelected : null
                        ]}>{opt}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={[styles.fixedBottomDock, dockBottomStyle]}>
                  <AppleNativeButton
                    style={[styles.actionBtnBlack, !isHearAboutValid ? styles.actionBtnDisabled : null]}
                    disabled={!isHearAboutValid}
                    onPress={() => setStep('rateUs')}
                  >
                    <Text style={styles.actionBtnTextWhite}>Continue</Text>
                  </AppleNativeButton>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        )}

        {step === 'rateUs' && (
          <View style={[styles.questionInner, { paddingBottom: insets.bottom + 30 }]}>
            <View style={styles.questionHeadingContainer}>
              <Text style={styles.questionTitle}>Help us grow!</Text>
              <Text style={styles.questionSubtitle}>{"We’re a small team, we'd really appreciate\na quick rating."}</Text>
            </View>

            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Image
                source={require('../assets/images/onboarding/rate.png')}
                style={styles.ratingImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.ratingActionsContainer}>
              <TouchableOpacity
                style={[
                  styles.iRatedLink,
                  { opacity: showIRated ? 1 : 0 }
                ]}
                disabled={!showIRated}
                onPress={() => setStep('notifications')}
              >
                <Text style={styles.iRatedLinkText}>I rated!</Text>
              </TouchableOpacity>

              <AppleNativeButton
                style={styles.actionBtnBlack}
                onPress={() => handleRateApp()}
              >
                <Text style={styles.actionBtnTextWhite}>Leave a rating!</Text>
              </AppleNativeButton>
            </View>
          </View>
        )}

        {step === 'notifications' && (
          <View style={[styles.questionInner, { paddingBottom: insets.bottom + 30 }]}>
            <View style={styles.questionHeadingContainer}>
              <Text style={styles.questionTitle}>Stay on top of job{"\n"}search.</Text>
              <Text style={styles.questionSubtitle}>Never miss personalized job opportunities.</Text>
            </View>

            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Image
                source={require('../assets/images/bell.png')}
                style={styles.bellImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.ratingActionsContainer}>
              <TouchableOpacity
                style={[
                  styles.iRatedLink,
                  { opacity: showIEnabled ? 1 : 0 }
                ]}
                disabled={!showIEnabled}
                onPress={() => setStep('referral')}
              >
                <Text style={styles.skipBtnTextBlack}>I enabled!</Text>
              </TouchableOpacity>

              <AppleNativeButton
                style={styles.actionBtnBlack}
                onPress={() => handleRequestNotifications()}
              >
                <Text style={styles.actionBtnTextWhite}>Enable Notifications</Text>
              </AppleNativeButton>
            </View>
          </View>
        )}

        {step === 'upload' && (
          <View style={[styles.questionInner, { paddingBottom: insets.bottom + 30 }]}>
            {isParsing ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%', paddingHorizontal: 20 }}>
                <ActivityIndicator
                  size="large"
                  color="#000000"
                  style={{ transform: [{ scale: 1.5 }], marginBottom: 24 }}
                />
                <Text style={{ fontSize: 24, fontWeight: '700', color: '#000000', textAlign: 'center', marginBottom: 12 }}>
                  Analyzing your resume...
                </Text>
                <Text style={{ fontSize: 16, color: '#666666', textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 }}>
                  We are reading your experience, education, and skills to auto-fill the onboarding forms.
                </Text>
              </View>
            ) : (
              <>
                <View style={[styles.questionHeadingContainer, { marginTop: 25, marginBottom: 10 }]}>
                  <Text style={{ fontSize: 32, fontWeight: '700', color: '#000000', textAlign: 'center', lineHeight: 38, letterSpacing: -0.5 }}>
                    Upload your resume{"\n"}or create one.
                  </Text>
                </View>

                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                  {selectedResume ? (
                    <View style={styles.selectedFileCol}>
                      <Ionicons name="checkmark-circle" size={56} color="#34C759" />
                      <Text style={styles.fileNameText} numberOfLines={1}>{selectedResume.name}</Text>
                      {selectedResume.size && (
                        <Text style={styles.fileSizeText}>
                          {(selectedResume.size / 1024).toFixed(1)} KB
                        </Text>
                      )}
                      <TouchableOpacity
                        style={styles.removeFileBtn}
                        onPress={() => setSelectedResume(null)}
                      >
                        <Text style={styles.removeFileText}>Remove file</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Image
                      source={require('../assets/images/onboarding/onboarding-resume.png')}
                      style={{ width: width * 0.65, height: 230 }}
                      resizeMode="contain"
                    />
                  )}
                </View>

                <View style={{ width: '100%', alignItems: 'center', marginBottom: 10 }}>
                  <TouchableOpacity
                    style={{ paddingVertical: 12, paddingHorizontal: 20, marginBottom: 12 }}
                    activeOpacity={0.7}
                    onPress={() => setStep('name')}
                  >
                    <Text style={{ color: '#666666', fontSize: 17, fontWeight: '500', textAlign: 'center' }}>
                      Build Later
                    </Text>
                  </TouchableOpacity>

                  <AppleNativeButton
                    style={styles.actionBtnBlack}
                    onPress={selectedResume ? () => setStep('name') : handlePickResume}
                  >
                    <Text style={styles.actionBtnTextWhite}>
                      {selectedResume ? 'Continue' : 'Upload resume'}
                    </Text>
                  </AppleNativeButton>
                </View>
              </>
            )}
          </View>
        )}

        {step === 'loading' && (
          <View style={styles.loadingScreenContainer}>
            <ActivityIndicator
              size="large"
              color="#000000"
              style={{ transform: [{ scale: 1.8 }], marginBottom: 50 }}
            />
            <Text style={styles.loadingText}>Building your</Text>
            <Text style={styles.loadingText}>personalized career</Text>
            <Text style={styles.loadingText}>journey</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    width: '100%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchBarInput: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
    paddingVertical: 8,
  },
  addCustomRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  addCustomRoleText: {
    fontSize: 15,
    color: '#1D4ED8',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  keyboardContainer: {
    flex: 1,
    width: '100%',
  },
  questionInner: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // Progress Header
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 50,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEFEF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  progressBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#EAEAEA',
    borderRadius: 3,
    marginLeft: 20,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#000000',
    borderRadius: 3,
  },
  // STEP 1 - INTRO
  backgroundImage: {
    position: 'absolute',
    width: width,
    height: height * 1.28,
    bottom: 0,
  },
  laurelContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 15,
  },
  laurelImage: {
    width: 220,
    height: 50,
  },
  centerTextContainer: {
    alignSelf: 'flex-start',
    width: '100%',
    marginTop: -20,
  },
  largeTitleText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 1.5,
    lineHeight: 36,
    textTransform: 'uppercase',
  },
  subTitleBlock: {
    marginTop: 200,
  },
  mediumTitleText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 1,
    lineHeight: 28,
    textTransform: 'uppercase',
  },
  staircase1: {
    marginLeft: width * 0.05,
  },
  staircase2: {
    marginLeft: width * 0.16,
  },
  staircase3: {
    marginLeft: width * 0.32,
  },
  staircase4: {
    marginLeft: width * 0.28,
  },
  staircase5: {
    marginLeft: width * 0.39,
  },
  staircase6: {
    marginLeft: width * 0.55,
  },
  continueBtn: {
    width: '100%',
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  continueBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  // STEP 2 - WELCOME
  welcomeHeader: {
    alignItems: 'center',
    marginTop: 40,
  },
  welcomeTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  bottomControls: {
    width: '100%',
    alignItems: 'center',
  },
  authBtnContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 35,
  },
  authBtn: {
    width: '100%',
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleIconImage: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  authBtnIcon: {
    marginRight: 10,
  },
  authBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  skipBtnLink: {
    marginTop: 10,
    paddingVertical: 5,
  },
  skipBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'none',
  },
  termsText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 15,
  },
  termsUnderline: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  // STEP 3 - REFERRAL
  hiddenTextInput: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
  },
  referralMiddleArea: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    width: '100%',
    marginVertical: 15,
  },
  dashesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  dashBox: {
    width: 38,
    height: 44,

    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  dashText: {
    fontSize: 25,
    fontWeight: '600',
    color: '#6b6b6bff',
  },
  laptopAsset: {
    width: width * 0.7,
    height: 150,
  },
  fixedBottomDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'center',
    zIndex: 99,
  },
  referralActions: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  ratingActionsContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  rateSubtitle: {
    fontSize: 16,
    color: 'rgba(0,0,0,0.6)',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
  iRatedLink: {
    paddingVertical: 8,
    marginBottom: 12,
  },
  iRatedLinkText: {
    fontSize: 16,
    color: '#4A4A4A',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  skipBtnLinkBlack: {
    marginBottom: 10,
    paddingVertical: 10,
  },
  skipBtnTextBlack: {
    color: 'rgba(0,0,0,0.5)',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'none',
  },
  // STEP 4 - ENGINEERED
  engineeredHeadingContainer: {
    alignItems: 'center',
    marginTop: 25,
    marginBottom: 15,
  },
  engineeredHeadingMain: {
    color: '#000000',
    fontSize: 42,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: 4,
    letterSpacing: -0.5,
  },
  engineeredHeadingSub: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  engineeredLoopContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  tickerRow: {
    width: '100%',
    height: 88,
    marginVertical: 4,
    overflow: 'hidden',
  },
  tickerWrapper: {
    flexDirection: 'row',
  },
  tickerImage: {
    height: 88,
    width: 900,
  },
  tickerImage1: {
    height: 88,
    width: 650,
  },
  companiesPillContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  companiesPill: {
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  companiesPillText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  // QUESTION GENERAL
  questionHeadingContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  questionTitle: {
    color: '#000000',
    fontSize: 32,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 38,

  },
  questionSubtitle: {
    color: 'rgba(0,0,0,0.5)',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  inputCenteringGroup: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 70
  },
  nameTextInput: {
    width: '90%',
    height: 60,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '600',
    color: '#000000',
    borderBottomWidth: 0,
  },
  actionBtnBlack: {
    width: '100%',
    height: 56,
    backgroundColor: '#000000',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  actionBtnDisabled: {
    backgroundColor: '#E0E0E0',
  },
  actionBtnTextWhite: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // STEP 7 - JOBS ACCORDION
  accordionContainer: {
    flex: 1,
    width: '100%',
  },
  accordionScrollView: {
    flex: 1,
    width: '100%',
    marginTop: 15,
  },
  accordionScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  accordionSection: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingVertical: 14,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accordionCategoryTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  accordionCategorySubtitle: {
    fontSize: 11,
    color: 'rgba(0,0,0,0.4)',
    marginTop: 2,
    fontWeight: '500',
  },
  accordionContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    paddingLeft: 30,
  },
  roleBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  roleBadgeSelected: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  roleBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  roleBadgeTextSelected: {
    color: '#FFFFFF',
  },
  accordionActions: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  // STEP 8 - INTERESTS GRID
  interestsGridOuter: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    width: '100%',
  },
  interestBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E2E2',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 22,
    margin: 3,
  },
  interestBadgeSelected: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  interestBadgeEmoji: {
    fontSize: 15,
    marginRight: 6,
  },
  interestBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  interestBadgeTextSelected: {
    color: '#FFFFFF',
  },
  // RADIO LIST GROUP (CHALLENGE / EXPERIENCE / HEARABOUT)
  optionsListGroup: {
    width: '100%',
    justifyContent: 'flex-start',
    flex: 1,

  },
  radioItemBox: {
    width: '100%',
    height: 56,
    backgroundColor: '#F5F5F5',
    borderRadius: 18,
    paddingHorizontal: 20,
    justifyContent: 'center',
    marginBottom: 5,
    borderWidth: 2,
    borderColor: '#F5F5F5',
  },
  radioItemBoxSelected: {
    borderColor: '#000000',
    backgroundColor: '#000000',
  },
  radioItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  radioItemTextSelected: {
    color: '#FFFFFF',
  },
  // LOCATION PAGE
  locationContainer: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 0,
    marginTop: 35,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  selectedCityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    alignSelf: 'flex-start',
    width: "100%",
    position: "relative",
  },
  selectedCityText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  citySearchInputWrapper: {
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
  },
  citySearchInput: {
    width: '100%',
    height: 56,
    backgroundColor: '#F3F3F3',
    borderRadius: 20,
    paddingLeft: 20,
    paddingRight: 45,
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    textAlign: 'left',
  },
  citySearchSpinner: {
    position: 'absolute',
    right: 15,
  },
  suggestionsContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    marginTop: 8,
    maxHeight: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  // SALARY SLIDERS
  salarySlidersArea: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 20,
    justifyContent: 'flex-start',
    paddingTop: 120


  },
  sliderGroup: {
    width: '100%',
  },
  sliderLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sliderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
  },
  sliderBar: {
    width: '100%',
    height: 40,
  },
  // FINAL TRANSITION LOADING PAGE
  loadingScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    width: '100%',
  },
  loadingText: {
    fontSize: 26,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    lineHeight: 34,
  },
  // UPLOAD RESUME PAGE
  uploadFolderImage: {
    width: 200,
    height: 180,
  },
  uploadActionsArea: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  uploadOutlineBtn: {
    width: '100%',
    height: 56,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadOutlineBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  selectedFileCol: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  fileNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    marginTop: 10,
    textAlign: 'center',
  },
  fileSizeText: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  removeFileBtn: {
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
  },
  removeFileText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: '700',
  },
  ratingImage: {
    width: 330,
    height: 330,
  },
  bellImage: {
    width: 330,
    height: 330,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  rateModalCard: {
    width: 280,
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    alignItems: 'center',
    paddingTop: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  rateAppIcon: {
    width: 54,
    height: 54,
    borderRadius: 12,
    marginBottom: 12,
  },
  rateModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 4,
  },
  rateModalSubtitle: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.7)',
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
    lineHeight: 18,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.2)',
  },
  rateModalNotNowBtn: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.2)',
  },
  rateModalNotNowText: {
    fontSize: 17,
    fontWeight: '400',
    color: '#007AFF',
  },
});
