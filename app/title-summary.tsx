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

interface TitleSummaryItem {
  id: string;
  professionalTitle: string;
  summaryText: string;
}

export default function TitleSummaryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [items, setItems] = useState<TitleSummaryItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [professionalTitle, setProfessionalTitle] = useState('');
  const [summaryText, setSummaryText] = useState('');

  // AI Suggestions for Summary
  const AI_SUGGESTIONS = [
    'Passionate Product Designer with 5+ years of experience crafting intuitive, human-centered web and mobile experiences that drive user engagement.',
    'Senior Software Engineer specializing in scalable React Native mobile applications, cloud architecture, and high-performance frontend interfaces.',
  ];

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

        if (data.summaries && Array.isArray(data.summaries) && data.summaries.length > 0) {
          setItems(data.summaries);
        } else if (data.jobTitle || data.summary || data.role) {
          // Onboarding fallback initial item
          const initialItem: TitleSummaryItem = {
            id: '1',
            professionalTitle: data.jobTitle || data.role || 'Senior Product Designer',
            summaryText: data.summary || 'Passionate Product Designer with 5+ years of experience crafting intuitive mobile experiences.',
          };
          setItems([initialItem]);
        }
      }
    } catch (e) {
      console.log('Error loading title & summary profile data:', e);
    }
  };

  const saveSummaries = async (updatedList: TitleSummaryItem[]) => {
    try {
      const path = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
      const firstItem = updatedList[0];
      const updatedProfile = {
        ...(profile || {}),
        summaries: updatedList,
        jobTitle: firstItem ? firstItem.professionalTitle : '',
        summary: firstItem ? firstItem.summaryText : '',
      };
      setProfile(updatedProfile);
      setItems(updatedList);
      await FileSystem.writeAsStringAsync(path, JSON.stringify(updatedProfile));
    } catch (e) {
      console.log('Error saving summaries list:', e);
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setProfessionalTitle('');
    setSummaryText('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: TitleSummaryItem) => {
    setEditingId(item.id);
    setProfessionalTitle(item.professionalTitle || '');
    setSummaryText(item.summaryText || '');
    setIsModalOpen(true);
  };

  const handleSaveItem = () => {
    if (!professionalTitle.trim() || !summaryText.trim()) return;

    if (editingId) {
      // Edit existing item
      const updatedList = items.map((itm) => {
        if (itm.id === editingId) {
          return {
            ...itm,
            professionalTitle: professionalTitle.trim(),
            summaryText: summaryText.trim(),
          };
        }
        return itm;
      });
      saveSummaries(updatedList);
    } else {
      // Add new item
      const newItem: TitleSummaryItem = {
        id: Date.now().toString(),
        professionalTitle: professionalTitle.trim(),
        summaryText: summaryText.trim(),
      };
      saveSummaries([newItem, ...items]);
    }

    setIsModalOpen(false);
  };

  const handleMenuPress = (item: TitleSummaryItem, index: number) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Edit Title & Summary', 'Delete', 'Cancel'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
          title: item.professionalTitle,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            handleOpenEdit(item);
          } else if (buttonIndex === 1) {
            const updated = items.filter((_, i) => i !== index);
            saveSummaries(updated);
          }
        }
      );
    } else {
      Alert.alert(item.professionalTitle, 'Choose action', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: () => handleOpenEdit(item) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = items.filter((_, i) => i !== index);
            saveSummaries(updated);
          },
        },
      ]);
    }
  };

  const appendAiSuggestion = (suggestion: string) => {
    if (summaryText.trim().length > 0) {
      setSummaryText((prev) => `${prev}\n• ${suggestion}`);
    } else {
      setSummaryText(suggestion);
    }
  };

  const isFormValid = professionalTitle.trim().length > 0 && summaryText.trim().length > 0;

  // Remaining needed count (target = 2)
  const remainingNeeded = Math.max(0, 2 - items.length);

  // Floating Input Box renderer
  const renderFloatingInput = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    fieldName: string,
    multiline: boolean = false,
    extraStyle?: any
  ) => {
    const isFocused = focusedField === fieldName;
    const hasValue = value.trim().length > 0;

    return (
      <View
        style={[
          styles.floatingInputBox,
          multiline && { height: 140, justifyContent: 'flex-start' },
          isFocused && styles.floatingInputFocused,
          extraStyle,
        ]}
      >
        {(hasValue || isFocused) && (
          <Text style={styles.floatingInputLabel}>{label}</Text>
        )}
        <TextInput
          style={[
            styles.floatingTextInput,
            multiline && { height: 95, textAlignVertical: 'top' },
            !hasValue && !isFocused && styles.floatingTextInputEmpty,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={!hasValue && !isFocused ? label : ''}
          placeholderTextColor="#999999"
          onFocus={() => setFocusedField(fieldName)}
          onBlur={() => setFocusedField(null)}
          multiline={multiline}
        />
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

        <Text style={styles.headerTitle}>Title & Summary</Text>

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
        {/* + ADD TITLE & SUMMARY BUTTON */}
        <TouchableOpacity
          style={styles.addOutlineBtn}
          activeOpacity={0.8}
          onPress={handleOpenNew}
        >
          <Ionicons name="add" size={22} color="#000000" style={{ marginRight: 6 }} />
          <Text style={styles.addOutlineBtnText}>ADD TITLE & SUMMARY</Text>
        </TouchableOpacity>

        {/* LIST OF SAVED ITEMS */}
        {items.map((item, index) => (
          <View key={item.id || index} style={styles.summaryCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.professionalTitleText}>{item.professionalTitle}</Text>
              <TouchableOpacity
                style={styles.menuDotsBtn}
                onPress={() => handleMenuPress(item, index)}
              >
                <Ionicons name="ellipsis-vertical" size={18} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <Text style={styles.summaryBodyText}>{item.summaryText}</Text>
          </View>
        ))}
      </ScrollView>

      {/* ======================================================== */}
      {/* ADD / EDIT TITLE & SUMMARY MODAL */}
      {/* ======================================================== */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={[styles.cleanFullPageModal, { paddingTop: insets.top + 10, paddingBottom: Math.max(insets.bottom + 10, 20) }]}>
          
          {/* Sheet Header */}
          <View style={styles.sheetHeader}>
            <TouchableOpacity
              style={styles.sheetCloseCircleBtn}
              onPress={() => setIsModalOpen(false)}
            >
              <Ionicons name="close" size={20} color="#000000" />
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>
              {editingId ? 'Edit Title & Summary' : 'Add Title & Summary'}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.sheetFormScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Professional Title Field */}
            {renderFloatingInput('Professional Title', professionalTitle, setProfessionalTitle, 'professionalTitle')}

            {/* Summary Text Multiline Field */}
            {renderFloatingInput('Summary', summaryText, setSummaryText, 'summaryText', true)}

            {/* ✨ AI Help Section */}
            <View style={styles.aiHelpSection}>
              <Text style={styles.aiHelpTitle}>✨ AI Help</Text>
              {AI_SUGGESTIONS.map((suggestion, idx) => (
                <View key={idx} style={styles.aiCard}>
                  <TouchableOpacity
                    style={styles.aiPlusBtn}
                    activeOpacity={0.7}
                    onPress={() => appendAiSuggestion(suggestion)}
                  >
                    <Ionicons name="add-circle-outline" size={22} color="#000000" />
                  </TouchableOpacity>
                  <Text style={styles.aiCardText}>{suggestion}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Bottom Add/Save Action Button */}
          <TouchableOpacity
            style={[
              styles.addActionButton,
              isFormValid ? styles.addActionButtonActive : styles.addActionButtonDisabled,
            ]}
            activeOpacity={isFormValid ? 0.8 : 1}
            onPress={handleSaveItem}
            disabled={!isFormValid}
          >
            <Text
              style={[
                styles.addActionButtonText,
                isFormValid ? styles.addActionButtonTextActive : styles.addActionButtonTextDisabled,
              ]}
            >
              {editingId ? 'Save' : 'Add'}
            </Text>
          </TouchableOpacity>
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

  /* + ADD TITLE & SUMMARY OUTLINE BUTTON */
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

  /* SUMMARY CARD STYLES */
  summaryCard: {
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
    marginBottom: 8,
  },
  professionalTitleText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  menuDotsBtn: {
    padding: 4,
  },
  summaryBodyText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333333',
  },

  /* CLEAN FULL PAGE MODAL STYLES */
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
  sheetFormScroll: {
    gap: 12,
    paddingBottom: 20,
  },

  /* FLOATING INPUT BOX STYLES */
  floatingInputBox: {
    backgroundColor: '#F2F2F4',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    justifyContent: 'center',
    height: 58,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  floatingInputFocused: {
    borderColor: '#000000',
    backgroundColor: '#F2F2F4',
  },
  floatingInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 2,
  },
  floatingTextInput: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    padding: 0,
    margin: 0,
  },
  floatingTextInputEmpty: {
    fontSize: 16,
    fontWeight: '500',
    color: '#999999',
  },
  aiHelpSection: {
    marginTop: 8,
    gap: 10,
  },
  aiHelpTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
  aiCard: {
    backgroundColor: '#F0EEFF',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  aiPlusBtn: {
    marginTop: 2,
  },
  aiCardText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#333333',
    fontWeight: '500',
  },
  addActionButton: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 10,
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
  },
  addActionButtonTextDisabled: {
    color: '#FFFFFF',
  },
  addActionButtonTextActive: {
    color: '#FFFFFF',
  },
});
