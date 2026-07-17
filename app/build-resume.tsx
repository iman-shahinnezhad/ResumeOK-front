import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

interface WorkExperience {
  id: string;
  jobTitle: string;
  companyName: string;
  city: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface Education {
  id: string;
  schoolName: string;
  degree: string;
  fieldOfStudy: string;
  city: string;
  startDate: string;
  endDate: string;
  description: string;
  gpa?: string;
}

interface ResumeFormData {
  // Step 1: Contact details
  firstName: string;
  lastName: string;
  jobTitle: string;
  email: string;
  phone: string;
  city: string;
  dob?: string;
  nationality?: string;
  profileImage?: string;
  website?: string;

  // Step 2: Work Experience
  workExperiences: WorkExperience[];

  // Step 3: Skills
  skills: string[];
  languages: string[];

  // Step 4: Education
  educations: Education[];

  // Step 5: Professional Summary
  summary: string;
}

export default function BuildResumeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Wizard step (1 to 5)
  const [step, setStep] = useState<number>(1);

  // Form State
  const [formData, setFormData] = useState<ResumeFormData>({
    firstName: '',
    lastName: '',
    jobTitle: '',
    email: '',
    phone: '',
    city: '',
    dob: '',
    nationality: '',
    profileImage: '',
    website: '',
    workExperiences: [],
    skills: [],
    languages: ['English (Primary)', 'French (A2)'],
    educations: [],
    summary: '',
  });

  // Load onboarding profile if exists on mount
  React.useEffect(() => {
    async function loadOnboardingProfile() {
      try {
        const path = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
        const fileInfo = await FileSystem.getInfoAsync(path);
        if (fileInfo.exists) {
          const text = await FileSystem.readAsStringAsync(path);
          const parsed = JSON.parse(text);
          setFormData(prev => ({
            ...prev,
            firstName: parsed.firstName || prev.firstName,
            lastName: parsed.lastName || prev.lastName,
            jobTitle: parsed.jobTitle || prev.jobTitle,
            email: parsed.email || prev.email,
            phone: parsed.phone || prev.phone,
            city: parsed.city || prev.city,
            dob: parsed.dob || prev.dob,
            nationality: parsed.nationality || prev.nationality,
            website: parsed.website || prev.website,
            skills: parsed.skills || prev.skills,
            workExperiences: parsed.workExperiences || prev.workExperiences,
            educations: parsed.educations || prev.educations,
            summary: parsed.summary || prev.summary,
          }));
        }
      } catch (e) {
        console.log('Error loading onboarding profile in builder:', e);
      }
    }
    loadOnboardingProfile();
  }, []);

  // UI state for Loading and PDF Preview
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [showTemplateSelection, setShowTemplateSelection] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('modern_slate');

  // UI state for Step 1
  const [showOptional, setShowOptional] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string>('');

  // UI state for Date Picker (shared across steps)
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [datePickerMode, setDatePickerMode] = useState<'dob' | 'startDate' | 'endDate' | 'eduStartDate' | 'eduEndDate'>('dob');
  const [selectedDatePickerDate, setSelectedDatePickerDate] = useState<Date>(new Date());

  // Format Date object to string format
  const formatDateString = (date: Date, mode: 'dob' | 'startDate' | 'endDate' | 'eduStartDate' | 'eduEndDate') => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const shortYear = String(year).slice(-2);
    
