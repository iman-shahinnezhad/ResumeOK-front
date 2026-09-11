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
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[
        styles.logoContainer,
        {
          opacity: fadeAnim,
        }
      ]}>
        <Image
          source={require('../assets/images/icon.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  logoContainer: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
  },
});
