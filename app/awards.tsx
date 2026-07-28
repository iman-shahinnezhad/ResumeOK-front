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

interface AwardItem {
  id: string;
  awardTitle: string;
  issuedBy: string;
  date: string;
  description: string;
  awardUrl: string;
}

export default function AwardsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [awards, setAwards] = useState<AwardItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form States
  const [awardTitle, setAwardTitle] = useState('');
  const [issuedBy, setIssuedBy] = useState('');
  const [date, setDate] = useState('May 2024');
  const [dateObj, setDateObj] = useState<Date>(new Date(2024, 4, 1));
  const [description, setDescription] = useState('');
  const [awardUrl, setAwardUrl] = useState('');

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
        if (data.awards && Array.isArray(data.awards)) {
          setAwards(data.awards);
        } else {
          setAwards([]);
        }
      }
    } catch (e) {
      console.log('Error loading awards profile data:', e);
    }
  };

  const saveAwards = async (updatedList: AwardItem[]) => {
    try {
      const path = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
      const updatedProfile = { ...(profile || {}), awards: updatedList };
      setProfile(updatedProfile);
      setAwards(updatedList);
      await FileSystem.writeAsStringAsync(path, JSON.stringify(updatedProfile));
    } catch (e) {
      console.log('Error saving awards list:', e);
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setAwardTitle('');
    setIssuedBy('');
    setDate('May 2024');
    setDescription('');
    setAwardUrl('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: AwardItem) => {
    setEditingId(item.id);
    setAwardTitle(item.awardTitle || '');
    setIssuedBy(item.issuedBy || '');
    setDate(item.date || 'May 2024');
    setDescription(item.description || '');
    setAwardUrl(item.awardUrl || '');
    setIsModalOpen(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setDateObj(selectedDate);
      const formatted = selectedDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      setDate(formatted);
    }
  };

  const handleSaveAward = () => {
    if (!awardTitle.trim() || !issuedBy.trim()) return;

    const itemData: AwardItem = {
      id: editingId || Date.now().toString(),
      awardTitle: awardTitle.trim(),
      issuedBy: issuedBy.trim(),
      date: date.trim(),
      description: description.trim(),
      awardUrl: awardUrl.trim(),
    };

    if (editingId) {
      const updatedList = awards.map((a) => (a.id === editingId ? itemData : a));
      saveAwards(updatedList);
    } else {
      saveAwards([itemData, ...awards]);
    }

    setIsModalOpen(false);
  };

  const handleMenuPress = (item: AwardItem, index: number) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Edit Award', 'Delete', 'Cancel'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
          title: item.awardTitle,
          message: item.issuedBy,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            handleOpenEdit(item);
          } else if (buttonIndex === 1) {
            const updated = awards.filter((_, i) => i !== index);
            saveAwards(updated);
          }
        }
      );
    } else {
      Alert.alert(item.awardTitle, 'Choose action', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: () => handleOpenEdit(item) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = awards.filter((_, i) => i !== index);
            saveAwards(updated);
          },
        },
      ]);
    }
  };

  const isFormValid = awardTitle.trim().length > 0 && issuedBy.trim().length > 0;

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
          multiline && { height: 130, justifyContent: 'flex-start' },
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
            multiline && { height: 85, textAlignVertical: 'top' },
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
      {/* HEADER (NO RED BADGE) */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color="#000000" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Awards</Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* EXPLANATION BANNER CARD */}
        <View style={styles.explanationBanner}>
          <Ionicons name="trophy-outline" size={24} color="#2563EB" style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitleText}>Honors & Awards</Text>
            <Text style={styles.bannerSubtitleText}>
              Add honors, competitions, scholarships, or company awards that highlight your accomplishments.
            </Text>
          </View>
        </View>

        {/* + ADD AWARD OUTLINE BUTTON */}
        <TouchableOpacity
          style={styles.addOutlineBtn}
          activeOpacity={0.8}
          onPress={handleOpenNew}
        >
          <Ionicons name="add" size={22} color="#000000" style={{ marginRight: 6 }} />
          <Text style={styles.addOutlineBtnText}>ADD AWARD</Text>
        </TouchableOpacity>

        {/* LIST OF SAVED AWARDS */}
        {awards.map((item, index) => (
          <View key={item.id || index} style={styles.awardCard}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.awardTitleText}>{item.awardTitle}</Text>
                <Text style={styles.issuedByText}>Issued by {item.issuedBy}</Text>
              </View>

              <TouchableOpacity
                style={styles.menuDotsBtn}
                onPress={() => handleMenuPress(item, index)}
              >
                <Ionicons name="ellipsis-vertical" size={18} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {/* Date Pill */}
            {item.date ? (
              <View style={styles.datePill}>
                <Text style={styles.datePillText}>{item.date}</Text>
              </View>
            ) : null}

            {/* Description */}
            {item.description ? (
              <Text style={styles.descriptionText}>{item.description}</Text>
            ) : null}

            {/* Award URL */}
            {item.awardUrl ? (
              <View style={styles.linkPill}>
                <Ionicons name="link" size={14} color="#2563EB" />
                <Text style={styles.linkText} numberOfLines={1}>{item.awardUrl}</Text>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>

      {/* ======================================================== */}
      {/* ADD / EDIT AWARD MODAL */}
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
              {editingId ? 'Edit Award' : 'Add Award'}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.sheetFormScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 1. Award Title * */}
            {renderFloatingInput('Award Title *', awardTitle, setAwardTitle, 'awardTitle')}

            {/* 2. Issued By * */}
            {renderFloatingInput('Issued By * (e.g. Google, IEEE, Hackathon)', issuedBy, setIssuedBy, 'issuedBy')}

            {/* 3. Date * Picker */}
            <View style={styles.floatingInputBox}>
              <Text style={styles.floatingInputLabel}>Date *</Text>
              <Text style={styles.dateDisplayValueText}>{date || 'Month/Year'}</Text>
              {Platform.OS === 'ios' && (
                <DateTimePicker
                  value={dateObj}
                  mode="date"
                  display="compact"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                  style={styles.hiddenNativePicker}
                />
              )}
            </View>

            {/* 4. Description (Optional) */}
            {renderFloatingInput('Description (Optional)', description, setDescription, 'description', true)}

            {/* 5. Award URL (Optional) */}
            {renderFloatingInput('Award URL (Optional)', awardUrl, setAwardUrl, 'awardUrl')}
          </ScrollView>

          {/* Bottom Add/Save Action Button */}
          <TouchableOpacity
            style={[
              styles.addActionButton,
              isFormValid ? styles.addActionButtonActive : styles.addActionButtonDisabled,
            ]}
            activeOpacity={isFormValid ? 0.8 : 1}
            onPress={handleSaveAward}
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

  awardCard: {
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
  awardTitleText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  issuedByText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555555',
    marginTop: 2,
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
    marginBottom: 8,
  },
  linkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  linkText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '500',
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
