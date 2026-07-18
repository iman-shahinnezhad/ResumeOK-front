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

const CITIES_LIST = [
  'Dallas, TX, United States',
  'San Francisco, CA, United States',
  'New York, NY, United States',
  'Los Angeles, CA, United States',
  'Chicago, IL, United States',
  'Austin, TX, United States',
  'Seattle, WA, United States',
  'Boston, MA, United States',
  'Denver, CO, United States',
  'London, United Kingdom',
  'Toronto, ON, Canada',
  'Berlin, Germany',
  'Paris, France',
  'Sydney, NSW, Australia'
];

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, guestId } = useAuth();

  // Navigation Flow Steps
  const [step, setStep] = useState<
    'intro' | 'welcome' | 'referral' | 'engineered' | 'name' | 'email' | 'jobs' | 'interests' | 'challenge' | 'location' | 'experience' | 'salary' | 'hearAbout' | 'rateUs' | 'notifications' | 'upload' | 'loading'
  >('intro');
  const [loading, setLoading] = useState(false);

  // Referral State
  const [referralCode, setReferralCode] = useState('');
  const referralInputRef = useRef<TextInput>(null);

  // Profile data states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null);
  const [citySearch, setCitySearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedExperience, setSelectedExperience] = useState<string | null>(null);
  const [minSalary, setMinSalary] = useState(120000);
  const [maxSalary, setMaxSalary] = useState(320000);
  const [selectedHearAbout, setSelectedHearAbout] = useState<string | null>(null);
  const [selectedResume, setSelectedResume] = useState<{ name: string; uri: string; size?: number } | null>(null);

  // Accordion status mapping category name to expanded boolean
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Slide carousel state
  const [activeSlide, setActiveSlide] = useState(0);

  // Spinning Loader Animation Refs
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scrollX1 = useRef(new Animated.Value(0)).current;
  const scrollX2 = useRef(new Animated.Value(-600)).current;
  const scrollX3 = useRef(new Animated.Value(0)).current;

  // Trigger horizontal logo ticker animations with different speeds/directions
  useEffect(() => {
    if (step === 'engineered') {
      scrollX1.setValue(0);
      scrollX2.setValue(-600);
      scrollX3.setValue(0);

      // Row 1 (scrolls left)
      Animated.loop(
        Animated.timing(scrollX1, {
          toValue: -600,
          duration: 22000, // Slower
          easing: Easing.linear,
          useNativeDriver: true
        })
      ).start();

      // Row 2 (scrolls right)
      Animated.loop(
        Animated.timing(scrollX2, {
          toValue: 0,
          duration: 28000, // Slower
          easing: Easing.linear,
          useNativeDriver: true
        })
      ).start();

      // Row 3 (scrolls left, faster)
      Animated.loop(
        Animated.timing(scrollX3, {
          toValue: -600,
          duration: 9000, // Slower
          easing: Easing.linear,
          useNativeDriver: true
        })
      ).start();
    }
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
      if (await StoreReview.hasAction()) {
        await StoreReview.requestReview();
        // Delay step transition slightly so the native review popup presents smoothly on top
        setTimeout(() => {
          setStep('notifications');
        }, 1200);
      } else {
        // Fallback to writing store review manually
        Linking.openURL('https://apps.apple.com/app/idYOUR_APP_ID?action=write-review');
        setStep('notifications');
      }
    } catch (err) {
      console.log('Store review error:', err);
      setStep('notifications');
    }
  };

  const handleRequestNotifications = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      console.log('Notification permission status:', status);
    } catch (err) {
      console.log('Error requesting notification permission:', err);
    } finally {
      setStep('referral');
    }
  };

  // Google Sign-In Setup
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: 'YOUR_GOOGLE_IOS_CLIENT_ID',
    androidClientId: 'YOUR_GOOGLE_ANDROID_CLIENT_ID',
    webClientId: 'YOUR_GOOGLE_WEB_CLIENT_ID',
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

  const filteredCities = citySearch.trim() === ''
    ? []
    : CITIES_LIST.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()));

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

          <TouchableOpacity
            style={styles.continueBtn}
            activeOpacity={0.9}
            onPress={() => setStep('welcome')}
          >
            <Text style={styles.continueBtnText}>Continue</Text>
          </TouchableOpacity>
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
                  <Ionicons name="logo-google" size={20} color="#EA4335" style={styles.authBtnIcon} />
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
                <Image
                  source={require('../assets/images/laptop.png')}
                  style={styles.laptopAsset}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.referralActions}>
                <TouchableOpacity
                  style={[styles.actionBtnBlack, !isReferralValid ? styles.actionBtnDisabled : null]}
                  activeOpacity={isReferralValid ? 0.9 : 1}
                  disabled={!isReferralValid || loading}
                  onPress={handleReferralSubmit}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.actionBtnTextWhite}>Continue</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.skipBtnLinkBlack} onPress={() => setStep('upload')}>
                  <Text style={styles.skipBtnTextBlack}>Skip for now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      )}

      {step === 'engineered' && (
        <View style={[styles.questionInner, { paddingBottom: insets.bottom + 30 }]}>
          <View style={styles.engineeredHeadingContainer}>
            <Text style={styles.engineeredHeadingSub}>More than AI.</Text>
            <Text style={styles.engineeredHeadingMain}>Engineered</Text>
            <Text style={styles.engineeredHeadingSub}>for today's hiring process.</Text>
          </View>

          <View style={styles.engineeredLoopContainer}>
            {/* Row 1 */}
            <View style={styles.tickerRow}>
              <Animated.View style={[styles.tickerWrapper, { transform: [{ translateX: scrollX1 }] }]}>
                <Image
                  source={require('../assets/images/Engineered2.png')}
                  style={styles.tickerImage}
                  resizeMode="cover"
                />
                <Image
                  source={require('../assets/images/Engineered2.png')}
                  style={styles.tickerImage}
                  resizeMode="cover"
                />
              </Animated.View>
            </View>

            {/* Row 2 */}
            <View style={styles.tickerRow}>
              <Animated.View style={[styles.tickerWrapper, { transform: [{ translateX: scrollX2 }] }]}>
                <Image
                  source={require('../assets/images/Engineered1.png')}
                  style={styles.tickerImage1}
                  resizeMode="cover"
                />
                <Image
                  source={require('../assets/images/Engineered1.png')}
                  style={styles.tickerImage1}
                  resizeMode="cover"
                />
              </Animated.View>
            </View>

            {/* Row 3 */}
            <View style={styles.tickerRow}>
              <Animated.View style={[styles.tickerWrapper, { transform: [{ translateX: scrollX3 }] }]}>
                <Image
                  source={require('../assets/images/Engineered3.png')}
                  style={styles.tickerImage}
                  resizeMode="cover"
                />
                <Image
                  source={require('../assets/images/Engineered3.png')}
                  style={styles.tickerImage}
                  resizeMode="cover"
                />
              </Animated.View>
            </View>
          </View>

          <View style={styles.companiesPill}>
            <Text style={styles.companiesPillText}>+1200 Companies</Text>
          </View>

          <TouchableOpacity
            style={styles.actionBtnBlack}
            activeOpacity={0.9}
            onPress={() => setStep('name')}
          >
            <Text style={styles.actionBtnTextWhite}>Continue</Text>
          </TouchableOpacity>
        </View>
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
                  style={styles.nameTextInput}
                  placeholder="First Name"
                  placeholderTextColor="rgba(0,0,0,0.25)"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoFocus
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

              <TouchableOpacity
                style={[styles.actionBtnBlack, !isNameValid ? styles.actionBtnDisabled : null]}
                activeOpacity={isNameValid ? 0.9 : 1}
                disabled={!isNameValid}
                onPress={() => setStep('email')}
              >
                <Text style={styles.actionBtnTextWhite}>Continue</Text>
              </TouchableOpacity>
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
                <Text style={styles.questionTitle}>What's the best work{"\n"}email to reach you?</Text>
              </View>

              <View style={styles.inputCenteringGroup}>
                <TextInput
                  style={styles.nameTextInput}
                  placeholder="name@company.com"
                  placeholderTextColor="rgba(0,0,0,0.25)"
                  value={email}
                  onChangeText={setEmail}
                  autoFocus
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <TouchableOpacity
                style={[styles.actionBtnBlack, !isEmailValid ? styles.actionBtnDisabled : null]}
                activeOpacity={isEmailValid ? 0.9 : 1}
                disabled={!isEmailValid}
                onPress={() => setStep('interests')}
              >
                <Text style={styles.actionBtnTextWhite}>Continue</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      )}

      {step === 'jobs' && (
        <View style={styles.accordionContainer}>
          <View style={[styles.questionHeadingContainer, { paddingHorizontal: 24, marginBottom: 10 }]}>
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

          <View style={styles.accordionActions}>
            <TouchableOpacity
              style={[styles.actionBtnBlack, !isJobsValid ? styles.actionBtnDisabled : null]}
              activeOpacity={isJobsValid ? 0.9 : 1}
              disabled={!isJobsValid}
              onPress={() => setStep('experience')}
            >
              <Text style={styles.actionBtnTextWhite}>
                {selectedRoles.length > 0
                  ? `Continue With (${selectedRoles.length} Roles)`
                  : 'Continue'
                }
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === 'interests' && (
        <View style={styles.accordionContainer}>
          <View style={[styles.questionHeadingContainer, { paddingHorizontal: 24, marginBottom: 30 }]}>
            <Text style={styles.questionTitle}>What's most important{"\n"}in your next job?</Text>
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

          <View style={styles.accordionActions}>
            <TouchableOpacity
              style={[styles.actionBtnBlack, !isInterestsValid ? styles.actionBtnDisabled : null]}
              activeOpacity={isInterestsValid ? 0.9 : 1}
              disabled={!isInterestsValid}
              onPress={() => setStep('jobs')}
            >
              <Text style={styles.actionBtnTextWhite}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === 'challenge' && (
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
                  <Text style={styles.radioItemText}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.actionBtnBlack, !isChallengeValid ? styles.actionBtnDisabled : null]}
            activeOpacity={isChallengeValid ? 0.9 : 1}
            disabled={!isChallengeValid}
            onPress={() => setStep('hearAbout')}
          >
            <Text style={styles.actionBtnTextWhite}>Continue</Text>
          </TouchableOpacity>
        </View>
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
                <Text style={styles.questionSubtitle}>Don't worry, you can change it later.</Text>
              </View>

              <View style={styles.locationContainer}>
                {selectedCity ? (
                  <View style={styles.selectedCityPill}>
                    <Text style={styles.selectedCityText}>{selectedCity}</Text>
                    <TouchableOpacity onPress={() => setSelectedCity(null)}>
                      <Ionicons name="close-circle" size={20} color="rgba(0,0,0,0.4)" style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ width: '100%', alignItems: 'center' }}>
                    <TextInput
                      style={styles.citySearchInput}
                      placeholder="Search for a city..."
                      placeholderTextColor="rgba(0,0,0,0.3)"
                      value={citySearch}
                      onChangeText={setCitySearch}
                      autoFocus
                    />
                    {filteredCities.length > 0 && (
                      <View style={styles.suggestionsContainer}>
                        {filteredCities.map((c) => (
                          <TouchableOpacity
                            key={c}
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
                      </View>
                    )}
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.actionBtnBlack, !isLocationValid ? styles.actionBtnDisabled : null]}
                activeOpacity={isLocationValid ? 0.9 : 1}
                disabled={!isLocationValid}
                onPress={() => setStep('salary')}
              >
                <Text style={styles.actionBtnTextWhite}>Continue</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      )}

      {step === 'experience' && (
        <View style={[styles.questionInner, { paddingBottom: insets.bottom + 30 }]}>
          <View style={styles.questionHeadingContainer}>
            <Text style={styles.questionTitle}>How much experience{"\n"}do you have?</Text>
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
                  <Text style={styles.radioItemText}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.actionBtnBlack, !isExperienceValid ? styles.actionBtnDisabled : null]}
            activeOpacity={isExperienceValid ? 0.9 : 1}
            disabled={!isExperienceValid}
            onPress={() => setStep('location')}
          >
            <Text style={styles.actionBtnTextWhite}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'salary' && (
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

          <TouchableOpacity
            style={styles.actionBtnBlack}
            activeOpacity={0.9}
            onPress={() => setStep('challenge')}
          >
            <Text style={styles.actionBtnTextWhite}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'hearAbout' && (
        <View style={[styles.questionInner, { paddingBottom: insets.bottom + 30 }]}>
          <View style={styles.questionHeadingContainer}>
            <Text style={styles.questionTitle}>How did you hear{"\n"}about ResumeOK?</Text>
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
                  <Text style={styles.radioItemText}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.actionBtnBlack, !isHearAboutValid ? styles.actionBtnDisabled : null]}
            activeOpacity={isHearAboutValid ? 0.9 : 1}
            disabled={!isHearAboutValid}
            onPress={() => setStep('rateUs')}
          >
            <Text style={styles.actionBtnTextWhite}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'rateUs' && (
        <View style={[styles.questionInner, { paddingBottom: insets.bottom + 30 }]}>
          <View style={styles.questionHeadingContainer}>
            <Text style={styles.questionTitle}>Help us grow!</Text>
            <Text style={styles.questionSubtitle}>We’re a small team, we’d really appreciate a quick rating.</Text>
          </View>

          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Image
              source={require('../assets/images/leave-rate.png')}
              style={styles.ratingImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.referralActions}>
            <TouchableOpacity
              style={styles.actionBtnBlack}
              activeOpacity={0.9}
              onPress={handleRateApp}
            >
              <Text style={styles.actionBtnTextWhite}>Leave a rating!</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipBtnLinkBlack} onPress={() => setStep('notifications')}>
              <Text style={styles.skipBtnTextBlack}>I rated!</Text>
            </TouchableOpacity>
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

          <View style={styles.referralActions}>
            <TouchableOpacity
              style={styles.actionBtnBlack}
              activeOpacity={0.9}
              onPress={handleRequestNotifications}
            >
              <Text style={styles.actionBtnTextWhite}>Allow Notifications</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipBtnLinkBlack} onPress={() => setStep('referral')}>
              <Text style={styles.skipBtnTextBlack}>I enabled!</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === 'upload' && (
        <View style={[styles.questionInner, { paddingBottom: insets.bottom + 30 }]}>
          <View style={styles.questionHeadingContainer}>
            <Text style={styles.questionTitle}>Upload your resume</Text>
            <Text style={styles.questionSubtitle}>We will auto-fill your profile and optimize your resume.</Text>
          </View>

          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
            <TouchableOpacity
              style={[
                styles.uploadBoxContainer,
                selectedResume ? styles.uploadBoxActive : null
              ]}
              activeOpacity={0.8}
              onPress={handlePickResume}
            >
              {selectedResume ? (
                <View style={styles.selectedFileCol}>
                  <Ionicons name="checkmark-circle" size={48} color="#34C759" />
                  <Text style={styles.fileNameText} numberOfLines={1}>{selectedResume.name}</Text>
                  {selectedResume.size && (
                    <Text style={styles.fileSizeText}>
                      {(selectedResume.size / 1024).toFixed(1)} KB
                    </Text>
                  )}
                  <TouchableOpacity
                    style={styles.removeFileBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      setSelectedResume(null);
                    }}
                  >
                    <Text style={styles.removeFileText}>Remove file</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.uploadPromptCol}>
                  <Ionicons name="document-text-outline" size={48} color="rgba(0,0,0,0.4)" style={{ marginBottom: 12 }} />
                  <Text style={styles.uploadPromptMain}>Tap to upload resume</Text>
                  <Text style={styles.uploadPromptSub}>Supports PDF, DOCX, or TXT up to 10MB</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.referralActions}>
            <TouchableOpacity
              style={styles.actionBtnBlack}
              activeOpacity={0.9}
              onPress={() => setStep('loading')}
            >
              <Text style={styles.actionBtnTextWhite}>
                {selectedResume ? 'Upload & Continue' : 'Continue'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipBtnLinkBlack} onPress={() => setStep('loading')}>
              <Text style={styles.skipBtnTextBlack}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === 'loading' && (
        <View style={styles.loadingScreenContainer}>
          <Animated.View style={{ transform: [{ rotate: spinRotation }], marginBottom: 30 }}>
            <Ionicons name="sync-outline" size={60} color="#000000" />
          </Animated.View>
          <Text style={styles.loadingText}>Building your</Text>
          <Text style={styles.loadingText}>personalized career</Text>
          <Text style={styles.loadingText}>journey</Text>
        </View>
      )}
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
    backgroundColor: '#F3F3F3',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  dashText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
  },
  laptopAsset: {
    width: width * 0.75,
    height: 180,
  },
  referralActions: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  skipBtnLinkBlack: {
    marginTop: 10,
    paddingVertical: 10,
  },
  skipBtnTextBlack: {
    color: 'rgba(0,0,0,0.5)',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  // STEP 4 - ENGINEERED
  engineeredHeadingContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  engineeredHeadingMain: {
    color: '#000000',
    fontSize: 38,
    fontWeight: '900',
    textAlign: 'center',
    marginVertical: 4,
  },
  engineeredHeadingSub: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  engineeredLoopContainer: {
    width: '100%',
    height: 250,
    overflow: 'hidden',
    justifyContent: 'center',
    marginVertical: 10,
  },
  tickerRow: {
    width: '100%',
    height: 65,
    marginVertical: 3,
    overflow: 'hidden',
  },
  tickerWrapper: {
    flexDirection: 'row',
    width: 1200,
  },
  tickerImage: {
    objectFit: "contain",
    height: 65,
    width: 800,
  },
  tickerImage1: {
    objectFit: "contain",
    height: 65,
    width: 550,
  },
  companiesPill: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 10,
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
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 38,
  },
  questionSubtitle: {
    color: 'rgba(0,0,0,0.5)',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
  },
  inputCenteringGroup: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 40,
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
    paddingVertical: 16,
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
    paddingHorizontal: 20,
    justifyContent: 'center',
    flex: 1,
  },
  radioItemBox: {
    width: '100%',
    height: 56,
    backgroundColor: '#F5F5F5',
    borderRadius: 18,
    paddingHorizontal: 20,
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#F5F5F5',
  },
  radioItemBoxSelected: {
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  radioItemText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  // LOCATION PAGE
  locationContainer: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
  },
  selectedCityText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  citySearchInput: {
    width: '90%',
    height: 60,
    backgroundColor: '#F5F5F5',
    borderRadius: 18,
    paddingHorizontal: 20,
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },
  suggestionsContainer: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    marginTop: 8,
    maxHeight: 180,
    overflow: 'hidden',
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
    justifyContent: 'center',
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
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
    lineHeight: 34,
  },
  // UPLOAD RESUME PAGE
  uploadBoxContainer: {
    width: '90%',
    height: 180,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#CCCCCC',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFB',
  },
  uploadBoxActive: {
    borderColor: '#34C759',
    backgroundColor: '#F2FBF4',
  },
  uploadPromptCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadPromptMain: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  uploadPromptSub: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.4)',
    marginTop: 6,
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
