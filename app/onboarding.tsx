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
  Keyboard
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as FileSystem from 'expo-file-system/legacy';
import Svg, { Path, G } from 'react-native-svg';
import Slider from '@react-native-community/slider';
import { useAuth, API_URL } from '../context/AuthContext';
import Ionicons from '@expo/vector-icons/Ionicons';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

// Custom Laurel Wreath SVG for Hired Professionals badge
const LaurelWreathLeft = () => (
  <Svg width={30} height={40} viewBox="0 0 24 32" fill="none">
    <G opacity={0.9}>
      <Path d="M22 2C18 3 12 7 10 13C8.5 17.5 9 22 10.5 25C11 26 12 25.5 11.5 24.5C9.5 20.5 9 15 13 9.5C15 6.8 19 4 21.5 3C22 2.8 22.2 2.2 22 2Z" fill="#FFFFFF" />
      <Path d="M19 8C15.5 9 10.5 12.5 9 18C7.8 22.5 8.5 26.5 10 29.5C10.5 30.5 11.5 30 11 29C9.5 26 9 21.5 12.5 16.5C14.5 13.8 17.5 10.5 19.5 9C20 8.8 20 8.2 19 8Z" fill="#FFFFFF" />
      <Path d="M16 14C13 15 9 18.5 8 23.5C7.2 27.5 7.8 30.5 9 33C9.5 34 10.2 33.5 9.8 32.5C8.8 29.8 8.5 25.8 11.5 21C13.2 18.3 15.5 15.5 17 14.5C17.5 14.2 17 13.8 16 14Z" fill="#FFFFFF" />
    </G>
  </Svg>
);

