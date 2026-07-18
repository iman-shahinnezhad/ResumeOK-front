import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Image } from 'react-native';

interface SplashProps {
  onContinue?: () => void;
}

export default function Splash({ onContinue }: SplashProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Subtle fade-in of the logo image
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      // Trigger continuation immediately after fade-in completes
      if (onContinue) {
        onContinue();
      }
    });
  }, [onContinue]);

  return (
    <View style={styles.container}>
      <Animated.View style={[
        styles.logoContainer,
        {
          opacity: fadeAnim,
        }
      ]}>
        <Image
          source={require('../assets/images/RESUME-OK.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  logoContainer: {
    width: '80%',
    maxWidth: 320,
    aspectRatio: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: '70%',
    height: '70%',
  },
});
