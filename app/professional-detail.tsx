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
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
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

export default function ProfessionalDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);

  // Active modal state
  type ModalType = 'experience' | 'summary' | 'education' | 'skills' | null;
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Add Experience Form State
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [city, setCity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  // Title & Summary Form State
  const [professionalTitle, setProfessionalTitle] = useState('');
  const [summaryText, setSummaryText] = useState('');

  // AI Suggestions list
  const AI_SUGGESTIONS = [
    'Design innovative products by collaborating with cross-functional teams, creating prototypes, and refining concepts to meet user needs and business goals.',
    'Spearheaded technical development and user experience strategy across web and mobile platforms to boost user engagement by 40%.',
  ];

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      const path = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        const text = await FileSystem.readAsStringAsync(path);
        const data = JSON.parse(text);
        setProfile(data);
        if (data.jobTitle) setProfessionalTitle(data.jobTitle);
        if (data.summary) setSummaryText(data.summary);
      }
    } catch (e) {
      console.log('Error loading profile:', e);
    }
  };

  const saveProfileField = async (key: string, value: any) => {
    try {
      const path = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
      const updated = { ...(profile || {}), [key]: value };
      setProfile(updated);
      await FileSystem.writeAsStringAsync(path, JSON.stringify(updated));
    } catch (e) {
      console.log('Error saving profile field:', e);
    }
  };

  const handleAddExperience = () => {
    if (!jobTitle.trim() || !companyName.trim()) return;

    const newExp: Experience = {
      id: Date.now().toString(),
      jobTitle: jobTitle.trim(),
      companyName: companyName.trim(),
      city: city.trim(),
      startDate: startDate.trim(),
      endDate: endDate.trim(),
      jobDescription: jobDescription.trim(),
    };

    const currentExps = profile?.experiences || [];
    const updated = [newExp, ...currentExps];
    saveProfileField('experiences', updated);

    // Reset form & close modal
    setJobTitle('');
    setCompanyName('');
    setCity('');
    setStartDate('');
    setEndDate('');
    setJobDescription('');
    setActiveModal(null);
  };

  const handleSaveSummary = () => {
    saveProfileField('jobTitle', professionalTitle.trim());
    saveProfileField('summary', summaryText.trim());
    setActiveModal(null);
  };

  const appendAiSuggestion = (suggestion: string) => {
    if (jobDescription.trim().length > 0) {
      setJobDescription((prev) => `${prev}\n• ${suggestion}`);
    } else {
      setJobDescription(`• ${suggestion}`);
    }
  };

  const isFormValid = jobTitle.trim().length > 0 && companyName.trim().length > 0;

  // Reusable Floating Input Box matching Screenshots 1 & 2
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

        <Text style={styles.headerTitle}>Professional Detail</Text>

        {(() => {
          const summaryRemaining = Math.max(0, 2 - (profile?.summaries?.length || (profile?.jobTitle ? 1 : 0)));
          const expRemaining = Math.max(0, 2 - (profile?.experiences?.length || 0));
          const projectRemaining = Math.max(0, 3 - (profile?.projects?.length || 0));
          const eduRemaining = Math.max(0, 1 - (profile?.educations?.length || 0));
          const techCount = profile?.skills?.length || 0;
          const softCount = profile?.softSkills?.length || 0;
          const skillRemaining = Math.max(0, 3 - (techCount + softCount));
          const langRemaining = Math.max(0, 1 - (profile?.languages?.length || 0));

          const totalRemaining = summaryRemaining + expRemaining + projectRemaining + eduRemaining + skillRemaining + langRemaining;

          if (totalRemaining > 0) {
            return (
              <View style={styles.badgePillRed}>
                <Text style={styles.badgeTextWhite}>Add {totalRemaining}</Text>
              </View>
            );
          }
          return (
            <View style={styles.badgePillGreen}>
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </View>
          );
        })()}
      </View>

      {/* MENU LIST ITEMS (MATCHING SCREENSHOT 2) */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Title & Summary */}
        <TouchableOpacity
          style={styles.menuCardRow}
          activeOpacity={0.7}
          onPress={() => router.push('/title-summary' as any)}
        >
          <View style={styles.blueBriefcaseIconBox}>
            <Ionicons name="briefcase" size={20} color="#2563EB" />
          </View>
          <Text style={styles.menuCardTitle}>Title & Summary</Text>
          <View style={styles.menuCardRight}>
            {(() => {
              const count = profile?.summaries?.length || (profile?.jobTitle ? 1 : 0);
              const remaining = Math.max(0, 2 - count);
              if (remaining > 0) {
                return (
                  <View style={styles.badgePillRed}>
                    <Text style={styles.badgeTextWhite}>Add {remaining}</Text>
                  </View>
                );
              }
              return (
                <View style={styles.badgePillGreen}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
              );
            })()}
            <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
          </View>
        </TouchableOpacity>

        {/* 2. Work Experience */}
        <TouchableOpacity
          style={styles.menuCardRow}
          activeOpacity={0.7}
          onPress={() => router.push('/work-experience' as any)}
        >
          <View style={styles.blueBriefcaseIconBox}>
            <Ionicons name="briefcase" size={20} color="#2563EB" />
          </View>
          <Text style={styles.menuCardTitle}>Work Experience</Text>
          <View style={styles.menuCardRight}>
            {(() => {
              const expCount = profile?.experiences?.length || 0;
              const remaining = Math.max(0, 2 - expCount);
              if (remaining > 0) {
                return (
                  <View style={styles.badgePillRed}>
                    <Text style={styles.badgeTextWhite}>Add {remaining}</Text>
                  </View>
                );
              }
              return (
                <View style={styles.badgePillGreen}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
              );
            })()}
            <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
          </View>
        </TouchableOpacity>

        {/* 3. Projects */}
        <TouchableOpacity
          style={styles.menuCardRow}
          activeOpacity={0.7}
          onPress={() => router.push('/projects' as any)}
        >
          <View style={styles.blueBriefcaseIconBox}>
            <Ionicons name="briefcase" size={20} color="#2563EB" />
          </View>
          <Text style={styles.menuCardTitle}>Projects</Text>
          <View style={styles.menuCardRight}>
            {(() => {
              const count = profile?.projects?.length || 0;
              const remaining = Math.max(0, 3 - count);
              if (remaining > 0) {
                return (
                  <View style={styles.badgePillRed}>
                    <Text style={styles.badgeTextWhite}>Add {remaining}</Text>
                  </View>
                );
              }
              return (
                <View style={styles.badgePillGreen}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
              );
            })()}
            <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
          </View>
        </TouchableOpacity>

        {/* 4. Volunteer */}
        <TouchableOpacity
          style={styles.menuCardRow}
          activeOpacity={0.7}
          onPress={() => router.push('/volunteer' as any)}
        >
          <View style={styles.blueBriefcaseIconBox}>
            <Ionicons name="briefcase" size={20} color="#2563EB" />
          </View>
          <Text style={styles.menuCardTitle}>Volunteer</Text>
          <View style={styles.menuCardRight}>
            <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
          </View>
        </TouchableOpacity>

        {/* 5. Education */}
        <TouchableOpacity
          style={styles.menuCardRow}
          activeOpacity={0.7}
          onPress={() => router.push('/education' as any)}
        >
          <View style={styles.blueBriefcaseIconBox}>
            <Ionicons name="briefcase" size={20} color="#2563EB" />
          </View>
          <Text style={styles.menuCardTitle}>Education</Text>
          <View style={styles.menuCardRight}>
            {(() => {
              const count = profile?.educations?.length || 0;
              const remaining = Math.max(0, 1 - count);
              if (remaining > 0) {
                return (
                  <View style={styles.badgePillRed}>
                    <Text style={styles.badgeTextWhite}>Add {remaining}</Text>
                  </View>
                );
              }
              return (
                <View style={styles.badgePillGreen}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
              );
            })()}
            <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
          </View>
        </TouchableOpacity>

        {/* 6. Skills */}
        <TouchableOpacity
          style={styles.menuCardRow}
          activeOpacity={0.7}
          onPress={() => router.push('/skills' as any)}
        >
          <View style={styles.blueBriefcaseIconBox}>
            <Ionicons name="briefcase" size={20} color="#2563EB" />
          </View>
          <Text style={styles.menuCardTitle}>Skills</Text>
          <View style={styles.menuCardRight}>
            {(() => {
              const techCount = profile?.skills?.length || 0;
              const softCount = profile?.softSkills?.length || 0;
              const totalCount = techCount + softCount;
              const remaining = Math.max(0, 3 - totalCount);
              if (remaining > 0) {
                return (
                  <View style={styles.badgePillRed}>
                    <Text style={styles.badgeTextWhite}>Add {remaining}</Text>
                  </View>
                );
              }
              return (
                <View style={styles.badgePillGreen}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
              );
            })()}
            <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
          </View>
        </TouchableOpacity>

        {/* 7. Languages */}
        <TouchableOpacity
          style={styles.menuCardRow}
          activeOpacity={0.7}
          onPress={() => router.push('/languages' as any)}
        >
          <View style={styles.blueBriefcaseIconBox}>
            <Ionicons name="language" size={20} color="#2563EB" />
          </View>
          <Text style={styles.menuCardTitle}>Languages</Text>
          <View style={styles.menuCardRight}>
            {(() => {
              const count = profile?.languages?.length || 0;
              const remaining = Math.max(0, 1 - count);
              if (remaining > 0) {
                return (
                  <View style={styles.badgePillRed}>
                    <Text style={styles.badgeTextWhite}>Add {remaining}</Text>
                  </View>
                );
              }
              return (
                <View style={styles.badgePillGreen}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
              );
            })()}
            <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
          </View>
        </TouchableOpacity>

        {/* 8. Certificates */}
        <TouchableOpacity
          style={styles.menuCardRow}
          activeOpacity={0.7}
          onPress={() => router.push('/certificates' as any)}
        >
          <View style={styles.blueBriefcaseIconBox}>
            <Ionicons name="briefcase" size={20} color="#2563EB" />
          </View>
          <Text style={styles.menuCardTitle}>Certificates</Text>
          <View style={styles.menuCardRight}>
            <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
          </View>
        </TouchableOpacity>

        {/* 9. Your Links */}
        <TouchableOpacity
          style={styles.menuCardRow}
          activeOpacity={0.7}
          onPress={() => router.push('/links' as any)}
        >
          <View style={styles.blueBriefcaseIconBox}>
            <Ionicons name="briefcase" size={20} color="#2563EB" />
          </View>
          <Text style={styles.menuCardTitle}>Your Links</Text>
          <View style={styles.menuCardRight}>
            <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
          </View>
        </TouchableOpacity>

        {/* 9. Awards */}
        <TouchableOpacity
          style={styles.menuCardRow}
          activeOpacity={0.7}
          onPress={() => router.push('/awards' as any)}
        >
          <View style={styles.blueBriefcaseIconBox}>
            <Ionicons name="briefcase" size={20} color="#2563EB" />
          </View>
          <Text style={styles.menuCardTitle}>Awards</Text>
          <View style={styles.menuCardRight}>
            <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
          </View>
        </TouchableOpacity>

        {/* 10. Recognition */}
        <TouchableOpacity
          style={styles.menuCardRow}
          activeOpacity={0.7}
          onPress={() => router.push('/recognitions' as any)}
        >
          <View style={styles.blueBriefcaseIconBox}>
            <Ionicons name="briefcase" size={20} color="#2563EB" />
          </View>
          <Text style={styles.menuCardTitle}>Recognition</Text>
          <View style={styles.menuCardRight}>
            <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
          </View>
        </TouchableOpacity>


      </ScrollView>

      {/* ======================================================== */}
      {/* ADD EXPERIENCE MODAL (MATCHING SCREENSHOTS 1 & 2) */}
      {/* ======================================================== */}
      <Modal
        visible={activeModal === 'experience'}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={[styles.cleanFullPageModal, { paddingTop: insets.top + 10, paddingBottom: Math.max(insets.bottom + 10, 20) }]}>

          {/* Sheet Header */}
          <View style={styles.sheetHeader}>
            <TouchableOpacity
              style={styles.sheetCloseCircleBtn}
              onPress={() => setActiveModal(null)}
            >
              <Ionicons name="close" size={20} color="#000000" />
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>Add Experience</Text>
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

            {/* Row with Start Date & End Date */}
            <View style={styles.dateRow}>
              {renderFloatingInput('Start Date', startDate, setStartDate, 'startDate', false, { flex: 1 })}
              {renderFloatingInput('End Date', endDate, setEndDate, 'endDate', false, { flex: 1 })}
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

          {/* Bottom Add Action Button */}
          <TouchableOpacity
            style={[
              styles.addActionButton,
              isFormValid ? styles.addActionButtonActive : styles.addActionButtonDisabled,
            ]}
            activeOpacity={isFormValid ? 0.8 : 1}
            onPress={handleAddExperience}
            disabled={!isFormValid}
          >
            <Text
              style={[
                styles.addActionButtonText,
                isFormValid ? styles.addActionButtonTextActive : styles.addActionButtonTextDisabled,
              ]}
            >
              Add
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* TITLE & SUMMARY MODAL */}
      {/* ======================================================== */}
      <Modal
        visible={activeModal === 'summary'}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={[styles.cleanFullPageModal, { paddingTop: insets.top + 10, paddingBottom: Math.max(insets.bottom + 10, 20) }]}>
          <View style={styles.sheetHeader}>
            <TouchableOpacity
              style={styles.sheetCloseCircleBtn}
              onPress={() => setActiveModal(null)}
            >
              <Ionicons name="close" size={20} color="#000000" />
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>Title & Summary</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView contentContainerStyle={styles.sheetFormScroll}>
            {renderFloatingInput('Professional Title', professionalTitle, setProfessionalTitle, 'professionalTitle')}
            {renderFloatingInput('Summary', summaryText, setSummaryText, 'summaryText', true)}
          </ScrollView>

          <TouchableOpacity
            style={[styles.addActionButton, styles.addActionButtonActive]}
            activeOpacity={0.8}
            onPress={handleSaveSummary}
          >
            <Text style={[styles.addActionButtonText, styles.addActionButtonTextActive]}>
              Save Summary
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
    paddingBottom: 40,
    gap: 10,
  },
  menuCardRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  blueBriefcaseIconBox: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#EBF3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuCardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  menuCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  /* CLEAN FULL PAGE MODAL STYLES (MATCHING SCREENSHOTS 1 & 2) */
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

  /* FLOATING INPUT BOX STYLES (MATCHING SCREENSHOT 1 & 2) */
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