const LaurelWreathRight = () => (
  <Svg width={30} height={40} viewBox="0 0 24 32" fill="none">
    <G opacity={0.9}>
      <Path d="M2 2C6 3 12 7 14 13C15.5 17.5 15 22 13.5 25C13 26 12 25.5 12.5 24.5C14.5 20.5 15 15 11 9.5C9 6.8 5 4 2.5 3C2 2.8 1.8 2.2 2 2Z" fill="#FFFFFF" />
      <Path d="M5 8C8.5 9 13.5 12.5 15 18C16.2 22.5 15.5 26.5 14 29.5C13.5 30.5 12.5 30 13 29C14.5 26 15 21.5 11.5 16.5C9.5 13.8 6.5 10.5 4.5 9C4 8.8 4 8.2 5 8Z" fill="#FFFFFF" />
      <Path d="M8 14C11 15 15 18.5 16 23.5C16.8 27.5 16.2 30.5 15 33C14.5 34 13.8 33.5 14.2 32.5C15.2 29.8 15.5 25.8 12.5 21C10.8 18.3 8.5 15.5 7 14.5C6.5 14.2 7 13.8 8 14Z" fill="#FFFFFF" />
    </G>
  </Svg>
);

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
    'intro' | 'welcome' | 'referral' | 'engineered' | 'name' | 'email' | 'jobs' | 'interests' | 'challenge' | 'location' | 'experience' | 'salary'
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

  // Accordion status mapping category name to expanded boolean
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Slide carousel state
  const [activeSlide, setActiveSlide] = useState(0);

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

        setStep('referral');
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

          setStep('referral');
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
      setStep('engineered');
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
        setStep('engineered');
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
        expectedSalary: { min: minSalary, max: maxSalary }
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
    else if (step === 'referral') setStep('welcome');
    else if (step === 'engineered') setStep('referral');
    else if (step === 'name') setStep('engineered');
    else if (step === 'email') setStep('name');
    else if (step === 'jobs') setStep('email');
    else if (step === 'interests') setStep('jobs');
    else if (step === 'challenge') setStep('interests');
    else if (step === 'location') setStep('challenge');
    else if (step === 'experience') setStep('location');
    else if (step === 'salary') setStep('experience');
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

  // Questionnaire navigation metrics
  const totalSteps = 10;
  const currentProgressStep = 
    step === 'referral' ? 1 
    : step === 'engineered' ? 2 
    : step === 'name' ? 3 
    : step === 'email' ? 4 
    : step === 'jobs' ? 5 
    : step === 'interests' ? 6
    : step === 'challenge' ? 7
    : step === 'location' ? 8
    : step === 'experience' ? 9
    : 10;
  const progressPercentage = (currentProgressStep / totalSteps) * 100;

  const isNameValid = firstName.trim().length > 0 && lastName.trim().length > 0;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isReferralValid = referralCode.trim().length === 6;
  const isJobsValid = selectedRoles.length >= 3;
  const isInterestsValid = selectedInterests.length >= 3;
  const isChallengeValid = selectedChallenge !== null;
  const isLocationValid = selectedCity !== null;
  const isExperienceValid = selectedExperience !== null;

  return (
    <View style={styles.container}>
      {(step === 'intro' || step === 'welcome') ? (
        <>
          <Image
            source={require('../assets/images/onboarding.png')}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
          <View style={styles.overlay} />
        </>
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#FFFFFF' }]} />
      )}

      {/* Dynamic Header Progress Bar */}
      {step !== 'intro' && step !== 'welcome' && (
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
        <View style={[styles.inner, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 30 }]}>
          <View style={styles.badgeContainer}>
            <LaurelWreathLeft />
            <View style={styles.badgeTextCol}>
              <Text style={styles.badgeNumber}>+8,000</Text>
              <Text style={styles.badgeLabel}>Hired Professional</Text>
            </View>
            <LaurelWreathRight />
          </View>

          <View style={styles.centerTextContainer}>
            <Text style={styles.largeTitleText}>10X</Text>
            <Text style={styles.largeTitleText}>FASTER</Text>
            <Text style={styles.largeTitleText}>INTERVIEW</Text>
            <View style={styles.subTitleBlock}>
              <Text style={styles.mediumTitleText}>WITH</Text>
              <Text style={styles.mediumTitleText}>TAILORED</Text>
              <Text style={styles.mediumTitleText}>RESUME</Text>
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

                <TouchableOpacity style={styles.skipBtnLink} onPress={() => setStep('referral')}>
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

                <TouchableOpacity style={styles.skipBtnLinkBlack} onPress={() => setStep('engineered')}>
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

          <View style={styles.engineeredCarouselOuter}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              contentContainerStyle={{ alignItems: 'center' }}
            >
              <Image
                source={require('../assets/images/Engineered1.png')}
                style={styles.engineeredImage}
                resizeMode="contain"
              />
              <Image
                source={require('../assets/images/Engineered2.png')}
                style={styles.engineeredImage}
                resizeMode="contain"
              />
              <Image
                source={require('../assets/images/Engineered3.png')}
                style={styles.engineeredImage}
                resizeMode="contain"
              />
            </ScrollView>

            <View style={styles.slideIndicatorsRow}>
              {[0, 1, 2].map((idx) => (
                <View
                  key={idx}
                  style={[
                    styles.slideIndicatorDot,
                    activeSlide === idx ? styles.slideIndicatorDotActive : null
                  ]}
                />
              ))}
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
                onPress={() => setStep('jobs')}
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
              onPress={() => setStep('interests')}
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
              onPress={() => setStep('challenge')}
            >
              <Text style={styles.actionBtnTextWhite}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === 'challenge' && (
        <View style={[styles.questionInner, { paddingBottom: insets.bottom + 30 }]}>
          <View style={styles.questionHeadingContainer}>
            <Text style={styles.questionTitle}>Where do you want to{"\n"}work?</Text>
            <Text style={styles.questionSubtitle}>Don't worry, you can change it later.</Text>
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
            onPress={() => setStep('location')}
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
                <Text style={styles.questionTitle}>Where do you want to{"\n"}work?</Text>
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
                onPress={() => setStep('experience')}
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
            onPress={() => setStep('salary')}
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
            onPress={finishOnboarding}
          >
            <Text style={styles.actionBtnTextWhite}>Continue</Text>
          </TouchableOpacity>
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
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 20,
  },
  badgeTextCol: {
    alignItems: 'center',
    marginHorizontal: 10,
  },
  badgeNumber: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgeLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
    opacity: 0.9,
  },
  centerTextContainer: {
    alignSelf: 'flex-start',
    width: '100%',
    paddingLeft: 10,
    marginTop: -40,
  },
  largeTitleText: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 1.5,
    lineHeight: 48,
    textTransform: 'uppercase',
  },
  subTitleBlock: {
    marginTop: 35,
  },
  mediumTitleText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 1,
    lineHeight: 38,
    textTransform: 'uppercase',
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
    fontSize: 36,
    fontWeight: '900',
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
    marginTop: 25,
    paddingVertical: 10,
  },
  skipBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textDecorationLine: 'underline',
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
    marginTop: 20,
    paddingVertical: 10,
  },
  skipBtnTextBlack: {
    color: 'rgba(0,0,0,0.5)',
    fontSize: 16,
    fontWeight: '600',
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
  engineeredCarouselOuter: {
    width: width - 48,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  engineeredImage: {
    width: width - 48,
    height: 220,
  },
  slideIndicatorsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  slideIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CCCCCC',
    marginHorizontal: 4,
  },
  slideIndicatorDotActive: {
    backgroundColor: '#000000',
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  interestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E2E2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    margin: 6,
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
  // RADIO LIST GROUP (CHALLENGE / EXPERIENCE)
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
});
