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

interface CertificateItem {
  id: string;
  certificateName: string;
  issuingOrganization: string;
  issueDate: string;
  expirationDate: string;
  noExpiration: boolean;
  credentialId: string;
  credentialUrl: string;
  description: string;
}

export default function CertificatesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form States
  const [certificateName, setCertificateName] = useState('');
  const [issuingOrganization, setIssuingOrganization] = useState('');
  const [issueDate, setIssueDate] = useState('Jan 2024');
  const [expirationDate, setExpirationDate] = useState('Jan 2027');
  const [issueDateObj, setIssueDateObj] = useState<Date>(new Date(2024, 0, 1));
  const [expirationDateObj, setExpirationDateObj] = useState<Date>(new Date(2027, 0, 1));
  const [noExpiration, setNoExpiration] = useState(false);
  const [credentialId, setCredentialId] = useState('');
  const [credentialUrl, setCredentialUrl] = useState('');
  const [description, setDescription] = useState('');

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
        if (data.certificates && Array.isArray(data.certificates)) {
          setCertificates(data.certificates);
        } else {
          setCertificates([]);
        }
      }
    } catch (e) {
      console.log('Error loading certificates profile data:', e);
    }
  };

  const saveCertificates = async (updatedList: CertificateItem[]) => {
    try {
      const path = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
      const updatedProfile = { ...(profile || {}), certificates: updatedList };
      setProfile(updatedProfile);
      setCertificates(updatedList);
      await FileSystem.writeAsStringAsync(path, JSON.stringify(updatedProfile));
    } catch (e) {
      console.log('Error saving certificates list:', e);
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setCertificateName('');
    setIssuingOrganization('');
    setIssueDate('Jan 2024');
    setExpirationDate('Jan 2027');
    setNoExpiration(false);
    setCredentialId('');
    setCredentialUrl('');
    setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: CertificateItem) => {
    setEditingId(item.id);
    setCertificateName(item.certificateName || '');
    setIssuingOrganization(item.issuingOrganization || '');
    setIssueDate(item.issueDate || 'Jan 2024');
    setExpirationDate(item.expirationDate || 'Jan 2027');
    setNoExpiration(!!item.noExpiration);
    setCredentialId(item.credentialId || '');
    setCredentialUrl(item.credentialUrl || '');
    setDescription(item.description || '');
    setIsModalOpen(true);
  };

  const handleIssueDateChange = (event: any, date?: Date) => {
    if (date) {
      setIssueDateObj(date);
      const formatted = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      setIssueDate(formatted);
    }
  };

  const handleExpirationDateChange = (event: any, date?: Date) => {
    if (date) {
      setExpirationDateObj(date);
      const formatted = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      setExpirationDate(formatted);
    }
  };

  const handleSaveCertificate = () => {
    if (!certificateName.trim() || !issuingOrganization.trim()) return;

    const itemData: CertificateItem = {
      id: editingId || Date.now().toString(),
      certificateName: certificateName.trim(),
      issuingOrganization: issuingOrganization.trim(),
      issueDate: issueDate.trim(),
      expirationDate: noExpiration ? 'No Expiration' : expirationDate.trim(),
      noExpiration,
      credentialId: credentialId.trim(),
      credentialUrl: credentialUrl.trim(),
      description: description.trim(),
    };

    if (editingId) {
      const updatedList = certificates.map((c) => (c.id === editingId ? itemData : c));
      saveCertificates(updatedList);
    } else {
      saveCertificates([itemData, ...certificates]);
    }

    setIsModalOpen(false);
  };

  const handleMenuPress = (item: CertificateItem, index: number) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Edit Certificate', 'Delete', 'Cancel'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
          title: item.certificateName,
          message: item.issuingOrganization,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            handleOpenEdit(item);
          } else if (buttonIndex === 1) {
            const updated = certificates.filter((_, i) => i !== index);
            saveCertificates(updated);
          }
        }
      );
    } else {
      Alert.alert(item.certificateName, 'Choose action', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: () => handleOpenEdit(item) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = certificates.filter((_, i) => i !== index);
            saveCertificates(updated);
          },
        },
      ]);
    }
  };

  const isFormValid = certificateName.trim().length > 0 && issuingOrganization.trim().length > 0;

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
      {/* HEADER (NO RED BADGE FOR OPTIONAL SECTION) */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color="#000000" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Certificates</Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* EXPLANATION BANNER CARD */}
        <View style={styles.explanationBanner}>
          <Ionicons name="ribbon-outline" size={24} color="#2563EB" style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitleText}>Certifications (Optional)</Text>
            <Text style={styles.bannerSubtitleText}>
              Add professional certificates, licenses, or course completions that demonstrate your specialized expertise.
            </Text>
          </View>
        </View>

        {/* + ADD CERTIFICATE OUTLINE BUTTON */}
        <TouchableOpacity
          style={styles.addOutlineBtn}
          activeOpacity={0.8}
          onPress={handleOpenNew}
        >
          <Ionicons name="add" size={22} color="#000000" style={{ marginRight: 6 }} />
          <Text style={styles.addOutlineBtnText}>ADD CERTIFICATE</Text>
        </TouchableOpacity>

        {/* LIST OF SAVED CERTIFICATES */}
        {certificates.map((item, index) => (
          <View key={item.id || index} style={styles.certCard}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.certNameText}>{item.certificateName}</Text>
                <Text style={styles.orgText}>{item.issuingOrganization}</Text>
              </View>

              <TouchableOpacity
                style={styles.menuDotsBtn}
                onPress={() => handleMenuPress(item, index)}
              >
                <Ionicons name="ellipsis-vertical" size={18} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {/* Dates & ID */}
            <View style={styles.metaRow}>
              {(item.issueDate || item.expirationDate) && (
                <View style={styles.datePill}>
                  <Text style={styles.datePillText}>
                    {item.issueDate || ''} {item.noExpiration ? '• No Expiration' : item.expirationDate ? `- ${item.expirationDate}` : ''}
                  </Text>
                </View>
              )}

              {item.credentialId ? (
                <View style={styles.idPill}>
                  <Text style={styles.idPillText}>ID: {item.credentialId}</Text>
                </View>
              ) : null}
            </View>

            {/* Description */}
            {item.description ? (
              <Text style={styles.descriptionText}>{item.description}</Text>
            ) : null}

            {/* Credential URL */}
            {item.credentialUrl ? (
              <View style={styles.linkPill}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#2563EB" />
                <Text style={styles.linkText} numberOfLines={1}>{item.credentialUrl}</Text>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>

      {/* ======================================================== */}
      {/* ADD / EDIT CERTIFICATE MODAL */}
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
              {editingId ? 'Edit Certificate' : 'Add Certificate'}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.sheetFormScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 1. Certificate Name * */}
            {renderFloatingInput('Certificate Name *', certificateName, setCertificateName, 'certificateName')}

            {/* 2. Issuing Organization * */}
            {renderFloatingInput('Issuing Organization *', issuingOrganization, setIssuingOrganization, 'issuingOrganization')}

            {/* 3. Issue Date & Expiration Date + No Expiration Checkbox */}
            <View style={styles.sectionContainer}>
              <View style={styles.dateRow}>
                {/* Issue Date */}
                <View style={[styles.floatingInputBox, { flex: 1 }]}>
                  <Text style={styles.floatingInputLabel}>Issue Date</Text>
                  <Text style={styles.dateDisplayValueText}>{issueDate || 'Month/Year'}</Text>
                  {Platform.OS === 'ios' && (
                    <DateTimePicker
                      value={issueDateObj}
                      mode="date"
                      display="compact"
                      onChange={handleIssueDateChange}
                      maximumDate={new Date()}
                      style={styles.hiddenNativePicker}
                    />
                  )}
                </View>

                {/* Expiration Date */}
                <View style={[styles.floatingInputBox, { flex: 1, opacity: noExpiration ? 0.6 : 1 }]}>
                  <Text style={styles.floatingInputLabel}>Expiration Date</Text>
                  <Text style={styles.dateDisplayValueText}>
                    {noExpiration ? 'No Expiration' : expirationDate || 'Month/Year'}
                  </Text>
                  {!noExpiration && Platform.OS === 'ios' && (
                    <DateTimePicker
                      value={expirationDateObj}
                      mode="date"
                      display="compact"
                      onChange={handleExpirationDateChange}
                      style={styles.hiddenNativePicker}
                    />
                  )}
                </View>
              </View>

              {/* Checkbox: No Expiration */}
              <TouchableOpacity
                style={styles.checkboxRow}
                activeOpacity={0.8}
                onPress={() => setNoExpiration(!noExpiration)}
              >
                <View style={[styles.checkboxBox, noExpiration && styles.checkboxBoxChecked]}>
                  {noExpiration && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxText}>No Expiration</Text>
              </TouchableOpacity>
            </View>

            {/* 4. Credential ID */}
            {renderFloatingInput('Credential ID (Optional e.g. AWS-123)', credentialId, setCredentialId, 'credentialId')}

            {/* 5. Credential URL */}
            {renderFloatingInput('Credential URL (Optional)', credentialUrl, setCredentialUrl, 'credentialUrl')}

            {/* 6. Description */}
            {renderFloatingInput('Description (Optional)', description, setDescription, 'description', true)}
          </ScrollView>

          {/* Bottom Add/Save Action Button */}
          <TouchableOpacity
            style={[
              styles.addActionButton,
              isFormValid ? styles.addActionButtonActive : styles.addActionButtonDisabled,
            ]}
            activeOpacity={isFormValid ? 0.8 : 1}
            onPress={handleSaveCertificate}
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

  certCard: {
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
  certNameText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  orgText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555555',
    marginTop: 2,
  },
  menuDotsBtn: {
    padding: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  datePill: {
    backgroundColor: '#F2F2F4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  datePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  idPill: {
    backgroundColor: '#F0EEFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  idPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
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

  sectionContainer: {
    gap: 8,
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
