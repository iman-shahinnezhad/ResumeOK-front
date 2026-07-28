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
  Image,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

interface ProjectItem {
  id: string;
  projectName: string;
  role: string;
  description: string;
  technologies: string[];
  projectType: string;
  startDate: string;
  endDate: string;
  currentlyWorking: boolean;
  projectUrl: string;
  repository: string;
  achievements: string[];
  screenshots: string[];
}

const PROJECT_TYPE_OPTIONS = [
  'Company',
  'Personal',
  'Open Source',
  'Academic',
  'Freelance',
];

export default function ProjectsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form States
  const [projectName, setProjectName] = useState('');
  const [role, setRole] = useState('');
  const [description, setDescription] = useState('');
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [newTechInput, setNewTechInput] = useState('');
  const [projectType, setProjectType] = useState('Company');

  // Dates & Currently Working
  const [startDate, setStartDate] = useState('02 May 2020');
  const [endDate, setEndDate] = useState('02 May 2025');
  const [startDateObj, setStartDateObj] = useState<Date>(new Date(2020, 4, 2));
  const [endDateObj, setEndDateObj] = useState<Date>(new Date(2025, 4, 2));
  const [currentlyWorking, setCurrentlyWorking] = useState(false);

  // URLs
  const [projectUrl, setProjectUrl] = useState('');
  const [repository, setRepository] = useState('');

  // Achievements list
  const [achievements, setAchievements] = useState<string[]>([]);
  const [newAchievementInput, setNewAchievementInput] = useState('');

  // Media Screenshots list
  const [screenshots, setScreenshots] = useState<string[]>([]);

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
        if (data.projects && Array.isArray(data.projects)) {
          setProjects(data.projects);
        } else if (data.role || data.company) {
          const initialProject: ProjectItem = {
            id: '1',
            projectName: 'ResumeOK AI Platform',
            role: data.role || 'Lead Mobile Engineer',
            description: 'AI-powered resume builder and job optimization mobile application.',
            technologies: ['React Native', 'Expo', 'TypeScript'],
            projectType: 'Company',
            startDate: '02 May 2023',
            endDate: 'Present',
            currentlyWorking: true,
            projectUrl: 'https://resumeok.app',
            repository: 'https://github.com/resumeok/mobile-app',
            achievements: ['Increased user onboarding conversion rate by 35%.'],
            screenshots: [],
          };
          setProjects([initialProject]);
        }
      }
    } catch (e) {
      console.log('Error loading projects profile data:', e);
    }
  };

  const saveProjects = async (updatedList: ProjectItem[]) => {
    try {
      const path = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
      const updatedProfile = { ...(profile || {}), projects: updatedList };
      setProfile(updatedProfile);
      setProjects(updatedList);
      await FileSystem.writeAsStringAsync(path, JSON.stringify(updatedProfile));
    } catch (e) {
      console.log('Error saving projects list:', e);
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setProjectName('');
    setRole('');
    setDescription('');
    setTechnologies([]);
    setNewTechInput('');
    setProjectType('Company');
    setStartDate('02 May 2020');
    setEndDate('02 May 2025');
    setCurrentlyWorking(false);
    setProjectUrl('');
    setRepository('');
    setAchievements([]);
    setNewAchievementInput('');
    setScreenshots([]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ProjectItem) => {
    setEditingId(item.id);
    setProjectName(item.projectName || '');
    setRole(item.role || '');
    setDescription(item.description || '');
    setTechnologies(item.technologies || []);
    setNewTechInput('');
    setProjectType(item.projectType || 'Company');
    setStartDate(item.startDate || '02 May 2020');
    setEndDate(item.endDate || '02 May 2025');
    setCurrentlyWorking(!!item.currentlyWorking);
    setProjectUrl(item.projectUrl || '');
    setRepository(item.repository || '');
    setAchievements(item.achievements || []);
    setNewAchievementInput('');
    setScreenshots(item.screenshots || []);
    setIsModalOpen(true);
  };

  const handleAddTechnology = () => {
    const trimmed = newTechInput.trim();
    if (trimmed && !technologies.includes(trimmed)) {
      setTechnologies([...technologies, trimmed]);
      setNewTechInput('');
    }
  };

  const handleRemoveTechnology = (tech: string) => {
    setTechnologies(technologies.filter((t) => t !== tech));
  };

  const handleAddAchievement = () => {
    const trimmed = newAchievementInput.trim();
    if (trimmed) {
      setAchievements([...achievements, trimmed]);
      setNewAchievementInput('');
    }
  };

  const handleRemoveAchievement = (index: number) => {
    setAchievements(achievements.filter((_, i) => i !== index));
  };

  const handlePickScreenshot = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Media library access is required to upload screenshots.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setScreenshots([...screenshots, uri]);
      }
    } catch (e) {
      console.log('Error picking image:', e);
    }
  };

  const handleRemoveScreenshot = (index: number) => {
    setScreenshots(screenshots.filter((_, i) => i !== index));
  };

  const handleProjectTypePress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...PROJECT_TYPE_OPTIONS, 'Cancel'],
          cancelButtonIndex: PROJECT_TYPE_OPTIONS.length,
          title: 'Select Project Type',
        },
        (buttonIndex) => {
          if (buttonIndex < PROJECT_TYPE_OPTIONS.length) {
            setProjectType(PROJECT_TYPE_OPTIONS[buttonIndex]);
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

  const handleSaveProject = () => {
    if (!projectName.trim()) return;

    const projectData: ProjectItem = {
      id: editingId || Date.now().toString(),
      projectName: projectName.trim(),
      role: role.trim(),
      description: description.trim(),
      technologies,
      projectType,
      startDate: startDate.trim(),
      endDate: currentlyWorking ? 'Present' : endDate.trim(),
      currentlyWorking,
      projectUrl: projectUrl.trim(),
      repository: repository.trim(),
      achievements,
      screenshots,
    };

    if (editingId) {
      const updatedList = projects.map((p) => (p.id === editingId ? projectData : p));
      saveProjects(updatedList);
    } else {
      saveProjects([projectData, ...projects]);
    }

    setIsModalOpen(false);
  };

  const handleMenuPress = (item: ProjectItem, index: number) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Edit Project', 'Delete Project', 'Cancel'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
          title: item.projectName,
          message: item.role || item.projectType,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            handleOpenEdit(item);
          } else if (buttonIndex === 1) {
            const updated = projects.filter((_, i) => i !== index);
            saveProjects(updated);
          }
        }
      );
    } else {
      Alert.alert(item.projectName, 'Choose action', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: () => handleOpenEdit(item) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = projects.filter((_, i) => i !== index);
            saveProjects(updated);
          },
        },
      ]);
    }
  };

  const isFormValid = projectName.trim().length > 0;
  const remainingNeeded = Math.max(0, 3 - projects.length);

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

        <Text style={styles.headerTitle}>Projects</Text>

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
        {/* + ADD PROJECT BUTTON */}
        <TouchableOpacity
          style={styles.addOutlineBtn}
          activeOpacity={0.8}
          onPress={handleOpenNew}
        >
          <Ionicons name="add" size={22} color="#000000" style={{ marginRight: 6 }} />
          <Text style={styles.addOutlineBtnText}>ADD PROJECT</Text>
        </TouchableOpacity>

        {/* LIST OF SAVED PROJECTS */}
        {projects.map((item, index) => (
          <View key={item.id || index} style={styles.projectCard}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.projectNameText}>{item.projectName}</Text>
                {item.role ? <Text style={styles.projectRoleText}>{item.role}</Text> : null}
              </View>

              <View style={styles.cardHeaderRight}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{item.projectType || 'Company'}</Text>
                </View>

                <TouchableOpacity
                  style={styles.menuDotsBtn}
                  onPress={() => handleMenuPress(item, index)}
                >
                  <Ionicons name="ellipsis-vertical" size={18} color="#8E8E93" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Technologies Chips */}
            {item.technologies && item.technologies.length > 0 && (
              <View style={styles.techChipsRow}>
                {item.technologies.map((tech, tIdx) => (
                  <View key={tIdx} style={styles.techChipRead}>
                    <Text style={styles.techChipReadText}>{tech}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Dates */}
            {(item.startDate || item.endDate) && (
              <View style={styles.expDatePill}>
                <Text style={styles.expDateText}>
                  {item.startDate || ''} {item.currentlyWorking ? '- Present' : item.endDate ? `- ${item.endDate}` : ''}
                </Text>
              </View>
            )}

            {/* Description */}
            {item.description ? (
              <Text style={styles.projectDescriptionText}>{item.description}</Text>
            ) : null}

            {/* URLs */}
            {(item.projectUrl || item.repository) && (
              <View style={styles.linksRow}>
                {item.projectUrl ? (
                  <View style={styles.linkPill}>
                    <Ionicons name="link" size={12} color="#2563EB" />
                    <Text style={styles.linkText} numberOfLines={1}>{item.projectUrl}</Text>
                  </View>
                ) : null}
                {item.repository ? (
                  <View style={styles.linkPill}>
                    <Ionicons name="code-slash" size={12} color="#000000" />
                    <Text style={styles.linkText} numberOfLines={1}>{item.repository}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* ======================================================== */}
      {/* ADD / EDIT PROJECT MODAL */}
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
              {editingId ? 'Edit Project' : 'Add Project'}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.sheetFormScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 1. Project Name * */}
            {renderFloatingInput('Project Name *', projectName, setProjectName, 'projectName')}

            {/* 2. Role */}
            {renderFloatingInput('Role', role, setRole, 'role')}

            {/* 3. Description */}
            {renderFloatingInput('Description', description, setDescription, 'description', true)}

            {/* 4. Technologies (Interactive Chips) */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionLabel}>Technologies</Text>

              <View style={styles.techChipsContainer}>
                {technologies.map((tech, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.techChipInteractive}
                    onPress={() => handleRemoveTechnology(tech)}
                  >
                    <Text style={styles.techChipText}>{tech}</Text>
                    <Ionicons name="close" size={14} color="#555555" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.addTechInputRow}>
                <TextInput
                  style={styles.addTechTextInput}
                  placeholder="Add technology e.g. React Native"
                  placeholderTextColor="#999999"
                  value={newTechInput}
                  onChangeText={setNewTechInput}
                  onSubmitEditing={handleAddTechnology}
                />
                <TouchableOpacity
                  style={styles.addTechPlusBtn}
                  onPress={handleAddTechnology}
                >
                  <Ionicons name="add" size={20} color="#000000" />
                </TouchableOpacity>
              </View>
            </View>

            {/* 5. Project Type Dropdown */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionLabel}>Project Type</Text>
              <TouchableOpacity
                style={styles.projectTypeSelectorCard}
                activeOpacity={0.8}
                onPress={handleProjectTypePress}
              >
                <Text style={styles.projectTypeSelectorText}>{projectType}</Text>
                <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {/* 6. Clean Date Row (NO nested grey capsules!) */}
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
                <View style={[styles.floatingInputBox, { flex: 1, opacity: currentlyWorking ? 0.6 : 1 }]}>
                  <Text style={styles.floatingInputLabel}>End Date</Text>
                  <Text style={styles.dateDisplayValueText}>
                    {currentlyWorking ? 'Present' : endDate || 'Month/Year'}
                  </Text>
                  {!currentlyWorking && Platform.OS === 'ios' && (
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

              {/* Checkbox: Currently Working */}
              <TouchableOpacity
                style={styles.checkboxRow}
                activeOpacity={0.8}
                onPress={() => setCurrentlyWorking(!currentlyWorking)}
              >
                <View style={[styles.checkboxBox, currentlyWorking && styles.checkboxBoxChecked]}>
                  {currentlyWorking && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxText}>Currently Working</Text>
              </TouchableOpacity>
            </View>

            {/* 7. Project URL */}
            {renderFloatingInput('Project URL', projectUrl, setProjectUrl, 'projectUrl')}

            {/* 8. Repository */}
            {renderFloatingInput('Repository', repository, setRepository, 'repository')}

            {/* 9. Key Achievements */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionLabel}>Key Achievements</Text>

              {achievements.map((ach, aIdx) => (
                <View key={aIdx} style={styles.achievementItemRow}>
                  <Text style={styles.achievementDot}>•</Text>
                  <Text style={styles.achievementText}>{ach}</Text>
                  <TouchableOpacity onPress={() => handleRemoveAchievement(aIdx)}>
                    <Ionicons name="close-circle" size={18} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
              ))}

              <View style={styles.addAchievementInputRow}>
                <TextInput
                  style={styles.addAchievementTextInput}
                  placeholder="e.g. Optimized app startup speed by 40%"
                  placeholderTextColor="#999999"
                  value={newAchievementInput}
                  onChangeText={setNewAchievementInput}
                  onSubmitEditing={handleAddAchievement}
                />
                <TouchableOpacity
                  style={styles.addAchievementBtn}
                  onPress={handleAddAchievement}
                >
                  <Ionicons name="add" size={18} color="#000000" />
                  <Text style={styles.addAchievementBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 10. Media Screenshots */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionLabel}>Media</Text>

              {screenshots.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {screenshots.map((uri, sIdx) => (
                      <View key={sIdx} style={styles.screenshotThumbContainer}>
                        <Image source={{ uri }} style={styles.screenshotThumbImg} />
                        <TouchableOpacity
                          style={styles.removeScreenshotBtn}
                          onPress={() => handleRemoveScreenshot(sIdx)}
                        >
                          <Ionicons name="close-circle" size={18} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}

              <TouchableOpacity
                style={styles.uploadMediaOutlineBtn}
                activeOpacity={0.8}
                onPress={handlePickScreenshot}
              >
                <Ionicons name="image-outline" size={20} color="#000000" style={{ marginRight: 6 }} />
                <Text style={styles.uploadMediaOutlineBtnText}>+ Upload Screenshot</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Bottom Add/Save Action Button */}
          <TouchableOpacity
            style={[
              styles.addActionButton,
              isFormValid ? styles.addActionButtonActive : styles.addActionButtonDisabled,
            ]}
            activeOpacity={isFormValid ? 0.8 : 1}
            onPress={handleSaveProject}
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

  projectCard: {
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
  projectNameText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  projectRoleText: {
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
  typeBadge: {
    backgroundColor: '#EBF3FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  menuDotsBtn: {
    padding: 4,
  },
  techChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  techChipRead: {
    backgroundColor: '#F2F2F4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  techChipReadText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
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
  projectDescriptionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333333',
    marginBottom: 10,
  },
  linksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  linkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
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

  techChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  techChipInteractive: {
    backgroundColor: '#EBEBEB',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  techChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  addTechInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F4',
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 50,
  },
  addTechTextInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  addTechPlusBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  projectTypeSelectorCard: {
    backgroundColor: '#F2F2F4',
    borderRadius: 20,
    paddingHorizontal: 18,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  projectTypeSelectorText: {
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

  achievementItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  achievementDot: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  achievementText: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  addAchievementInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F4',
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 52,
    gap: 8,
  },
  addAchievementTextInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  addAchievementBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  addAchievementBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
  },

  screenshotThumbContainer: {
    position: 'relative',
  },
  screenshotThumbImg: {
    width: 90,
    height: 90,
    borderRadius: 16,
  },
  removeScreenshotBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  uploadMediaOutlineBtn: {
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadMediaOutlineBtnText: {
    fontSize: 14,
    fontWeight: '700',
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
