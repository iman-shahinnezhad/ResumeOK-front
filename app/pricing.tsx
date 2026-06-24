import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { API_URL, useAuth } from '../context/AuthContext';
import { getPackages, purchasePackage, setupPurchaseListeners } from '../utils/purchases';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export default function Pricing() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, updateUser, guestId, guestCredit } = useAuth();

  const [packages, setPackages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPack, setSelectedPack] = useState<any>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const pkgs = await getPackages();
        setPackages(pkgs);
        if (pkgs.length > 0) {
          setSelectedPack(pkgs[0]);
        }
      } catch (err) {
        console.error('Failed to load packages', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    const unsubscribe = setupPurchaseListeners(
      async (receipt) => {
        console.log('Apple Purchase successful! Verifying receipt securely on server...');
        try {
          const response = await fetch(`${API_URL}/purchase/verify-apple`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              receiptData: receipt,
              deviceId: user?.id || guestId
            })
          });

          if (response.ok) {
            const data = await response.json();
            if (data.user) {
              await updateUser(data.user);
              console.log('✅ Credits added instantly!');
              Alert.alert("Success", "Your purchase was successful and credits have been added!");
              router.back();
            } else {
              Alert.alert("Verification Failed", "Receipt verified, but user data was not returned.");
              throw new Error("Verification failed: User data was not returned.");
            }
          } else {
            const errText = await response.text();
            console.error('Apple Verification rejected by backend:', errText);
            let errorMessage = "The server rejected the purchase verification. Please contact support.";
            try {
              const parsed = JSON.parse(errText);
              if (parsed.error) errorMessage = parsed.error;
            } catch (e) { }
            Alert.alert("Verification Failed", errorMessage);
            throw new Error(`Verification rejected by backend: ${errorMessage}`);
          }
        } catch (err) {
          console.error("Verification network error:", err);
          Alert.alert("Verification Error", "Could not connect to the verification server. Please check your internet connection.");
          throw err;
        } finally {
          setIsPurchasing(false);
        }
      },
      (error) => {
        console.error('Purchase error listener:', error);
        setIsPurchasing(false);
        if (error?.code !== 'E_USER_CANCELLED') {
          Alert.alert("Payment Failed", error?.message || "An error occurred during the payment process.");
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user, router, updateUser, guestId]);

  const handleContinue = async () => {
    if (!selectedPack) return;
    setIsPurchasing(true);

    try {
      const result = await purchasePackage(selectedPack);
      if (!result) {
        setIsPurchasing(false);
      }
    } catch (err: any) {
      console.error('Purchase error', err);
      setIsPurchasing(false);

      if (isExpoGo) {
        Alert.alert(
          "Expo Go Simulation",
          "In-App Purchases are not supported in Expo Go. Do you want to simulate a successful purchase?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Simulate Success",
              onPress: async () => {
                setIsPurchasing(true);
                try {
                  const mockSku = selectedPack.product.identifier;
                  let payloadB64 = '';
                  if (mockSku === 'com.resumeok.pro') {
                    payloadB64 = 'eyJwcm9kdWN0SWQiOiJjb20ucmVzdW1lb2sucHJvIiwidHJhbnNhY3Rpb25JZCI6Im1vY2tfMTIzIn0=';
                  } else if (mockSku === 'com.resumeok.basic') {
                    payloadB64 = 'eyJwcm9kdWN0SWQiOiJjb20ucmVzdW1lb2suYmFzaWMiLCJ0cmFuc2FjdGlvbklkIjoibW9ja18xMjMifQ==';
                  } else if (mockSku === 'com.resumeok.ultimate') {
                    payloadB64 = 'eyJwcm9kdWN0SWQiOiJjb20ucmVzdW1lb2sudWx0aW1hdGUiLCJ0cmFuc2FjdGlvbklkIjoibW9ja18xMjMifQ==';
                  } else {
                    payloadB64 = 'eyJwcm9kdWN0SWQiOiJjb20ucmVzdW1lb2subWF4IiwidHJhbnNhY3Rpb25JZCI6Im1vY2tfMTIzIn0=';
                  }
                  
                  const mockReceipt = `eyJhbGciOiJSUzI1NiJ9.${payloadB64}.mock_signature`;

                  const response = await fetch(`${API_URL}/purchase/verify-apple`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      receiptData: mockReceipt,
                      deviceId: user?.id || guestId
                    })
                  });

                  if (response.ok) {
                    const data = await response.json();
                    if (data.user) {
                      await updateUser(data.user);
                      Alert.alert("Success", "Simulated purchase successful!");
                      router.back();
                    } else {
                      Alert.alert("Verification Failed", "Mock purchase verified but failed to load user data.");
                    }
                  } else {
                    const errText = await response.text();
                    Alert.alert("Failed", `Simulation failed: ${errText}`);
                  }
                } catch (e) {
                  Alert.alert("Error", "Network error during simulation.");
                } finally {
                  setIsPurchasing(false);
                }
              }
            }
          ]
        );
        return;
      }

      if (err?.code !== 'E_USER_CANCELLED') {
        Alert.alert("Purchase Error", err.message || "Could not launch purchase sheet.");
      }
    }
  };

  const renderFeature = (text: string) => (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>
        <Ionicons name="checkmark-circle-outline" size={20} color="#7C3AED" />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#EBE8FF', '#FFFFFF']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#000000" />
          </TouchableOpacity>

          <View style={styles.creditsBadge}>
            <Text style={styles.creditsText}>{user?.credit ?? guestCredit} Credits</Text>
          </View>
        </View>

        <Text style={styles.title}>Unlock AI Features{'\n'}on your phone</Text>

        <View style={styles.featuresContainer}>
          {renderFeature('Tailor unlimited resumes & CVs')}
          {renderFeature('Write custom cover letters instantly')}
          {renderFeature('AI-powered ATS matching & insights')}
          {renderFeature('Download & share professional PDFs')}
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7C3AED" />
            <Text style={styles.loadingText}>Fetching live plans from Apple...</Text>
          </View>
        ) : (
          <View style={styles.packagesContainer}>
            {packages.map((pkg, idx) => {
              const isSelected = selectedPack?.product.identifier === pkg.product.identifier;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.packageCard, isSelected ? styles.packageCardSelected : undefined]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedPack(pkg)}
                >
                  <View style={styles.packageCardLeft}>
                    <View style={[styles.radioContainer, isSelected ? styles.radioContainerSelected : undefined]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <View>
                      <Text style={styles.pkgTitle}>{pkg.product.title}</Text>
                      <Text style={styles.pkgDesc}>{pkg.product.description}</Text>
                    </View>
                  </View>
                  <Text style={styles.pkgPrice}>{pkg.product.priceString}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          style={[styles.continueBtn, (!selectedPack || isPurchasing || isLoading) ? styles.continueBtnDisabled : undefined]}
          activeOpacity={0.8}
          onPress={handleContinue}
          disabled={!selectedPack || isPurchasing || isLoading}
        >
          {isPurchasing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.continueBtnText}>CONTINUE</Text>
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>

        <View style={styles.footerLinksRow}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => Linking.openURL('https://pixflow.net/pixflow-app-privacy-policy/')}>
            <Text style={styles.footerText}>Privacy</Text>
          </TouchableOpacity>
          <Text style={[styles.footerText, { marginHorizontal: 8 }]}>|</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={() => Linking.openURL('https://pixflow.net/pixflow-app-user-agreement/')}>
            <Text style={styles.footerText}>Terms</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <Text style={styles.footerCancelText}>Cancelable at any time</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 240,
  },
  headerRow: {
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creditsBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  creditsText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    color: '#2E1A8E',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 36,
    lineHeight: 40,
  },
  featuresContainer: {
    marginBottom: 36,
    paddingHorizontal: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    marginRight: 12,
  },
  featureText: {
    color: '#5C4DE6',
    fontSize: 15,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#7C3AED',
    marginTop: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  packagesContainer: {
    gap: 16,
  },
  packageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F3FF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  packageCardSelected: {
    borderColor: '#7C3AED',
    backgroundColor: '#EBE7FF',
  },
  packageCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#7C3AED',
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioContainerSelected: {
    borderColor: '#7C3AED',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#7C3AED',
  },
  pkgTitle: {
    color: '#2E1A8E',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  pkgDesc: {
    color: '#6355D8',
    fontSize: 13,
    fontWeight: '600',
  },
  pkgPrice: {
    color: '#2E1A8E',
    fontSize: 16,
    fontWeight: '800',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  continueBtn: {
    backgroundColor: '#4C2BE6',
    borderRadius: 30,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#4C2BE6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  continueBtnDisabled: {
    opacity: 0.5,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginRight: 4,
  },
  footerLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  footerText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
  footerCancelText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
});
