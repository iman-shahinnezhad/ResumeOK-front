import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ApplyJobScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ url: string; title?: string; company?: string }>();
  const webViewRef = useRef<WebView>(null);

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [autofillCount, setAutofillCount] = useState(0);

  const jobUrl = params.url || 'https://google.com';
  const jobTitle = params.title || 'Job Application';
  const companyName = params.company || '';

  // Load User Profile Data for Form Filling
  useEffect(() => {
    async function loadProfile() {
      try {
        const path = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
        const info = await FileSystem.getInfoAsync(path);
        if (info.exists) {
          const content = await FileSystem.readAsStringAsync(path);
          setProfileData(JSON.parse(content));
        }
      } catch (err) {
        console.log('Error loading profile for autofill:', err);
      }
    }
    loadProfile();
  }, []);

  // Form Autofill JavaScript Injection Code
  const getAutofillJS = () => {
    if (!profileData) return '';

    const firstName = (profileData.firstName || '').replace(/'/g, "\\'");
    const lastName = (profileData.lastName || '').replace(/'/g, "\\'");
    const fullName = `${firstName} ${lastName}`.trim().replace(/'/g, "\\'");
    const email = (profileData.email || '').replace(/'/g, "\\'");
    const phone = (profileData.phone || '').replace(/'/g, "\\'");
    const linkedin = (profileData.linkedinUrl || '').replace(/'/g, "\\'");
    const portfolio = (profileData.portfolioUrl || '').replace(/'/g, "\\'");
    const city = (profileData.city || '').replace(/'/g, "\\'");

    return `
      (function() {
        try {
          function setNativeValue(element, value) {
            if (!element || !value) return;
            const lastValue = element.value;
            element.value = value;
            const event = new Event('input', { bubbles: true });
            const changeEvent = new Event('change', { bubbles: true });
            element.dispatchEvent(event);
            element.dispatchEvent(changeEvent);
          }

          let filled = 0;

          // First Name
          document.querySelectorAll('input[name*="first" i], input[id*="first" i], input[autocomplete="given-name"]').forEach(el => {
            setNativeValue(el, '${firstName}');
            filled++;
          });

          // Last Name
          document.querySelectorAll('input[name*="last" i], input[id*="last" i], input[autocomplete="family-name"]').forEach(el => {
            setNativeValue(el, '${lastName}');
            filled++;
          });

          // Full Name Fallback
          document.querySelectorAll('input[name*="name" i]:not([name*="first"]):not([name*="last"]), input[id="name" i]').forEach(el => {
            if (!el.value) { setNativeValue(el, '${fullName}'); filled++; }
          });

          // Email
          document.querySelectorAll('input[type="email" i], input[name*="email" i], input[id*="email" i]').forEach(el => {
            setNativeValue(el, '${email}');
            filled++;
          });

          // Phone
          document.querySelectorAll('input[type="tel" i], input[name*="phone" i], input[id*="phone" i], input[name*="mobile" i]').forEach(el => {
            setNativeValue(el, '${phone}');
            filled++;
          });

          // LinkedIn
          document.querySelectorAll('input[name*="linkedin" i], input[id*="linkedin" i]').forEach(el => {
            if ('${linkedin}') { setNativeValue(el, '${linkedin}'); filled++; }
          });

          // Portfolio / Website
          document.querySelectorAll('input[name*="website" i], input[name*="portfolio" i], input[id*="website" i]').forEach(el => {
            if ('${portfolio}') { setNativeValue(el, '${portfolio}'); filled++; }
          });

          // Location / City
          document.querySelectorAll('input[name*="location" i], input[name*="city" i], input[id*="location" i]').forEach(el => {
            if ('${city}') { setNativeValue(el, '${city}'); filled++; }
          });

          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'AUTOFILL_SUCCESS', count: filled }));
        } catch(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'AUTOFILL_ERROR', error: e.message }));
        }
      })();
      true;
    `;
  };

  const handleTriggerAutofill = () => {
    if (webViewRef.current && profileData) {
      webViewRef.current.injectJavaScript(getAutofillJS());
    } else {
      Alert.alert('Profile Empty', 'Please complete your onboarding profile first to use 1-Click Autofill.');
    }
  };

  const handleCopyText = async (text: string, label: string) => {
    if (text) {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied!', `${label} copied to clipboard.`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#1F2937" />
        </TouchableOpacity>

        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle} numberOfLines={1}>{jobTitle}</Text>
          {companyName ? <Text style={styles.headerSubtitle} numberOfLines={1}>{companyName}</Text> : null}
        </View>

        <TouchableOpacity style={styles.reloadBtn} onPress={() => webViewRef.current?.reload()}>
          <Ionicons name="refresh" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* In-App Application WebView */}
      <View style={{ flex: 1 }}>
        <WebView
          ref={webViewRef}
          source={{ uri: jobUrl }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => {
            setLoading(false);
            // Auto-inject fields once page finishes loading
            setTimeout(() => {
              if (webViewRef.current && profileData) {
                webViewRef.current.injectJavaScript(getAutofillJS());
              }
            }, 1200);
          }}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'AUTOFILL_SUCCESS' && data.count > 0) {
                setAutofillCount(data.count);
              }
            } catch (e) {}
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          style={{ flex: 1 }}
        />

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#7C3AED" />
            <Text style={styles.loadingText}>Opening Application Page...</Text>
          </View>
        )}
      </View>

      {/* Floating Bottom Autofill Toolbar */}
      <View style={[styles.bottomToolbar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={styles.autofillBtn}
          activeOpacity={0.85}
          onPress={handleTriggerAutofill}
        >
          <View style={styles.autofillIconWrap}>
            <Ionicons name="sparkles" size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.autofillBtnText}>
            {autofillCount > 0 ? `Autofilled ${autofillCount} Fields` : '1-Click Autofill Form'}
          </Text>
        </TouchableOpacity>

        {/* Quick Copy Chips */}
        {profileData && (
          <View style={styles.quickChipsRow}>
            {profileData.email ? (
              <TouchableOpacity
                style={styles.chipBtn}
                onPress={() => handleCopyText(profileData.email, 'Email')}
              >
                <Ionicons name="copy-outline" size={13} color="#4B5563" />
                <Text style={styles.chipText}>Email</Text>
              </TouchableOpacity>
            ) : null}

            {profileData.phone ? (
              <TouchableOpacity
                style={styles.chipBtn}
                onPress={() => handleCopyText(profileData.phone, 'Phone')}
              >
                <Ionicons name="copy-outline" size={13} color="#4B5563" />
                <Text style={styles.chipText}>Phone</Text>
              </TouchableOpacity>
            ) : null}

            {profileData.firstName ? (
              <TouchableOpacity
                style={styles.chipBtn}
                onPress={() => handleCopyText(`${profileData.firstName} ${profileData.lastName || ''}`, 'Full Name')}
              >
                <Ionicons name="copy-outline" size={13} color="#4B5563" />
                <Text style={styles.chipText}>Name</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justify: 'center',
    alignItems: 'center',
  },
  reloadBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justify: 'center',
    alignItems: 'center',
  },
  headerTitleCol: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  bottomToolbar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  autofillBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  autofillIconWrap: {
    marginRight: 8,
  },
  autofillBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  quickChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 8,
  },
  chipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
});
