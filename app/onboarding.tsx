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

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, guestId } = useAuth();
  
  // Screen Step flow: intro -> welcome -> engineered -> name -> email
  const [step, setStep] = useState<'intro' | 'welcome' | 'engineered' | 'name' | 'email'>('intro');
  const [loading, setLoading] = useState(false);

  // Profile data collection states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  // Slider State for Step 3
  const [activeSlide, setActiveSlide] = useState(0);

  // Google OAuth Request Setup
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
      
      // Submit to backend /api/auth/google
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

        // Pre-fill fields with social info
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
        // Send to backend /api/auth/apple
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

          // Pre-fill profile fields
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

  const saveProfileData = async () => {
    try {
      const path = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
      const profile = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim()
      };
      await FileSystem.writeAsStringAsync(path, JSON.stringify(profile));

      // Also update name on server if user is logged in
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
  };

  const handleScroll = (event: any) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / (width - 48));
    setActiveSlide(index);
  };

  // Helper progress calculations
  const totalSteps = 3; // engineered, name, email
  const currentProgressStep = step === 'engineered' ? 1 : step === 'name' ? 2 : 3;
  const progressPercentage = (currentProgressStep / totalSteps) * 100;

  const isNameValid = firstName.trim().length > 0 && lastName.trim().length > 0;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return (
    <View style={styles.container}>
      {/* Intro and Welcome use the sunset background. Others use a pure white layout. */}
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

      {/* Dynamic Questionnaire Navigation Header */}
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

      {step === 'engineered' && (
        <View style={[styles.questionInner, { paddingBottom: insets.bottom + 30 }]}>
          <View style={styles.engineeredHeadingContainer}>
            <Text style={styles.engineeredHeadingSub}>More than AI.</Text>
            <Text style={styles.engineeredHeadingMain}>Engineered</Text>
            <Text style={styles.engineeredHeadingSub}>for today's hiring process.</Text>
          </View>

          {/* Sliding horizontal company grid images */}
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

            {/* Slider Dots */}
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

          {/* Companies Count Pill */}
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
                onPress={finishOnboarding}
              >
                <Text style={styles.actionBtnTextWhite}>Continue</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
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
  // Header Navigation Progress Bar
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
  // STEP 3 - ENGINEERED
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
  // QUESTION STEPS (NAME/EMAIL)
  questionHeadingContainer: {
    marginTop: 60,
    alignItems: 'center',
  },
  questionTitle: {
    color: '#000000',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 38,
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
});