    if (mode === 'dob') {
      return `${day}/${month}/${year}`;
    } else {
      return `${month}/${shortYear}`;
    }
  };

  // Parse string format to Date object
  const parseDateString = (str: string, mode: 'dob' | 'startDate' | 'endDate' | 'eduStartDate' | 'eduEndDate'): Date => {
    if (!str) {
      if (mode === 'dob') {
        const defaultDate = new Date();
        defaultDate.setFullYear(defaultDate.getFullYear() - 25); // default to 25 years ago for birth date
        return defaultDate;
      }
      return new Date();
    }
    
    try {
      if (mode === 'dob') {
        const parts = str.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            return new Date(year, month, day);
          }
        }
      } else {
        const parts = str.split('/');
        if (parts.length === 2) {
          const month = parseInt(parts[0], 10) - 1;
          const year = parseInt(`20${parts[1]}`, 10);
          if (!isNaN(month) && !isNaN(year)) {
            return new Date(year, month, 1);
          }
        }
      }
    } catch (e) {
      console.log('Error parsing date string:', e);
    }
    return new Date();
  };

  const openDatePicker = (mode: 'dob' | 'startDate' | 'endDate' | 'eduStartDate' | 'eduEndDate') => {
    let currentVal = '';
    if (mode === 'dob') {
      currentVal = formData.dob || '';
    } else if (mode === 'startDate') {
      currentVal = expStartDate;
    } else if (mode === 'endDate') {
      currentVal = expEndDate;
    } else if (mode === 'eduStartDate') {
      currentVal = eduStartDate;
    } else if (mode === 'eduEndDate') {
      currentVal = eduEndDate;
    }
    
    const parsedDate = parseDateString(currentVal, mode);
    setSelectedDatePickerDate(parsedDate);
    setDatePickerMode(mode);
    setShowDatePicker(true);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (selectedDate) {
        const formatted = formatDateString(selectedDate, datePickerMode);
        if (datePickerMode === 'dob') {
          setFormData(prev => ({ ...prev, dob: formatted }));
        } else if (datePickerMode === 'startDate') {
          setExpStartDate(formatted);
        } else if (datePickerMode === 'endDate') {
          setExpEndDate(formatted);
        } else if (datePickerMode === 'eduStartDate') {
          setEduStartDate(formatted);
        } else if (datePickerMode === 'eduEndDate') {
          setEduEndDate(formatted);
          setEduIsCurrent(false);
        }
      }
    } else {
      if (selectedDate) {
        setSelectedDatePickerDate(selectedDate);
      }
    }
  };

  const handleDoneDatePicker = () => {
    const formatted = formatDateString(selectedDatePickerDate, datePickerMode);
    if (datePickerMode === 'dob') {
      setFormData(prev => ({ ...prev, dob: formatted }));
    } else if (datePickerMode === 'startDate') {
      setExpStartDate(formatted);
    } else if (datePickerMode === 'endDate') {
      setExpEndDate(formatted);
    } else if (datePickerMode === 'eduStartDate') {
      setEduStartDate(formatted);
    } else if (datePickerMode === 'eduEndDate') {
      setEduEndDate(formatted);
      setEduIsCurrent(false);
    }
    setShowDatePicker(false);
  };

  const renderDatePicker = () => {
    if (!showDatePicker) return null;
    return (
      Platform.OS === 'ios' ? (
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.pickerModalOverlay}>
            <TouchableOpacity
              style={styles.pickerModalDismissArea}
              activeOpacity={1}
              onPress={() => setShowDatePicker(false)}
            />
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerModalHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.pickerHeaderCancelBtn}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.pickerHeaderTitle}>
                  {datePickerMode === 'dob' 
                    ? 'Date of Birth' 
                    : datePickerMode === 'startDate' || datePickerMode === 'eduStartDate'
                      ? 'Start Date' 
                      : 'End Date'}
                </Text>
                <TouchableOpacity onPress={handleDoneDatePicker}>
                  <Text style={styles.pickerHeaderDoneBtn}>Done</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={selectedDatePickerDate}
                  mode="date"
                  display="spinner"
                  onChange={onDateChange}
                  textColor="#000000"
                />
              </View>
            </View>
          </View>
        </Modal>
      ) : (
        <DateTimePicker
          value={selectedDatePickerDate}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )
    );
  };

  // UI state for Step 2 (Work Experience Modal)
  const [isExpModalVisible, setIsExpModalVisible] = useState<boolean>(false);
  const [editingExpId, setEditingExpId] = useState<string | null>(null);

  // Modal Input states for Step 2
  const [expJobTitle, setExpJobTitle] = useState<string>('');
  const [expCompany, setExpCompany] = useState<string>('');
  const [expCity, setExpCity] = useState<string>('');
  const [expStartDate, setExpStartDate] = useState<string>('');
  const [expEndDate, setExpEndDate] = useState<string>('');
  const [expDescription, setExpDescription] = useState<string>('');

  // Delete Confirmation state for Step 2
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState<boolean>(false);
  const [expToDeleteId, setExpToDeleteId] = useState<string | null>(null);

  // UI state for Step 3 (Skills & Languages)
  const [showAddSkillInput, setShowAddSkillInput] = useState<boolean>(false);
  const [newSkillText, setNewSkillText] = useState<string>('');
  const [showAddLanguageInput, setShowAddLanguageInput] = useState<boolean>(false);
  const [newLanguageText, setNewLanguageText] = useState<string>('');

  // UI state for Step 4 (Education Modal)
  const [isEduModalVisible, setIsEduModalVisible] = useState<boolean>(false);
  const [editingEduId, setEditingEduId] = useState<string | null>(null);

  // Modal Input states for Step 4
  const [eduSchool, setEduSchool] = useState<string>('');
  const [eduDegree, setEduDegree] = useState<string>('');
  const [eduFieldOfStudy, setEduFieldOfStudy] = useState<string>('');
  const [eduCity, setEduCity] = useState<string>('');
  const [eduStartDate, setEduStartDate] = useState<string>('');
  const [eduEndDate, setEduEndDate] = useState<string>('');
  const [eduDescription, setEduDescription] = useState<string>('');
  const [eduGpa, setEduGpa] = useState<string>('');
  const [eduIsCurrent, setEduIsCurrent] = useState<boolean>(false);

  // Delete Confirmation state for Step 4
  const [isEduDeleteConfirmVisible, setIsEduDeleteConfirmVisible] = useState<boolean>(false);
  const [eduToDeleteId, setEduToDeleteId] = useState<string | null>(null);



  // AI suggestions list (Step 2)
  const aiHelpSuggestions = [
    'Something about design product',
    'Exploring user experience principles',
    'Analyzing market trends for innovation',
    'Creating prototypes for user feedback',
  ];

  // AI suggestions list (Step 4)
  const eduHelpSuggestions = [
    'Graduated with honors (top 5% of class)',
    'Relevant coursework in computer science and software engineering',
    'Active member of the student association and technology club',
    'Completed capstone research project on AI systems development',
  ];

  // Preset skills suggestions (Step 3)
  const presetSkills = [
    'Project management',
    'Team leadership',
    'Agile methodologies',
    'Stakeholder engagement',
    'Risk assessment',
    'Product design',
    'User experience',
    'Data analysis',
  ];

  // Handle Text changes (Step 1)
  const handleInputChange = (field: keyof ResumeFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (field === 'email') {
      validateEmail(value);
    }
  };

  // Email validation helper
  const validateEmail = (value: string) => {
    if (!value) {
      setEmailError('');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value.trim())) {
      setEmailError('Invalid email address');
    } else {
      setEmailError('');
    }
  };

  // Image picker helper
  const pickProfileImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow media library access to pick a photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFormData(prev => ({ ...prev, profileImage: result.assets[0].uri }));
      }
    } catch (err) {
      console.log('Error picking profile image:', err);
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  // Determine if continue button is enabled for current step
  const isFormValid = () => {
    if (step === 1) {
      const { firstName, lastName, jobTitle, email, phone, city } = formData;
      return (
        firstName.trim().length > 0 &&
        lastName.trim().length > 0 &&
        jobTitle.trim().length > 0 &&
        email.trim().length > 0 &&
        phone.trim().length > 0 &&
        city.trim().length > 0 &&
        emailError === ''
      );
    }
    if (step === 2) {
      return formData.workExperiences.length > 0;
    }
    if (step === 3) {
      return formData.skills.length > 0;
    }
    if (step === 4) {
      return true;
    }
    if (step === 5) {
      return formData.summary.trim().length > 0;
    }
    return true;
  };

  const handleContinue = () => {
    if (!isFormValid()) return;
    
    if (step < 5) {
      setStep(prev => prev + 1);
    } else {
      handleFinalize();
    }
  };

  const handleFinalize = async () => {
    try {
      setIsFinalizing(true);
      // Simulated compile delay
      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (error) {
      console.log('Error during finalization:', error);
    } finally {
      setIsFinalizing(false);
      setShowTemplateSelection(true);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      let base64Image = '';
      if (formData.profileImage) {
        try {
          base64Image = await FileSystem.readAsStringAsync(formData.profileImage, {
            encoding: FileSystem.EncodingType.Base64,
          });
        } catch (err) {
          console.log("Error reading profile image for base64:", err);
        }
      }

      let mimeType = 'image/jpeg';
      if (formData.profileImage) {
        if (formData.profileImage.toLowerCase().endsWith('.png')) {
          mimeType = 'image/png';
        } else if (formData.profileImage.toLowerCase().endsWith('.gif')) {
          mimeType = 'image/gif';
        }
      }

      const imgHtml = base64Image 
        ? `data:${mimeType};base64,${base64Image}`
        : '';

      let htmlContent = '';

      if (selectedTemplate === 'modern_slate') {
        htmlContent = `
<html>
<head>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #000000;
      margin: 40px;
      line-height: 1.4;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    .name {
      font-size: 28px;
      font-weight: bold;
      text-transform: uppercase;
      margin: 0;
      letter-spacing: 0.5px;
      color: #000000;
    }
    .title {
      font-size: 14px;
      color: #4b5563;
      margin: 4px 0 0 0;
      font-weight: 500;
    }
    .layout-table {
      width: 100%;
      border-collapse: collapse;
    }
    .left-col {
      width: 33%;
      padding-right: 20px;
      border-right: 1.5px solid #cbd5e1;
      vertical-align: top;
    }
    .right-col {
      width: 67%;
      padding-left: 20px;
      vertical-align: top;
    }
    .section-title {
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 0;
      margin-bottom: 12px;
      letter-spacing: 1px;
      color: #000000;
    }
    .contacts-sec {
      margin-bottom: 24px;
    }
    .contact-item {
      font-size: 11px;
      color: #000000;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      word-break: break-all;
    }
    .contact-icon {
      margin-right: 8px;
      flex-shrink: 0;
      color: #000000;
    }
    .profile-img {
      width: 75px;
      height: 75px;
      border-radius: 50%;
      object-fit: cover;
      margin-bottom: 15px;
      display: block;
    }
    .skill-item {
      font-size: 11px;
      color: #000000;
      margin-bottom: 6px;
    }
    .right-section-title {
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 0;
      margin-bottom: 10px;
      letter-spacing: 1px;
      color: #000000;
    }
    .profile-text {
      font-size: 11.5px;
      color: #374151;
      line-height: 1.5;
      margin-bottom: 15px;
    }
    .section-divider {
      border: none;
      border-top: 1px solid #cbd5e1;
      margin-top: 15px;
      margin-bottom: 15px;
    }
    .item-block {
      margin-bottom: 14px;
    }
    .item-title {
      font-size: 12px;
      font-weight: bold;
      margin: 0;
      color: #000000;
    }
    .item-sub {
      font-size: 11px;
      color: #737373;
      margin: 3px 0;
    }
    .item-desc {
      font-size: 11px;
      margin: 4px 0 0 0;
      padding-left: 15px;
      color: #374151;
      line-height: 1.4;
    }
    .item-desc li {
      margin-bottom: 3px;
    }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td style="vertical-align: top;">
        <h1 class="name">${formData.firstName} ${formData.lastName}</h1>
        <p class="title">${formData.jobTitle}</p>
      </td>
    </tr>
  </table>
  <table class="layout-table">
    <tr>
      <td class="left-col">
        ${imgHtml ? `<img src="${imgHtml}" class="profile-img" />` : ''}
        
        <div class="contacts-sec">
          <div class="section-title">CONTACTS</div>
          <div class="contact-item">
            <svg class="contact-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            <span>${formData.phone}</span>
          </div>
          <div class="contact-item">
            <svg class="contact-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            <span>${formData.email}</span>
          </div>
          <div class="contact-item">
            <svg class="contact-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span>${formData.city}</span>
          </div>
          ${formData.website ? `
          <div class="contact-item">
            <svg class="contact-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
            <span>${formData.website}</span>
          </div>
          ` : ''}
        </div>
        
        ${formData.skills.length > 0 ? `
        <div class="contacts-sec" style="margin-top: 24px;">
          <div class="section-title">SKILLS</div>
          ${formData.skills.map(s => `<div class="skill-item">• ${s}</div>`).join('')}
        </div>
        ` : ''}
        
        ${formData.languages && formData.languages.length > 0 ? `
        <div class="contacts-sec" style="margin-top: 24px;">
          <div class="section-title">LANGUAGES</div>
          ${formData.languages.map(l => `<div class="skill-item">• ${l}</div>`).join('')}
        </div>
        ` : ''}
      </td>
      <td class="right-col">
        <div class="right-section-title">SUMMERY</div>
        <div class="profile-text">${formData.summary}</div>
        <hr class="section-divider" />
        
        ${formData.workExperiences.length > 0 ? `
        <div class="right-section-title" style="margin-top: 15px;">WORK EXPERIENCE</div>
        ${formData.workExperiences.map(exp => `
          <div class="item-block">
            <h3 class="item-title">${exp.jobTitle}</h3>
            <p class="item-sub">${exp.companyName}, ${exp.city} | ${exp.startDate} - ${exp.endDate}</p>
            <ul class="item-desc">
              ${exp.description.split('\n').filter(l => l.trim().length > 0).map(l => `<li>${l.replace(/^[•\s*-]+/, '').trim()}</li>`).join('')}
            </ul>
          </div>
        `).join('')}
        ` : ''}
        
        ${formData.educations.length > 0 ? `
        <div class="right-section-title" style="margin-top: 20px;">EDUCATION</div>
        ${formData.educations.map(edu => `
          <div class="item-block">
            <h3 class="item-title">${edu.degree} in ${edu.fieldOfStudy}</h3>
            <p class="item-sub">${edu.schoolName}, ${edu.city} | ${edu.startDate} - ${edu.endDate}</p>
            ${edu.description ? `
              <ul class="item-desc">
                ${edu.description.split('\n').filter(l => l.trim().length > 0).map(l => `<li>${l.replace(/^[•\s*-]+/, '').trim()}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('')}
        ` : ''}
      </td>
    </tr>
  </table>
</body>
</html>
`;
      } else if (selectedTemplate === 'executive_classic') {
        htmlContent = `
<html>
<head>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #000000;
      margin: 45px;
      line-height: 1.4;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .profile-img {
      width: 75px;
      height: 75px;
      border-radius: 50%;
      object-fit: cover;
      display: block;
      margin: 0 auto 12px auto;
    }
    .name {
      font-size: 26px;
      font-weight: bold;
      text-transform: uppercase;
      margin: 0 0 4px 0;
      letter-spacing: 0.5px;
    }
    .title {
      font-size: 14px;
      color: #374151;
      margin: 0;
      font-weight: 500;
    }
    .contact-bar {
      text-align: center;
      font-size: 10.5px;
      color: #4b5563;
      margin-top: 8px;
      border-bottom: 1.5px solid #000000;
      padding-bottom: 10px;
      display: flex;
      justify-content: center;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .contact-item {
      display: flex;
      align-items: center;
    }
    .contact-icon {
      margin-right: 4px;
    }
    .section-title {
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 20px;
      margin-bottom: 10px;
      border-bottom: 1px solid #000000;
      padding-bottom: 3px;
      letter-spacing: 0.5px;
    }
    .profile-text {
      font-size: 11.5px;
      margin-bottom: 15px;
      color: #374151;
      line-height: 1.5;
    }
    .item-block {
      margin-bottom: 12px;
    }
    .item-company {
      font-size: 11px;
      font-weight: 600;
      color: #4b5563;
      margin: 2px 0;
    }
    .item-desc {
      font-size: 11px;
      margin: 4px 0 0 0;
      padding-left: 15px;
      color: #374151;
      line-height: 1.4;
    }
    .item-desc li {
      margin-bottom: 3px;
    }
    .skills-list {
      font-size: 11px;
      line-height: 1.5;
      color: #374151;
    }
  </style>
</head>
<body>
  <div class="header">
    ${imgHtml ? `<img src="${imgHtml}" class="profile-img" />` : ''}
    <h1 class="name">${formData.firstName} ${formData.lastName}</h1>
    <p class="title">${formData.jobTitle}</p>
    <div class="contact-bar">
      <div class="contact-item">
        <svg class="contact-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
        <span>${formData.phone}</span>
      </div>
      <div class="contact-item">
        <svg class="contact-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
        <span>${formData.email}</span>
      </div>
      <div class="contact-item">
        <svg class="contact-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        <span>${formData.city}</span>
      </div>
      ${formData.website ? `
      <div class="contact-item">
        <svg class="contact-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
        <span>${formData.website}</span>
      </div>
      ` : ''}
    </div>
  </div>

  <div class="section-title">SUMMERY</div>
  <div class="profile-text">${formData.summary}</div>

  ${formData.workExperiences.length > 0 ? `
    <div class="section-title">WORK EXPERIENCE</div>
    ${formData.workExperiences.map(exp => `
      <div class="item-block">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 2px;">
          <tr>
            <td style="font-weight: bold; font-size: 12px; text-align: left; color: #000000;">${exp.jobTitle}</td>
            <td style="font-size: 11px; color: #737373; text-align: right;">${exp.startDate} - ${exp.endDate}</td>
          </tr>
        </table>
        <div class="item-company">${exp.companyName}, ${exp.city}</div>
        <ul class="item-desc">
          ${exp.description.split('\n').filter(l => l.trim().length > 0).map(l => `<li>${l.replace(/^[•\s*-]+/, '').trim()}</li>`).join('')}
        </ul>
      </div>
    `).join('')}
  ` : ''}

  ${formData.educations.length > 0 ? `
    <div class="section-title">EDUCATION</div>
    ${formData.educations.map(edu => `
      <div class="item-block">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 2px;">
          <tr>
            <td style="font-weight: bold; font-size: 12px; text-align: left; color: #000000;">${edu.degree} in ${edu.fieldOfStudy}</td>
            <td style="font-size: 11px; color: #737373; text-align: right;">${edu.startDate} - ${edu.endDate}</td>
          </tr>
        </table>
        <div class="item-company">${edu.schoolName}, ${edu.city}</div>
        ${edu.description ? `
          <ul class="item-desc">
            ${edu.description.split('\n').filter(l => l.trim().length > 0).map(l => `<li>${l.replace(/^[•\s*-]+/, '').trim()}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `).join('')}
  ` : ''}

  ${formData.skills.length > 0 ? `
    <div class="section-title">SKILLS</div>
    <div class="skills-list">
      • ${formData.skills.join(' &nbsp;&nbsp;&bull;&nbsp;&nbsp; ')}
    </div>
  ` : ''}

  ${formData.languages && formData.languages.length > 0 ? `
    <div class="section-title">LANGUAGES</div>
    <div class="skills-list">
      ${formData.languages.join(' &nbsp;&nbsp;&nbsp;&nbsp; ')}
    </div>
  ` : ''}
</body>
</html>
`;
      } else if (selectedTemplate === 'creative_column') {
        htmlContent = `
<html>
<head>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #374151;
      margin: 40px;
      line-height: 1.4;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    .name-cell {
      vertical-align: bottom;
    }
    .contacts-cell {
      text-align: right;
      vertical-align: bottom;
    }
    .name {
      font-size: 26px;
      font-weight: bold;
      color: #000000;
      margin: 0;
    }
    .title {
      font-size: 13px;
      color: #4b5563;
      margin: 4px 0 0 0;
      font-weight: 500;
    }
    .contact-item {
      font-size: 10.5px;
      color: #4b5563;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }
    .contact-icon {
      margin-right: 6px;
    }
    .header-line {
      border: none;
      border-top: 1.5px solid #cbd5e1;
      margin-bottom: 20px;
    }
    .layout-table {
      width: 100%;
      border-collapse: collapse;
    }
    .left-col {
      width: 65%;
      padding-right: 20px;
      vertical-align: top;
    }
    .right-col {
      width: 35%;
      padding-left: 15px;
      vertical-align: top;
    }
    .section-title {
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      color: #000000;
      border-bottom: 1.5px solid #cbd5e1;
      padding-bottom: 3px;
      margin-top: 0;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }
    .item-block {
      margin-bottom: 15px;
    }
    .item-title {
      font-size: 12px;
      font-weight: bold;
      color: #000000;
      margin: 0;
    }
    .item-company {
      font-size: 11px;
      font-weight: 600;
      color: #4b5563;
      margin: 2px 0;
    }
    .item-desc {
      font-size: 11px;
      margin: 4px 0 0 0;
      padding-left: 15px;
      color: #374151;
      line-height: 1.4;
    }
    .item-desc li {
      margin-bottom: 3px;
    }
    .profile-text {
      font-size: 11px;
      line-height: 1.5;
      color: #374151;
      margin-bottom: 15px;
    }
    .list-item {
      font-size: 11px;
      color: #374151;
      margin-bottom: 5px;
    }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      ${imgHtml ? `
      <td style="width: 70px; vertical-align: bottom; padding-right: 15px;">
        <img src="${imgHtml}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; display: block;" />
      </td>
      ` : ''}
      <td class="name-cell">
        <h1 class="name">${formData.firstName} ${formData.lastName}</h1>
        <p class="title">${formData.jobTitle}</p>
      </td>
      <td class="contacts-cell">
        <div class="contact-item">
          <span>${formData.phone}</span>
          <svg class="contact-icon" style="margin-left: 6px; margin-right: 0;" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
        </div>
        <div class="contact-item">
          <span>${formData.email}</span>
          <svg class="contact-icon" style="margin-left: 6px; margin-right: 0;" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
        </div>
        <div class="contact-item">
          <span>${formData.city}</span>
          <svg class="contact-icon" style="margin-left: 6px; margin-right: 0;" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        </div>
        ${formData.website ? `
        <div class="contact-item">
          <span>${formData.website}</span>
          <svg class="contact-icon" style="margin-left: 6px; margin-right: 0;" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
        </div>
        ` : ''}
      </td>
    </tr>
  </table>
  
  <hr class="header-line" />
  
  <table class="layout-table">
    <tr>
      <td class="left-col">
        ${formData.workExperiences.length > 0 ? `
        <div class="section-title">WORK EXPERIENCE</div>
        ${formData.workExperiences.map(exp => `
          <div class="item-block">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 2px;">
              <tr>
                <td style="font-weight: bold; font-size: 12px; text-align: left; color: #000000;">${exp.jobTitle}</td>
                <td style="font-size: 10.5px; color: #737373; text-align: right;">${exp.startDate} - ${exp.endDate}</td>
              </tr>
            </table>
            <div class="item-company">${exp.companyName}, ${exp.city}</div>
            <ul class="item-desc">
              ${exp.description.split('\n').filter(l => l.trim().length > 0).map(l => `<li>${l.replace(/^[•\s*-]+/, '').trim()}</li>`).join('')}
            </ul>
          </div>
        `).join('')}
        ` : ''}
        
        ${formData.educations.length > 0 ? `
        <div class="section-title" style="margin-top: 15px;">EDUCATION</div>
        ${formData.educations.map(edu => `
          <div class="item-block">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 2px;">
              <tr>
                <td style="font-weight: bold; font-size: 12px; text-align: left; color: #000000;">${edu.degree} in ${edu.fieldOfStudy}</td>
                <td style="font-size: 10.5px; color: #737373; text-align: right;">${edu.startDate} - ${edu.endDate}</td>
              </tr>
            </table>
            <div class="item-company">${edu.schoolName}, ${edu.city}</div>
            ${edu.description ? `
              <ul class="item-desc">
                ${edu.description.split('\n').filter(l => l.trim().length > 0).map(l => `<li>${l.replace(/^[•\s*-]+/, '').trim()}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('')}
        ` : ''}
      </td>
      <td class="right-col">
        ${formData.summary ? `
        <div class="section-title">SUMMERY</div>
        <div class="profile-text">${formData.summary}</div>
        ` : ''}
        
        ${formData.skills.length > 0 ? `
        <div class="section-title" style="margin-top: 15px;">SKILLS</div>
        ${formData.skills.map(s => `<div class="list-item">• ${s}</div>`).join('')}
        ` : ''}
        
        ${formData.languages && formData.languages.length > 0 ? `
        <div class="section-title" style="margin-top: 20px;">LANGUAGES</div>
        ${formData.languages.map(l => `<div class="list-item">• ${l}</div>`).join('')}
        ` : ''}
      </td>
    </tr>
  </table>
</body>
</html>
`;
      } else if (selectedTemplate === 'elegant_warm') {
        htmlContent = `
<html>
<head>
  <style>
    @page {
      margin: 0;
    }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      height: 100%;
    }
    .layout-table {
      width: 100%;
      border-collapse: collapse;
      height: 100%;
      min-height: 100vh;
    }
    .sidebar {
      width: 32%;
      background-color: #eae6f3;
      padding: 40px 20px;
      vertical-align: top;
      color: #1e1b4b;
    }
    .main-content {
      width: 68%;
      padding: 40px 30px;
      vertical-align: top;
      background-color: #ffffff;
    }
    .profile-img {
      width: 75px;
      height: 75px;
      border-radius: 50%;
      object-fit: cover;
      margin-bottom: 25px;
      display: block;
    }
    .sidebar-section {
      margin-top: 25px;
    }
    .sidebar-section:first-child {
      margin-top: 0;
    }
    .sidebar-title {
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      color: #000000;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }
    .contact-item {
      font-size: 11px;
      color: #000000;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      word-break: break-all;
    }
    .contact-icon {
      margin-right: 8px;
      flex-shrink: 0;
    }
    .sidebar-list-item {
      font-size: 11px;
      color: #000000;
      margin-bottom: 6px;
    }
    .name {
      font-size: 26px;
      font-weight: bold;
      color: #000000;
      margin: 0;
    }
    .title {
      font-size: 13px;
      color: #4f46e5;
      text-transform: uppercase;
      font-weight: bold;
      letter-spacing: 1px;
      margin-top: 4px;
      margin-bottom: 20px;
    }
    .summary-text {
      font-size: 11.5px;
      line-height: 1.5;
      margin-bottom: 25px;
      color: #374151;
    }
    .section-title {
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      color: #000000;
      margin-top: 20px;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }
    .item-block {
      margin-bottom: 14px;
    }
    .item-title-row {
      display: flex;
      justify-content: space-between;
    }
    .item-title {
      font-size: 12px;
      font-weight: bold;
      color: #000000;
      margin: 0;
    }
    .item-date {
      font-size: 11px;
      color: #737373;
    }
    .item-company {
      font-size: 11px;
      font-weight: 600;
      color: #4b5563;
      margin: 3px 0;
    }
    .item-desc {
      font-size: 11px;
      margin: 4px 0 0 0;
      padding-left: 15px;
      color: #374151;
      line-height: 1.4;
    }
    .item-desc li {
      margin-bottom: 3px;
    }
  </style>
</head>
<body>
  <table class="layout-table">
    <tr>
      <td class="sidebar">
        ${imgHtml ? `<img src="${imgHtml}" class="profile-img" />` : ''}
        
        <div class="sidebar-section">
          <div class="sidebar-title">Contact</div>
          <div class="contact-item">
            <svg class="contact-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            <span>${formData.phone}</span>
          </div>
          <div class="contact-item">
            <svg class="contact-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            <span>${formData.email}</span>
          </div>
          <div class="contact-item">
            <svg class="contact-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span>${formData.city}</span>
          </div>
          ${formData.website ? `
          <div class="contact-item">
            <svg class="contact-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
            <span>${formData.website}</span>
          </div>
          ` : ''}
        </div>
        
        ${formData.skills.length > 0 ? `
        <div class="sidebar-section">
          <div class="sidebar-title">Skills</div>
          ${formData.skills.map(s => `<div class="sidebar-list-item">• ${s}</div>`).join('')}
        </div>
        ` : ''}
        
        ${formData.languages && formData.languages.length > 0 ? `
        <div class="sidebar-section">
          <div class="sidebar-title">Languages</div>
          ${formData.languages.map(l => `<div class="sidebar-list-item">• ${l}</div>`).join('')}
        </div>
        ` : ''}
      </td>
      <td class="main-content">
        <h1 class="name">${formData.firstName} ${formData.lastName}</h1>
        <p class="title">${formData.jobTitle}</p>
        
        <div class="summary-text">${formData.summary}</div>
        
        ${formData.workExperiences.length > 0 ? `
        <div class="section-title">WORK EXPERIENCE</div>
        ${formData.workExperiences.map(exp => `
          <div class="item-block">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 2px;">
              <tr>
                <td style="font-weight: bold; font-size: 12px; text-align: left; color: #000000;">${exp.jobTitle}</td>
                <td style="font-size: 11px; color: #737373; text-align: right;">${exp.startDate} - ${exp.endDate}</td>
              </tr>
            </table>
            <div class="item-company">${exp.companyName}, ${exp.city}</div>
            <ul class="item-desc">
              ${exp.description.split('\n').filter(l => l.trim().length > 0).map(l => `<li>${l.replace(/^[•\s*-]+/, '').trim()}</li>`).join('')}
            </ul>
          </div>
        `).join('')}
        ` : ''}
        
        ${formData.educations.length > 0 ? `
        <div class="section-title">EDUCATION</div>
        ${formData.educations.map(edu => `
          <div class="item-block">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 2px;">
              <tr>
                <td style="font-weight: bold; font-size: 12px; text-align: left; color: #000000;">${edu.degree} in ${edu.fieldOfStudy}</td>
                <td style="font-size: 11px; color: #737373; text-align: right;">${edu.startDate} - ${edu.endDate}</td>
              </tr>
            </table>
            <div class="item-company">${edu.schoolName}, ${edu.city}</div>
            ${edu.description ? `
              <ul class="item-desc">
                ${edu.description.split('\n').filter(l => l.trim().length > 0).map(l => `<li>${l.replace(/^[•\s*-]+/, '').trim()}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('')}
        ` : ''}
      </td>
    </tr>
  </table>
</body>
</html>
`;
      }

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      
      // Save it to resumes folder and resumes.json
      try {
        const resumesJsonPath = `${FileSystem.documentDirectory}resumes.json`;
        let currentList: any[] = [];
        const fileInfo = await FileSystem.getInfoAsync(resumesJsonPath);
        if (fileInfo.exists) {
          const content = await FileSystem.readAsStringAsync(resumesJsonPath);
          currentList = JSON.parse(content);
        }
        
        const dateStr = new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit'
        }) + ' ' + new Date().toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit'
        });

        const cleanStr = (str: string) => {
          return str ? str.trim().replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_') : '';
        };
        const first = cleanStr(formData.firstName);
        const last = cleanStr(formData.lastName);
        const job = cleanStr(formData.jobTitle);
        
        let extraInfo = '';
        if (job) {
          extraInfo = job;
        } else if (formData.skills && formData.skills.length > 0) {
          extraInfo = cleanStr(formData.skills[0]);
        } else if (formData.workExperiences && formData.workExperiences.length > 0 && formData.workExperiences[0].companyName) {
          extraInfo = cleanStr(formData.workExperiences[0].companyName);
        }

        let baseParts = [];
        if (first) baseParts.push(first);
        if (last) baseParts.push(last);
        if (extraInfo) baseParts.push(extraInfo);

        let baseName = baseParts.join('_').replace(/_+/g, '_');
        if (baseName.endsWith('_')) baseName = baseName.slice(0, -1);
        if (baseName.startsWith('_')) baseName = baseName.slice(1);
        
        if (!baseName) {
          baseName = 'Resume';
        }
        const resumeName = `${baseName}_Resume.pdf`;

        const resumesDir = `${FileSystem.documentDirectory}resumes/`;
        const dirInfo = await FileSystem.getInfoAsync(resumesDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(resumesDir, { intermediates: true });
        }
        const localPath = `${resumesDir}${Date.now()}_${resumeName}`;
        await FileSystem.copyAsync({
          from: uri,
          to: localPath
        });

        const newResume = {
          id: String(Date.now()),
          name: resumeName,
          date: dateStr,
          uri: localPath,
          size: 0,
          mimeType: 'application/pdf',
          isBuilt: true
        };

        const newList = [newResume, ...currentList];
        await FileSystem.writeAsStringAsync(resumesJsonPath, JSON.stringify(newList));

        // Copy printed file to cache directory with clean name for sharing sheet beauty
        const sharePath = `${FileSystem.cacheDirectory}${resumeName}`;
        try {
          const info = await FileSystem.getInfoAsync(sharePath);
          if (info.exists) {
            await FileSystem.deleteAsync(sharePath, { idempotent: true });
          }
        } catch (e) {
          console.log("Error cleaning up cached share file:", e);
        }
        await FileSystem.copyAsync({
          from: uri,
          to: sharePath
        });
        await Sharing.shareAsync(sharePath, { UTI: '.pdf', mimeType: 'application/pdf' });
      } catch (saveErr) {
        console.log("Failed to save built resume to resumes list:", saveErr);
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (err) {
      console.log('Error generating or sharing PDF:', err);
      Alert.alert('Download Error', 'Could not generate or download PDF.');
    }
  };

  const handleBackPress = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
    } else {
      router.back();
    }
  };

  // Step 2 Modal validation
  const isExpInputValid = () => {
    return (
      expJobTitle.trim().length > 0 &&
      expCompany.trim().length > 0 &&
      expCity.trim().length > 0 &&
      expStartDate.trim().length > 0 &&
      expEndDate.trim().length > 0 &&
      expDescription.trim().length > 0
    );
  };

  // Clear modal inputs (Step 2)
  const clearExpInputs = () => {
    setExpJobTitle('');
    setExpCompany('');
    setExpCity('');
    setExpStartDate('');
    setExpEndDate('');
    setExpDescription('');
    setEditingExpId(null);
  };

  // Add work experience handler (Step 2)
  const openAddExpModal = () => {
    clearExpInputs();
    setIsExpModalVisible(true);
  };

  // Edit work experience handler (Step 2)
  const openEditExpModal = (exp: WorkExperience) => {
    setExpJobTitle(exp.jobTitle);
    setExpCompany(exp.companyName);
    setExpCity(exp.city);
    setExpStartDate(exp.startDate);
    setExpEndDate(exp.endDate);
    setExpDescription(exp.description);
    setEditingExpId(exp.id);
    setIsExpModalVisible(true);
  };

  // Save work experience (Add / Edit)
  const handleSaveExperience = () => {
    if (!isExpInputValid()) return;

    if (editingExpId) {
      setFormData(prev => ({
        ...prev,
        workExperiences: prev.workExperiences.map(item =>
          item.id === editingExpId
            ? {
              ...item,
              jobTitle: expJobTitle.trim(),
              companyName: expCompany.trim(),
              city: expCity.trim(),
              startDate: expStartDate.trim(),
              endDate: expEndDate.trim(),
              description: expDescription.trim(),
            }
            : item
        ),
      }));
    } else {
      const newExp: WorkExperience = {
        id: Date.now().toString(),
        jobTitle: expJobTitle.trim(),
        companyName: expCompany.trim(),
        city: expCity.trim(),
        startDate: expStartDate.trim(),
        endDate: expEndDate.trim(),
        description: expDescription.trim(),
      };
      setFormData(prev => ({
        ...prev,
        workExperiences: [...prev.workExperiences, newExp],
      }));
    }

    setIsExpModalVisible(false);
    clearExpInputs();
  };

  // Trigger Delete confirmation (Step 2)
  const triggerDeleteConfirm = (id: string) => {
    setExpToDeleteId(id);
    setIsDeleteConfirmVisible(true);
  };

  // Delete work experience
  const handleDeleteExperience = () => {
    if (expToDeleteId) {
      setFormData(prev => ({
        ...prev,
        workExperiences: prev.workExperiences.filter(item => item.id !== expToDeleteId),
      }));
    }
    setIsDeleteConfirmVisible(false);
    setExpToDeleteId(null);
  };

  // Add suggestion to description (Step 2)
  const handleAddAiSuggestion = (suggestion: string) => {
    setExpDescription(prev => {
      const trimmed = prev.trim();
      if (!trimmed) {
        return `• ${suggestion}`;
      }
      return `${prev}\n• ${suggestion}`;
    });
  };

  // Parse and render description bullets in list cards (Step 2/4)
  const renderDescriptionBullets = (desc: string) => {
    const lines = desc.split('\n').filter(line => line.trim().length > 0);
    return lines.map((line, idx) => {
      const cleaned = line.replace(/^[•\s*-]+/, '').trim();
      return (
        <View key={idx} style={styles.bulletRow}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>{cleaned}</Text>
        </View>
      );
    });
  };

  // Toggle skill selection in preset & added list (Step 3)
  const toggleSkillSelection = (skillName: string) => {
    setFormData(prev => {
      const isSelected = prev.skills.includes(skillName);
      if (isSelected) {
        return {
          ...prev,
          skills: prev.skills.filter(s => s !== skillName),
        };
      } else {
        return {
          ...prev,
          skills: [...prev.skills, skillName],
        };
      }
    });
  };

  // Add custom skill logic (Step 3)
  const handleAddCustomSkill = () => {
    const trimmed = newSkillText.trim();
    if (!trimmed) return;

    setFormData(prev => {
      if (prev.skills.includes(trimmed)) {
        return prev;
      }
      return {
        ...prev,
        skills: [...prev.skills, trimmed],
      };
    });
    setNewSkillText('');
    setShowAddSkillInput(false);
  };

  // Toggle language selection (Step 3)
  const toggleLanguageSelection = (langName: string) => {
    setFormData(prev => {
      const isSelected = prev.languages.includes(langName);
      if (isSelected) {
        return {
          ...prev,
          languages: prev.languages.filter(l => l !== langName),
        };
      } else {
        return {
          ...prev,
          languages: [...prev.languages, langName],
        };
      }
    });
  };

  // Add custom language logic (Step 3)
  const handleAddCustomLanguage = () => {
    const trimmed = newLanguageText.trim();
    if (!trimmed) return;

    setFormData(prev => {
      if (prev.languages.includes(trimmed)) {
        return prev;
      }
      return {
        ...prev,
        languages: [...prev.languages, trimmed],
      };
    });
    setNewLanguageText('');
    setShowAddLanguageInput(false);
  };

  // Step 4 Modal validation
  const isEduInputValid = () => {
    return (
      eduSchool.trim().length > 0 &&
      eduDegree.trim().length > 0 &&
      eduFieldOfStudy.trim().length > 0 &&
      eduCity.trim().length > 0 &&
      eduStartDate.trim().length > 0 &&
      (eduIsCurrent || eduEndDate.trim().length > 0)
    );
  };

  // Clear modal inputs (Step 4)
  const clearEduInputs = () => {
    setEduSchool('');
    setEduDegree('');
    setEduFieldOfStudy('');
    setEduCity('');
    setEduStartDate('');
    setEduEndDate('');
    setEduDescription('');
    setEduGpa('');
    setEduIsCurrent(false);
    setEditingEduId(null);
  };

  // Add education handler (Step 4)
  const openAddEduModal = () => {
    clearEduInputs();
    setIsEduModalVisible(true);
  };

  // Edit education handler (Step 4)
  const openEditEduModal = (edu: Education) => {
    setEduSchool(edu.schoolName);
    setEduDegree(edu.degree);
    setEduFieldOfStudy(edu.fieldOfStudy);
    setEduCity(edu.city);
    setEduStartDate(edu.startDate);
    setEduEndDate(edu.endDate);
    setEduDescription(edu.description);
    setEduGpa(edu.gpa || '');
    setEduIsCurrent(edu.endDate === 'Present');
    setEditingEduId(edu.id);
    setIsEduModalVisible(true);
  };

  // Save education (Add / Edit)
  const handleSaveEducation = () => {
    if (!isEduInputValid()) return;

    if (editingEduId) {
      setFormData(prev => ({
        ...prev,
        educations: prev.educations.map(item =>
          item.id === editingEduId
            ? {
                ...item,
                schoolName: eduSchool.trim(),
                degree: eduDegree.trim(),
                fieldOfStudy: eduFieldOfStudy.trim(),
                city: eduCity.trim(),
                startDate: eduStartDate.trim(),
                endDate: eduIsCurrent ? 'Present' : eduEndDate.trim(),
                description: eduDescription.trim(),
                gpa: eduGpa.trim(),
              }
            : item
        ),
      }));
    } else {
      const newEdu: Education = {
        id: Date.now().toString(),
        schoolName: eduSchool.trim(),
        degree: eduDegree.trim(),
        fieldOfStudy: eduFieldOfStudy.trim(),
        city: eduCity.trim(),
        startDate: eduStartDate.trim(),
        endDate: eduIsCurrent ? 'Present' : eduEndDate.trim(),
        description: eduDescription.trim(),
        gpa: eduGpa.trim(),
      };
      setFormData(prev => ({
        ...prev,
        educations: [...prev.educations, newEdu],
      }));
    }

    setIsEduModalVisible(false);
    clearEduInputs();
  };

  // Trigger Delete confirmation (Step 4)
  const triggerEduDeleteConfirm = (id: string) => {
    setEduToDeleteId(id);
    setIsEduDeleteConfirmVisible(true);
  };

  // Delete education record
  const handleDeleteEducation = () => {
    if (eduToDeleteId) {
      setFormData(prev => ({
        ...prev,
        educations: prev.educations.filter(item => item.id !== eduToDeleteId),
      }));
    }
    setIsEduDeleteConfirmVisible(false);
    setEduToDeleteId(null);
  };

  // Add suggestion to description (Step 4)
  const handleAddEduAiSuggestion = (suggestion: string) => {
    setEduDescription(prev => {
      const trimmed = prev.trim();
      if (!trimmed) {
        return `• ${suggestion}`;
      }
      return `${prev}\n• ${suggestion}`;
    });
  };

  // Handle summary text change (Step 5)
  const handleSummaryChange = (text: string) => {
    setFormData(prev => ({ ...prev, summary: text }));
  };



  if (isFinalizing) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingIconWrapper}>
          <Image
            source={require('../assets/images/flash.png')}
            style={styles.loadingImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.loadingText}>FINALIZING ...</Text>
      </View>
    );
  }

  if (showTemplateSelection) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* HEADER */}
        <View style={[styles.header, { marginTop: insets.top }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => {
            router.replace('/(tabs)');
          }}>
            <Ionicons name="chevron-back" size={28} color="#000000" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Select Template</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.pageTitle}>Select a Design Template</Text>
          <Text style={{ fontSize: 14, color: '#737373', marginTop: -20, marginBottom: 24 }}>
            Choose a custom layout style for your resume. All templates are completely free.
          </Text>

          {[
            {
              id: 'modern_slate',
              name: 'Modern Slate',
              desc: 'Clean layouts with slate-gray accents and clear separators.',
              tags: ['Recommended', 'Minimalist'],
              layoutIcon: 'grid-outline'
            },
            {
              id: 'executive_classic',
              name: 'Executive Classic',
              desc: 'Traditional corporate styling with balanced structures.',
              tags: ['Professional', 'Corporate'],
              layoutIcon: 'briefcase-outline'
            },
            {
              id: 'creative_column',
              name: 'Creative Columns',
              desc: 'Premium two-column layout with colored sidebar details.',
              tags: ['Creative', 'Tech / Design'],
              layoutIcon: 'color-palette-outline'
            },
            {
              id: 'elegant_warm',
              name: 'Elegant Warm',
              desc: 'Refined spacing, typography, and warm aesthetic accents.',
              tags: ['Editorial', 'Arts / Writing'],
              layoutIcon: 'book-outline'
            }
          ].map((tmpl) => {
            const isSelected = selectedTemplate === tmpl.id;
            return (
              <TouchableOpacity
                key={tmpl.id}
                style={[
                  styles.templateCard,
                  isSelected ? styles.templateCardSelected : styles.templateCardUnselected
                ]}
                activeOpacity={0.8}
                onPress={() => setSelectedTemplate(tmpl.id)}
              >
                <View style={styles.templateCardHeader}>
                  <View style={[styles.templateIconWrapper, isSelected ? styles.templateIconSelected : null]}>
                    <Ionicons name={tmpl.layoutIcon as any} size={24} color={isSelected ? "#FFFFFF" : "#000000"} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.templateCardName}>{tmpl.name}</Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={18} color="#000000" style={{ marginLeft: 8 }} />
                      )}
                    </View>
                    <Text style={styles.templateCardDesc}>{tmpl.desc}</Text>
                  </View>
                </View>
                <View style={styles.templateTagsRow}>
                  {tmpl.tags.map((tag, i) => (
                    <View key={i} style={[styles.templateTag, isSelected ? styles.templateTagSelected : null]}>
                      <Text style={[styles.templateTagText, isSelected ? styles.templateTagTextSelected : null]}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* CONTINUE TO PREVIEW BUTTON */}
        <View style={[styles.bottomButtonContainer, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity
            style={styles.continueBtn}
            activeOpacity={0.8}
            onPress={() => {
              setShowTemplateSelection(false);
              setShowPreview(true);
            }}
          >
            <Text style={styles.continueBtnText}>CONTINUE TO PREVIEW</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  if (showPreview) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* HEADER */}
        <View style={[styles.header, { marginTop: insets.top }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => {
            router.replace('/(tabs)');
          }}>
            <Ionicons name="chevron-back" size={28} color="#000000" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Resume Preview</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 220 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.pageTitle}>Your Resume is ready 🥳</Text>

          {/* QUICK STYLE SWITCHER */}
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#000000', marginBottom: 8, paddingHorizontal: 4 }}>
            Change Resume Template Style:
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, marginBottom: 20, paddingBottom: 4 }}
          >
            {[
              { id: 'modern_slate', name: 'Slate' },
              { id: 'executive_classic', name: 'Executive' },
              { id: 'creative_column', name: 'Creative' },
              { id: 'elegant_warm', name: 'Elegant' },
            ].map(t => {
              const active = selectedTemplate === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setSelectedTemplate(t.id)}
                  style={{
                    backgroundColor: active ? '#000000' : '#FFFFFF',
                    borderWidth: 1.5,
                    borderColor: '#000000',
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    marginRight: 8
                  }}
                >
                  <Text style={{ color: active ? '#FFFFFF' : '#000000', fontSize: 13, fontWeight: '700' }}>
                    {t.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* PDF PREVIEW CONTAINER */}
          <View style={[
            styles.previewContainer,
            { padding: 0 }
          ]}>
            {selectedTemplate === 'modern_slate' && (
              <View style={{ backgroundColor: '#FFFFFF', padding: 20, borderRadius: 24 }}>
                {/* Header */}
                <View style={{ marginBottom: 15 }}>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: '#000000' }}>
                    {formData.firstName} {formData.lastName}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#4B5563', fontWeight: '500', marginTop: 2 }}>
                    {formData.jobTitle}
                  </Text>
                </View>

                {/* Main Body */}
                <View style={{ flexDirection: 'row' }}>
                  {/* Left Col (Contacts, Skills, Languages) */}
                  <View style={{ width: '33%', paddingRight: 15, borderRightWidth: 1.5, borderColor: '#cbd5e1' }}>
                    {formData.profileImage ? (
                      <Image source={{ uri: formData.profileImage }} style={{ width: 64, height: 64, borderRadius: 32, marginBottom: 15, alignSelf: 'flex-start' }} />
                    ) : null}
                    
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#000000', marginBottom: 8, letterSpacing: 0.5 }}>CONTACTS</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Ionicons name="call-outline" size={12} color="#000000" style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 10, color: '#000000', flex: 1 }}>{formData.phone}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Ionicons name="mail-outline" size={12} color="#000000" style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 10, color: '#000000', flex: 1 }} numberOfLines={1}>{formData.email}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Ionicons name="location-outline" size={12} color="#000000" style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 10, color: '#000000', flex: 1 }}>{formData.city}</Text>
                    </View>
                    {formData.website ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <Ionicons name="link-outline" size={12} color="#000000" style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 10, color: '#000000', flex: 1 }} numberOfLines={1}>{formData.website}</Text>
                      </View>
                    ) : null}

                    {formData.skills.length > 0 && (
                      <>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#000000', marginTop: 20, marginBottom: 8, letterSpacing: 0.5 }}>SKILLS</Text>
                        {formData.skills.map(s => (
                          <Text key={s} style={{ fontSize: 10, color: '#000000', marginBottom: 4 }}>• {s}</Text>
                        ))}
                      </>
                    )}

                    {formData.languages && formData.languages.length > 0 && (
                      <>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#000000', marginTop: 20, marginBottom: 8, letterSpacing: 0.5 }}>LANGUAGES</Text>
                        {formData.languages.map(l => (
                          <Text key={l} style={{ fontSize: 10, color: '#000000', marginBottom: 4 }}>• {l}</Text>
                        ))}
                      </>
                    )}
                  </View>

                  {/* Right Col */}
                  <View style={{ width: '67%', paddingLeft: 18 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#000000', marginBottom: 8, letterSpacing: 0.5 }}>SUMMERY</Text>
                    <Text style={{ fontSize: 11, color: '#374151', lineHeight: 15, marginBottom: 15 }}>{formData.summary}</Text>
                    
                    <View style={{ height: 1, backgroundColor: '#cbd5e1', marginVertical: 15 }} />

                    {formData.workExperiences.length > 0 && (
                      <>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#000000', marginBottom: 8, letterSpacing: 0.5 }}>WORK EXPERIENCE</Text>
                        {formData.workExperiences.map(exp => (
                          <View key={exp.id} style={{ marginBottom: 12 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#000000' }}>{exp.jobTitle}</Text>
                            <Text style={{ fontSize: 10, fontWeight: '600', color: '#4B5563', marginVertical: 1 }}>{exp.companyName}, {exp.city} | {exp.startDate} - {exp.endDate}</Text>
                            {exp.description ? (
                              <View style={{ marginTop: 2 }}>{renderDescriptionBullets(exp.description)}</View>
                            ) : null}
                          </View>
                        ))}
                      </>
                    )}

                    {formData.educations.length > 0 && (
                      <>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#000000', marginTop: 10, marginBottom: 8, letterSpacing: 0.5 }}>EDUCATION</Text>
                        {formData.educations.map(edu => (
                          <View key={edu.id} style={{ marginBottom: 12 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#000000' }}>{edu.degree} in {edu.fieldOfStudy}</Text>
                            <Text style={{ fontSize: 10, fontWeight: '600', color: '#4B5563', marginVertical: 1 }}>{edu.schoolName}, {edu.city} | {edu.startDate} - {edu.endDate}</Text>
                            {edu.description ? (
                              <View style={{ marginTop: 2 }}>{renderDescriptionBullets(edu.description)}</View>
                            ) : null}
                          </View>
                        ))}
                      </>
                    )}
                  </View>
                </View>
              </View>
            )}

            {selectedTemplate === 'executive_classic' && (
              <View style={{ backgroundColor: '#FFFFFF', padding: 20, borderRadius: 24 }}>
                {/* Centered Header */}
                <View style={{ alignItems: 'center', marginBottom: 15 }}>
                  {formData.profileImage ? (
                    <Image source={{ uri: formData.profileImage }} style={{ width: 64, height: 64, borderRadius: 32, marginBottom: 12, alignSelf: 'center' }} />
                  ) : null}
                  <Text style={{ fontSize: 24, fontWeight: '800', color: '#000000', textAlign: 'center' }}>
                    {formData.firstName} {formData.lastName}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600', marginTop: 2, textAlign: 'center' }}>
                    {formData.jobTitle}
                  </Text>
                  {/* Contact details centered row */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginTop: 8, gap: 10, borderBottomWidth: 1.5, borderColor: '#000000', paddingBottom: 10, width: '100%' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="call-outline" size={11} color="#4B5563" style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 10.5, color: '#4B5563' }}>{formData.phone}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="mail-outline" size={11} color="#4B5563" style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 10.5, color: '#4B5563' }}>{formData.email}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="location-outline" size={11} color="#4B5563" style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 10.5, color: '#4B5563' }}>{formData.city}</Text>
                    </View>
                    {formData.website ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="link-outline" size={11} color="#4B5563" style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 10.5, color: '#4B5563' }}>{formData.website}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Profile Summary */}
                <View style={{ marginBottom: 15 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#000000', borderBottomWidth: 1, borderColor: '#cbd5e1', paddingBottom: 2, marginBottom: 6 }}>SUMMERY</Text>
                  <Text style={{ fontSize: 11, color: '#374151', lineHeight: 15 }}>{formData.summary}</Text>
                </View>

                {/* Work Experience */}
                {formData.workExperiences.length > 0 && (
                  <View style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#000000', borderBottomWidth: 1, borderColor: '#cbd5e1', paddingBottom: 2, marginBottom: 8 }}>WORK EXPERIENCE</Text>
                    {formData.workExperiences.map(exp => (
                      <View key={exp.id} style={{ marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#000000' }}>{exp.jobTitle}</Text>
                          <Text style={{ fontSize: 10, color: '#6B7280' }}>{exp.startDate} - {exp.endDate}</Text>
                        </View>
                        <Text style={{ fontSize: 10.5, fontWeight: '600', color: '#4B5563', marginVertical: 1 }}>{exp.companyName}, {exp.city}</Text>
                        {exp.description ? (
                          <View style={{ marginTop: 2 }}>{renderDescriptionBullets(exp.description)}</View>
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}

                {/* Education */}
                {formData.educations.length > 0 && (
                  <View style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#000000', borderBottomWidth: 1, borderColor: '#cbd5e1', paddingBottom: 2, marginBottom: 8 }}>EDUCATION</Text>
                    {formData.educations.map(edu => (
                      <View key={edu.id} style={{ marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#000000' }}>{edu.degree} in {edu.fieldOfStudy}</Text>
                          <Text style={{ fontSize: 10, color: '#6B7280' }}>{edu.startDate} - {edu.endDate}</Text>
                        </View>
                        <Text style={{ fontSize: 10.5, fontWeight: '600', color: '#4B5563', marginVertical: 1 }}>{edu.schoolName}, {edu.city}</Text>
                        {edu.description ? (
                          <View style={{ marginTop: 2 }}>{renderDescriptionBullets(edu.description)}</View>
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}

                {/* Skills Bullet Dots List */}
                {formData.skills.length > 0 && (
                  <View style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#000000', borderBottomWidth: 1, borderColor: '#cbd5e1', paddingBottom: 2, marginBottom: 6 }}>SKILLS</Text>
                    <Text style={{ fontSize: 11, color: '#374151', lineHeight: 15 }}>
                      • {formData.skills.join('  •  ')}
                    </Text>
                  </View>
                )}

                {/* Languages */}
                {formData.languages && formData.languages.length > 0 && (
                  <View style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#000000', borderBottomWidth: 1, borderColor: '#cbd5e1', paddingBottom: 2, marginBottom: 6 }}>LANGUAGES</Text>
                    <Text style={{ fontSize: 11, color: '#374151', lineHeight: 15 }}>
                      {formData.languages.join('    ')}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {selectedTemplate === 'creative_column' && (
              <View style={{ backgroundColor: '#FFFFFF', padding: 20, borderRadius: 24 }}>
                {/* Header: row layout */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderBottomWidth: 1.5, borderColor: '#cbd5e1', paddingBottom: 12, marginBottom: 15 }}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    {formData.profileImage ? (
                      <Image source={{ uri: formData.profileImage }} style={{ width: 60, height: 60, borderRadius: 30, marginRight: 12 }} />
                    ) : null}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 24, fontWeight: '800', color: '#000000' }}>
                        {formData.firstName} {formData.lastName}
                      </Text>
                      <Text style={{ fontSize: 13, color: '#4B5563', fontWeight: '600', marginTop: 2 }}>
                        {formData.jobTitle}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', minWidth: 120 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                      <Text style={{ fontSize: 10, color: '#4B5563', marginRight: 6 }}>{formData.phone}</Text>
                      <Ionicons name="call-outline" size={11} color="#4B5563" />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                      <Text style={{ fontSize: 10, color: '#4B5563', marginRight: 6 }} numberOfLines={1}>{formData.email}</Text>
                      <Ionicons name="mail-outline" size={11} color="#4B5563" />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                      <Text style={{ fontSize: 10, color: '#4B5563', marginRight: 6 }}>{formData.city}</Text>
                      <Ionicons name="location-outline" size={11} color="#4B5563" />
                    </View>
                    {formData.website ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 10, color: '#4B5563', marginRight: 6 }} numberOfLines={1}>{formData.website}</Text>
                        <Ionicons name="link-outline" size={11} color="#4B5563" />
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Split columns */}
                <View style={{ flexDirection: 'row' }}>
                  {/* Left side: Work Exp & Education (65%) */}
                  <View style={{ width: '65%', paddingRight: 15 }}>
                    {formData.workExperiences.length > 0 && (
                      <View style={{ marginBottom: 15 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#000000', borderBottomWidth: 1, borderColor: '#cbd5e1', paddingBottom: 2, marginBottom: 8 }}>WORK EXPERIENCE</Text>
                        {formData.workExperiences.map(exp => (
                          <View key={exp.id} style={{ marginBottom: 12 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#000000', flex: 1, marginRight: 5 }}>{exp.jobTitle}</Text>
                              <Text style={{ fontSize: 10, color: '#6B7280' }}>{exp.startDate} - {exp.endDate}</Text>
                            </View>
                            <Text style={{ fontSize: 10.5, fontWeight: '600', color: '#4B5563', marginVertical: 1 }}>{exp.companyName}, {exp.city}</Text>
                            {exp.description ? (
                              <View style={{ marginTop: 2 }}>{renderDescriptionBullets(exp.description)}</View>
                            ) : null}
                          </View>
                        ))}
                      </View>
                    )}

                    {formData.educations.length > 0 && (
                      <View style={{ marginBottom: 15 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#000000', borderBottomWidth: 1, borderColor: '#cbd5e1', paddingBottom: 2, marginBottom: 8 }}>EDUCATION</Text>
                        {formData.educations.map(edu => (
                          <View key={edu.id} style={{ marginBottom: 12 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#000000', flex: 1, marginRight: 5 }}>{edu.degree} in {edu.fieldOfStudy}</Text>
                              <Text style={{ fontSize: 10, color: '#6B7280' }}>{edu.startDate} - {edu.endDate}</Text>
                            </View>
                            <Text style={{ fontSize: 10.5, fontWeight: '600', color: '#4B5563', marginVertical: 1 }}>{edu.schoolName}, {edu.city}</Text>
                            {edu.description ? (
                              <View style={{ marginTop: 2 }}>{renderDescriptionBullets(edu.description)}</View>
                            ) : null}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Right side: Summary, Skills, Languages (35%) */}
                  <View style={{ width: '35%', paddingLeft: 10 }}>
                    {formData.summary ? (
                      <>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#000000', borderBottomWidth: 1, borderColor: '#cbd5e1', paddingBottom: 2, marginBottom: 6 }}>SUMMERY</Text>
                        <Text style={{ fontSize: 11, color: '#374151', lineHeight: 15, marginBottom: 15 }}>{formData.summary}</Text>
                      </>
                    ) : null}

                    {formData.skills.length > 0 && (
                      <View style={{ marginBottom: 15 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#000000', borderBottomWidth: 1, borderColor: '#cbd5e1', paddingBottom: 2, marginBottom: 8 }}>SKILLS</Text>
                        {formData.skills.map(s => (
                          <Text key={s} style={{ fontSize: 10, color: '#000000', marginBottom: 4 }}>• {s}</Text>
                        ))}
                      </View>
                    )}

                    {formData.languages && formData.languages.length > 0 && (
                      <View style={{ marginBottom: 15 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#000000', borderBottomWidth: 1, borderColor: '#cbd5e1', paddingBottom: 2, marginBottom: 8 }}>LANGUAGES</Text>
                        {formData.languages.map(l => (
                          <Text key={l} style={{ fontSize: 10, color: '#000000', marginBottom: 4 }}>• {l}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </View>
            )}

            {selectedTemplate === 'elegant_warm' && (
              <View style={{ backgroundColor: '#FFFFFF', flexDirection: 'row', borderRadius: 24, overflow: 'hidden' }}>
                {/* Left Sidebar (Pastel Lavender) */}
                <View style={{ width: '32%', backgroundColor: '#eae6f3', padding: 18 }}>
                  {formData.profileImage ? (
                    <Image source={{ uri: formData.profileImage }} style={{ width: 64, height: 64, borderRadius: 32, marginBottom: 20, alignSelf: 'flex-start' }} />
                  ) : null}
                  
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#000000', borderBottomWidth: 1, borderColor: '#cbd5e1', paddingBottom: 4, marginBottom: 10 }}>Contact</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Ionicons name="call-outline" size={11} color="#000000" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 10, color: '#000000', flex: 1 }}>{formData.phone}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Ionicons name="mail-outline" size={11} color="#000000" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 10, color: '#000000', flex: 1 }} numberOfLines={1}>{formData.email}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Ionicons name="location-outline" size={11} color="#000000" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 10, color: '#000000', flex: 1 }}>{formData.city}</Text>
                  </View>
                  {formData.website ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Ionicons name="link-outline" size={11} color="#000000" style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 10, color: '#000000', flex: 1 }} numberOfLines={1}>{formData.website}</Text>
                    </View>
                  ) : null}

                  {formData.skills.length > 0 && (
                    <View style={{ marginTop: 20 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#000000', borderBottomWidth: 1, borderColor: '#cbd5e1', paddingBottom: 4, marginBottom: 10 }}>Skills</Text>
                      {formData.skills.map(s => (
                        <Text key={s} style={{ fontSize: 10, color: '#000000', marginBottom: 4 }}>• {s}</Text>
                      ))}
                    </View>
                  )}

                  {formData.languages && formData.languages.length > 0 && (
                    <View style={{ marginTop: 20 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#000000', borderBottomWidth: 1, borderColor: '#cbd5e1', paddingBottom: 4, marginBottom: 10 }}>Languages</Text>
                      {formData.languages.map(l => (
                        <Text key={l} style={{ fontSize: 10, color: '#000000', marginBottom: 4 }}>• {l}</Text>
                      ))}
                    </View>
                  )}
                </View>

                {/* Right Content */}
                <View style={{ width: '68%', padding: 20 }}>
                  <View style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: '#000000' }}>
                      {formData.firstName} {formData.lastName}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#4f46e5', fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {formData.jobTitle}
                    </Text>
                  </View>

                  <Text style={{ fontSize: 11, color: '#374151', lineHeight: 15, marginBottom: 20 }}>{formData.summary}</Text>

                  {formData.workExperiences.length > 0 && (
                    <View style={{ marginBottom: 15 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#000000', borderBottomWidth: 1.5, borderColor: '#cbd5e1', paddingBottom: 2, marginBottom: 8 }}>WORK EXPERIENCE</Text>
                      {formData.workExperiences.map(exp => (
                        <View key={exp.id} style={{ marginBottom: 12 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#000000', flex: 1, marginRight: 5 }}>{exp.jobTitle}</Text>
                            <Text style={{ fontSize: 10, color: '#737373' }}>{exp.startDate} - {exp.endDate}</Text>
                          </View>
                          <Text style={{ fontSize: 10.5, color: '#4B5563', marginVertical: 1 }}>{exp.companyName}, {exp.city}</Text>
                          {exp.description ? (
                            <View style={{ marginTop: 2 }}>{renderDescriptionBullets(exp.description)}</View>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  )}

                  {formData.educations.length > 0 && (
                    <View style={{ marginBottom: 15 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#000000', borderBottomWidth: 1.5, borderColor: '#cbd5e1', paddingBottom: 2, marginBottom: 8 }}>EDUCATION</Text>
                      {formData.educations.map(edu => (
                        <View key={edu.id} style={{ marginBottom: 12 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#000000', flex: 1, marginRight: 5 }}>{edu.degree} in {edu.fieldOfStudy}</Text>
                            <Text style={{ fontSize: 10, color: '#737373' }}>{edu.startDate} - {edu.endDate}</Text>
                          </View>
                          <Text style={{ fontSize: 10.5, color: '#4B5563', marginVertical: 1 }}>{edu.schoolName}, {edu.city}</Text>
                          {edu.description ? (
                            <View style={{ marginTop: 2 }}>{renderDescriptionBullets(edu.description)}</View>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* BOTTOM BUTTONS */}
        <View style={[styles.previewButtonsWrapper, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity
            style={styles.editResumeBtn}
            activeOpacity={0.8}
            onPress={() => {
              setShowPreview(false);
              setStep(1);
            }}
          >
            <Text style={styles.editResumeBtnText}>EDIT DATA</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.downloadResumeBtn}
            activeOpacity={0.8}
            onPress={handleDownloadPdf}
          >
            <Text style={styles.downloadResumeBtnText}>DOWNLOAD PDF</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // STEP 3: SKILLS SCREEN
  if (step === 3) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* HEADER */}
        <View style={[styles.header, { marginTop: insets.top }]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="chevron-back" size={28} color="#000000" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Resume Builder</Text>
            <View style={styles.progressRow}>
              <Text style={styles.stepIndicatorText}>3 of 5</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: '60%' }]} />
              </View>
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.pageTitle}>Add your skills</Text>
          <Text style={styles.skillsSubtitle}>We recommend including at least 6-8 skills.</Text>

          {/* AI Suggested Skills Coming Soon */}
          <View style={styles.aiSuggestionComingSoon}>
            <Ionicons name="sparkles" size={16} color="#000000" style={{ marginRight: 8, marginTop: 1 }} />
            <Text style={styles.aiComingSoonText}>
              ✨ AI Suggested Skills are coming soon! Custom skills will be recommended dynamically based on your target role in the next update.
            </Text>
          </View>

          {/* ADD SKILL button */}
          <TouchableOpacity
            style={styles.addExpTriggerBtn}
            activeOpacity={0.8}
            onPress={() => setShowAddSkillInput(prev => !prev)}
          >
            <Text style={styles.addExpTriggerText}>+ ADD SKILL</Text>
          </TouchableOpacity>

          {/* Custom Inline Add Skill input */}
          {showAddSkillInput && (
            <View style={styles.skillInputWrapper}>
              <TextInput
                style={styles.skillTextInput}
                value={newSkillText}
                onChangeText={setNewSkillText}
                placeholder="e.g. skill"
                placeholderTextColor="#A3A3A3"
                autoFocus={true}
                onSubmitEditing={handleAddCustomSkill}
              />
              <TouchableOpacity
                style={styles.skillAddBtn}
                activeOpacity={0.8}
                onPress={handleAddCustomSkill}
              >
                <Text style={styles.skillAddBtnText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.skillTrashBtn}
                activeOpacity={0.8}
                onPress={() => {
                  setNewSkillText('');
                  setShowAddSkillInput(false);
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}

          {/* Added Skills list section */}
          {formData.skills.length > 0 && (
            <View style={styles.addedSkillsWrapper}>
              <Text style={styles.sectionHeader}>Added Skills</Text>
              <View style={styles.skillsGrid}>
                {formData.skills.map((skillName) => (
                  <TouchableOpacity
                    key={skillName}
                    style={[styles.skillPill, styles.skillPillSelected]}
                    activeOpacity={0.7}
                    onPress={() => toggleSkillSelection(skillName)}
                  >
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color="#FFFFFF"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.skillPillText, styles.skillPillTextSelected]}>
                      {skillName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Languages Section */}
          <View style={[styles.addedSkillsWrapper, { marginTop: 30 }]}>
            <Text style={styles.sectionHeader}>Languages</Text>
            <View style={styles.skillsGrid}>
              {formData.languages.map((langName) => (
                <TouchableOpacity
                  key={langName}
                  style={[styles.skillPill, styles.skillPillSelected]}
                  activeOpacity={0.7}
                  onPress={() => toggleLanguageSelection(langName)}
                >
                  <Ionicons
                    name="checkmark"
                    size={14}
                    color="#FFFFFF"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.skillPillText, styles.skillPillTextSelected]}>
                    {langName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ADD LANGUAGE button */}
            <TouchableOpacity
              style={[styles.addExpTriggerBtn, { marginTop: 10 }]}
              activeOpacity={0.8}
              onPress={() => setShowAddLanguageInput(prev => !prev)}
            >
              <Text style={styles.addExpTriggerText}>+ ADD LANGUAGE</Text>
            </TouchableOpacity>

            {/* Custom Inline Add Language input */}
            {showAddLanguageInput && (
              <View style={styles.skillInputWrapper}>
                <TextInput
                  style={styles.skillTextInput}
                  value={newLanguageText}
                  onChangeText={setNewLanguageText}
                  placeholder="e.g. Spanish (Intermediate)"
                  placeholderTextColor="#A3A3A3"
                  autoFocus={true}
                  onSubmitEditing={handleAddCustomLanguage}
                />
                <TouchableOpacity
                  style={styles.skillAddBtn}
                  activeOpacity={0.8}
                  onPress={handleAddCustomLanguage}
                >
                  <Text style={styles.skillAddBtnText}>Add</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.skillTrashBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    setNewLanguageText('');
                    setShowAddLanguageInput(false);
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>

        {/* BOTTOM CONTINUE BUTTON */}
        <View style={[styles.bottomButtonContainer, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity
            style={[styles.continueBtn, !isFormValid() ? styles.continueBtnDisabled : undefined]}
            activeOpacity={0.8}
            disabled={!isFormValid()}
            onPress={handleContinue}
          >
            <Text style={styles.continueBtnText}>CONTINUE</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // STEP 4: EDUCATION SCREEN
  if (step === 4) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* HEADER */}
        <View style={[styles.header, { marginTop: insets.top }]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="chevron-back" size={28} color="#000000" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Resume Builder</Text>
            <View style={styles.progressRow}>
              <Text style={styles.stepIndicatorText}>4 of 5</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: '80%' }]} />
              </View>
            </View>
          </View>
        </View>

        {/* EDUCATION LIST */}
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.pageTitle}>Most relevant education</Text>

          {formData.educations.length > 0 && (
            <View style={styles.listContainer}>
              <Text style={styles.sectionHeader}>Education</Text>
              {formData.educations.map((item) => (
                <View key={item.id} style={styles.expCard}>
                  <View style={styles.expCardHeader}>
                    <Text style={styles.expCardTitle} numberOfLines={1}>
                      {item.degree} in {item.fieldOfStudy} - <Text style={styles.expCardCompany}>{item.schoolName}</Text>
                    </Text>
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        style={styles.cardActionBtn}
                        onPress={() => openEditEduModal(item)}
                      >
                        <Ionicons name="pencil" size={18} color="#4B5563" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cardActionBtn}
                        onPress={() => triggerEduDeleteConfirm(item.id)}
                      >
                        <Ionicons name="trash" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <Text style={styles.expCardSub}>
                    {item.startDate} - {item.endDate} , {item.city}{item.gpa ? `  •  GPA: ${item.gpa}` : ''}
                  </Text>
                  
                  {item.description ? (
                    <View style={styles.bulletsContainer}>
                      {renderDescriptionBullets(item.description)}
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}

          {/* Add Education outline button */}
          <TouchableOpacity
            style={styles.addExpTriggerBtn}
            activeOpacity={0.8}
            onPress={openAddEduModal}
          >
            <Text style={styles.addExpTriggerText}>+ ADD EDUCATION</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* BOTTOM CONTINUE BUTTON */}
        <View style={[styles.bottomButtonContainer, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity
            style={[styles.continueBtn, !isFormValid() ? styles.continueBtnDisabled : undefined]}
            activeOpacity={0.8}
            disabled={!isFormValid()}
            onPress={handleContinue}
          >
            <Text style={styles.continueBtnText}>CONTINUE</Text>
          </TouchableOpacity>
        </View>

        {/* EDUCATION DETAILS BOTTOM SHEET MODAL */}
        <Modal
          visible={isEduModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsEduModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKBView}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.bottomSheetContainer}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setIsEduModalVisible(false)}
                  >
                    <Ionicons name="close" size={24} color="#000000" />
                  </TouchableOpacity>
                  <Text style={styles.modalHeaderTitle}>
                    {editingEduId ? 'Edit Education' : 'Add Education'}
                  </Text>
                  <View style={{ width: 44 }} />
                </View>

                {/* Modal Form */}
                <ScrollView
                  contentContainerStyle={styles.modalScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* School Name */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>School / University</Text>
                    <TextInput
                      style={styles.input}
                      value={eduSchool}
                      onChangeText={setEduSchool}
                      placeholder="e.g. Stanford University"
                      placeholderTextColor="#A3A3A3"
                    />
                  </View>

                  {/* Degree */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Degree</Text>
                    <TextInput
                      style={styles.input}
                      value={eduDegree}
                      onChangeText={setEduDegree}
                      placeholder="e.g. Bachelor of Science"
                      placeholderTextColor="#A3A3A3"
                    />
                  </View>

                  {/* Field of study */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Field of Study</Text>
                    <TextInput
                      style={styles.input}
                      value={eduFieldOfStudy}
                      onChangeText={setEduFieldOfStudy}
                      placeholder="e.g. Computer Science"
                      placeholderTextColor="#A3A3A3"
                    />
                  </View>

                  {/* City */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>City</Text>
                    <TextInput
                      style={styles.input}
                      value={eduCity}
                      onChangeText={setEduCity}
                      placeholder="e.g. Stanford"
                      placeholderTextColor="#A3A3A3"
                    />
                  </View>

                  {/* Start/End Date side-by-side (With Date Pickers) */}
                  <View style={styles.dateInputsRow}>
                    <View style={[styles.fieldContainer, { flex: 1, marginRight: 12 }]}>
                      <Text style={styles.fieldLabel}>Start Date</Text>
                      <TouchableOpacity
                        style={styles.input}
                        activeOpacity={0.7}
                        onPress={() => openDatePicker('eduStartDate')}
                      >
                        <Text style={{ color: eduStartDate ? '#000000' : '#A3A3A3', fontSize: 16 }}>
                          {eduStartDate || 'MM/YY'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={[styles.fieldContainer, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>End Date</Text>
                      <TouchableOpacity
                        style={styles.input}
                        activeOpacity={0.7}
                        onPress={() => {
                          if (eduIsCurrent) {
                            setEduIsCurrent(false);
                            setEduEndDate('');
                          }
                          openDatePicker('eduEndDate');
                        }}
                      >
                        <Text style={{ color: eduEndDate ? '#000000' : '#A3A3A3', fontSize: 16 }}>
                          {eduEndDate || 'MM/YY'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Currently Studying checkbox */}
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    activeOpacity={0.8}
                    onPress={() => {
                      const newIsCurrent = !eduIsCurrent;
                      setEduIsCurrent(newIsCurrent);
                      if (newIsCurrent) {
                        setEduEndDate('Present');
                      } else {
                        setEduEndDate('');
                      }
                    }}
                  >
                    <Ionicons
                      name={eduIsCurrent ? "checkbox" : "square-outline"}
                      size={22}
                      color="#000000"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.checkboxLabel}>I currently study here</Text>
                  </TouchableOpacity>

                  {/* Grade / GPA */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Grade / GPA (Optional)</Text>
                    <TextInput
                      style={styles.input}
                      value={eduGpa}
                      onChangeText={setEduGpa}
                      placeholder="e.g. 3.8/4.0 or First Class"
                      placeholderTextColor="#A3A3A3"
                    />
                  </View>

                  {/* Education Description */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Description (Optional)</Text>
                    <TextInput
                      style={[styles.input, styles.textAreaInput]}
                      value={eduDescription}
                      onChangeText={setEduDescription}
                      placeholder="e.g. Accomplishments, coursework, GPA..."
                      placeholderTextColor="#A3A3A3"
                      multiline={true}
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>

                  {/* Suggested Bullets Section */}
                  <View style={styles.aiHelpSection}>
                    <View style={styles.aiHelpHeader}>
                      <Ionicons name="list-outline" size={16} color="#000000" style={{ marginRight: 6 }} />
                      <Text style={styles.aiHelpTitle}>Suggested Bullets</Text>
                    </View>
                    
                    <View style={styles.aiSuggestionComingSoon}>
                      <Ionicons name="sparkles" size={16} color="#000000" style={{ marginRight: 8, marginTop: 1 }} />
                      <Text style={styles.aiComingSoonText}>
                        ✨ AI Suggested Bullets are coming soon! Custom academic suggestions will be recommended dynamically in the next update.
                      </Text>
                    </View>
                  </View>

                  {/* Modal Submit Button */}
                  <TouchableOpacity
                    style={[styles.modalSubmitBtn, !isEduInputValid() ? styles.modalSubmitBtnDisabled : undefined]}
                    activeOpacity={0.8}
                    disabled={!isEduInputValid()}
                    onPress={handleSaveEducation}
                  >
                    <Text style={styles.modalSubmitBtnText}>
                      {editingEduId ? 'SAVE' : 'ADD'}
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
          {renderDatePicker()}
        </Modal>

        {/* EDUCATION DELETE CONFIRMATION MODAL */}
        <Modal
          visible={isEduDeleteConfirmVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setIsEduDeleteConfirmVisible(false)}
        >
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmBox}>
              <View style={styles.confirmIconContainer}>
                <Ionicons name="trash-outline" size={28} color="#EF4444" />
              </View>
              <Text style={styles.confirmTitle}>Delete Education?</Text>
              <Text style={styles.confirmMessage}>
                Are you sure you want to delete this education record? This action cannot be undone.
              </Text>
              <View style={styles.confirmButtonsRow}>
                <TouchableOpacity
                  style={styles.confirmCancelBtn}
                  activeOpacity={0.7}
                  onPress={() => setIsEduDeleteConfirmVisible(false)}
                >
                  <Text style={styles.confirmCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmDeleteBtn}
                  activeOpacity={0.7}
                  onPress={handleDeleteEducation}
                >
                  <Text style={styles.confirmDeleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    );
  }

  // STEP 5: PROFESSIONAL SUMMARY SCREEN
  if (step === 5) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* HEADER */}
        <View style={[styles.header, { marginTop: insets.top }]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="chevron-back" size={28} color="#000000" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Resume Builder</Text>
            <View style={styles.progressRow}>
              <Text style={styles.stepIndicatorText}>5 of 5</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: '100%' }]} />
              </View>
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.pageTitle}>Your Professional summery</Text>

          {/* Description field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textAreaInput, { height: 180 }]}
              value={formData.summary}
              onChangeText={handleSummaryChange}
              placeholder="e.g. Results-driven Software Engineer with 5+ years of experience specializing in building scalable web and mobile applications..."
              placeholderTextColor="#A3A3A3"
              multiline={true}
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          {/* Suggested Summaries Section */}
          <View style={styles.aiHelpSection}>
            <View style={styles.aiHelpHeader}>
              <Ionicons name="bulb-outline" size={16} color="#000000" style={{ marginRight: 6 }} />
              <Text style={styles.aiHelpTitle}>Suggested Summaries</Text>
            </View>
            
            <View style={styles.aiSuggestionComingSoon}>
              <Ionicons name="sparkles" size={16} color="#000000" style={{ marginRight: 8, marginTop: 1 }} />
              <Text style={styles.aiComingSoonText}>
                ✨ AI Suggested Summaries are coming soon! We will automatically generate personalized summaries based on your experience and skills in the next update.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* BOTTOM FINALIZE BUTTON */}
        <View style={[styles.bottomButtonContainer, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity
            style={[styles.continueBtn, !isFormValid() ? styles.continueBtnDisabled : undefined]}
            activeOpacity={0.8}
            disabled={!isFormValid()}
            onPress={handleContinue}
          >
            <Text style={styles.continueBtnText}>FINALIZE</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // STEP 2: WORK EXPERIENCES SCREEN
  if (step === 2) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* HEADER */}
        <View style={[styles.header, { marginTop: insets.top }]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="chevron-back" size={28} color="#000000" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Resume Builder</Text>
            <View style={styles.progressRow}>
              <Text style={styles.stepIndicatorText}>2 of 5</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: '40%' }]} />
              </View>
            </View>
          </View>
        </View>

        {/* WORK EXPERIENCES LIST */}
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.pageTitle}>Most relevant work experience</Text>

          {formData.workExperiences.length > 0 && (
            <View style={styles.listContainer}>
              <Text style={styles.sectionHeader}>Work Experience</Text>
              {formData.workExperiences.map((item) => (
                <View key={item.id} style={styles.expCard}>
                  <View style={styles.expCardHeader}>
                    <Text style={styles.expCardTitle} numberOfLines={1}>
                      {item.jobTitle} - <Text style={styles.expCardCompany}>{item.companyName}</Text>
                    </Text>
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        style={styles.cardActionBtn}
                        onPress={() => openEditExpModal(item)}
                      >
                        <Ionicons name="pencil" size={18} color="#4B5563" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cardActionBtn}
                        onPress={() => triggerDeleteConfirm(item.id)}
                      >
                        <Ionicons name="trash" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <Text style={styles.expCardSub}>
                    {item.startDate} - {item.endDate} , {item.city}
                  </Text>
                  
                  <View style={styles.bulletsContainer}>
                    {renderDescriptionBullets(item.description)}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Add Work Experience outline button */}
          <TouchableOpacity
            style={styles.addExpTriggerBtn}
            activeOpacity={0.8}
            onPress={openAddExpModal}
          >
            <Text style={styles.addExpTriggerText}>+ ADD WORK EXPERIENCE</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* BOTTOM CONTINUE BUTTON */}
        <View style={[styles.bottomButtonContainer, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity
            style={[styles.continueBtn, !isFormValid() ? styles.continueBtnDisabled : undefined]}
            activeOpacity={0.8}
            disabled={!isFormValid()}
            onPress={handleContinue}
          >
            <Text style={styles.continueBtnText}>CONTINUE</Text>
          </TouchableOpacity>
        </View>

        {/* EXPERIENCE DETAILS MODAL (BOTTOM SHEET STYLE) */}
        <Modal
          visible={isExpModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsExpModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKBView}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.bottomSheetContainer}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setIsExpModalVisible(false)}
                  >
                    <Ionicons name="close" size={24} color="#000000" />
                  </TouchableOpacity>
                  <Text style={styles.modalHeaderTitle}>
                    {editingExpId ? 'Edit Experience' : 'Add Experience'}
                  </Text>
                  <View style={{ width: 44 }} />
                </View>

                {/* Modal Form */}
                <ScrollView
                  contentContainerStyle={styles.modalScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Job Title */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Job title</Text>
                    <TextInput
                      style={styles.input}
                      value={expJobTitle}
                      onChangeText={setExpJobTitle}
                      placeholder="e.g. Product designer"
                      placeholderTextColor="#A3A3A3"
                    />
                  </View>

                  {/* Company Name */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Company Name</Text>
                    <TextInput
                      style={styles.input}
                      value={expCompany}
                      onChangeText={setExpCompany}
                      placeholder="e.g. Pixflow"
                      placeholderTextColor="#A3A3A3"
                    />
                  </View>

                  {/* City */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>City</Text>
                    <TextInput
                      style={styles.input}
                      value={expCity}
                      onChangeText={setExpCity}
                      placeholder="e.g. London"
                      placeholderTextColor="#A3A3A3"
                    />
                  </View>

                  {/* Start/End Date side-by-side */}
                  <View style={styles.dateInputsRow}>
                    <View style={[styles.fieldContainer, { flex: 1, marginRight: 12 }]}>
                      <Text style={styles.fieldLabel}>Start Date</Text>
                      <TouchableOpacity
                        style={styles.input}
                        activeOpacity={0.7}
                        onPress={() => openDatePicker('startDate')}
                      >
                        <Text style={{ color: expStartDate ? '#000000' : '#A3A3A3', fontSize: 16 }}>
                          {expStartDate || 'MM/YY'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={[styles.fieldContainer, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>End Date</Text>
                      <TouchableOpacity
                        style={styles.input}
                        activeOpacity={0.7}
                        onPress={() => openDatePicker('endDate')}
                      >
                        <Text style={{ color: expEndDate ? '#000000' : '#A3A3A3', fontSize: 16 }}>
                          {expEndDate || 'MM/YY'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Job Description */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Job Description</Text>
                    <TextInput
                      style={[styles.input, styles.textAreaInput]}
                      value={expDescription}
                      onChangeText={setExpDescription}
                      placeholder="e.g. Led design of core products..."
                      placeholderTextColor="#A3A3A3"
                      multiline={true}
                      numberOfLines={5}
                      textAlignVertical="top"
                    />
                  </View>

                  {/* Suggested Bullets Section */}
                  <View style={styles.aiHelpSection}>
                    <View style={styles.aiHelpHeader}>
                      <Ionicons name="list-outline" size={16} color="#000000" style={{ marginRight: 6 }} />
                      <Text style={styles.aiHelpTitle}>Suggested Bullets</Text>
                    </View>
                    
                    <View style={styles.aiSuggestionComingSoon}>
                      <Ionicons name="sparkles" size={16} color="#000000" style={{ marginRight: 8, marginTop: 1 }} />
                      <Text style={styles.aiComingSoonText}>
                        ✨ AI Suggested Bullets are coming soon! We will dynamically suggest professional bullet points tailored to your job role in the next update.
                      </Text>
                    </View>
                  </View>

                  {/* Modal Submit Button */}
                  <TouchableOpacity
                    style={[styles.modalSubmitBtn, !isExpInputValid() ? styles.modalSubmitBtnDisabled : undefined]}
                    activeOpacity={0.8}
                    disabled={!isExpInputValid()}
                    onPress={handleSaveExperience}
                  >
                    <Text style={styles.modalSubmitBtnText}>
                      {editingExpId ? 'SAVE' : 'ADD'}
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
          {renderDatePicker()}
        </Modal>

        {/* DELETE CONFIRMATION MODAL */}
        <Modal
          visible={isDeleteConfirmVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setIsDeleteConfirmVisible(false)}
        >
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmBox}>
              <View style={styles.confirmIconContainer}>
                <Ionicons name="trash-outline" size={28} color="#EF4444" />
              </View>
              <Text style={styles.confirmTitle}>Delete Experience?</Text>
              <Text style={styles.confirmMessage}>
                Are you sure you want to delete this work experience? This action cannot be undone.
              </Text>
              <View style={styles.confirmButtonsRow}>
                <TouchableOpacity
                  style={styles.confirmCancelBtn}
                  activeOpacity={0.7}
                  onPress={() => setIsDeleteConfirmVisible(false)}
                >
                  <Text style={styles.confirmCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmDeleteBtn}
                  activeOpacity={0.7}
                  onPress={handleDeleteExperience}
                >
                  <Text style={styles.confirmDeleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    );
  }

  // STEP 1: CONTACT DETAILS SCREEN
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* HEADER */}
      <View style={[styles.header, { marginTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="chevron-back" size={28} color="#000000" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Resume Builder</Text>
          <View style={styles.progressRow}>
            <Text style={styles.stepIndicatorText}>1 of 5</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '20%' }]} />
            </View>
          </View>
        </View>
      </View>

      {/* FORM FIELDS */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Let’s Start with your contact detail</Text>

        {/* First Name */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>First name</Text>
          <TextInput
            style={styles.input}
            value={formData.firstName}
            onChangeText={text => handleInputChange('firstName', text)}
            placeholder="e.g. John"
            placeholderTextColor="#A3A3A3"
          />
        </View>

        {/* Last Name */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Last name</Text>
          <TextInput
            style={styles.input}
            value={formData.lastName}
            onChangeText={text => handleInputChange('lastName', text)}
            placeholder="e.g. Morgan"
            placeholderTextColor="#A3A3A3"
          />
        </View>

        {/* Job Title */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Job Title</Text>
          <TextInput
            style={styles.input}
            value={formData.jobTitle}
            onChangeText={text => handleInputChange('jobTitle', text)}
            placeholder="e.g. Designer"
            placeholderTextColor="#A3A3A3"
          />
        </View>

        {/* Email Address */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Email Address</Text>
          <TextInput
            style={[styles.input, emailError.length > 0 ? styles.inputError : undefined]}
            value={formData.email}
            onChangeText={text => handleInputChange('email', text)}
            placeholder="e.g. john.morgan@gmail.com"
            placeholderTextColor="#A3A3A3"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          {emailError.length > 0 && (
            <Text style={styles.errorText}>{emailError}</Text>
          )}
        </View>

        {/* Phone Number */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={text => handleInputChange('phone', text)}
            placeholder="e.g. +441235874262"
            placeholderTextColor="#A3A3A3"
            keyboardType="phone-pad"
          />
        </View>

        {/* City */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>City</Text>
          <TextInput
            style={styles.input}
            value={formData.city}
            onChangeText={text => handleInputChange('city', text)}
            placeholder="e.g. London"
            placeholderTextColor="#A3A3A3"
          />
        </View>

        {/* Website Link */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Website Link (Optional)</Text>
          <TextInput
            style={styles.input}
            value={formData.website}
            onChangeText={text => handleInputChange('website', text)}
            placeholder="e.g. johndoe.com"
            placeholderTextColor="#A3A3A3"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Optional Expandable Fields */}
        {showOptional ? (
          <View style={styles.optionalWrapper}>
            {/* Date of Birth */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Date of birth</Text>
              <TouchableOpacity
                style={styles.input}
                activeOpacity={0.7}
                onPress={() => openDatePicker('dob')}
              >
                <Text style={{ color: formData.dob ? '#000000' : '#A3A3A3', fontSize: 16 }}>
                  {formData.dob || 'e.g. 15/08/1995'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Nationality */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Nationality</Text>
              <TextInput
                style={styles.input}
                value={formData.nationality}
                onChangeText={text => handleInputChange('nationality', text)}
                placeholder="e.g. Canadian"
                placeholderTextColor="#A3A3A3"
              />
            </View>

            {/* Profile Image Picker */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Profile Image</Text>
              <View style={styles.imagePickerRow}>
                {formData.profileImage ? (
                  <Image source={{ uri: formData.profileImage }} style={styles.profilePreviewImage} />
                ) : (
                  <View style={styles.profilePreviewPlaceholder}>
                    <Ionicons name="person" size={24} color="#A3A3A3" />
                  </View>
                )}
                <TouchableOpacity style={styles.imagePickerBtn} onPress={pickProfileImage}>
                  <Text style={styles.imagePickerBtnText}>
                    {formData.profileImage ? 'Change Image' : 'Pick Image'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.privacyCaptionText}>
                🔒 Privacy Note: Your profile photo is processed and stored 100% locally on your device to be embedded onto your resume templates. It is never uploaded to remote servers or shared with third parties.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.optionalTriggerContainer}>
            <TouchableOpacity
              style={styles.optionalTriggerBtn}
              activeOpacity={0.8}
              onPress={() => setShowOptional(true)}
            >
              <Text style={styles.optionalTriggerText}>+ ADD OPTIONAL DETAIL</Text>
            </TouchableOpacity>
            <Text style={styles.optionalCaptionText}>Date of birth, Nationality, Profile image</Text>
          </View>
        )}
      </ScrollView>

      {/* BOTTOM CONTINUE BUTTON */}
      <View style={[styles.bottomButtonContainer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[styles.continueBtn, !isFormValid() ? styles.continueBtnDisabled : undefined]}
          activeOpacity={0.8}
          disabled={!isFormValid()}
          onPress={handleContinue}
        >
          <Text style={styles.continueBtnText}>CONTINUE</Text>
        </TouchableOpacity>
      </View>
      {renderDatePicker()}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  templateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  templateCardSelected: {
    borderColor: '#000000',
  },
  templateCardUnselected: {
    borderColor: '#EAEAEA',
  },
  templateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  templateIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateIconSelected: {
    backgroundColor: '#000000',
  },
  templateCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  templateCardDesc: {
    fontSize: 13,
    color: '#737373',
    marginTop: 4,
  },
  templateTagsRow: {
    flexDirection: 'row',
    marginTop: 14,
    marginLeft: 64,
  },
  templateTag: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
  },
  templateTagSelected: {
    backgroundColor: '#EAEAEA',
  },
  templateTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#737373',
  },
  templateTagTextSelected: {
    color: '#000000',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  stepIndicatorText: {
    fontSize: 11,
    color: '#737373',
    marginRight: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    maxWidth: 120,
  },
  progressBarFill: {
    height: 4,
    backgroundColor: '#000000',
    borderRadius: 2,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 28,
    lineHeight: 32,
  },
  fieldContainer: {
    width: '100%',
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    paddingLeft: 4,
  },
  input: {
    backgroundColor: '#EAEAEA',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    color: '#000000',
    fontSize: 16,
    width: '100%',
  },
  inputError: {
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
    paddingLeft: 12,
  },
  optionalTriggerContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  optionalTriggerBtn: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  optionalTriggerText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700',
  },
  optionalCaptionText: {
    fontSize: 12,
    color: '#737373',
    marginTop: 8,
    textAlign: 'center',
  },
  privacyCaptionText: {
    fontSize: 12,
    color: '#737373',
    marginTop: 8,
    lineHeight: 16,
  },
  optionalWrapper: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EAEAEA',
    paddingTop: 20,
  },
  imagePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  profilePreviewPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profilePreviewImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  imagePickerBtn: {
    backgroundColor: '#EAEAEA',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  imagePickerBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F9F9F9',
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EAEAEA',
  },
  continueBtn: {
    backgroundColor: '#000000',
    borderRadius: 30,
    paddingVertical: 18,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  placeholderContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  placeholderSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  backStepButton: {
    backgroundColor: '#000000',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backStepButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // Step 2/4 List Card Styles
  listContainer: {
    width: '100%',
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
  },
  expCard: {
    backgroundColor: '#EAEAEA',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  expCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
    marginRight: 10,
  },
  expCardCompany: {
    fontWeight: '500',
    color: '#4B5563',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  expCardSub: {
    fontSize: 13,
    color: '#737373',
    marginTop: 4,
    fontWeight: '500',
  },
  bulletsContainer: {
    marginTop: 12,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bulletDot: {
    fontSize: 14,
    color: '#000000',
    marginRight: 8,
    lineHeight: 18,
  },
  bulletText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 18,
    flex: 1,
  },
  addExpTriggerBtn: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 10,
    marginBottom: 20,
  },
  addExpTriggerText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700',
  },

  // Modal Bottom Sheet Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalKBView: {
    flex: 1,
  },
  bottomSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  modalCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  modalScrollContent: {
    paddingVertical: 20,
    paddingBottom: 40,
  },
  dateInputsRow: {
    flexDirection: 'row',
    width: '100%',
  },
  textAreaInput: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  aiHelpSection: {
    marginTop: 10,
    marginBottom: 24,
  },
  aiHelpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiHelpTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
  aiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  aiPillText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  modalSubmitBtn: {
    backgroundColor: '#000000',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 10,
  },
  modalSubmitBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Custom Center Confirm Dialog
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  confirmBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmButtonsRow: {
    flexDirection: 'row',
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  confirmCancelBtnText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
  confirmDeleteBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmDeleteBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  aiSuggestionComingSoon: {
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  aiComingSoonText: {
    color: '#6B7280',
    fontSize: 13.5,
    fontWeight: '500',
    lineHeight: 18,
    flex: 1,
  },

  // Step 3: Skills Section Styles
  skillsSubtitle: {
    fontSize: 14,
    color: '#737373',
    marginTop: -20,
    marginBottom: 24,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    marginBottom: 12,
  },
  skillPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  skillPillSelected: {
    backgroundColor: '#000',
  },
  skillPillUnselected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  skillPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  skillPillTextSelected: {
    color: '#FFFFFF',
  },
  skillPillTextUnselected: {
    color: '#000000',
  },
  skillInputWrapper: {
    backgroundColor: '#EAEAEA',
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  skillTextInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    paddingVertical: 8,
  },
  skillAddBtn: {
    backgroundColor: '#000000',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginRight: 8,
  },
  skillAddBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  skillTrashBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addedSkillsWrapper: {
    marginTop: 20,
    width: '100%',
  },

  // Date Picker Custom Styles
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  pickerModalDismissArea: {
    flex: 1,
  },
  pickerModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pickerHeaderCancelBtn: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '500',
  },
  pickerHeaderTitle: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerHeaderDoneBtn: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerContainer: {
    width: '100%',
    height: 220,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingLeft: 4,
  },
  checkboxLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIconWrapper: {
    marginBottom: 24,
  },
  loadingImage: {
    width: 100,
    height: 150,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 2,
  },
  previewContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  previewHeader: {
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    paddingBottom: 12,
    marginBottom: 16,
  },
  previewName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000000',
    textTransform: 'uppercase',
  },
  previewRole: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 2,
  },
  previewColumnsRow: {
    flexDirection: 'row',
  },
  previewLeftCol: {
    width: '35%',
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  previewRightCol: {
    width: '65%',
    paddingLeft: 16,
  },
  previewSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 8,
    letterSpacing: 1,
  },
  previewDetailLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#737373',
    marginTop: 6,
    textTransform: 'uppercase',
  },
  previewDetailValue: {
    fontSize: 11,
    color: '#000000',
    fontWeight: '500',
  },
  previewSkillText: {
    fontSize: 11,
    color: '#000000',
    marginBottom: 4,
    fontWeight: '500',
  },
  previewProfileText: {
    fontSize: 11,
    color: '#374151',
    lineHeight: 15,
  },
  previewItemBlock: {
    marginBottom: 12,
  },
  previewItemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  previewItemCompany: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  previewItemSub: {
    fontSize: 10,
    color: '#737373',
    marginVertical: 2,
    fontWeight: '500',
  },
  previewButtonsWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F9F9F9',
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EAEAEA',
  },
  editResumeBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingVertical: 18,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#000000',
    marginBottom: 12,
  },
  editResumeBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  downloadResumeBtn: {
    backgroundColor: '#000000',
    borderRadius: 30,
    paddingVertical: 18,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadResumeBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
