import Ionicons from '@expo/vector-icons/Ionicons';
import { SymbolView } from 'expo-symbols';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert, ActivityIndicator, Linking, TextInput, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, API_URL } from '../context/AuthContext';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { restorePurchases, getReceipt } from '../utils/purchases';
import { copyToClipboard } from '../utils/clipboard';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export default function Settings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { guestCredit, guestId, user, updateUser, logout } = useAuth();

  const [referralCode, setReferralCode] = React.useState('');

  // Greenhouse Integration States
  const [ghBoardToken, setGhBoardToken] = React.useState('');
  const [ghJobBoardKey, setGhJobBoardKey] = React.useState('');
  const [ghHarvestKey, setGhHarvestKey] = React.useState('');
  const [ghEmail, setGhEmail] = React.useState('');
  const [ghSaving, setGhSaving] = React.useState(false);

  React.useEffect(() => {
    async function loadGreenhouseConfig() {
      try {
        const path = `${FileSystem.documentDirectory}greenhouse_config.json`;
        const info = await FileSystem.getInfoAsync(path);
        if (info.exists) {
          const text = await FileSystem.readAsStringAsync(path);
          const parsed = JSON.parse(text);
          setGhBoardToken(parsed.boardToken || '');
          setGhJobBoardKey(parsed.jobBoardKey || '');
          setGhHarvestKey(parsed.harvestKey || '');
          setGhEmail(parsed.email || '');
        }
      } catch (e) {
        console.log("Error loading Greenhouse config:", e);
      }
    }
    loadGreenhouseConfig();
  }, []);

  const handleSaveGreenhouseConfig = async () => {
    setGhSaving(true);
    try {
      const path = `${FileSystem.documentDirectory}greenhouse_config.json`;
      const config = {
        boardToken: ghBoardToken.trim(),
        jobBoardKey: ghJobBoardKey.trim(),
        harvestKey: ghHarvestKey.trim(),
        email: ghEmail.trim()
      };
      await FileSystem.writeAsStringAsync(path, JSON.stringify(config));
      Alert.alert("Success", "Greenhouse configuration saved successfully.");
    } catch (e) {
      Alert.alert("Error", "Could not save Greenhouse configuration.");
    } finally {
      setGhSaving(false);
    }
  };
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
        const response = await fetch(`${API_URL}/api/users/stats?deviceId=${user?.id || guestId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.referralCode) setReferralCode(data.referralCode);
          if (data.totalJoined !== undefined) setTotalJoined(data.totalJoined);
          if (data.referralLevel !== undefined) setReferralLevel(data.referralLevel);
          if (data.referredBy) setReferredBy(data.referredBy);
        } else {
          setReferralError(true);
        }
      } catch (e) {
        setReferralError(true);
      } finally {
        setReferralLoading(false);
      }
    }
    fetchReferralStats();
  }, [user, guestId]);

  const handleCopyCode = () => {
    if (!referralCode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    copyToClipboard(referralCode, "Referral Code Copied", "Share your code with friends to earn credits!");
  };

  const handleCopyLink = () => {
    if (!referralCode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const link = `https://resumeok.app/invite?code=${referralCode}`;
    copyToClipboard(link, "Invite Link Copied", "Share your link with friends to earn credits!");
  };

  const handleSubmitReferrerCode = async () => {
    if (!enteredReferrerCode.trim()) return;
    setSubmittingReferrer(true);
    setReferrerSubmitError('');
    try {
      const response = await fetch(`${API_URL}/api/users/claim-referrer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: user?.id || guestId,
          referrerCode: enteredReferrerCode.trim()
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setReferredBy(data.referredBy || enteredReferrerCode.trim());
        if (data.user) {
          await updateUser(data.user);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Success", data.message || "Referrer code applied successfully!");
      } else {
        setReferrerSubmitError(data.error || "Invalid referrer code.");
      }
    } catch (e) {
      setReferrerSubmitError("Network error. Please try again.");
    } finally {
      setSubmittingReferrer(false);
    }
  };
  const copyCode = handleCopyCode;
  const handleSubmitReferrer = handleSubmitReferrerCode;

  const shareCode = async () => {
    if (!referralCode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        const { Share } = require('react-native');
        await Share.share({
          message: `Join ResumeOK with my invite code ${referralCode} and get free credits! https://resumeok.app/invite?code=${referralCode}`,
        });
      } else {
        handleCopyLink();
      }
    } catch (e) {
      console.log('Share error:', e);
    }
  };

  const currentData = {
    credit: user?.credit ?? guestCredit ?? 0,
    name: user?.name || 'Guest User',
    title: user?.name || 'Guest User',
    subtitle: user?.email || '',
    email: user?.email || 'guest@resumeok.app',
    avatar: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
    plan: user?.plan || 'Free',
    resetTime: null
  };

  const handleRestore = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const receipt = await getReceipt();
      if (receipt) {
        const restored = await restorePurchases();
        if (restored) {
          const response = await fetch(`${API_URL}/api/restore-purchases`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              receipt,
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
      Alert.alert("Restore Failed", "Could not restore purchases at this time.");
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
              router.replace('/onboarding' as any);
            } catch (err) {
              Alert.alert("Logout Failed", "Could not log out at this time.");
            }
          }
        }
      ]
    );
  };

  const renderMenuItem = (title: string, iconName: any) => (
    <TouchableOpacity
      key={title}
      style={styles.menuItem}
      activeOpacity={0.8}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (title === 'Restore Purchases') {
          handleRestore();
        } else if (title === 'Report Bug') {
          router.push('/report-bug');
        } else if (title === 'Terms of Service') {
          Linking.openURL('https://pixflow.net/pixflow-app-user-agreement/');
        } else if (title === 'Privacy Policy') {
          Linking.openURL('https://pixflow.net/pixflow-resumeok-app-privacy-policy/');
        } else if (title === 'Log Out') {
          handleLogout();
        }
      }}
    >
      <View style={styles.menuItemLeft}>
        <Ionicons
          name={iconName}
          size={20}
          color={title === 'Log Out' ? '#EF4444' : '#64748B'}
        />
        <Text
          style={[
            styles.menuItemText,
            {
              marginLeft: 12,
              color: title === 'Log Out' ? '#EF4444' : '#0F172A',
            },
          ]}
        >
          {title}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={title === 'Log Out' ? '#FCA5A5' : '#94A3B8'}
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F8FAFC', '#FFFFFF']} style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <View style={[styles.header, { marginTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backCircleBtn}
          activeOpacity={0.7}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          {Platform.OS === 'ios' ? (
            <SymbolView name="chevron.left" size={18} tintColor="#0F172A" resizeMode="scaleAspectFit" />
          ) : (
            <Ionicons name="chevron-back" size={20} color="#0F172A" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.creditsPill}
          activeOpacity={0.8}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/pricing' as any);
          }}
        >
          {Platform.OS === 'ios' ? (
            <SymbolView name="sparkles" size={15} tintColor="#F59E0B" resizeMode="scaleAspectFit" />
          ) : (
            <Ionicons name="sparkles" size={16} color="#F59E0B" />
          )}
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
          <View style={styles.menuDivider} />
          {renderMenuItem('Log Out', 'log-out-outline')}
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
  backCircleBtn: {
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
  creditsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  creditsText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
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
