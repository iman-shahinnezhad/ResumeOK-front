import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
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

  // Step 2: Work Experience
  workExperiences: WorkExperience[];

  // Step 3: Skills
  skills: string[];

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
    workExperiences: [],
    skills: [],
    educations: [],
    summary: '',
  });

  // UI state for Loading and PDF Preview
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);

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

  // UI state for Step 3 (Skills)
  const [showAddSkillInput, setShowAddSkillInput] = useState<boolean>(false);
  const [newSkillText, setNewSkillText] = useState<string>('');

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

  // UI state for Step 5 (Summary)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);

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
      
      const experiencesText = formData.workExperiences
        .map(exp => `ID: ${exp.id}\nTitle: ${exp.jobTitle}\nCompany: ${exp.companyName}\nDescription: ${exp.description}`)
        .join('\n\n');

      const educationsText = formData.educations
        .map(edu => `ID: ${edu.id}\nDegree: ${edu.degree}\nSchool: ${edu.schoolName}\nDescription: ${edu.description}`)
        .join('\n\n');

      const promptText = `You are an expert resume writer. Polish and refine the descriptions of work experiences and education records for the following candidate to make them sound highly professional, action-oriented, and grammatically perfect.

Candidate Name: ${formData.firstName} ${formData.lastName}
Target Role: ${formData.jobTitle}

RAW WORK EXPERIENCES:
${experiencesText}

RAW EDUCATION:
${educationsText}

Respond ONLY with a valid JSON object matching this exact structure:
{
  "workExperiences": [
    { "id": "experience_id", "description": "polished bulleted descriptions here, using • for each bullet point" }
  ],
  "educations": [
    { "id": "education_id", "description": "polished bulleted descriptions or paragraph here, using • if bulleted" }
  ]
}

Ensure the output is valid JSON. Do not include markdown code blocks, do not include introductory text, and do not wrap the JSON in \`\`\`json.`;

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': 'AQ.Ab8RN6LjiOKxvxO8J1J0MWsp3Wrbo5emB0MOb6JFXsWKYIlqhw'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: promptText }]
              }
            ]
          })
        }
      );

      if (response.ok) {
        const responseJson = await response.json();
        const rawText = responseJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        try {
          const parsed = JSON.parse(cleanedText);
          
          setFormData(prev => {
            const updatedWork = prev.workExperiences.map(work => {
              const match = parsed.workExperiences?.find((w: any) => w.id === work.id);
              return match ? { ...work, description: match.description } : work;
            });
            const updatedEdu = prev.educations.map(edu => {
              const match = parsed.educations?.find((e: any) => e.id === edu.id);
              return match ? { ...edu, description: match.description } : edu;
            });
            return {
              ...prev,
              workExperiences: updatedWork,
              educations: updatedEdu
            };
          });
        } catch (e) {
          console.log('Failed to parse Gemini polish response:', e);
        }
      }
    } catch (error) {
      console.log('Error during finalization:', error);
    } finally {
      setTimeout(() => {
        setIsFinalizing(false);
        setShowPreview(true);
      }, 1500);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const htmlContent = `
<html>
<head>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #000000;
      margin: 40px;
      line-height: 1.5;
    }
    .header {
      border-bottom: 2px solid #000000;
      padding-bottom: 15px;
      margin-bottom: 25px;
    }
    .name {
      font-size: 28px;
      font-weight: bold;
      text-transform: uppercase;
      margin: 0;
      letter-spacing: 1px;
    }
    .title {
      font-size: 16px;
      color: #4b5563;
      margin: 5px 0 0 0;
      font-weight: 500;
    }
    .container {
      display: flex;
    }
    .left-col {
      width: 33%;
      padding-right: 20px;
      border-right: 1px solid #e5e7eb;
    }
    .right-col {
      width: 67%;
      padding-left: 25px;
    }
    .section-title {
      font-size: 13px;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 25px;
      margin-bottom: 12px;
      border-bottom: 1px solid #000000;
      padding-bottom: 4px;
      letter-spacing: 1px;
    }
    .section-title:first-child {
      margin-top: 0;
    }
    .detail-label {
      font-size: 11px;
      font-weight: bold;
      color: #4b5563;
      margin-top: 8px;
      text-transform: uppercase;
    }
    .detail-val {
      font-size: 13px;
      margin-bottom: 4px;
    }
    .profile-text {
      font-size: 13px;
      margin-bottom: 20px;
      color: #374151;
    }
    .item-block {
      margin-bottom: 18px;
    }
    .item-title {
      font-size: 14px;
      font-weight: bold;
      margin: 0;
    }
    .item-company {
      font-size: 13px;
      font-weight: 600;
      color: #4b5563;
      margin: 2px 0;
    }
    .item-sub {
      font-size: 12px;
      color: #6b7280;
      margin: 2px 0 6px 0;
    }
    .item-desc {
      font-size: 12px;
      margin: 0;
      padding-left: 18px;
      color: #374151;
    }
    .item-desc li {
      margin-bottom: 4px;
    }
    .skill-val {
      font-size: 13px;
      margin-bottom: 6px;
      color: #374151;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="name">${formData.firstName} ${formData.lastName}</h1>
    <p class="title">${formData.jobTitle}</p>
  </div>
  <div class="container">
    <div class="left-col">
      <div class="section-title">Details</div>
      
      <div class="detail-label">Phone</div>
      <div class="detail-val">${formData.phone}</div>
      
      <div class="detail-label">Email</div>
      <div class="detail-val" style="word-break: break-all;">${formData.email}</div>
      
      <div class="detail-label">City</div>
      <div class="detail-val">${formData.city}</div>
      
      ${formData.dob ? `
        <div class="detail-label">DOB</div>
        <div class="detail-val">${formData.dob}</div>
      ` : ''}
      
      ${formData.nationality ? `
        <div class="detail-label">Nationality</div>
        <div class="detail-val">${formData.nationality}</div>
      ` : ''}
      
      ${formData.skills.length > 0 ? `
        <div class="section-title">Skills</div>
        ${formData.skills.map(s => `<div class="skill-val">• ${s}</div>`).join('')}
      ` : ''}
    </div>
    
    <div class="right-col">
      <div class="section-title">Profile</div>
      <div class="profile-text">${formData.summary}</div>
      
      ${formData.workExperiences.length > 0 ? `
        <div class="section-title">Work Experience</div>
        ${formData.workExperiences.map(exp => `
          <div class="item-block">
            <h3 class="item-title">${exp.jobTitle}</h3>
            <div class="item-company">${exp.companyName}</div>
            <p class="item-sub">${exp.startDate} - ${exp.endDate}  |  ${exp.city}</p>
            <ul class="item-desc">
              ${exp.description.split('\n').filter(l => l.trim().length > 0).map(l => `<li>${l.replace(/^[•\s*-]+/, '').trim()}</li>`).join('')}
            </ul>
          </div>
        `).join('')}
      ` : ''}
      
      ${formData.educations.length > 0 ? `
        <div class="section-title">Education</div>
        ${formData.educations.map(edu => `
          <div class="item-block">
            <h3 class="item-title">${edu.degree} in ${edu.fieldOfStudy}</h3>
            <div class="item-company">${edu.schoolName}</div>
            <p class="item-sub">${edu.startDate} - ${edu.endDate}  |  ${edu.city}${edu.gpa ? `  •  GPA: ${edu.gpa}` : ''}</p>
            ${edu.description ? `
              <ul class="item-desc">
                ${edu.description.split('\n').filter(l => l.trim().length > 0).map(l => `<li>${l.replace(/^[•\s*-]+/, '').trim()}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('')}
      ` : ''}
    </div>
  </div>
</body>
</html>
`;

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

        const first = formData.firstName ? formData.firstName.trim() : "Resume";
        const last = formData.lastName ? formData.lastName.trim() : "";
        const resumeName = `${first}${last ? "_" + last : ""}_built.pdf`.replace(/\s+/g, '_');
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
          mimeType: 'application/pdf'
        };

        const newList = [newResume, ...currentList];
        await FileSystem.writeAsStringAsync(resumesJsonPath, JSON.stringify(newList));
      } catch (saveErr) {
        console.log("Failed to save built resume to resumes list:", saveErr);
      }

      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
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

  // Generate professional summary using Gemini API (Step 5)
  const generateAiSummary = async () => {
    try {
      setIsGeneratingSummary(true);

      const experiencesText = formData.workExperiences
        .map(exp => `- ${exp.jobTitle} at ${exp.companyName} (${exp.startDate} - ${exp.endDate}): ${exp.description}`)
        .join('\n');

      const educationsText = formData.educations.length > 0
        ? `Education:\n` + formData.educations
            .map(edu => `- ${edu.degree} in ${edu.fieldOfStudy} from ${edu.schoolName} (${edu.startDate} - ${edu.endDate})${edu.gpa ? `, GPA: ${edu.gpa}` : ''}`)
            .join('\n')
        : '';

      const skillsText = formData.skills.join(', ');

      const promptText = `Generate a compelling, professional resume summary (around 3 sentences) for a candidate with the following details:
Name: ${formData.firstName} ${formData.lastName}
Target Role/Title: ${formData.jobTitle}
Work Experiences:
${experiencesText}
${educationsText ? educationsText + '\n' : ''}Skills:
${skillsText}

Return ONLY the summary text, written in professional third-person tone with active verbs. Do NOT include any introductory or concluding text, and do NOT use markdown formatting (no bolding, no headers).`;

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': 'AQ.Ab8RN6LjiOKxvxO8J1J0MWsp3Wrbo5emB0MOb6JFXsWKYIlqhw'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: promptText }]
              }
            ]
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const responseJson = await response.json();
      const rawText = responseJson.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (rawText) {
        setFormData(prev => ({ ...prev, summary: rawText.trim() }));
      } else {
        throw new Error('No summary returned');
      }
    } catch (error) {
      console.log('Error generating summary:', error);
      Alert.alert('AI Generation Error', 'Failed to generate summary. Please type it manually.');
    } finally {
      setIsGeneratingSummary(false);
    }
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

  if (showPreview) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* HEADER */}
        <View style={[styles.header, { marginTop: insets.top }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => {
            setShowPreview(false);
            setStep(5);
          }}>
            <Ionicons name="chevron-back" size={28} color="#000000" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Resume Preview</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 180 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.pageTitle}>Your Resume is ready 🥳</Text>

          {/* PDF PREVIEW CONTAINER */}
          <View style={styles.previewContainer}>
            {/* Top Header */}
            <View style={styles.previewHeader}>
              <Text style={styles.previewName}>
                {formData.firstName} {formData.lastName}
              </Text>
              <Text style={styles.previewRole}>
                {formData.jobTitle}
              </Text>
            </View>

            {/* Two-Column Layout */}
            <View style={styles.previewColumnsRow}>
              {/* Left Column */}
              <View style={styles.previewLeftCol}>
                <Text style={styles.previewSectionTitle}>DETAILS</Text>
                
                <Text style={styles.previewDetailLabel}>Phone</Text>
                <Text style={styles.previewDetailValue}>{formData.phone}</Text>

                <Text style={styles.previewDetailLabel}>Email</Text>
                <Text style={styles.previewDetailValue} numberOfLines={1}>{formData.email}</Text>

                <Text style={styles.previewDetailLabel}>City</Text>
                <Text style={styles.previewDetailValue}>{formData.city}</Text>

                {formData.dob ? (
                  <>
                    <Text style={styles.previewDetailLabel}>DOB</Text>
                    <Text style={styles.previewDetailValue}>{formData.dob}</Text>
                  </>
                ) : null}

                {formData.nationality ? (
                  <>
                    <Text style={styles.previewDetailLabel}>Nationality</Text>
                    <Text style={styles.previewDetailValue}>{formData.nationality}</Text>
                  </>
                ) : null}

                {formData.skills.length > 0 && (
                  <>
                    <Text style={[styles.previewSectionTitle, { marginTop: 20 }]}>SKILLS</Text>
                    {formData.skills.map((skill) => (
                      <Text key={skill} style={styles.previewSkillText}>• {skill}</Text>
                    ))}
                  </>
                )}
              </View>

              {/* Right Column */}
              <View style={styles.previewRightCol}>
                <Text style={styles.previewSectionTitle}>PROFILE</Text>
                <Text style={styles.previewProfileText}>{formData.summary}</Text>

                {formData.workExperiences.length > 0 && (
                  <>
                    <Text style={[styles.previewSectionTitle, { marginTop: 20 }]}>WORK EXPERIENCE</Text>
                    {formData.workExperiences.map((exp) => (
                      <View key={exp.id} style={styles.previewItemBlock}>
                        <Text style={styles.previewItemTitle}>{exp.jobTitle}</Text>
                        <Text style={styles.previewItemCompany}>{exp.companyName}</Text>
                        <Text style={styles.previewItemSub}>
                          {exp.startDate} - {exp.endDate}  |  {exp.city}
                        </Text>
                        {exp.description ? (
                          <View style={{ marginTop: 4 }}>
                            {renderDescriptionBullets(exp.description)}
                          </View>
                        ) : null}
                      </View>
                    ))}
                  </>
                )}

                {formData.educations.length > 0 && (
                  <>
                    <Text style={[styles.previewSectionTitle, { marginTop: 20 }]}>EDUCATION</Text>
                    {formData.educations.map((edu) => (
                      <View key={edu.id} style={styles.previewItemBlock}>
                        <Text style={styles.previewItemTitle}>{edu.degree} in {edu.fieldOfStudy}</Text>
                        <Text style={styles.previewItemCompany}>{edu.schoolName}</Text>
                        <Text style={styles.previewItemSub}>
                          {edu.startDate} - {edu.endDate}  |  {edu.city} {edu.gpa ? `  •  GPA: ${edu.gpa}` : ''}
                        </Text>
                        {edu.description ? (
                          <View style={{ marginTop: 4 }}>
                            {renderDescriptionBullets(edu.description)}
                          </View>
                        ) : null}
                      </View>
                    ))}
                  </>
                )}
              </View>
            </View>
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
            <Text style={styles.editResumeBtnText}>EDIT</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.downloadResumeBtn}
            activeOpacity={0.8}
            onPress={handleDownloadPdf}
          >
            <Text style={styles.downloadResumeBtnText}>DOWNLOAD</Text>
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

          {/* Suggestion pills grid */}
          <View style={styles.skillsGrid}>
            {presetSkills.map((skillName) => {
              const isSelected = formData.skills.includes(skillName);
              return (
                <TouchableOpacity
                  key={skillName}
                  style={[styles.skillPill, isSelected ? styles.skillPillSelected : styles.skillPillUnselected]}
                  activeOpacity={0.7}
                  onPress={() => toggleSkillSelection(skillName)}
                >
                  <Ionicons
                    name={isSelected ? "checkmark" : "add"}
                    size={14}
                    color={isSelected ? "#FFFFFF" : "#000000"}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.skillPillText, isSelected ? styles.skillPillTextSelected : styles.skillPillTextUnselected]}>
                    {skillName}
                  </Text>
                </TouchableOpacity>
              );
            })}
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

                  {/* AI Help Section */}
                  <View style={styles.aiHelpSection}>
                    <View style={styles.aiHelpHeader}>
                      <Ionicons name="sparkles" size={16} color="#A855F7" style={{ marginRight: 6 }} />
                      <Text style={styles.aiHelpTitle}>AI Help</Text>
                    </View>
                    
                    {eduHelpSuggestions.map((suggestion, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.aiPill}
                        activeOpacity={0.7}
                        onPress={() => handleAddEduAiSuggestion(suggestion)}
                      >
                        <Ionicons name="add-circle-outline" size={18} color="#000000" style={{ marginRight: 8 }} />
                        <Text style={styles.aiPillText} numberOfLines={1}>
                          {suggestion}
                        </Text>
                      </TouchableOpacity>
                    ))}
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
              placeholder="e.g. Nika"
              placeholderTextColor="#A3A3A3"
              multiline={true}
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          {/* AI Help Section */}
          <View style={styles.aiHelpSection}>
            <View style={styles.aiHelpHeader}>
              <Ionicons name="sparkles" size={16} color="#A855F7" style={{ marginRight: 6 }} />
              <Text style={styles.aiHelpTitle}>AI Help</Text>
            </View>
            
            <TouchableOpacity
              style={styles.aiPill}
              activeOpacity={0.7}
              onPress={generateAiSummary}
              disabled={isGeneratingSummary}
            >
              {isGeneratingSummary ? (
                <ActivityIndicator size="small" color="#A855F7" style={{ marginRight: 8 }} />
              ) : (
                <Ionicons name="add-circle-outline" size={18} color="#000000" style={{ marginRight: 8 }} />
              )}
              <Text style={styles.aiPillText} numberOfLines={1}>
                {isGeneratingSummary ? 'Generating Summary...' : 'Generate Summery'}
              </Text>
            </TouchableOpacity>
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

                  {/* AI Help Section */}
                  <View style={styles.aiHelpSection}>
                    <View style={styles.aiHelpHeader}>
                      <Ionicons name="sparkles" size={16} color="#A855F7" style={{ marginRight: 6 }} />
                      <Text style={styles.aiHelpTitle}>AI Help</Text>
                    </View>
                    
                    {aiHelpSuggestions.map((suggestion, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.aiPill}
                        activeOpacity={0.7}
                        onPress={() => handleAddAiSuggestion(suggestion)}
                      >
                        <Ionicons name="add-circle-outline" size={18} color="#000000" style={{ marginRight: 8 }} />
                        <Text style={styles.aiPillText} numberOfLines={1}>
                          {suggestion}
                        </Text>
                      </TouchableOpacity>
                    ))}
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
            placeholder="e.g. Nika"
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
            placeholder="e.g. NikaMorgan@gmail.com"
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
                placeholder="e.g. Iranian"
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
    backgroundColor: '#FAF5FF',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3E8FF',
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
