import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActionSheetIOS,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';

interface ResumeItem {
  id: string;
  name: string;
  uri?: string;
  date: string;
  size?: string;
  isDefault?: boolean;
}

export default function ResumesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [resumes, setResumes] = useState<ResumeItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadResumes();
    }, [])
  );

  const loadResumes = async () => {
    try {
      const path = `${FileSystem.documentDirectory}resumes.json`;
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        const text = await FileSystem.readAsStringAsync(path);
        const data = JSON.parse(text);
        if (Array.isArray(data) && data.length > 0) {
          // Ensure at least one resume is marked as default
          let hasDefault = data.some((r: ResumeItem) => r.isDefault);
          let validated = data.map((r: ResumeItem, idx: number) => {
            if (!hasDefault && idx === 0) {
              return { ...r, isDefault: true };
            }
            return r;
          });
          setResumes(validated);
          return;
        }
      }

      // Check onboarding profile fallback if no resumes file
      const profilePath = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
      const profileInfo = await FileSystem.getInfoAsync(profilePath);
      if (profileInfo.exists) {
        const pText = await FileSystem.readAsStringAsync(profilePath);
        const pData = JSON.parse(pText);
        if (pData.resumeFile) {
          const fallback: ResumeItem[] = [
            {
              id: '1',
              name: pData.resumeFile.name || 'OmidMoradi_25jun.PDF',
              uri: pData.resumeFile.uri,
              date: '25 Jun',
              isDefault: true,
            },
          ];
          setResumes(fallback);
          saveResumesList(fallback);
          return;
        }
      }

      setResumes([]);
    } catch (e) {
      console.log('Error loading resumes:', e);
    }
  };

  const saveResumesList = async (list: ResumeItem[]) => {
    try {
      const path = `${FileSystem.documentDirectory}resumes.json`;
      await FileSystem.writeAsStringAsync(path, JSON.stringify(list));
      setResumes(list);

      // Sync default resume with profile
      const defaultItem = list.find((r) => r.isDefault);
      if (defaultItem) {
        const profilePath = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
        const profileInfo = await FileSystem.getInfoAsync(profilePath);
        let profileData = {};
        if (profileInfo.exists) {
          const pText = await FileSystem.readAsStringAsync(profilePath);
          profileData = JSON.parse(pText);
        }
        const updatedProfile = {
          ...profileData,
          defaultResumeId: defaultItem.id,
          defaultResumeFile: defaultItem,
          resumeFile: defaultItem.uri ? {
            name: defaultItem.name,
            uri: defaultItem.uri,
            size: defaultItem.size ? Math.round(parseFloat(defaultItem.size) * 1024 * 1024) : undefined
          } : null
        };
        await FileSystem.writeAsStringAsync(profilePath, JSON.stringify(updatedProfile));
      }
    } catch (e) {
      console.log('Error saving resumes list:', e);
    }
  };

  const handleSetDefault = (id: string) => {
    const updated = resumes.map((r) => ({
      ...r,
      isDefault: r.id === id,
    }));
    saveResumesList(updated);
  };

  const handleUploadResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const isFirst = resumes.length === 0;
        const newResume: ResumeItem = {
          id: Date.now().toString(),
          name: asset.name || 'My_Resume.pdf',
          uri: asset.uri,
          date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
          size: asset.size ? `${(asset.size / 1024 / 1024).toFixed(1)} MB` : undefined,
          isDefault: isFirst,
        };
        const updated = [newResume, ...resumes];
        await saveResumesList(updated);
      }
    } catch (e) {
      console.log('Document picker error:', e);
      const isFirst = resumes.length === 0;
      const demoResume: ResumeItem = {
        id: Date.now().toString(),
        name: 'OmidMoradi_25jun.PDF',
        date: '25 Jun',
        isDefault: isFirst,
      };
      saveResumesList([demoResume, ...resumes]);
    }
  };

  const handleResumeMenu = (item: ResumeItem, index: number) => {
    const options = item.isDefault
      ? ['View Resume', 'Delete Resume', 'Cancel']
      : ['Set as Default', 'View Resume', 'Delete Resume', 'Cancel'];

    const destructiveIndex = item.isDefault ? 1 : 2;
    const cancelIndex = item.isDefault ? 2 : 3;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex: destructiveIndex,
          cancelButtonIndex: cancelIndex,
          title: item.name,
          message: item.isDefault ? 'Default resume for job applications' : undefined,
        },
        (buttonIndex) => {
          if (!item.isDefault && buttonIndex === 0) {
            // Set as Default
            handleSetDefault(item.id);
          } else if ((item.isDefault && buttonIndex === 0) || (!item.isDefault && buttonIndex === 1)) {
            // View resume
            if (item.uri) {
              router.push('/build-resume');
            } else {
              Alert.alert('Resume', `Viewing ${item.name}`);
            }
          } else if ((item.isDefault && buttonIndex === 1) || (!item.isDefault && buttonIndex === 2)) {
            // Delete resume
            let updated = resumes.filter((_, i) => i !== index);
            if (item.isDefault && updated.length > 0) {
              updated[0].isDefault = true;
            }
            saveResumesList(updated);
          }
        }
      );
    } else {
      Alert.alert(item.name, 'Choose action', [
        { text: 'Cancel', style: 'cancel' },
        ...(!item.isDefault
          ? [{ text: 'Set as Default', onPress: () => handleSetDefault(item.id) }]
          : []),
        {
          text: 'View',
          onPress: () => {
            if (item.uri) router.push('/build-resume');
            else Alert.alert('Resume', `Viewing ${item.name}`);
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            let updated = resumes.filter((_, i) => i !== index);
            if (item.isDefault && updated.length > 0) {
              updated[0].isDefault = true;
            }
            saveResumesList(updated);
          },
        },
      ]);
    }
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

        <Text style={styles.headerTitle}>Resumes</Text>

        {resumes.length === 0 ? (
          <View style={styles.badgePillRed}>
            <Text style={styles.badgeTextWhite}>Add 1</Text>
          </View>
        ) : (
          <View style={styles.badgePillGreen}>
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          </View>
        )}
      </View>

      {/* CONTENT AREA */}
      {resumes.length > 0 ? (
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* EXPLANATION BANNER CARD */}
          <View style={styles.explanationBanner}>
            <Ionicons name="sparkles-outline" size={24} color="#2563EB" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitleText}>Default Resume for Job Apply</Text>
              <Text style={styles.bannerSubtitleText}>
                The default resume will be automatically sent when applying for jobs.
              </Text>
            </View>
          </View>

          {resumes.map((item, index) => (
            <TouchableOpacity
              key={item.id || index}
              style={[
                styles.resumeCard,
                item.isDefault && styles.resumeCardDefault,
              ]}
              activeOpacity={0.8}
              onPress={() => handleSetDefault(item.id)}
            >
              <View style={styles.folderIconBox}>
                <Ionicons
                  name={item.isDefault ? 'document-text' : 'folder'}
                  size={24}
                  color={item.isDefault ? '#2563EB' : '#555555'}
                />
              </View>

              <View style={{ flex: 1, marginRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.resumeNameText} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Ionicons name="checkmark-circle" size={12} color="#FFFFFF" style={{ marginRight: 2 }} />
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  )}
                </View>
                {item.date ? (
                  <Text style={styles.resumeDateText}>Added {item.date}</Text>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.menuDotsBtn}
                activeOpacity={0.7}
                onPress={() => handleResumeMenu(item, index)}
              >
                <Ionicons name="ellipsis-vertical" size={18} color="#555555" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyFolderGraphic}>
            <Ionicons name="folder-open" size={90} color="#8E8E93" />
          </View>
        </View>
      )}

      {/* BOTTOM ACTION BUTTONS */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom + 10, 20) }]}>
        <TouchableOpacity
          style={styles.uploadBtnOutline}
          activeOpacity={0.8}
          onPress={handleUploadResume}
        >
          <Text style={styles.uploadBtnText}>Upload resume</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buildBtnSolid}
          activeOpacity={0.8}
          onPress={() => router.push('/build-resume')}
        >
          <Text style={styles.buildBtnText}>Start building a resume</Text>
        </TouchableOpacity>
      </View>
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
  badgePillRed: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgePillGreen: {
    backgroundColor: '#16A34A',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTextWhite: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    gap: 12,
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

  resumeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  resumeCardDefault: {
    borderColor: '#2563EB',
    backgroundColor: '#FFFFFF',
  },
  folderIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  resumeNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    maxWidth: 160,
  },
  resumeDateText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
    marginTop: 2,
  },
  defaultBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    top: -10,
    right: -30,
  },
  defaultBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  menuDotsBtn: {
    padding: 6,
  },

  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFolderGraphic: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#EBEBEB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomBar: {
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 10,
  },
  uploadBtnOutline: {
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#000000',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
  buildBtnSolid: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buildBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
