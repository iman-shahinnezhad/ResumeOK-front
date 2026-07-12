import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated, Easing, ImageBackground, TouchableOpacity, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SplashProps {
  onContinue?: () => void;
}

export default function Splash({ onContinue }: SplashProps) {
  const insets = useSafeAreaInsets();
  const isPad = Platform.OS === 'ios' && Platform.isPad;

  // Animation values
  const fadeHeader = useRef(new Animated.Value(0)).current;
  const slideHeader = useRef(new Animated.Value(-20)).current;

  const fadeTitle1 = useRef(new Animated.Value(0)).current;
  const slideTitle1 = useRef(new Animated.Value(-15)).current;
  const fadeTitle2 = useRef(new Animated.Value(0)).current;
  const slideTitle2 = useRef(new Animated.Value(-15)).current;
  const fadeTitle3 = useRef(new Animated.Value(0)).current;
  const slideTitle3 = useRef(new Animated.Value(-15)).current;

  const fadeLower1 = useRef(new Animated.Value(0)).current;
  const slideLower1 = useRef(new Animated.Value(15)).current;
  const fadeLower2 = useRef(new Animated.Value(0)).current;
  const slideLower2 = useRef(new Animated.Value(15)).current;
  const fadeLower3 = useRef(new Animated.Value(0)).current;
  const slideLower3 = useRef(new Animated.Value(15)).current;

  const fadeButton = useRef(new Animated.Value(0)).current;
  const scaleButton = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Staggered animated sequence for a premium feeling
    Animated.sequence([
      // 1. Header fade-in & slide down
      Animated.parallel([
        Animated.timing(fadeHeader, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideHeader, { toValue: 0, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
      // 2. Staircase title elements "#1 RESUME BUILDER"
      Animated.stagger(150, [
        Animated.parallel([
          Animated.timing(fadeTitle1, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(slideTitle1, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(fadeTitle2, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(slideTitle2, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(fadeTitle3, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(slideTitle3, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
      ]),
      // 3. Staircase lower elements "BASED ON JOB SKILL REQUIRED"
      Animated.stagger(150, [
        Animated.parallel([
          Animated.timing(fadeLower1, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(slideLower1, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(fadeLower2, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(slideLower2, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(fadeLower3, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(slideLower3, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
      ]),
      // 4. Continue Button pop
      Animated.parallel([
        Animated.timing(fadeButton, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(scaleButton, { toValue: 1, duration: 500, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <ImageBackground
      source={require('../assets/images/splash-bg.png')}
      style={styles.container}
      resizeMode="cover"
    >
      {/* Ambient Premium Glows */}
      <View style={styles.ambientGlowLeft} />
      <View style={styles.ambientGlowRight} />

      <View style={{ flex: 1, width: '100%', maxWidth: isPad ? 450 : '100%', alignSelf: 'center', justifyContent: 'space-between' }}>
        {/* Top Section: Customer Info Image */}
        <Animated.View style={[
          styles.headerContainer,
          {
            marginTop: insets.top + 30,
            opacity: fadeHeader,
            transform: [{ translateY: slideHeader }]
          }
        ]}>
          <Image
            source={require('../assets/images/customer-info.png')}
            style={styles.customerInfoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Center Section: #1 RESUME BUILDER (Staggered staircase) */}
        <View style={styles.centerSection}>
          <Animated.View style={{
            opacity: fadeTitle1,
            transform: [{ translateX: slideTitle1 }]
          }}>
            <Text style={styles.titleNumber}>#1</Text>
          </Animated.View>

          <Animated.View style={{
            opacity: fadeTitle2,
            transform: [{ translateX: slideTitle2 }],
            marginLeft: 60,
            marginTop: -5
          }}>
            <Text style={styles.titleMain}>RESUME</Text>
          </Animated.View>

          <Animated.View style={{
            opacity: fadeTitle3,
            transform: [{ translateX: slideTitle3 }],
            marginLeft: 120,
            marginTop: -5
          }}>
            <Text style={styles.titleMain}>BUILDER</Text>
          </Animated.View>
        </View>

        {/* Lower Section: BASED ON JOB SKILL REQUIRED (Staggered staircase) */}
        <View style={styles.lowerSection}>
          <Animated.View style={{
            opacity: fadeLower1,
            transform: [{ translateX: slideLower1 }],
            marginLeft: 70
          }}>
            <Text style={styles.lowerMain}>BASED ON</Text>
          </Animated.View>

          <Animated.View style={{
            opacity: fadeLower2,
            transform: [{ translateX: slideLower2 }],
            marginLeft: 125,
            marginTop: -2
          }}>
            <Text style={styles.lowerMain}>JOB SKILL</Text>
          </Animated.View>

          <Animated.View style={{
            opacity: fadeLower3,
            transform: [{ translateX: slideLower3 }],
            marginLeft: 170,
            marginTop: -2
          }}>
            <Text style={styles.lowerMain}>REQUIRED</Text>
          </Animated.View>
        </View>

        {/* Bottom Button Section */}
        <View style={[styles.buttonSection, { marginBottom: insets.bottom + 30 }]}>
          <Animated.View style={{
            opacity: fadeButton,
            transform: [{ scale: scaleButton }],
            width: '100%'
          }}>
            <TouchableOpacity
              style={styles.continueButton}
              activeOpacity={0.9}
              onPress={onContinue}
            >
              <Text style={styles.continueButtonText}>CONTINUE</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 9999,
    backgroundColor: '#05070c',
  },
  ambientGlowLeft: {
    position: 'absolute',
    top: '25%',
    left: '-20%',
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: '#a8d249',
    opacity: 0.05,
    shadowColor: '#a8d249',
    shadowRadius: 150,
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  ambientGlowRight: {
    position: 'absolute',
    bottom: '20%',
    right: '-20%',
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: '#F8E8C0',
    opacity: 0.04,
    shadowColor: '#F8E8C0',
    shadowRadius: 150,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  customerInfoImage: {
    width: 246,
    height: 63,
  },
  centerSection: {
    width: '100%',
    marginTop: 40,
    alignSelf: 'flex-start',
  },
  titleNumber: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
  },
  titleMain: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  lowerSection: {
    width: '100%',
    marginBottom: 40,
    alignSelf: 'flex-start',
  },
  lowerMain: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  buttonSection: {
    width: '100%',
    alignItems: 'center',
  },
  continueButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#f8f1ce',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f8f1ce',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 6,
  },
  continueButtonText: {
    color: '#0f1225',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
