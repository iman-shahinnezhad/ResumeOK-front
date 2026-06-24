import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { API_URL, useAuth } from '../context/AuthContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { copyToClipboard as safeCopyToClipboard } from '../utils/clipboard';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function ReferralBottomSheet({ visible, onClose }: Props) {
  const router = useRouter();
  const { guestId, refreshCredits } = useAuth();
  const bottomSheetRef = useRef<BottomSheet>(null);

  const [loading, setLoading] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [stats, setStats] = useState({ referralCode: '', totalJoined: 0, referralLevel: 0 });
  const [fetchError, setFetchError] = useState(false);
  const [redeemError, setRedeemError] = useState('');

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.expand();
      fetchStats();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible]);

  const fetchStats = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const res = await fetch(`${API_URL}/api/guest/${guestId}/referral-stats`);
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          setStats({ referralCode: data.referralCode, totalJoined: data.totalJoined, referralLevel: data.referralLevel });
        } else {
          setFetchError(true);
        }
      } else {
        setFetchError(true);
      }
    } catch (e) {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (stats.referralCode) {
      await safeCopyToClipboard(stats.referralCode, 'Referral code copied to clipboard.');
    }
  };

  const shareCode = async () => {
    if (stats.referralCode) {
      try {
        await Share.share({ message: `Join me on ResumeOK! Use my referral code: ${stats.referralCode}` });
      } catch (error) {
        console.error(error);
      }
    }
  };

  const redeemReward = async () => {
    setRedeemError('');
    setRedeeming(true);
    try {
      const res = await fetch(`${API_URL}/api/guest/${guestId}/redeem`, { method: 'POST' });
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          Alert.alert('Success!', 'You received 50 credits!');
          await refreshCredits();
          await fetchStats();
          onClose();
        } else {
          setRedeemError('Almost there! Invite a few more friends to reach the milestone and unlock your reward.');
        }
      } else {
        Alert.alert('Error', 'Backend returned an invalid response. Is the server updated?');
      }
    } catch (e) {
      setRedeemError('Network error. Please try again.');
    } finally {
      setRedeeming(false);
    }
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
        onPress={onClose}
      />
    ),
    [onClose]
  );

  if (!visible) return null;

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        enableDynamicSizing={true}
        enablePanDownToClose={true}
        onClose={onClose}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetView style={styles.content}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={18} color="#000000" />
          </TouchableOpacity>

          <Text style={styles.title}>Share your invite code</Text>
          <Text style={styles.subtitle}>
            Invite {stats.referralLevel === 0 ? '3' : '5 more'} friends to earn free credits
          </Text>

          {fetchError ? (
            <Text style={styles.errorBannerText}>
              Oops! Your invite code is currently unavailable. Please try again later.
            </Text>
          ) : (
            <>
              <Text style={styles.statsText}>
                Total Friend Joined: {loading ? '...' : stats.totalJoined}
              </Text>

              <View style={styles.codeRow}>
                <TouchableOpacity style={styles.codeBox} onPress={copyToClipboard} disabled={loading}>
                  <Text style={styles.codeText}>{stats.referralCode || '...'}</Text>
                  <Ionicons name="copy-outline" size={20} color="#000000" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareButton} onPress={shareCode} disabled={loading}>
                  <Text style={styles.shareText}>Share </Text>
                  <Ionicons name="share-outline" size={18} color="#000000" />
                </TouchableOpacity>
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.redeemButton, fetchError ? { opacity: 0.5 } : undefined]}
            onPress={redeemReward}
            disabled={redeeming || fetchError}
          >
            {redeeming ? <ActivityIndicator color="#000" /> : <Text style={styles.redeemText}>REDEEM</Text>}
          </TouchableOpacity>

          {redeemError ? <Text style={styles.redeemErrorText}>{redeemError}</Text> : null}

          <View style={styles.orRow}>
            <View style={styles.line} />
            <Text style={styles.orText}>Or</Text>
            <View style={styles.line} />
          </View>

          <TouchableOpacity style={styles.buyButton} onPress={() => { onClose(); router.push('/pricing'); }}>
            <Text style={styles.buyText}>BUY CREDITS</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handleIndicator: {
    backgroundColor: '#E5E7EB',
    width: 40,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 24,
  },
  errorBannerText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 10,
    lineHeight: 20,
  },
  codeRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  codeBox: {
    flex: 1,
    height: 56,
    backgroundColor: '#F3F4F6',
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  codeText: { color: '#000000', fontSize: 16, letterSpacing: 2, fontWeight: '700' },
  shareButton: {
    width: 120,
    height: 56,
    backgroundColor: '#F3F4F6',
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareText: { color: '#000000', fontSize: 16, fontWeight: '600' },
  redeemButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  redeemText: { color: '#000000', fontSize: 16, fontWeight: '700' },
  redeemErrorText: {
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: -8,
    marginBottom: 16,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  line: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  orText: { color: '#9CA3AF', marginHorizontal: 10, fontSize: 14 },
  buyButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#000000',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
