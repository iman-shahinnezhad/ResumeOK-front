import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { API_URL, useAuth } from '../context/AuthContext';
import { getPackages, purchasePackage, setupPurchaseListeners } from '../utils/purchases';
import ReferralBottomSheet from '../components/ReferralBottomSheet';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export default function Pricing() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, updateUser, guestId, guestCredit } = useAuth();

  const [packages, setPackages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPack, setSelectedPack] = useState<any>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [referralVisible, setReferralVisible] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const pkgs = await getPackages();
        // Sort so Monthly (com.applydesk.monthly) comes first
        const sorted = [...pkgs].sort((a, b) => {
          const idA = a.product.identifier || '';
          if (idA.includes('monthly')) return -1;
          return 1;
        });
        setPackages(sorted);
        if (sorted.length > 0) {
          setSelectedPack(sorted[0]);
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
                if (mockSku === 'com.applydesk.monthly') {
                  payloadB64 = 'eyJwcm9kdWN0SWQiOiJjb20uYXBwbHlkZXNrLm1vbnRobHkiLCJ0cmFuc2FjdGlvbklkIjoibW9ja18xMjMifQ==';
                } else {
                  payloadB64 = 'eyJwcm9kdWN0SWQiOiJjb20uYXBwbHlkZXNrLndlZWtseSIsInRyYW5zYWN0aW9uSWQiOiJtb2NrXzEyMyJ9';
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

    setIsPurchasing(true);

    try {
      const result = await purchasePackage(selectedPack);
      if (!result) {
        setIsPurchasing(false);
      }
    } catch (err: any) {
      console.error('Purchase error', err);
      setIsPurchasing(false);

      if (err?.code !== 'E_USER_CANCELLED') {
        Alert.alert("Purchase Error", err.message || "Could not launch purchase sheet.");
      }
    }
  };

  const renderFeature = (text: string) => (
    <View style={styles.featureRow} key={text}>
      <View style={styles.featureIcon}>
        <Ionicons name="checkmark-circle-outline" size={22} color="#3B1EB8" />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#DCD6FE', '#F3EFFF', '#FFFFFF']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 16) + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color="#000000" />
          </TouchableOpacity>

          <View style={styles.creditsBadge}>
            <Text style={styles.creditsText}>{user?.credit ?? guestCredit} Credits</Text>
          </View>
        </View>

        <Text style={styles.title}>Get hired by next{'\n'}week!</Text>

        <View style={styles.featuresContainer}>
          {renderFeature('Access 8M+ fresh job listings')}
          {renderFeature('AI-powered resume tailoring for every job')}
          {renderFeature('Personalized cover letters')}
          {renderFeature('AI job application autofill')}
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B1EB8" />
            <Text style={styles.loadingText}>Fetching live plans from Apple...</Text>
          </View>
        ) : (
          <>
            <View style={styles.packagesContainer}>
              {packages.map((pkg, idx) => {
                const isSelected = selectedPack?.product.identifier === pkg.product.identifier;
                const rawPrice = pkg.product.priceString || '$9.99';
                const formattedPrice = (rawPrice.toLowerCase().includes('week') || rawPrice.toLowerCase().includes('month'))
                  ? rawPrice
                  : `${rawPrice}/Week`;

                return (
                  <TouchableOpacity
                    key={pkg.product.identifier || idx}
                    style={[styles.packageCard, isSelected ? styles.packageCardSelected : styles.packageCardUnselected]}
                    activeOpacity={0.85}
                    onPress={() => setSelectedPack(pkg)}
                  >
                    <View style={[styles.radioContainer, isSelected ? styles.radioContainerSelected : styles.radioContainerUnselected]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>

                    <View style={styles.packageContent}>
                      <Text style={[styles.pkgTitle, isSelected ? styles.pkgTitleSelected : styles.pkgTitleUnselected]}>
                        {pkg.product.title}
                      </Text>
                      <Text style={[styles.pkgDesc, isSelected ? styles.pkgDescSelected : styles.pkgDescUnselected]}>
                        {pkg.product.description}
                      </Text>
                    </View>

                    <Text style={[styles.pkgPrice, isSelected ? styles.pkgPriceSelected : styles.pkgPriceUnselected]}>
                      {formattedPrice}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={styles.inviteCard}
                activeOpacity={0.8}
                onPress={() => setReferralVisible(true)}
              >
                <Ionicons name="gift" size={20} color="#3B1EB8" style={{ marginRight: 12 }} />
                <View style={styles.inviteContent}>
                  <Text style={styles.inviteTitle}>Or Invite Friends</Text>
                  <Text style={styles.inviteDesc}>Get free credits for each friend who joins</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#3B1EB8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.subscriptionTermsText}>
              Subscription Details: Payment will be charged to your iTunes Account at confirmation of purchase. Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period at the rate of the selected plan. Subscriptions and auto-renewal may be managed or turned off by going to your Account Settings after purchase.
            </Text>
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={[styles.continueBtn, (!selectedPack || isPurchasing || isLoading) ? styles.continueBtnDisabled : undefined]}
          activeOpacity={0.85}
          onPress={handleContinue}
          disabled={!selectedPack || isPurchasing || isLoading}
        >
          {isPurchasing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View style={styles.continueBtnContent}>
              <Text style={styles.continueBtnText}>CONTINUE</Text>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" style={{ marginLeft: 4 }} />
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.footerBottomRow}>
          <View style={styles.privacyTermsRow}>
            <TouchableOpacity activeOpacity={0.7} onPress={() => Linking.openURL('https://pixflow.net/pixflow-resumeok-app-privacy-policy/')}>
              <Text style={styles.footerLinkText}>Privacy</Text>
            </TouchableOpacity>
            <Text style={styles.footerPipeText}> | </Text>
            <TouchableOpacity activeOpacity={0.7} onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}>
              <Text style={styles.footerLinkText}>Terms</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.cancelAnytimeText}>Cancelable at any time</Text>
        </View>
      </View>

      <ReferralBottomSheet
        visible={referralVisible}
        onClose={() => setReferralVisible(false)}
      />
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
    paddingBottom: 130,
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
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  creditsBadge: {
    backgroundColor: '#EAEAEF',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
  },
  creditsText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    color: '#3B1EB8',
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  featuresContainer: {
    marginBottom: 32,
    paddingHorizontal: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    marginRight: 10,
  },
  featureText: {
    color: '#3B1EB8',
    fontSize: 15,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#3B1EB8',
    marginTop: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  packagesContainer: {
    gap: 12,
  },
  packageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  packageCardSelected: {
    backgroundColor: '#000000',
  },
  packageCardUnselected: {
    backgroundColor: '#EAEAEF',
  },
  radioContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioContainerSelected: {
    borderColor: '#FFFFFF',
  },
  radioContainerUnselected: {
    borderColor: '#9CA3AF',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  packageContent: {
    flex: 1,
  },
  pkgTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  pkgTitleSelected: {
    color: '#FFFFFF',
  },
  pkgTitleUnselected: {
    color: '#0F172A',
  },
  pkgDesc: {
    fontSize: 13.5,
    fontWeight: '500',
    marginTop: 2,
  },
  pkgDescSelected: {
    color: '#9CA3AF',
  },
  pkgDescUnselected: {
    color: '#64748B',
  },
  pkgPrice: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  pkgPriceSelected: {
    color: '#FFFFFF',
  },
  pkgPriceUnselected: {
    color: '#0F172A',
  },
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 30, 184, 0.05)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(59, 30, 184, 0.15)',
    marginTop: 4,
  },
  inviteContent: {
    flex: 1,
  },
  inviteTitle: {
    color: '#3B1EB8',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  inviteDesc: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  subscriptionTermsText: {
    color: '#9CA3AF',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 12,
    zIndex: 999,
  },
  continueBtn: {
    backgroundColor: '#000000',
    borderRadius: 30,
    paddingVertical: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  continueBtnDisabled: {
    opacity: 0.5,
  },
  continueBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  privacyTermsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerLinkText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
  },
  footerPipeText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
  },
  cancelAnytimeText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
  },
});
