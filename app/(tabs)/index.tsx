import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View, Platform, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const { user, guestCredit, refreshCredits } = useAuth();
  const isPad = Platform.OS === 'ios' && Platform.isPad;

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshCredits();
    } catch (err) {
      console.log("Error during home refresh:", err);
    } finally {
      setRefreshing(false);
    }
  }, [refreshCredits]);

  const handleBuildResume = () => {
    router.push('/build-resume');
  };

  const handleUploadResume = () => {
    router.push('/audit');
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { marginTop: insets.top + (isPad ? 25 : 0) }]}>
        <TouchableOpacity style={styles.profileContainer} activeOpacity={0.8} onPress={() => router.push('/settings')}>
          <Image source={require('../../assets/images/placeholder-avatar.png')} style={styles.profilePic} />
        </TouchableOpacity>

        {isPad && (
          <View style={styles.topNavCapsule}>
            <TouchableOpacity
              style={[styles.topNavItem, styles.topNavItemActive]}
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={[styles.topNavText, styles.topNavTextActive]}>Resume</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.topNavItem}
              onPress={() => router.replace('/(tabs)/cover-letter')}
            >
              <Text style={styles.topNavText}>Cover Letter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.topNavItem}
              onPress={() => router.replace('/(tabs)/library')}
            >
              <Text style={styles.topNavText}>Your Doc</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.creditsBadge} activeOpacity={0.8} onPress={() => router.push('/pricing' as any)}>
          <Text style={styles.creditsText}>{user?.credit ?? guestCredit} Credits</Text>
        </TouchableOpacity>
      </View>

      {/* SCROLL CONTENT */}
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={{ width: '100%', maxWidth: isPad ? 600 : (isLandscape ? 600 : '100%'), alignSelf: 'center' }}>

          {/* Match Resume Card */}
          <TouchableOpacity
            style={styles.matchCard}
            activeOpacity={0.9}
            onPress={handleUploadResume}
          >
            <Image
              source={require('../../assets/images/build-resume.png')}
              style={styles.matchCardBg}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(5, 2, 25, 0.4)', 'rgba(5, 2, 25, 0.95)']}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.matchCardContent}>
              <View style={styles.matchTitleRow}>
                <Text style={styles.matchCardTitle}>Match Resume</Text>
                <Ionicons name="chevron-forward" size={24} color="#FFF" style={styles.matchChevron} />
              </View>
              <Text style={styles.matchCardSubtitle}>50% better job match with a tailored resume.</Text>
            </View>
          </TouchableOpacity>

          {/* Build Resume Section Header */}
          <Text style={styles.sectionTitle}>Build Resume</Text>

          {/* Build Resume Lavender Card */}
          <TouchableOpacity
            style={styles.buildCard}
            activeOpacity={0.8}
            onPress={handleBuildResume}
          >
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>🥳 Free Forever</Text>
            </View>
            <View style={styles.buildCardContentRow}>
              <Image source={require('../../assets/images/file.png')} style={styles.folderIconImage} />
              <View style={styles.buildTitleContainer}>
                <Text style={styles.buildTitleText}>Build Resume</Text>
                <Ionicons name="chevron-forward" size={18} color="#3B2E9B" style={styles.buildChevron} />
              </View>
            </View>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    zIndex: 10,
  },
  profileContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  profilePic: {
    width: '100%',
    height: '100%',
  },
  creditsBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  creditsText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  topNavCapsule: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 24,
    padding: 4,
    alignItems: 'center',
  },
  topNavItem: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topNavItemActive: {
    backgroundColor: '#FFFFFF',
  },
  topNavText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '600',
  },
  topNavTextActive: {
    color: '#007AFF',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  matchCard: {
    width: '100%',
    aspectRatio: 380 / 350,
    borderRadius: 32,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#050219',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
    marginBottom: 24,
  },
  matchCardBg: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  matchCardContent: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
  },
  matchTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchCardTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  matchChevron: {
    marginLeft: 6,
    marginTop: 2,
  },
  matchCardSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 6,
  },
  sectionTitle: {
    color: '#000000',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 16,
  },
  buildCard: {
    backgroundColor: '#F0EEFF',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#C3B8FF',
    paddingVertical: 24,
    paddingHorizontal: 20,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  badgeContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#1E1B4B',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  buildCardContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  folderIconImage: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
    marginRight: 16,
  },
  buildTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buildTitleText: {
    color: '#3B2E9B',
    fontSize: 18,
    fontWeight: '700',
  },
  buildChevron: {
    marginLeft: 4,
    marginTop: 2,
  },
});

