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

interface VolunteerItem {
  id: string;
  organization: string;
  role: string;
  cause: string;
  startDate: string;
  endDate: string;
  currentlyVolunteering: boolean;
  description: string;
  skillsUsed: string[];
}

const CAUSE_OPTIONS = [
  'Education',
  'Environment',
  'Health',
  'Community',
  'Animal Welfare',
  'Disaster Relief',
  'Arts & Culture',
  'Human Rights',
  'Other',
];

export default function VolunteerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [volunteers, setVolunteers] = useState<VolunteerItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form States
  const [organization, setOrganization] = useState('');
  const [role, setRole] = useState('');
  const [cause, setCause] = useState('Education');

  // Dates & Currently Volunteering
  const [startDate, setStartDate] = useState('Jan 2025');
  const [endDate, setEndDate] = useState('Present');
  const [startDateObj, setStartDateObj] = useState<Date>(new Date(2025, 0, 1));
  const [endDateObj, setEndDateObj] = useState<Date>(new Date());
  const [currentlyVolunteering, setCurrentlyVolunteering] = useState(true);

  // Description & Skills
  const [description, setDescription] = useState('');
  const [skillsUsed, setSkillsUsed] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState('');

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
        if (data.volunteers && Array.isArray(data.volunteers)) {
          setVolunteers(data.volunteers);
        } else {
          setVolunteers([]);
        }
      }
    } catch (e) {
      console.log('Error loading volunteer profile data:', e);
    }
  };

  const saveVolunteers = async (updatedList: VolunteerItem[]) => {
    try {
      const path = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
      const updatedProfile = { ...(profile || {}), volunteers: updatedList };
      setProfile(updatedProfile);
      setVolunteers(updatedList);
      await FileSystem.writeAsStringAsync(path, JSON.stringify(updatedProfile));
    } catch (e) {
      console.log('Error saving volunteer list:', e);
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setOrganization('');
    setRole('');
    setCause('Education');
    setStartDate('Jan 2025');
    setEndDate('Present');
    setCurrentlyVolunteering(true);
    setDescription('');
    setSkillsUsed([]);
    setNewSkillInput('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: VolunteerItem) => {
    setEditingId(item.id);
    setOrganization(item.organization || '');
    setRole(item.role || '');
    setCause(item.cause || 'Education');
    setStartDate(item.startDate || 'Jan 2025');
    setEndDate(item.endDate || 'Present');
    setCurrentlyVolunteering(!!item.currentlyVolunteering);
    setDescription(item.description || '');
    setSkillsUsed(item.skillsUsed || []);
    setNewSkillInput('');
    setIsModalOpen(true);
  };

  const handleAddSkill = () => {
    const trimmed = newSkillInput.trim();
    if (trimmed && !skillsUsed.includes(trimmed)) {
      setSkillsUsed([...skillsUsed, trimmed]);
      setNewSkillInput('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkillsUsed(skillsUsed.filter((s) => s !== skill));
  };

  const handleCausePress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...CAUSE_OPTIONS, 'Cancel'],
          cancelButtonIndex: CAUSE_OPTIONS.length,
          title: 'Select Cause',
        },
        (buttonIndex) => {
          if (buttonIndex < CAUSE_OPTIONS.length) {
            setCause(CAUSE_OPTIONS[buttonIndex]);
          }
        }
      );
    }
  };

  const handleStartDateChange = (event: any, date?: Date) => {
    if (date) {
      setStartDateObj(date);
      const formatted = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      setStartDate(formatted);
    }
  };

  const handleEndDateChange = (event: any, date?: Date) => {
    if (date) {
      setEndDateObj(date);
      const formatted = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      setEndDate(formatted);
    }
  };

  const handleSaveVolunteer = () => {
    if (!organization.trim()) return;

    const itemData: VolunteerItem = {
      id: editingId || Date.now().toString(),
      organization: organization.trim(),
      role: role.trim(),
      cause,
      startDate: startDate.trim(),
      endDate: currentlyVolunteering ? 'Present' : endDate.trim(),
      currentlyVolunteering,
      description: description.trim(),
      skillsUsed,
    };

    if (editingId) {
      const updatedList = volunteers.map((v) => (v.id === editingId ? itemData : v));
      saveVolunteers(updatedList);
    } else {
      saveVolunteers([itemData, ...volunteers]);
    }

    setIsModalOpen(false);
  };

  const handleMenuPress = (item: VolunteerItem, index: number) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Edit Volunteer Work', 'Delete', 'Cancel'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
          title: item.organization,
          message: item.role || item.cause,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            handleOpenEdit(item);
          } else if (buttonIndex === 1) {
            const updated = volunteers.filter((_, i) => i !== index);
            saveVolunteers(updated);
          }
        }
      );
    } else {
      Alert.alert(item.organization, 'Choose action', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: () => handleOpenEdit(item) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = volunteers.filter((_, i) => i !== index);
            saveVolunteers(updated);
          },
        },
      ]);
    }
  };

  const isFormValid = organization.trim().length > 0;

  // Refined Floating Input Box
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

        <Text style={styles.headerTitle}>Volunteer</Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* EXPLANATION BANNER CARD */}
        <View style={styles.explanationBanner}>
          <Ionicons name="heart-circle-outline" size={24} color="#2563EB" style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitleText}>Volunteer Work (Optional)</Text>
            <Text style={styles.bannerSubtitleText}>
              Add unpaid or volunteer work that demonstrates your skills, leadership, or community involvement.
            </Text>
          </View>
        </View>

        {/* + ADD VOLUNTEER WORK OUTLINE BUTTON */}
        <TouchableOpacity
          style={styles.addOutlineBtn}
          activeOpacity={0.8}
          onPress={handleOpenNew}
        >
          <Ionicons name="add" size={22} color="#000000" style={{ marginRight: 6 }} />
          <Text style={styles.addOutlineBtnText}>ADD VOLUNTEER WORK</Text>
        </TouchableOpacity>

        {/* LIST OF SAVED VOLUNTEER ITEMS */}
        {volunteers.map((item, index) => (
          <View key={item.id || index} style={styles.volunteerCard}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.orgText}>{item.organization}</Text>
                {item.role ? <Text style={styles.roleText}>{item.role}</Text> : null}
              </View>

              <View style={styles.cardHeaderRight}>
                {item.cause ? (
                  <View style={styles.causeBadge}>
                    <Text style={styles.causeBadgeText}>{item.cause}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={styles.menuDotsBtn}
                  onPress={() => handleMenuPress(item, index)}
                >
                  <Ionicons name="ellipsis-vertical" size={18} color="#8E8E93" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Dates */}
            {(item.startDate || item.endDate) && (
              <View style={styles.datePill}>
                <Text style={styles.datePillText}>
                  {item.startDate || ''} {item.currentlyVolunteering ? '- Present' : item.endDate ? `- ${item.endDate}` : ''}
                </Text>
              </View>
            )}

            {/* Description */}
            {item.description ? (
              <Text style={styles.descriptionText}>{item.description}</Text>
            ) : null}

            {/* Skills Used */}
            {item.skillsUsed && item.skillsUsed.length > 0 && (
              <View style={styles.skillsRow}>
                {item.skillsUsed.map((sk, sIdx) => (
                  <View key={sIdx} style={styles.skillChipRead}>
                    <Text style={styles.skillChipReadText}>{sk}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* ======================================================== */}
      {/* ADD / EDIT VOLUNTEER WORK MODAL */}
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
              {editingId ? 'Edit Volunteer Work' : 'Add Volunteer Work'}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.sheetFormScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 1. Organization * */}
            {renderFloatingInput('Organization *', organization, setOrganization, 'organization')}

            {/* 2. Role */}
            {renderFloatingInput('Role', role, setRole, 'role')}

            {/* 3. Cause Dropdown */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionLabel}>Cause</Text>
              <TouchableOpacity
                style={styles.causeSelectorCard}
                activeOpacity={0.8}
                onPress={handleCausePress}
              >
                <Text style={styles.causeSelectorText}>{cause}</Text>
                <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {/* 4. Clean Date Row (NO nested grey capsules!) */}
            <View style={styles.sectionContainer}>
              <View style={styles.dateRow}>
                {/* Start Date */}
                <View style={[styles.floatingInputBox, { flex: 1 }]}>
                  <Text style={styles.floatingInputLabel}>Start Date</Text>
                  <Text style={styles.dateDisplayValueText}>{startDate || 'Month/Year'}</Text>
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

                {/* End Date */}
                <View style={[styles.floatingInputBox, { flex: 1, opacity: currentlyVolunteering ? 0.6 : 1 }]}>
                  <Text style={styles.floatingInputLabel}>End Date</Text>
                  <Text style={styles.dateDisplayValueText}>
                    {currentlyVolunteering ? 'Present' : endDate || 'Month/Year'}
                  </Text>
                  {!currentlyVolunteering && Platform.OS === 'ios' && (
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

              {/* Checkbox: Currently Volunteering */}
              <TouchableOpacity
                style={styles.checkboxRow}
                activeOpacity={0.8}
                onPress={() => setCurrentlyVolunteering(!currentlyVolunteering)}
              >
                <View style={[styles.checkboxBox, currentlyVolunteering && styles.checkboxBoxChecked]}>
                  {currentlyVolunteering && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxText}>Currently Volunteering</Text>
              </TouchableOpacity>
            </View>

            {/* 5. Description */}
            {renderFloatingInput('Description', description, setDescription, 'description', true)}

            {/* 6. Skills Used (Optional Chips) */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionLabel}>Skills Used (Optional)</Text>

              <View style={styles.chipsContainer}>
                {skillsUsed.map((sk, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.chipInteractive}
                    onPress={() => handleRemoveSkill(sk)}
                  >
                    <Text style={styles.chipText}>{sk}</Text>
                    <Ionicons name="close" size={14} color="#555555" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.addSkillInputRow}>
                <TextInput
                  style={styles.addSkillTextInput}
                  placeholder="e.g. Mentoring, Public Speaking"
                  placeholderTextColor="#999999"
                  value={newSkillInput}
                  onChangeText={setNewSkillInput}
                  onSubmitEditing={handleAddSkill}
                />
                <TouchableOpacity
                  style={styles.addSkillPlusBtn}
                  onPress={handleAddSkill}
                >
                  <Ionicons name="add" size={20} color="#000000" />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Bottom Add/Save Action Button */}
          <TouchableOpacity
            style={[
              styles.addActionButton,
              isFormValid ? styles.addActionButtonActive : styles.addActionButtonDisabled,
            ]}
            activeOpacity={isFormValid ? 0.8 : 1}
            onPress={handleSaveVolunteer}
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
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
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

  addOutlineBtn: {
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#000000',
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOutlineBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },

  volunteerCard: {
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orgText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  roleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555555',
    marginTop: 2,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  causeBadge: {
    backgroundColor: '#F0EEFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  causeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
  },
  menuDotsBtn: {
    padding: 4,
  },
  datePill: {
    backgroundColor: '#F2F2F4',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 10,
  },
  datePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333333',
    marginBottom: 10,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillChipRead: {
    backgroundColor: '#F2F2F4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  skillChipReadText: {
    fontSize: 12,
    fontWeight: '600',
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
    gap: 14,
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

  sectionContainer: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },

  causeSelectorCard: {
    backgroundColor: '#F2F2F4',
    borderRadius: 20,
    paddingHorizontal: 18,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  causeSelectorText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },

  dateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxBoxChecked: {
    backgroundColor: '#000000',
  },
  checkboxText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },

  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipInteractive: {
    backgroundColor: '#EBEBEB',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  addSkillInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F4',
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 50,
  },
  addSkillTextInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  addSkillPlusBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
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
