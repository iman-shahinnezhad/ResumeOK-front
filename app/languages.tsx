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
  ActionSheetIOS,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as FileSystem from 'expo-file-system/legacy';

interface LanguageItem {
  id: string;
  name: string;
  proficiency: string;
}

const PROFICIENCY_OPTIONS = ['Native', 'Fluent', 'Intermediate', 'Basic'];

export default function LanguagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [languages, setLanguages] = useState<LanguageItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [langName, setLangName] = useState('');
  const [proficiency, setProficiency] = useState('Fluent');

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
        if (data.languages && Array.isArray(data.languages) && data.languages.length > 0) {
          setLanguages(data.languages);
        } else {
          // Initial default languages if empty
          const defaults: LanguageItem[] = [
            { id: '1', name: 'English', proficiency: 'Fluent' },
            { id: '2', name: 'Persian', proficiency: 'Native' },
          ];
          setLanguages(defaults);
        }
      }
    } catch (e) {
      console.log('Error loading languages profile data:', e);
    }
  };

  const saveLanguages = async (updatedList: LanguageItem[]) => {
    try {
      const path = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
      const updatedProfile = { ...(profile || {}), languages: updatedList };
      setProfile(updatedProfile);
      setLanguages(updatedList);
      await FileSystem.writeAsStringAsync(path, JSON.stringify(updatedProfile));
    } catch (e) {
      console.log('Error saving languages list:', e);
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setLangName('');
    setProficiency('Fluent');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: LanguageItem) => {
    setEditingId(item.id);
    setLangName(item.name || '');
    setProficiency(item.proficiency || 'Fluent');
    setIsModalOpen(true);
  };

  const handleProficiencyPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...PROFICIENCY_OPTIONS, 'Cancel'],
          cancelButtonIndex: PROFICIENCY_OPTIONS.length,
          title: 'Select Language Proficiency',
        },
        (buttonIndex) => {
          if (buttonIndex < PROFICIENCY_OPTIONS.length) {
            setProficiency(PROFICIENCY_OPTIONS[buttonIndex]);
          }
        }
      );
    }
  };

  const handleSaveLanguage = () => {
    if (!langName.trim()) return;

    const itemData: LanguageItem = {
      id: editingId || Date.now().toString(),
      name: langName.trim(),
      proficiency,
    };

    if (editingId) {
      const updatedList = languages.map((l) => (l.id === editingId ? itemData : l));
      saveLanguages(updatedList);
    } else {
      saveLanguages([itemData, ...languages]);
    }

    setIsModalOpen(false);
  };

  const handleMenuPress = (item: LanguageItem, index: number) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Edit Language', 'Delete', 'Cancel'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
          title: item.name,
          message: item.proficiency,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            handleOpenEdit(item);
          } else if (buttonIndex === 1) {
            const updated = languages.filter((_, i) => i !== index);
            saveLanguages(updated);
          }
        }
      );
    } else {
      Alert.alert(item.name, 'Choose action', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: () => handleOpenEdit(item) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = languages.filter((_, i) => i !== index);
            saveLanguages(updated);
          },
        },
      ]);
    }
  };

  const isFormValid = langName.trim().length > 0;

  // Remaining needed items calculation (target = 1 language)
  const remainingNeeded = Math.max(0, 1 - languages.length);

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

        <Text style={styles.headerTitle}>Languages</Text>

        {remainingNeeded > 0 ? (
          <View style={styles.badgePillRed}>
            <Text style={styles.badgeTextWhite}>Add {remainingNeeded}</Text>
          </View>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* + ADD LANGUAGE OUTLINE BUTTON */}
        <TouchableOpacity
          style={styles.addOutlineBtn}
          activeOpacity={0.8}
          onPress={handleOpenNew}
        >
          <Ionicons name="add" size={22} color="#000000" style={{ marginRight: 6 }} />
          <Text style={styles.addOutlineBtnText}>ADD LANGUAGE</Text>
        </TouchableOpacity>

        {/* LIST OF SAVED LANGUAGES */}
        {languages.map((item, index) => (
          <View key={item.id || index} style={styles.langCard}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.langNameText}>{item.name}</Text>
                <Text style={styles.proficiencyText}>{item.proficiency}</Text>
              </View>

              <TouchableOpacity
                style={styles.menuDotsBtn}
                onPress={() => handleMenuPress(item, index)}
              >
                <Ionicons name="ellipsis-vertical" size={18} color="#8E8E93" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ======================================================== */}
      {/* ADD / EDIT LANGUAGE MODAL */}
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
            <Text style={styles.sheetTitle}>
              {editingId ? 'Edit Language' : 'Add Language'}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={{ gap: 16 }}>
            {/* Language Name Input */}
            <View style={[styles.floatingInputBox, focusedField === 'langName' && styles.floatingInputFocused]}>
              {langName.trim().length > 0 && (
                <Text style={styles.floatingInputLabel}>Language Name *</Text>
              )}
              <TextInput
                style={styles.floatingTextInput}
                placeholder="Language Name * e.g. English, French"
                placeholderTextColor="#999999"
                value={langName}
                onChangeText={setLangName}
                onFocus={() => setFocusedField('langName')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Proficiency Dropdown */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionLabel}>Proficiency Level</Text>
              <TouchableOpacity
                style={styles.selectorCard}
                activeOpacity={0.8}
                onPress={handleProficiencyPress}
              >
                <Text style={styles.selectorText}>{proficiency}</Text>
                <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.addActionButton,
                isFormValid ? styles.addActionButtonActive : styles.addActionButtonDisabled,
              ]}
              disabled={!isFormValid}
              onPress={handleSaveLanguage}
            >
              <Text style={styles.addActionButtonText}>
                {editingId ? 'Save' : 'Add'}
              </Text>
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
  badgePillRed: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
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
    paddingTop: 15,
    paddingBottom: 40,
    gap: 14,
  },

  addOutlineBtn: {
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#000000',
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  addOutlineBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },

  langCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  langNameText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  proficiencyText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555555',
    marginTop: 2,
  },
  menuDotsBtn: {
    padding: 4,
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

  floatingInputBox: {
    backgroundColor: '#F2F2F4',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    justifyContent: 'center',
    height: 56,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  floatingInputFocused: {
    borderColor: '#000000',
    backgroundColor: '#F2F2F4',
  },
  floatingInputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 2,
  },
  floatingTextInput: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    padding: 0,
    margin: 0,
  },

  sectionContainer: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  selectorCard: {
    backgroundColor: '#F2F2F4',
    borderRadius: 20,
    paddingHorizontal: 18,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },

  addActionButton: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  addActionButtonDisabled: {
    backgroundColor: '#D1D1D6',
  },
  addActionButtonActive: {
    backgroundColor: '#000000',
  },
  addActionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
