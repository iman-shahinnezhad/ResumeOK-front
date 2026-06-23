import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth, API_URL } from '../context/AuthContext';

interface Props {
  onDismiss: () => void;
}

export default function ReferralOnboarding({ onDismiss }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { guestId } = useAuth(); // guestId is the device ID used for backend

  const finishOnboarding = async () => {
    try {
      await FileSystem.writeAsStringAsync(FileSystem.documentDirectory + 'has_seen_referral.txt', 'true');
    } catch (e) {
      console.error(e);
    }
    onDismiss();
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!code.trim()) {
      setErrorMsg("Please enter a referral code or skip.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/guest/${guestId}/referral`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralCode: code.trim() })
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert("Success", "Referral code applied successfully!");
        finishOnboarding();
      } else {
        setErrorMsg(data.error || "This referral code is invalid or incorrect.");
      }
    } catch (error) {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            {/* Top Header */}
            <View style={styles.headerGroup}>
              <Text style={styles.title}>Referral code</Text>
              <Text style={styles.subtitle}>Paste a friend{"'"}s referral code or skip</Text>
            </View>

            {/* Center Image */}
            <View style={styles.imageContainer}>
              <Image 
                source={require('../assets/images/laptop.png')} 
                style={styles.image} 
                resizeMode="contain" 
              />
            </View>

            {/* Bottom Actions */}
            <View style={styles.actionsGroup}>
              <TextInput
                style={[styles.input, errorMsg ? styles.inputError : null]}
                placeholder="REFERRAL CODE"
                placeholderTextColor="rgba(0,0,0,0.35)"
                value={code}
                onChangeText={(text) => {
                  setCode(text);
                  if (errorMsg) setErrorMsg('');
                }}
                autoCapitalize="characters"
                autoCorrect={false}
              />

              {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
                {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.submitText}>SUBMIT</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.skipButton} onPress={finishOnboarding} disabled={loading}>
                <Text style={styles.skipText}>SKIP</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F6F6',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  headerGroup: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(0,0,0,0.5)',
    fontWeight: '500',
    textAlign: 'center',
  },
  imageContainer: {
    width: '100%',
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  actionsGroup: {
    width: '100%',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    height: 56,
    backgroundColor: '#EAEAEA',
    borderRadius: 28,
    color: '#000000',
    paddingHorizontal: 24,
    fontSize: 15,
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  inputError: {
    borderColor: '#ff4d4d',
    borderWidth: 1.5,
  },
  errorText: {
    color: '#ff4d4d',
    fontSize: 13,
    marginBottom: 12,
    marginTop: -4,
    fontWeight: '600',
  },
  submitButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  submitText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  skipButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#000000',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
