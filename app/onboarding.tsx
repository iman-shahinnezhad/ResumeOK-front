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
  Easing
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
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

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');



const CATEGORIES_DATA = [
  {
    name: 'Design',
    icon: 'palette-outline',
    roles: [
      'Backend Engineer',
      'Blockchain Engineer',
      'Cloud Engineer',
      'Data Engineer',
      'Developer Relations',
      'DevOps Engineer',
      'Embedded Engineer',
      'Engineering Manager',
      'Frontend Engineer',
      'Full stack Engineer',
      'Game Engineer',
      'ML Engineer',
      'QA Engineer',
      'Sales Engineer',
      'Software Engineer',
      'Site Reliability Engineer',
      'Software Architect',
      'Support Engineer'
    ]
  },
  {
    name: 'Software & Engineering',
    icon: 'code-slash-outline',
    roles: ['Mobile Engineer', 'Firmware Engineer', 'Systems Architect', 'Security Analyst']
  },
  {
    name: 'Marketing',
    icon: 'megaphone-outline',
    roles: ['Growth Marketer', 'SEO Specialist', 'Content Strategist', 'Social Media Manager']
  },
  {
    name: 'Product',
    icon: 'cube-outline',
    roles: ['Product Manager', 'Associate Product Manager', 'Product Owner']
  },
  {
    name: 'Data & AI',
    icon: 'analytics-outline',
    roles: ['Data Scientist', 'Data Analyst', 'Machine Learning Engineer', 'AI Researcher']
  },
  {
    name: 'Sales',
    icon: 'trending-up-outline',
    roles: ['Account Executive', 'Business Development Rep', 'Sales Manager']
  },
  {
    name: 'Security',
    icon: 'shield-checkmark-outline',
    roles: ['Security Analyst', 'Penetration Tester', 'Security Architect']
  },
  {
    name: 'Consulting',
    icon: 'people-outline',
    roles: ['Management Consultant', 'Strategy Consultant', 'IT Consultant']
  },
  {
    name: 'Human Resources',
    icon: 'person-add-outline',
    roles: ['HR Manager', 'Talent Acquisition', 'Recruiter']
  },
  {
    name: 'Customer Support',
    icon: 'headset-outline',
    roles: ['Customer Support Specialist', 'Technical Support Agent']
  },
  {
    name: 'Misc. Engineering',
    icon: 'build-outline',
    roles: ['Hardware Engineer', 'Mechanical Engineer', 'Electrical Engineer']
  },
  {
    name: 'Finance',
    icon: 'cash-outline',
    roles: ['Financial Analyst', 'Accountant', 'Investment Analyst']
  },
  {
    name: 'Legal',
    icon: 'briefcase-outline',
    roles: ['Legal Counsel', 'Compliance Officer']
  },
  {
    name: 'Healthcare & Medical',
    icon: 'medical-outline',
    roles: ['Medical Advisor', 'Health Analyst']
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
  const { login, guestId } = useAuth();

  // Navigation Flow Steps
  const [step, _setStep] = useState<
    'intro' | 'welcome' | 'referral' | 'engineered' | 'name' | 'email' | 'jobs' | 'interests' | 'challenge' | 'location' | 'experience' | 'salary' | 'hearAbout' | 'rateUs' | 'notifications' | 'upload' | 'loading'
  >('intro');
  const [loading, setLoading] = useState(false);

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
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
      }

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
      }
    } catch (err) {
      console.log('Error picking document:', err);
    }
  };

  const handleRateApp = async () => {
    try {
      // On iOS Simulator / DEV mode, Apple's SKStoreReviewController dims the screen with a black overlay without rendering the dialog.
      // We bypass this in __DEV__ mode with an Alert fallback so testing works smoothly on simulator.
      if (!__DEV__ && (await StoreReview.hasAction())) {
        await StoreReview.requestReview();
      } else {
        Alert.alert(
          "Enjoying ResumeOK?",
          "Would you like to leave us a 5-star rating on the App Store?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Rate 5 Stars",
              onPress: () => {
                Linking.openURL('https://apps.apple.com/app/id6783382482?action=write-review').catch(() => { });
              }
            }
          ]
        );
      }
    } catch (err) {
      console.log('Store review error:', err);
    }

    // After 3 seconds, present the "I rated!" button as the main action
    setTimeout(() => {
      setShowIRated(true);
    }, 3000);
  };

  const handleRequestNotifications = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      console.log('Notification permission status:', status);
    } catch (err) {
      console.log('Error requesting notification permission:', err);
    }

    // After 3 seconds, reveal "I enabled!" button with opacity transition
    setTimeout(() => {
      setShowIEnabled(true);
    }, 3000);
  };

  // Google Sign-In Setup
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || 'YOUR_GOOGLE_IOS_CLIENT_ID',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || 'YOUR_GOOGLE_ANDROID_CLIENT_ID',
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_WEB_CLIENT_ID',
  });

  useEffect(() => {
    if (response?.type === 'success' && response.authentication?.accessToken) {
      handleGoogleLogin(response.authentication.accessToken);
    }
  }, [response]);

  const handleGoogleLogin = async (accessToken: string) => {
    setLoading(true);
    try {
      const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!userInfoResponse.ok) {
        throw new Error('Failed to fetch user info from Google');
      }

      const googleUser = await userInfoResponse.json();

      const authRes = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: googleUser.email,
          name: googleUser.name,
          avatar: googleUser.picture,
          googleId: googleUser.id,
        }),
      });

      if (!authRes.ok) {
        throw new Error('Backend registration failed');
      }

      const data = await authRes.json();
      if (data.success && data.token) {
        await login({
          user: data.user,
          accessToken: data.token,
        });

        if (googleUser.given_name) setFirstName(googleUser.given_name);
        if (googleUser.family_name) setLastName(googleUser.family_name);
        if (googleUser.email) setEmail(googleUser.email);

        setStep('engineered');
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      Alert.alert('Google Sign-In Error', err.message || 'An error occurred during Google sign-in.');
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

        if (!authRes.ok) {
          const errData = await authRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Backend registration failed');
        }

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
        }
      }
    } catch (err: any) {
      console.error('Apple login error:', err);
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple Sign-In Error', err.message || 'An error occurred during Apple sign-in.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReferralSubmit = async () => {
    if (!referralCode.trim()) {
      setStep('upload');
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
        setStep('upload');
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
      const profile = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        skills: selectedRoles,
        interests: selectedInterests,
        challenge: selectedChallenge,
        city: selectedCity,
        experience: selectedExperience,
        expectedSalary: { min: minSalary, max: maxSalary },
        hearAbout: selectedHearAbout,
        resumeFile: selectedResume ? {
          name: selectedResume.name,
          uri: selectedResume.uri,
          size: selectedResume.size
        } : null
      };
      await FileSystem.writeAsStringAsync(path, JSON.stringify(profile));

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
    else if (step === 'name') setStep('engineered');
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
    else if (step === 'upload') setStep('referral');
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
      : step === 'name' ? 2
        : step === 'email' ? 3
          : step === 'interests' ? 4
            : step === 'jobs' ? 5
              : step === 'experience' ? 6
                : step === 'location' ? 7
                  : step === 'salary' ? 8
                    : step === 'challenge' ? 9
                      : step === 'hearAbout' ? 10
                        : step === 'rateUs' ? 11
                          : step === 'notifications' ? 12
                            : step === 'referral' ? 13
                              : 14;
  const progressPercentage = (currentProgressStep / totalSteps) * 100;

  const isNameValid = firstName.trim().length > 0 && lastName.trim().length > 0;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isReferralValid = referralCode.trim().length === 6;
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
                    onPress={() => promptAsync()}
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
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardContainer}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={[styles.questionInner, { paddingBottom: insets.bottom + 30 }]}>
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

                <View style={styles.referralMiddleArea}>
                  {renderReferralDashes()}
                  {!isKeyboardVisible && (
                    <Image
                      source={require('../assets/images/referral.png')}
                      style={styles.laptopAsset}
                      resizeMode="contain"
                    />
                  )}
                </View>

                <View style={styles.referralActions}>
                  <TouchableOpacity style={styles.skipBtnLinkBlack} onPress={() => setStep('upload')}>
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
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardContainer}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={[styles.questionInner, { paddingBottom: insets.bottom + 90 }]}>
                <View style={styles.engineeredHeadingContainer}>
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

                <View style={[styles.fixedBottomDock, { bottom: insets.bottom + 20 }]}>
                  <AppleNativeButton
                    style={styles.actionBtnBlack}
                    onPress={() => setStep('name')}
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
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

                <View style={[styles.fixedBottomDock, { bottom: insets.bottom + 20 }]}>
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
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

                <View style={[styles.fixedBottomDock, { bottom: insets.bottom + 20 }]}>
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
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardContainer}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={[styles.questionInner, { paddingBottom: insets.bottom + 30 }]}>
                <View style={styles.questionHeadingContainer}>
                  <Text style={styles.questionTitle}>What job are you{"\n"}targeting?</Text>
                  <Text style={styles.questionSubtitle}>We calibrate your matches, At least 3 Interests.</Text>
                </View>

                <ScrollView
                  style={styles.accordionScrollView}
                  contentContainerStyle={styles.accordionScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {CATEGORIES_DATA.map((category) => {
                    const isExpanded = expandedCategory === category.name;
                    const selectedInCategory = category.roles.filter(role => selectedRoles.includes(role)).length;

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
                                21 Role {selectedInCategory > 0 ? `(${selectedInCategory} Roles Selected)` : ''}
                              </Text>
                            </View>
                          </View>
                          <Ionicons
                            name={isExpanded ? "chevron-up" : "chevron-down"}
                            size={18}
                            color="#000000"
                          />
                        </TouchableOpacity>

                        {isExpanded && (
                          <View style={styles.accordionContent}>
                            {category.roles.map((role) => {
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

                <View style={[styles.fixedBottomDock, { bottom: insets.bottom + 20 }]}>
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
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        )}

        {step === 'interests' && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

                <View style={[styles.fixedBottomDock, { bottom: insets.bottom + 20 }]}>
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
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

                <View style={[styles.fixedBottomDock, { bottom: insets.bottom + 20 }]}>
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
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

                <View style={[styles.fixedBottomDock, { bottom: insets.bottom + 20 }]}>
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
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

                <View style={[styles.fixedBottomDock, { bottom: insets.bottom + 20 }]}>
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
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

                <View style={[styles.fixedBottomDock, { bottom: insets.bottom + 20 }]}>
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
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

                <View style={[styles.fixedBottomDock, { bottom: insets.bottom + 20 }]}>
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
                source={require('../assets/images/leave-rate.png')}
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
            <View style={styles.questionHeadingContainer}>
              <Text style={styles.questionTitle}>Upload your resume{"\n"}or create one.</Text>
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
                  source={require('../assets/images/resume-onboarding.png')}
                  style={styles.uploadFolderImage}
                  resizeMode="contain"
                />
              )}
            </View>

            <View style={styles.uploadActionsArea}>
              <TouchableOpacity style={styles.skipBtnLinkBlack} onPress={() => setStep('loading')}>
                <Text style={styles.skipBtnTextBlack}>Skip for now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.uploadOutlineBtn}
                activeOpacity={0.8}
                onPress={handlePickResume}
              >
                <Text style={styles.uploadOutlineBtnText}>
                  {selectedResume ? 'Change resume' : 'Upload resume'}
                </Text>
              </TouchableOpacity>

              <AppleNativeButton
                style={styles.actionBtnBlack}
                onPress={() => setStep('loading')}
              >
                <Text style={styles.actionBtnTextWhite}>
                  {selectedResume ? 'Continue' : 'Start building a resume'}
                </Text>
              </AppleNativeButton>
            </View>
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
    marginBottom: 30,
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
    width: width * 0.75,
    height: 180,
  },
  fixedBottomDock: {
    position: 'absolute',
    left: 24,
    right: 24,
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
    paddingBottom: 20,
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
});
