import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Icon, VectorIcon } from 'expo-router/unstable-native-tabs';
import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

export default function ReportBug() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, guestCredit } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!feedback.trim()) {
      Alert.alert('Required Field', 'Please enter your feedback or bug description.');
      return;
    }

    setSubmitting(true);

    // Simulate submission to server
    setTimeout(() => {
      setSubmitting(false);
      Alert.alert(
        'Thank You!',
        'Your feedback has been successfully submitted. Our team will review it shortly.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }, 1500);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <LinearGradient colors={['#0f1d43', '#080d1e', '#050608']} style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <View style={[styles.header, { marginTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Icon sf={{ default: 'chevron.backward', selected: 'chevron.backward' }} androidSrc={<VectorIcon family={MaterialIcons} name="arrow-back" />} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.creditsBadge} activeOpacity={0.8} onPress={() => router.push('/pricing' as any)}>
          <Icon sf={{ default: 'bolt.circle.fill', selected: 'bolt.circle.fill' }} androidSrc={<VectorIcon family={MaterialIcons} name="bolt" />} />
          <Text style={[styles.creditsText, { marginLeft: 6 }]}>{user?.credit ?? guestCredit} Credits</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Section */}
        <View style={styles.bannerContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80' }}
            style={styles.bannerImage}
          />
          <View style={styles.bannerOverlay} />
        </View>

        {/* Info Card */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>ResumeOK App Feedback</Text>
          <Text style={styles.formSubtitle}>
            Your email will only be used for follow-up purposes and will never be shared with anyone.
          </Text>
        </View>

        {/* Input Cards */}

        {/* Name Field */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Your Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="My answer"
            placeholderTextColor="rgba(255, 255, 255, 0.3)"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Email Field */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Your Email</Text>
          <TextInput
            style={styles.textInput}
            placeholder="My answer"
            placeholderTextColor="rgba(255, 255, 255, 0.3)"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* Feedback Field */}
        <View style={[styles.inputCard, !feedback.trim() ? styles.requiredBorder : undefined]}>
          <View style={styles.labelRow}>
            <Text style={styles.inputLabel}>Your feedback or feature request</Text>
            <Text style={styles.requiredAsterisk}>*</Text>
          </View>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="My answer"
            placeholderTextColor="rgba(255, 255, 255, 0.3)"
            multiline
            numberOfLines={4}
            value={feedback}
            onChangeText={setFeedback}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, !feedback.trim() ? styles.submitButtonDisabled : undefined]}
          activeOpacity={0.8}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Submitting...' : 'Submit'}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050608',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditsBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  creditsText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  bannerContainer: {
    width: '100%',
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 29, 67, 0.2)',
  },
  formCard: {
    backgroundColor: '#1b1d28',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  formTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 10,
  },
  formSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    lineHeight: 20,
  },
  inputCard: {
    backgroundColor: '#161619',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  requiredBorder: {
    borderColor: 'rgba(229, 57, 53, 0.3)', // Soft red border if empty/required
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  requiredAsterisk: {
    color: '#e53935',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 4,
    marginTop: -8, // Align nicely next to text
  },
  textInput: {
    color: '#fff',
    fontSize: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 8,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#eaeaea',
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#13151f',
    fontSize: 16,
    fontWeight: '600',
  },
});
