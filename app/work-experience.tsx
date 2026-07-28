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
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system/legacy';

interface Experience {
  id: string;
  jobTitle: string;
  companyName: string;
  city: string;
  startDate: string;
  endDate: string;
  jobDescription: string;
}

export default function WorkExperienceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [city, setCity] = useState('');
  const [startDate, setStartDate] = useState('02 May 2020');
  const [endDate, setEndDate] = useState('02 May 2025');
  const [jobDescription, setJobDescription] = useState('');

  // Date Objects for Native DatePickers
  const [startDateObj, setStartDateObj] = useState<Date>(new Date(2020, 4, 2));
  const [endDateObj, setEndDateObj] = useState<Date>(new Date(2025, 4, 2));

  // AI Suggestions list
  const AI_SUGGESTIONS = [
    'Design innovative products by collaborating with cross-functional teams, creating prototypes, and refining concepts to meet user needs and business goals.',
    'Spearheaded technical development and user experience strategy across web and mobile platforms to boost user engagement by 40%.',
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
        if (data.experiences && Array.isArray(data.experiences)) {
          setExperiences(data.experiences);
        } else if (data.role || data.company) {
          const initialItem: Experience = {
            id: '1',
            jobTitle: data.role || data.jobTitle || 'Product Designer',
            companyName: data.company || 'Pixflo',
            city: data.city || 'Paris, France',
            startDate: '02 May 2020',
            endDate: '02 May 2025',
            jobDescription: data.summary || 'Design innovative products by collaborating with cross-functional teams.',
          };
          setExperiences([initialItem]);
        }
      }
    } catch (e) {
      console.log('Error loading experiences profile data:', e);
    }
  };

  const saveExperiences = async (updatedList: Experience[]) => {
    try {
      const path = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
      const updatedProfile = { ...(profile || {}), experiences: updatedList };
      setProfile(updatedProfile);
      setExperiences(updatedList);
      await FileSystem.writeAsStringAsync(path, JSON.stringify(updatedProfile));
    } catch (e) {
      console.log('Error saving experiences list:', e);
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setJobTitle('');
    setCompanyName('');
    setCity('');
    setStartDate('02 May 2020');
    setEndDate('02 May 2025');
    setJobDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Experience) => {
    setEditingId(item.id);
    setJobTitle(item.jobTitle || '');
    setCompanyName(item.companyName || '');
    setCity(item.city || '');
    setStartDate(item.startDate || '02 May 2020');
    setEndDate(item.endDate || '02 May 2025');
    setJobDescription(item.jobDescription || '');
    setIsModalOpen(true);
  };

  const handleStartDateChange = (event: any, date?: Date) => {
    if (date) {
      setStartDateObj(date);
      const formatted = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      setStartDate(formatted);
    }
  };

  const handleEndDateChange = (event: any, date?: Date) => {
    if (date) {
      setEndDateObj(date);
      const formatted = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      setEndDate(formatted);
    }
  };

  const handleSaveExperience = () => {
    if (!jobTitle.trim() || !companyName.trim()) return;

    if (editingId) {
      const updatedList = experiences.map((exp) => {
        if (exp.id === editingId) {
          return {
            ...exp,
            jobTitle: jobTitle.trim(),
            companyName: companyName.trim(),
            city: city.trim(),
            startDate: startDate.trim(),
            endDate: endDate.trim(),
            jobDescription: jobDescription.trim(),
          };
        }
        return exp;
      });
      saveExperiences(updatedList);
    } else {
      const newExp: Experience = {
        id: Date.now().toString(),
        jobTitle: jobTitle.trim(),
        companyName: companyName.trim(),
        city: city.trim(),
        startDate: startDate.trim(),
        endDate: endDate.trim(),
        jobDescription: jobDescription.trim(),
      };
      saveExperiences([newExp, ...experiences]);
    }

    setIsModalOpen(false);
  };

  const handleMenuPress = (item: Experience, index: number) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Edit Experience', 'Delete Experience', 'Cancel'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
          title: item.jobTitle,
          message: item.companyName,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            handleOpenEdit(item);
          } else if (buttonIndex === 1) {
            const updated = experiences.filter((_, i) => i !== index);
            saveExperiences(updated);
          }
        }
      );
    } else {
      Alert.alert(item.jobTitle, 'Choose action', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: () => handleOpenEdit(item) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = experiences.filter((_, i) => i !== index);
            saveExperiences(updated);
          },
        },
      ]);
    }
  };

  const appendAiSuggestion = (suggestion: string) => {
    if (jobDescription.trim().length > 0) {
      setJobDescription((prev) => `${prev}\n• ${suggestion}`);
    } else {
      setJobDescription(`• ${suggestion}`);
    }
  };

  const isFormValid = jobTitle.trim().length > 0 && companyName.trim().length > 0;
  const remainingNeeded = Math.max(0, 2 - experiences.length);

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

        <Text style={styles.headerTitle}>Work Experience</Text>

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
        {/* + ADD WORK EXPERIENCE BUTTON */}
        <TouchableOpacity
          style={styles.addWorkExpBtnOutline}
          activeOpacity={0.8}
          onPress={handleOpenNew}
        >
          <Ionicons name="add" size={22} color="#000000" style={{ marginRight: 6 }} />
          <Text style={styles.addWorkExpBtnText}>ADD WORK EXPERIENCE</Text>
        </TouchableOpacity>

        {/* LIST OF SAVED EXPERIENCES */}
        {experiences.map((item, index) => (
          <View
            key={item.id || index}
            style={styles.experienceCard}
          >
            <View style={styles.expCardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.expJobTitle}>{item.jobTitle}</Text>
                <Text style={styles.expCompanyText}>
                  {item.companyName} {item.city ? `• ${item.city}` : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.deleteCardBtn}
                onPress={() => handleMenuPress(item, index)}
              >
                <Ionicons name="ellipsis-vertical" size={18} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {(item.startDate || item.endDate) && (
              <View style={styles.expDatePill}>
                <Text style={styles.expDateText}>
                  {item.startDate || ''} {item.endDate ? `- ${item.endDate}` : ''}
                </Text>
              </View>
            )}

            {item.jobDescription ? (
              <Text style={styles.expDescriptionText}>{item.jobDescription}</Text>
            ) : null}
          </View>
        ))}
      </ScrollView>

      {/* ======================================================== */}
      {/* ADD / EDIT EXPERIENCE MODAL */}
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
              {editingId ? 'Edit Experience' : 'Add Experience'}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.sheetFormScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Job Title Field */}
            {renderFloatingInput('Job title', jobTitle, setJobTitle, 'jobTitle')}

            {/* Company Name Field */}
            {renderFloatingInput('Company Name', companyName, setCompanyName, 'companyName')}

            {/* City Field */}
            {renderFloatingInput('City', city, setCity, 'city')}

            {/* Clean Date Row (NO nested grey capsules!) */}
            <View style={styles.dateRow}>
              {/* Start Date Box */}
              <View style={[styles.floatingInputBox, { flex: 1 }]}>
                <Text style={styles.floatingInputLabel}>Start Date</Text>
                <Text style={styles.dateDisplayValueText}>{startDate || 'Date'}</Text>
                {Platform.OS === 'ios' && (
                  <DateTimePicker
                    value={startDateObj}
                    mode="date"
                    display="compact"
                    onChange={handleStartDateChange}
                    maximumDate={new Date()}
                    style={styles.hiddenNativePicker}
                  />
                )}
              </View>

              {/* End Date Box */}
              <View style={[styles.floatingInputBox, { flex: 1 }]}>
                <Text style={styles.floatingInputLabel}>End Date</Text>
                <Text style={styles.dateDisplayValueText}>{endDate || 'Date'}</Text>
                {Platform.OS === 'ios' && (
                  <DateTimePicker
                    value={endDateObj}
                    mode="date"
                    display="compact"
                    onChange={handleEndDateChange}
                    style={styles.hiddenNativePicker}
                  />
                )}
              </View>
            </View>

            {/* Job Description Multiline Field */}
            {renderFloatingInput('Job Description', jobDescription, setJobDescription, 'jobDescription', true)}

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
            onPress={handleSaveExperience}
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

  addWorkExpBtnOutline: {
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
  addWorkExpBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },

  experienceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  expCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  expJobTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  expCompanyText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555555',
    marginTop: 2,
  },
  deleteCardBtn: {
    padding: 4,
  },
  expDatePill: {
    backgroundColor: '#F2F2F4',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 10,
  },
  expDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  expDescriptionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333333',
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
  sheetFormScroll: {
    gap: 12,
    paddingBottom: 20,
  },

  /* REFINED FLOATING INPUT BOX STYLES */
  floatingInputBox: {
    position: 'relative',
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
  floatingTextInputEmpty: {
    fontSize: 15,
    fontWeight: '500',
    color: '#999999',
  },
  dateDisplayValueText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginTop: 2,
  },
  hiddenNativePicker: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.015,
  },

  dateRow: {
    flexDirection: 'row',
    gap: 10,
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
