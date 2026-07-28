import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as FileSystem from 'expo-file-system/legacy';

interface CustomLinkItem {
  id: string;
  title: string;
  url: string;
}

export default function YourLinksScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Standard Links
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [instagram, setInstagram] = useState('');
  const [dribbble, setDribbble] = useState('');
  const [medium, setMedium] = useState('');

  // Custom Links List
  const [customLinks, setCustomLinks] = useState<CustomLinkItem[]>([]);

  // Add Custom Link Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [])
  );

  const loadProfileData = async () => {
    try {
      const path = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        const text = await FileSystem.readAsStringAsync(path);
        const data = JSON.parse(text);
        setProfile(data);

        setLinkedin(data.linkedin || '');
        setGithub(data.github || '');
        setWebsite(data.website || '');
        setTwitter(data.twitter || '');
        setInstagram(data.instagram || '');
        setDribbble(data.dribbble || '');
        setMedium(data.medium || '');

        if (data.customLinks && Array.isArray(data.customLinks)) {
          setCustomLinks(data.customLinks);
        }
      }
    } catch (e) {
      console.log('Error loading links profile data:', e);
    }
  };

  const handleSaveAllLinks = async () => {
    try {
      const path = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
      const updatedProfile = {
        ...(profile || {}),
        linkedin: linkedin.trim(),
        github: github.trim(),
        website: website.trim(),
        twitter: twitter.trim(),
        instagram: instagram.trim(),
        dribbble: dribbble.trim(),
        medium: medium.trim(),
        customLinks,
      };
      setProfile(updatedProfile);
      await FileSystem.writeAsStringAsync(path, JSON.stringify(updatedProfile));
      Alert.alert('Saved', 'Your links have been updated successfully.');
      router.back();
    } catch (e) {
      console.log('Error saving links profile data:', e);
    }
  };

  const handleAddCustomLink = () => {
    if (!customTitle.trim() || !customUrl.trim()) return;

    const newItem: CustomLinkItem = {
      id: Date.now().toString(),
      title: customTitle.trim(),
      url: customUrl.trim(),
    };

    setCustomLinks([...customLinks, newItem]);
    setCustomTitle('');
    setCustomUrl('');
    setIsModalOpen(false);
  };

  const handleRemoveCustomLink = (id: string) => {
    setCustomLinks(customLinks.filter((item) => item.id !== id));
  };

  // Floating Link Input Box Renderer with Icon
  const renderStandardLinkInput = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    fieldName: string,
    iconName: any,
    iconColor: string = '#000000',
    placeholder: string = 'username or url'
  ) => {
    const isFocused = focusedField === fieldName;
    const hasValue = value.trim().length > 0;

    return (
      <View
        style={[
          styles.linkInputBox,
          isFocused && styles.linkInputFocused,
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
          <Ionicons name={iconName} size={20} color={iconColor} />
        </View>

        <View style={{ flex: 1, justifyContent: 'center' }}>
          {(hasValue || isFocused) && (
            <Text style={styles.floatingInputLabel}>{label}</Text>
          )}
          <TextInput
            style={[
              styles.floatingTextInput,
              !hasValue && !isFocused && styles.floatingTextInputEmpty,
            ]}
            value={value}
            onChangeText={onChangeText}
            placeholder={!hasValue && !isFocused ? label : ''}
            placeholderTextColor="#999999"
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setFocusedField(fieldName)}
            onBlur={() => setFocusedField(null)}
          />
        </View>

        {hasValue && (
          <TouchableOpacity onPress={() => onChangeText('')} style={{ padding: 4 }}>
            <Ionicons name="close-circle" size={16} color="#C7C7CC" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color="#000000" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Your Links</Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* EXPLANATION BANNER CARD */}
        <View style={styles.explanationBanner}>
          <Ionicons name="globe-outline" size={24} color="#2563EB" style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitleText}>Online Presence & Links</Text>
            <Text style={styles.bannerSubtitleText}>
              Add your LinkedIn, GitHub, Portfolio, and social profiles to showcase your work and build credibility.
            </Text>
          </View>
        </View>

        {/* 1. GENERAL / STANDARD LINKS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitleText}>Standard Links</Text>

          <View style={{ gap: 10, marginTop: 10 }}>
            {renderStandardLinkInput(
              'LinkedIn Profile',
              linkedin,
              setLinkedin,
              'linkedin',
              'logo-linkedin',
              '#0A66C2',
              'linkedin.com/in/username'
            )}

            {renderStandardLinkInput(
              'GitHub Profile',
              github,
              setGithub,
              'github',
              'logo-github',
              '#24292E',
              'github.com/username'
            )}

            {renderStandardLinkInput(
              'Personal Portfolio / Website',
              website,
              setWebsite,
              'website',
              'globe-outline',
              '#2563EB',
              'https://yourwebsite.com'
            )}

            {renderStandardLinkInput(
              'Twitter / X Profile',
              twitter,
              setTwitter,
              'twitter',
              'logo-twitter',
              '#1DA1F2',
              'x.com/username'
            )}

            {renderStandardLinkInput(
              'Instagram Profile',
              instagram,
              setInstagram,
              'instagram',
              'logo-instagram',
              '#E4405F',
              'instagram.com/username'
            )}

            {renderStandardLinkInput(
              'Dribbble / Design Portfolio',
              dribbble,
              setDribbble,
              'dribbble',
              'color-palette-outline',
              '#EA4C89',
              'dribbble.com/username'
            )}

            {renderStandardLinkInput(
              'Medium / Blog',
              medium,
              setMedium,
              'medium',
              'book-outline',
              '#000000',
              'medium.com/@username'
            )}
          </View>
        </View>

        {/* 2. CUSTOM LINKS SECTION */}
        <View style={styles.sectionCard}>
          <View style={styles.customHeaderRow}>
            <Text style={styles.sectionTitleText}>Custom Links</Text>
          </View>

          {customLinks.length > 0 && (
            <View style={{ gap: 8, marginTop: 10, marginBottom: 12 }}>
              {customLinks.map((item) => (
                <View key={item.id} style={styles.customLinkItemCard}>
                  <View style={styles.customLinkIconBox}>
                    <Ionicons name="link-outline" size={18} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customTitleText}>{item.title}</Text>
                    <Text style={styles.customUrlText} numberOfLines={1}>{item.url}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveCustomLink(item.id)}>
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* + ADD CUSTOM LINK BUTTON */}
          <TouchableOpacity
            style={styles.addCustomOutlineBtn}
            activeOpacity={0.8}
            onPress={() => {
              setCustomTitle('');
              setCustomUrl('');
              setIsModalOpen(true);
            }}
          >
            <Ionicons name="add" size={20} color="#000000" style={{ marginRight: 6 }} />
            <Text style={styles.addCustomOutlineBtnText}>+ ADD CUSTOM LINK</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* BOTTOM SAVE BUTTON */}
      <View style={[styles.bottomContainer, { paddingBottom: Math.max(insets.bottom + 10, 20) }]}>
        <TouchableOpacity
          style={styles.saveActionButton}
          activeOpacity={0.8}
          onPress={handleSaveAllLinks}
        >
          <Text style={styles.saveActionButtonText}>Save Links</Text>
        </TouchableOpacity>
      </View>

      {/* ======================================================== */}
      {/* ADD CUSTOM LINK MODAL */}
      {/* ======================================================== */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={[styles.cleanFullPageModal, { paddingTop: insets.top + 10, paddingBottom: Math.max(insets.bottom + 10, 20) }]}>
          
          <View style={styles.sheetHeader}>
            <TouchableOpacity
              style={styles.sheetCloseCircleBtn}
              onPress={() => setIsModalOpen(false)}
            >
              <Ionicons name="close" size={20} color="#000000" />
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>Add Custom Link</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={{ gap: 16 }}>
            {/* Title Input */}
            <View style={styles.floatingInputBoxModal}>
              <Text style={styles.floatingInputLabel}>Link Title *</Text>
              <TextInput
                style={styles.floatingTextInputModal}
                placeholder="e.g. Substack, YouTube, ProductHunt"
                placeholderTextColor="#999999"
                value={customTitle}
                onChangeText={setCustomTitle}
              />
            </View>

            {/* URL Input */}
            <View style={styles.floatingInputBoxModal}>
              <Text style={styles.floatingInputLabel}>URL *</Text>
              <TextInput
                style={styles.floatingTextInputModal}
                placeholder="https://..."
                placeholderTextColor="#999999"
                value={customUrl}
                onChangeText={setCustomUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.saveActionButton,
                (customTitle.trim().length > 0 && customUrl.trim().length > 0)
                  ? styles.addActionButtonActive
                  : styles.addActionButtonDisabled,
              ]}
              disabled={!(customTitle.trim().length > 0 && customUrl.trim().length > 0)}
              onPress={handleAddCustomLink}
            >
              <Text style={styles.saveActionButtonText}>Add Custom Link</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#F5F5F7',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    gap: 14,
  },

  explanationBanner: {
    backgroundColor: '#EBF3FF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  bannerTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 4,
  },
  bannerSubtitleText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#3B82F6',
    fontWeight: '500',
  },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionTitleText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },

  /* STANDARD LINK INPUT BOX STYLES */
  linkInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F4',
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 56,
    gap: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  linkInputFocused: {
    borderColor: '#000000',
    backgroundColor: '#F2F2F4',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingInputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 1,
  },
  floatingTextInput: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    padding: 0,
    margin: 0,
  },
  floatingTextInputEmpty: {
    fontSize: 14,
    fontWeight: '500',
    color: '#999999',
  },

  /* CUSTOM LINKS STYLES */
  customHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customLinkItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  customLinkIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EBF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  customUrlText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '500',
    marginTop: 1,
  },
  addCustomOutlineBtn: {
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  addCustomOutlineBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },

  bottomContainer: {
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  saveActionButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveActionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  cleanFullPageModal: {
    flex: 1,
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sheetCloseCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EBEBEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },

  floatingInputBoxModal: {
    backgroundColor: '#F2F2F4',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    justifyContent: 'center',
    height: 56,
  },
  floatingTextInputModal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    padding: 0,
    margin: 0,
  },
  addActionButtonActive: {
    backgroundColor: '#000000',
  },
  addActionButtonDisabled: {
    backgroundColor: '#D1D1D6',
  },
});
