import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert, ActivityIndicator, Linking, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, API_URL } from '../context/AuthContext';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { restorePurchases, getReceipt } from '../utils/purchases';
import { copyToClipboard } from '../utils/clipboard';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export default function Settings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { guestCredit, guestId, user, updateUser } = useAuth();

  const [referralCode, setReferralCode] = React.useState('');
  const [totalJoined, setTotalJoined] = React.useState(0);
  const [referralLevel, setReferralLevel] = React.useState(0);
  const [referralLoading, setReferralLoading] = React.useState(true);
  const [referralError, setReferralError] = React.useState(false);

  // Referrer input states
  const [referredBy, setReferredBy] = React.useState<string | null>(null);
  const [enteredReferrerCode, setEnteredReferrerCode] = React.useState('');
  const [submittingReferrer, setSubmittingReferrer] = React.useState(false);
  const [referrerSubmitError, setReferrerSubmitError] = React.useState('');

  React.useEffect(() => {
    async function fetchReferralStats() {
      try {
        const res = await fetch(`${API_URL}/api/guest/${guestId}/referral-stats`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setReferralCode(data.referralCode);
            setTotalJoined(data.totalJoined || 0);
            setReferralLevel(data.referralLevel || 0);
            setReferredBy(data.referredBy || null);
          } else {
            setReferralError(true);
          }
        } else {
          setReferralError(true);
        }
      } catch (err) {
        setReferralError(true);
      } finally {
        setReferralLoading(false);
      }
    }
    fetchReferralStats();
  }, [guestId]);

  const handleSubmitReferrer = async () => {
    setReferrerSubmitError('');
    if (!enteredReferrerCode.trim()) {
      setReferrerSubmitError('Please enter a referral code.');
      return;
    }
    
    setSubmittingReferrer(true);
    try {
      const response = await fetch(`${API_URL}/api/guest/${guestId}/referral`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralCode: enteredReferrerCode.trim() })
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert("Success", "Referral code applied successfully!");
        setReferredBy(enteredReferrerCode.trim().toUpperCase());
      } else {
        setReferrerSubmitError(data.error || "This referral code is invalid.");
      }
    } catch (error) {
      setReferrerSubmitError("Network error. Please try again.");
    } finally {
      setSubmittingReferrer(false);
    }
  };

  const copyCode = async () => {
    if (referralCode) {
      await copyToClipboard(referralCode, "Referral code copied to clipboard.");
    }
  };

  const shareCode = async () => {
    if (referralCode) {
      try {
        const { Share } = require('react-native');
        await Share.share({
          message: `Join me on ResumeOK! Use my referral code: ${referralCode}`,
        });
      } catch (error) {
        console.error(error);
      }
    }
  };

  const currentData = {
    avatar: require('../assets/images/placeholder-avatar.png'), // Default abstract 3D asset
    title: 'Free Plan',
    subtitle: '',
    plan: 'Free',
    credit: String(guestCredit),
    resetTime: null,
    planButtonTitle: 'Upgrade To Premium',
  };

  const handleRestore = async () => {
    try {
      if (isExpoGo) {
        Alert.alert("Simulation", "Restoring purchases is simulated. Your credits are synced.");
        return;
      }
      
      const receipt = await getReceipt();
      if (receipt) {
        console.log('Found App Store receipt! Verifying...');
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
            Alert.alert("Success", "Your purchases have been successfully restored.");
            return;
          }
        }
      }

      const purchases = await restorePurchases();
      if (purchases && purchases.length > 0) {
        const latestPurchase = purchases[purchases.length - 1];
        const latestReceipt = latestPurchase.transactionReceipt || latestPurchase.purchaseToken;
        if (latestReceipt) {
          const response = await fetch(`${API_URL}/purchase/verify-apple`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              receiptData: latestReceipt,
              deviceId: user?.id || guestId
            })
          });

          if (response.ok) {
            const data = await response.json();
            if (data.user) {
              await updateUser(data.user);
              Alert.alert("Success", "Your purchases have been successfully restored.");
              return;
            }
          }
        }
      }

      Alert.alert("No Purchases", "No previous purchases were found for your account.");
    } catch (err) {
      console.error('Restore purchases failed', err);
      Alert.alert("Restore Failed", "Could not restore purchases at this time. Please try again later.");
    }
  };

  const renderMenuItem = (title: string, iconName: any) => (
    <TouchableOpacity
      key={title}
      style={styles.menuItem}
      activeOpacity={0.8}
      onPress={() => {
        if (title === 'Restore Purchases') {
          handleRestore();
        } else if (title === 'Report Bug') {
          router.push('/report-bug');
        } else if (title === 'Terms of Service') {
          Linking.openURL('https://pixflow.net/pixflow-app-user-agreement/');
        } else if (title === 'Privacy Policy') {
          Linking.openURL('https://pixflow.net/pixflow-resumeok-app-privacy-policy/');
        }
      }}
    >
      <View style={styles.menuItemLeft}>
        <Ionicons name={iconName} size={20} color="#a0a4b8" />
        <Text style={[styles.menuItemText, { marginLeft: 12 }]}>{title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F3F4F6', '#FFFFFF']} style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <View style={[styles.header, { marginTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.creditsBadge} activeOpacity={0.8} onPress={() => router.push('/pricing' as any)}>
          <Ionicons name="flash" size={16} color="#000" />
          <Text style={[styles.creditsText, { marginLeft: 6 }]}>{currentData.credit} Credits</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>

        {/* Profile Card / Top Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileInfo}>
            <Image source={typeof currentData.avatar === 'string' ? { uri: currentData.avatar } : currentData.avatar} style={styles.avatarImage} />
            <View>
              <Text style={styles.profileTitle}>{currentData.title}</Text>
              {currentData.subtitle ? <Text style={styles.profileSubtitle}>{currentData.subtitle}</Text> : null}
            </View>
          </View>
        </View>

        {/* Plan & Credits Block */}
        <View style={styles.planCard}>
          <View style={styles.planDetailsRow}>

            <View style={styles.planStatCol}>
              <Text style={styles.planStatLabel}>Plan</Text>
              <Text style={styles.planStatValue}>{currentData.plan}</Text>
            </View>

            <View style={styles.verticalDivider} />

            <View style={styles.planStatCol}>
              <Text style={styles.planStatLabel}>Credits</Text>
              <Text style={styles.planStatValue}>{currentData.credit}</Text>
            </View>

            {currentData.resetTime ? (
              <>
                <View style={styles.verticalDivider} />
                <View style={styles.planStatCol}>
                  <Text style={styles.planStatLabel}>Resets</Text>
                  <Text style={styles.planStatValue}>{currentData.resetTime}</Text>
                </View>
              </>
            ) : null}

          </View>

          {currentData.plan === 'Free' && (
            <Text style={styles.planInfoText}>
              Upgrade to get up to 140 Match Resume + 60 Cover letter weekly!
            </Text>
          )}

          <TouchableOpacity
            style={styles.planButton}
            activeOpacity={0.8}
            onPress={() => router.push('/pricing' as any)}
          >
            <Text style={styles.planButtonText}>Upgrade to get credits</Text>
          </TouchableOpacity>
        </View>

        {/* Referral Code Card */}
        <View style={styles.referralCard}>
          <LinearGradient
            colors={['rgba(168, 210, 73, 0.05)', 'rgba(0, 191, 255, 0.02)']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.referralHeader}>
            <Ionicons name="gift-outline" size={22} color="#a8d249" />
            <Text style={styles.referralTitle}>Invite & Earn Credits</Text>
          </View>
          <Text style={styles.referralDesc}>
            Share your invite code with friends. When they join, you earn free credits to build resumes and generate cover letters!
          </Text>

          {referralLoading ? (
            <ActivityIndicator size="small" color="#000" style={{ marginVertical: 12 }} />
          ) : referralError ? (
            <Text style={styles.referralErrorText}>Failed to load referral code</Text>
          ) : (
            <View>
              <View style={styles.joinedCountRow}>
                <Text style={styles.joinedCountText}>Friends Joined:</Text>
                <View style={styles.joinedBadge}>
                  <Text style={styles.joinedBadgeText}>
                    {referralLevel === 0 ? `${totalJoined} of 3` : `${referralLevel >= 2 ? 5 : Math.max(0, totalJoined - 3)} of 5`}
                  </Text>
                </View>
              </View>
              
              <View style={styles.referralActionRow}>
                <TouchableOpacity style={styles.codeContainer} activeOpacity={0.7} onPress={copyCode}>
                  <Text style={styles.codeText}>{referralCode || '...'}</Text>
                  <Ionicons name="copy-outline" size={16} color="rgba(0,0,0,0.5)" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareButton} activeOpacity={0.8} onPress={shareCode}>
                  <Text style={styles.shareButtonText}>Share ↗</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Referrer Card */}
        {!referralLoading && !referralError && (
          <View style={styles.referrerCard}>
            <LinearGradient
              colors={['rgba(0, 191, 255, 0.04)', 'rgba(0, 191, 255, 0.01)']}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.referralHeader}>
              <Ionicons name="people-outline" size={22} color="#00bfff" />
              <Text style={styles.referralTitle}>Referrer Code</Text>
            </View>

            {referredBy ? (
              <View style={styles.referredByContainer}>
                <Text style={styles.referredByText}>Referred by:</Text>
                <View style={styles.referredByBadge}>
                  <Text style={styles.referredByBadgeText}>{referredBy}</Text>
                </View>
              </View>
            ) : (
              <View>
                <Text style={styles.referralDesc}>
                  Enter the referral code of the friend who invited you to get free credits!
                </Text>
                <View style={styles.referrerActionRow}>
                  <TextInput
                    style={styles.referrerInput}
                    placeholder="REFERRAL CODE"
                    placeholderTextColor="rgba(0,0,0,0.3)"
                    value={enteredReferrerCode}
                    onChangeText={setEnteredReferrerCode}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={[styles.referrerSubmitBtn, submittingReferrer ? styles.referrerSubmitBtnDisabled : undefined]}
                    activeOpacity={0.8}
                    onPress={handleSubmitReferrer}
                    disabled={submittingReferrer}
                  >
                    {submittingReferrer ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.referrerSubmitBtnText}>Submit</Text>
                    )}
                  </TouchableOpacity>
                </View>
                {referrerSubmitError ? (
                  <Text style={styles.referrerErrorText}>{referrerSubmitError}</Text>
                ) : null}
              </View>
            )}
          </View>
        )}

        {/* Menu Section */}
        <View style={styles.menuSectionHeader}>
          <Text style={styles.menuSectionTitle}>{currentData.plan} Plan</Text>
        </View>

        <View style={styles.menuCard}>
          {renderMenuItem('Restore Purchases', 'refresh-outline')}
          <View style={styles.menuDivider} />
          {renderMenuItem('Terms of Service', 'book-outline')}
          <View style={styles.menuDivider} />
          {renderMenuItem('Privacy Policy', 'book-outline')}
          <View style={styles.menuDivider} />
          {renderMenuItem('Report Bug', 'alert-circle-outline')}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditsBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  creditsText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#000',
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 20,
  },
  profileSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)'
  },
  profileTitle: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
  profileSubtitle: {
    color: '#4B5563',
    fontSize: 13,
    marginTop: 4,
  },
  getFreeCreditBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  getFreeCreditText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '500',
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  planDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  planStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  verticalDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E5E7EB',
  },
  planStatLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  planStatValue: {
    color: '#000',
    fontSize: 24,
    fontWeight: '800',
  },
  planInfoText: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
    lineHeight: 18,
  },
  planButton: {
    backgroundColor: '#000000',
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
  },
  planButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  menuSectionHeader: {
    marginBottom: 16,
    paddingLeft: 4,
  },
  menuSectionTitle: {
    color: '#374151',
    fontSize: 18,
    fontWeight: '700',
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 16,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 20,
  },
  referralCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  referralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  referralTitle: {
    color: '#000',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 8,
  },
  referralDesc: {
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  referralActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  codeContainer: {
    flex: 1,
    height: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  codeText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  shareButton: {
    width: 100,
    height: 50,
    backgroundColor: '#f8f1ce',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonText: {
    color: '#0f1225',
    fontSize: 14,
    fontWeight: '700',
  },
  referralErrorText: {
    color: '#ff3b30',
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 12,
  },
  joinedCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  joinedCountText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  joinedBadge: {
    backgroundColor: '#a8d249',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  joinedBadgeText: {
    color: '#0f1225',
    fontSize: 13,
    fontWeight: '700',
  },
  referrerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  referredByContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    marginTop: 8,
  },
  referredByText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  referredByBadge: {
    backgroundColor: '#00bfff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  referredByBadgeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  referrerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  referrerInput: {
    flex: 1,
    height: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 25,
    color: '#000',
    paddingHorizontal: 20,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    fontWeight: '600',
    textAlign: 'center',
  },
  referrerSubmitBtn: {
    width: 100,
    height: 50,
    backgroundColor: '#000000',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referrerSubmitBtnDisabled: {
    opacity: 0.5,
  },
  referrerSubmitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  referrerErrorText: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
});
