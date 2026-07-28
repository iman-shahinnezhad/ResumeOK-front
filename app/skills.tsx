import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as FileSystem from 'expo-file-system/legacy';

const AI_SKILL_SUGGESTIONS = [
  'React Native',
  'TypeScript',
  'UI/UX Design',
  'Node.js',
  'GraphQL',
  'Figma',
  'State Management',
  'REST APIs',
];

export default function SkillsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);

  // Skills Lists
  const [technicalSkills, setTechnicalSkills] = useState<string[]>(['React Native', 'TypeScript', 'Node.js', 'Figma']);
  const [softSkills, setSoftSkills] = useState<string[]>(['Leadership', 'Problem Solving', 'Teamwork']);

  // Input states
  const [newTechInput, setNewTechInput] = useState('');
  const [newSoftInput, setNewSoftInput] = useState('');

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

        if (data.skills && Array.isArray(data.skills) && data.skills.length > 0) {
          setTechnicalSkills(data.skills);
        }
        if (data.softSkills && Array.isArray(data.softSkills)) {
          setSoftSkills(data.softSkills);
        }
      }
    } catch (e) {
      console.log('Error loading skills profile data:', e);
    }
  };

  const saveSkillsData = async (
    updatedTech: string[],
    updatedSoft: string[]
  ) => {
    try {
      const path = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
      const updatedProfile = {
        ...(profile || {}),
        skills: updatedTech,
        softSkills: updatedSoft,
      };
      setProfile(updatedProfile);
      setTechnicalSkills(updatedTech);
      setSoftSkills(updatedSoft);
      await FileSystem.writeAsStringAsync(path, JSON.stringify(updatedProfile));
    } catch (e) {
      console.log('Error saving skills data:', e);
    }
  };

  const handleAddTechSkill = (skillToAdd?: string) => {
    const target = (skillToAdd || newTechInput).trim();
    if (target && !technicalSkills.includes(target)) {
      const updated = [...technicalSkills, target];
      saveSkillsData(updated, softSkills);
      if (!skillToAdd) setNewTechInput('');
    }
  };

  const handleRemoveTechSkill = (tech: string) => {
    const updated = technicalSkills.filter((t) => t !== tech);
    saveSkillsData(updated, softSkills);
  };

  const handleAddSoftSkill = () => {
    const trimmed = newSoftInput.trim();
    if (trimmed && !softSkills.includes(trimmed)) {
      const updated = [...softSkills, trimmed];
      saveSkillsData(technicalSkills, updated);
      setNewSoftInput('');
    }
  };

  const handleRemoveSoftSkill = (sk: string) => {
    const updated = softSkills.filter((s) => s !== sk);
    saveSkillsData(technicalSkills, updated);
  };

  // Remaining needed items calculation (target = 3 total skills)
  const totalSkillsCount = technicalSkills.length + softSkills.length;
  const remainingNeeded = Math.max(0, 3 - totalSkillsCount);

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

        <Text style={styles.headerTitle}>Skills</Text>

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
        {/* 1. TECHNICAL SKILLS SECTION */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionTitleText}>Technical & Hard Skills</Text>
          <Text style={styles.sectionSubtitleText}>Add tools, frameworks, and domain expertise.</Text>

          <View style={styles.chipsContainer}>
            {technicalSkills.map((tech, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.chipItem}
                activeOpacity={0.7}
                onPress={() => handleRemoveTechSkill(tech)}
              >
                <Text style={styles.chipText}>{tech}</Text>
                <Ionicons name="close-circle" size={16} color="#8E8E93" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Add Tech Input Row */}
          <View style={styles.addInputRow}>
            <TextInput
              style={styles.addTextInput}
              placeholder="e.g. React Native, Python, Figma"
              placeholderTextColor="#999999"
              value={newTechInput}
              onChangeText={setNewTechInput}
              onSubmitEditing={() => handleAddTechSkill()}
            />
            <TouchableOpacity
              style={styles.addPlusBtn}
              onPress={() => handleAddTechSkill()}
            >
              <Ionicons name="add" size={20} color="#000000" />
            </TouchableOpacity>
          </View>

          {/* ✨ AI Suggestions */}
          <View style={styles.aiSuggestionsBox}>
            <Text style={styles.aiTitle}>✨ Quick Suggestions</Text>
            <View style={styles.aiChipsRow}>
              {AI_SKILL_SUGGESTIONS.map((sug, idx) => {
                const isAdded = technicalSkills.includes(sug);
                if (isAdded) return null;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={styles.aiChipBtn}
                    onPress={() => handleAddTechSkill(sug)}
                  >
                    <Ionicons name="add" size={14} color="#2563EB" />
                    <Text style={styles.aiChipText}>{sug}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* 2. SOFT SKILLS SECTION */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionTitleText}>Soft Skills & Attributes</Text>
          <Text style={styles.sectionSubtitleText}>Communication, leadership, and personal qualities.</Text>

          <View style={styles.chipsContainer}>
            {softSkills.map((sk, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.chipItemSoft}
                activeOpacity={0.7}
                onPress={() => handleRemoveSoftSkill(sk)}
              >
                <Text style={styles.chipTextSoft}>{sk}</Text>
                <Ionicons name="close-circle" size={16} color="#8E8E93" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Add Soft Skill Input Row */}
          <View style={styles.addInputRow}>
            <TextInput
              style={styles.addTextInput}
              placeholder="e.g. Time Management, Public Speaking"
              placeholderTextColor="#999999"
              value={newSoftInput}
              onChangeText={setNewSoftInput}
              onSubmitEditing={handleAddSoftSkill}
            />
            <TouchableOpacity
              style={styles.addPlusBtn}
              onPress={handleAddSoftSkill}
            >
              <Ionicons name="add" size={20} color="#000000" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
    paddingTop: 10,
    paddingBottom: 40,
    gap: 16,
  },

  cardSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionTitleText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  sectionSubtitleText: {
    fontSize: 13,
    color: '#666666',
    marginTop: 2,
    marginBottom: 12,
  },

  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chipItem: {
    backgroundColor: '#F2F2F4',
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
  chipItemSoft: {
    backgroundColor: '#F0EEFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipTextSoft: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
  },

  addInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F4',
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 50,
  },
  addTextInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  addPlusBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  aiSuggestionsBox: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F2',
  },
  aiTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 8,
  },
  aiChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  aiChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EBF3FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  aiChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
});
