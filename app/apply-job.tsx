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
import { SymbolView } from 'expo-symbols';
import { BlurView } from 'expo-blur';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
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
    const email = (profileData.email || '').replace(/'/g, "\\'");
    const phone = (profileData.phone || profileData.phoneNumber || profileData.mobile || '').replace(/'/g, "\\'");
    const linkedin = (profileData.linkedinUrl || profileData.linkedin || '').replace(/'/g, "\\'");
    const portfolio = (profileData.portfolioUrl || profileData.portfolio || profileData.website || '').replace(/'/g, "\\'");
    const city = (profileData.city || '').replace(/'/g, "\\'");
    const country = (profileData.country || 'United States').replace(/'/g, "\\'");

    return `
      (function() {
        try {
          function setNativeValue(element, value) {
            if (!element || !value) return;
            
            if (element.tagName === 'SELECT') {
              const options = Array.from(element.options);
              const valLower = value.toLowerCase();
              let matchedOption = options.find(opt => opt.value.toLowerCase() === valLower || opt.text.toLowerCase().includes(valLower));
              if (matchedOption) {
                element.value = matchedOption.value;
                element.dispatchEvent(new Event('change', { bubbles: true }));
              }
              return;
            }

            try {
              const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
              const prototype = Object.getPrototypeOf(element);
              const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
              if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
                prototypeValueSetter.call(element, value);
              } else if (valueSetter) {
                valueSetter.call(element, value);
              } else {
                element.value = value;
              }
            } catch (e) {
              element.value = value;
            }
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.blur();
          }

          function findInputs(selectors, labelKeywords, placeholderKeywords) {
            const found = new Set();
            if (selectors) {
              document.querySelectorAll(selectors).forEach(el => {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
                  found.add(el);
                }
              });
            }
            const labels = Array.from(document.querySelectorAll('label'));
            for (const label of labels) {
              const labelText = label.innerText.toLowerCase();
              if (labelKeywords.some(kw => labelText.includes(kw))) {
                const htmlFor = label.getAttribute('for');
                if (htmlFor) {
                  const el = document.getElementById(htmlFor);
                  if (el) found.add(el);
                }
                const nestedInput = label.querySelector('input, textarea, select');
                if (nestedInput) found.add(nestedInput);
                let sibling = label.nextElementSibling;
                if (sibling) {
                  if (sibling.tagName === 'INPUT' || sibling.tagName === 'TEXTAREA' || sibling.tagName === 'SELECT') {
                    found.add(sibling);
                  } else {
                    const child = sibling.querySelector('input, textarea, select');
                    if (child) found.add(child);
                  }
                }
              }
            }
            if (placeholderKeywords) {
              document.querySelectorAll('input, textarea').forEach(el => {
                const ph = (el.getAttribute('placeholder') || '').toLowerCase();
                if (placeholderKeywords.some(kw => ph.includes(kw))) {
                  found.add(el);
                }
              });
            }
            return Array.from(found);
          }

          let filled = 0;

          // First Name
          if ('${firstName}') {
            const els = findInputs('input[name*="first" i], input[id*="first" i], input[autocomplete="given-name"]', ['first name', 'given name'], ['first name', 'given name']);
            els.forEach(el => {
              if (!el.value) {
                setNativeValue(el, '${firstName}');
                filled++;
              }
            });
          }

          // Last Name
          if ('${lastName}') {
            const els = findInputs('input[name*="last" i], input[id*="last" i], input[autocomplete="family-name"]', ['last name', 'surname', 'family name'], ['last name', 'surname', 'family name']);
            els.forEach(el => {
              if (!el.value) {
                setNativeValue(el, '${lastName}');
                filled++;
              }
            });
          }

          // Email
          if ('${email}') {
            const els = findInputs('input[type="email" i], input[name*="email" i], input[id*="email" i], input[autocomplete="email"]', ['email', 'e-mail'], ['email', 'e-mail']);
            els.forEach(el => {
              if (!el.value) {
                setNativeValue(el, '${email}');
                filled++;
              }
            });
          }

          // Phone
          if ('${phone}') {
            const els = findInputs('input[type="tel" i], input[name*="phone" i], input[id*="phone" i], input[name*="mobile" i]', ['phone', 'telephone', 'mobile', 'cell', 'number'], ['phone', 'telephone', 'mobile', 'cell', 'number']);
            els.forEach(el => {
              if (!el.value) {
                setNativeValue(el, '${phone}');
                filled++;
              }
            });
          }

          // LinkedIn
          if ('${linkedin}') {
            const els = findInputs('input[name*="linkedin" i], input[id*="linkedin" i], input[name*="link" i]', ['linkedin'], ['linkedin']);
            els.forEach(el => {
              if (!el.value) {
                setNativeValue(el, '${linkedin}');
                filled++;
              }
            });
          }

          // Portfolio
          if ('${portfolio}') {
            const els = findInputs('input[name*="website" i], input[name*="portfolio" i], input[id*="website" i], input[name*="url" i]', ['portfolio', 'website', 'url', 'personal link'], ['portfolio', 'website', 'url']);
            els.forEach(el => {
              if (!el.value) {
                setNativeValue(el, '${portfolio}');
                filled++;
              }
            });
          }

          // City
          if ('${city}') {
            const els = findInputs('input[name*="location" i], input[name*="city" i], input[id*="location" i]', ['location', 'city', 'address', 'living in'], ['location', 'city', 'address']);
            els.forEach(el => {
              if (!el.value) {
                setNativeValue(el, '${city}');
                filled++;
              }
            });
          }

          // Country
          if ('${country}') {
            const els = findInputs('select[name*="country" i], select[id*="country" i], input[name*="country" i], input[id*="country" i]', ['country'], ['country']);
            els.forEach(el => {
              if (el.tagName === 'SELECT') {
                const options = Array.from(el.options);
                const valLower = '${country}'.toLowerCase();
                let matchedOption = options.find(opt => opt.value.toLowerCase() === valLower || opt.text.toLowerCase().includes(valLower));
                if (matchedOption) {
                  el.value = matchedOption.value;
                  el.dispatchEvent(new Event('change', { bubbles: true }));
                  filled++;
                }
              } else if (el.tagName === 'INPUT' && !el.value) {
                setNativeValue(el, '${country}');
                filled++;
              }
            });
          }

          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'AUTOFILL_SUCCESS', count: filled }));
        } catch(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'AUTOFILL_ERROR', error: e.message }));
        }
      })();
      true;
    `;
  };

  const handleTriggerAutofill = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (webViewRef.current && profileData) {
      webViewRef.current.injectJavaScript(getAutofillJS());
    } else {
      Alert.alert('Profile Empty', 'Please complete your onboarding profile first to use 1-Click Autofill.');
    }
  };

  const handleCopyText = async (text: string, label: string) => {
    Haptics.selectionAsync();
    if (text) {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied!', `${label} copied to clipboard.`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.closeBtn}
          activeOpacity={0.7}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          {Platform.OS === 'ios' ? (
            <SymbolView name="xmark" size={18} tintColor="#1F2937" resizeMode="scaleAspectFit" />
          ) : (
            <Ionicons name="close" size={24} color="#1F2937" />
          )}
        </TouchableOpacity>

        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle} numberOfLines={1}>{jobTitle}</Text>
          {companyName ? <Text style={styles.headerSubtitle} numberOfLines={1}>{companyName}</Text> : null}
        </View>

        <TouchableOpacity
          style={styles.reloadBtn}
          activeOpacity={0.7}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            webViewRef.current?.reload();
          }}
        >
          {Platform.OS === 'ios' ? (
            <SymbolView name="arrow.clockwise" size={18} tintColor="#6B7280" resizeMode="scaleAspectFit" />
          ) : (
            <Ionicons name="refresh" size={20} color="#6B7280" />
          )}
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
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      <BlurView intensity={Platform.OS === 'ios' ? 80 : 100} tint="light" style={[styles.bottomToolbar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={styles.autofillBtn}
          activeOpacity={0.85}
          onPress={handleTriggerAutofill}
        >
          <View style={styles.autofillIconWrap}>
            {Platform.OS === 'ios' ? (
              <SymbolView name="sparkles" size={18} tintColor="#FFFFFF" resizeMode="scaleAspectFit" />
            ) : (
              <Ionicons name="sparkles" size={18} color="#FFFFFF" />
            )}
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
                {Platform.OS === 'ios' ? (
                  <SymbolView name="doc.on.doc" size={13} tintColor="#4B5563" resizeMode="scaleAspectFit" />
                ) : (
                  <Ionicons name="copy-outline" size={13} color="#4B5563" />
                )}
                <Text style={styles.chipText}>Email</Text>
              </TouchableOpacity>
            ) : null}

            {profileData.phone ? (
              <TouchableOpacity
                style={styles.chipBtn}
                onPress={() => handleCopyText(profileData.phone, 'Phone')}
              >
                {Platform.OS === 'ios' ? (
                  <SymbolView name="doc.on.doc" size={13} tintColor="#4B5563" resizeMode="scaleAspectFit" />
                ) : (
                  <Ionicons name="copy-outline" size={13} color="#4B5563" />
                )}
                <Text style={styles.chipText}>Phone</Text>
              </TouchableOpacity>
            ) : null}

            {profileData.firstName ? (
              <TouchableOpacity
                style={styles.chipBtn}
                onPress={() => handleCopyText(`${profileData.firstName} ${profileData.lastName || ''}`, 'Full Name')}
              >
                {Platform.OS === 'ios' ? (
                  <SymbolView name="doc.on.doc" size={13} tintColor="#4B5563" resizeMode="scaleAspectFit" />
                ) : (
                  <Ionicons name="copy-outline" size={13} color="#4B5563" />
                )}
                <Text style={styles.chipText}>Name</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </BlurView>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  reloadBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
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
