import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as FileSystem from 'expo-file-system/legacy';
import Slider from '@react-native-community/slider';
import DateTimePicker from '@react-native-community/datetimepicker';
import { City, Country } from 'country-state-city';
import { useAuth } from '../context/AuthContext';

const GENDER_OPTIONS = [
  'Male',
  'Female',
  'Non-binary',
  'Prefer not to say',
  'Other'
];

const ETHNICITY_OPTIONS = [
  'Asian',
  'Black / African American',
  'Hispanic / Latino',
  'White / Caucasian',
  'Two or More Races',
  'Prefer not to say'
];

const DISABILITY_OPTIONS = [
  'Yes, I have a disability',
  'No, I don’t have a disability',
  'Prefer not to say'
];

const CITIZENSHIP_OPTIONS = [
  'U.S. Citizen / Permanent Resident',
  'Requires Visa Sponsorship',
  'Work Authorization Only',
  'EU / UK Citizen',
  'Other'
];

export default function PersonalInfo() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [profile, setProfile] = useState<any>(null);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [salary, setSalary] = useState('');

  // Demographic states
  const [dob, setDob] = useState('11/03/1998');
  const [gender, setGender] = useState('Male');
  const [ethnicity, setEthnicity] = useState('');
  const [disability, setDisability] = useState('');
  const [citizenship, setCitizenship] = useState('');

  // Active modal state (for address, salary, dob)
  type ModalType = 'address' | 'salary' | 'dob' | null;
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // City Search Modal state
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<string[]>([]);
  const [isSearchingCity, setIsSearchingCity] = useState(false);

  // Salary Modal temp state
  const [minSalary, setMinSalary] = useState(50000);
  const [maxSalary, setMaxSalary] = useState(120000);

  // Date Picker temp state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(1998, 10, 3));

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const path = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        const text = await FileSystem.readAsStringAsync(path);
        const data = JSON.parse(text);
        setProfile(data);

        if (data.firstName) setFirstName(data.firstName);
        if (data.lastName) setLastName(data.lastName);
        if (data.email) setEmail(data.email);
        if (data.phone) setPhone(data.phone);
        if (data.city || data.address) setAddress(data.city || data.address);
        if (data.dob) setDob(data.dob);
        if (data.gender) setGender(data.gender);
        if (data.ethnicity) setEthnicity(data.ethnicity);
        if (data.disability) setDisability(data.disability);
        if (data.citizenship) setCitizenship(data.citizenship);

        if (data.expectedSalary && data.expectedSalary.min && data.expectedSalary.max) {
          setMinSalary(data.expectedSalary.min);
          setMaxSalary(data.expectedSalary.max);
          const minK = Math.round(data.expectedSalary.min / 1000);
          const maxK = Math.round(data.expectedSalary.max / 1000);
          setSalary(`$${minK}K - $${maxK}K`);
        } else {
          setSalary('$50K - $120K');
        }
      } else if (user) {
        if (user.name) {
          const parts = user.name.split(' ');
          setFirstName(parts[0] || '');
          setLastName(parts.slice(1).join(' ') || '');
        }
        if (user.email) setEmail(user.email);
      }
    } catch (e) {
      console.log('Error reading personal info:', e);
    }
  };

  // City search autocomplete effect
  useEffect(() => {
    const query = cityQuery.trim();
    if (query.length < 2) {
      setCityResults([]);
      setIsSearchingCity(false);
      return;
    }

    setIsSearchingCity(true);
    const queryLower = query.toLowerCase();
    const matches: string[] = [];

    try {
      const allCities = City.getAllCities();
      for (let i = 0; i < allCities.length && matches.length < 15; i++) {
        const c = allCities[i];
        if (c.name.toLowerCase().startsWith(queryLower) || c.name.toLowerCase().includes(queryLower)) {
          const countryObj = Country.getCountryByCode(c.countryCode);
          const countryName = countryObj ? countryObj.name : c.countryCode;
          let formatted = c.stateCode ? `${c.name}, ${c.stateCode}, ${countryName}` : `${c.name}, ${countryName}`;
          if (!matches.includes(formatted)) {
            matches.push(formatted);
          }
        }
      }
    } catch (e) {
      console.log('City search error:', e);
    }

    if (matches.length > 0) {
      setCityResults(matches);
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.features) {
            const remoteResults: string[] = [];
            data.features.forEach((f: any) => {
              const props = f.properties || {};
              const name = props.name;
              const state = props.state || props.county;
              const country = props.country;
              if (name) {
                let formatted = name;
                if (state && state !== name) formatted += `, ${state}`;
                if (country) formatted += `, ${country}`;
                if (!remoteResults.includes(formatted)) {
                  remoteResults.push(formatted);
                }
              }
            });
            if (remoteResults.length > 0) {
              setCityResults(remoteResults);
            }
          }
        }
      } catch (err) {
        console.log('Remote city fetch error:', err);
      } finally {
        setIsSearchingCity(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [cityQuery]);

  const saveProfileField = async (key: string, value: any) => {
    try {
      const path = `${FileSystem.documentDirectory}user_onboarding_profile.json`;
      const updated = { ...(profile || {}), [key]: value };
      setProfile(updated);
      await FileSystem.writeAsStringAsync(path, JSON.stringify(updated));
    } catch (e) {
      console.log('Save profile error:', e);
    }
  };

  const handleSaveSalary = () => {
    const minK = Math.round(minSalary / 1000);
    const maxK = Math.round(maxSalary / 1000);
    const formatted = `$${minK}K - $${maxK}K`;
    setSalary(formatted);
    saveProfileField('expectedSalary', { min: minSalary, max: maxSalary });
    setActiveModal(null);
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  // NATIVE APPLE ActionSheetIOS Handlers
  const handleGenderPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...GENDER_OPTIONS, 'Cancel'],
          cancelButtonIndex: GENDER_OPTIONS.length,
          title: 'Select Gender',
        },
        (buttonIndex) => {
          if (buttonIndex < GENDER_OPTIONS.length) {
            const selected = GENDER_OPTIONS[buttonIndex];
            setGender(selected);
            saveProfileField('gender', selected);
          }
        }
      );
    }
  };

  const handleEthnicityPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...ETHNICITY_OPTIONS, 'Cancel'],
          cancelButtonIndex: ETHNICITY_OPTIONS.length,
          title: 'Select Ethnicity',
        },
        (buttonIndex) => {
          if (buttonIndex < ETHNICITY_OPTIONS.length) {
            const selected = ETHNICITY_OPTIONS[buttonIndex];
            setEthnicity(selected);
            saveProfileField('ethnicity', selected);
          }
        }
      );
    }
  };

  const handleDisabilityPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...DISABILITY_OPTIONS, 'Cancel'],
          cancelButtonIndex: DISABILITY_OPTIONS.length,
          title: 'Disability Status',
        },
        (buttonIndex) => {
          if (buttonIndex < DISABILITY_OPTIONS.length) {
            const selected = DISABILITY_OPTIONS[buttonIndex];
            setDisability(selected);
            saveProfileField('disability', selected);
          }
        }
      );
    }
  };

  const handleCitizenshipPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...CITIZENSHIP_OPTIONS, 'Cancel'],
          cancelButtonIndex: CITIZENSHIP_OPTIONS.length,
          title: 'Citizenship Status',
        },
        (buttonIndex) => {
          if (buttonIndex < CITIZENSHIP_OPTIONS.length) {
            const selected = CITIZENSHIP_OPTIONS[buttonIndex];
            setCitizenship(selected);
            saveProfileField('citizenship', selected);
          }
        }
      );
    }
  };

  // Calculate missing fields count for Add X red badge across all 11 fields
  const checkMissingCount = () => {
    let missing = 0;
    if (!firstName.trim()) missing++;
    if (!lastName.trim()) missing++;
    if (!email.trim()) missing++;
    if (!phone.trim()) missing++;
    if (!address.trim()) missing++;
    if (!salary.trim()) missing++;
    if (!dob.trim()) missing++;
    if (!gender.trim()) missing++;
    if (!ethnicity.trim()) missing++;
    if (!disability.trim()) missing++;
    if (!citizenship.trim()) missing++;
    return missing;
  };

  const missingCount = checkMissingCount();

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

        <Text style={styles.headerTitle}>Personal info</Text>

        {missingCount > 0 ? (
          <View style={styles.badgePillRed}>
            <Text style={styles.badgeTextWhite}>Add {missingCount}</Text>
          </View>
        ) : (
          <View style={styles.badgePillGreen}>
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* AVATAR WITH EDIT PEN */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            <Image
              source={require('../assets/images/placeholder-avatar.png')}
              style={styles.avatarImg}
            />
            <TouchableOpacity style={styles.editPenBtn} activeOpacity={0.8}>
              <Ionicons name="pencil" size={14} color="#000000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* FIELDS GROUP 1 */}
        <View style={styles.fieldsGroup}>

          {/* First Name */}
          <View style={styles.fieldBox}>
            <Text style={styles.fieldLabel}>First Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={firstName}
              onChangeText={(text) => {
                setFirstName(text);
                saveProfileField('firstName', text);
              }}
              placeholder="Enter first name"
              placeholderTextColor="#999999"
            />
          </View>

          {/* Last Name */}
          <View style={styles.fieldBox}>
            <Text style={styles.fieldLabel}>Last Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={lastName}
              onChangeText={(text) => {
                setLastName(text);
                saveProfileField('lastName', text);
              }}
              placeholder="Enter last name"
              placeholderTextColor="#999999"
            />
          </View>

          {/* Email Address */}
          <View style={styles.fieldBox}>
            <View style={styles.fieldHeaderRow}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              {!email.trim() && <View style={styles.redDot} />}
            </View>
            <TextInput
              style={styles.fieldInput}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                saveProfileField('email', text);
              }}
              placeholder="Enter email address"
              placeholderTextColor="#999999"
              keyboardType="email-address"
            />
          </View>

          {/* Phone Number */}
          <View style={styles.fieldBox}>
            <View style={styles.fieldHeaderRow}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              {!phone.trim() && <View style={styles.redDot} />}
            </View>
            <TextInput
              style={styles.fieldInput}
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                saveProfileField('phone', text);
              }}
              placeholder="Enter phone number"
              placeholderTextColor="#999999"
              keyboardType="phone-pad"
            />
          </View>

          {/* Address */}
          <TouchableOpacity
            style={styles.fieldBoxRow}
            activeOpacity={0.7}
            onPress={() => {
              setCityQuery('');
              setActiveModal('address');
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Address</Text>
              <Text style={address.trim() ? styles.fieldValueBold : styles.fieldPlaceholder}>
                {address.trim() || 'Add address'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {!address.trim() && <View style={styles.redDot} />}
              <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
            </View>
          </TouchableOpacity>

          {/* Salary */}
          <TouchableOpacity
            style={styles.fieldBoxRow}
            activeOpacity={0.7}
            onPress={() => setActiveModal('salary')}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Salary</Text>
              <Text style={salary.trim() ? styles.fieldValueBold : styles.fieldPlaceholder}>
                {salary.trim() || 'Add expected salary'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {!salary.trim() && <View style={styles.redDot} />}
              <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
            </View>
          </TouchableOpacity>

        </View>

        {/* DEMOGRAPHIC SECTION */}
        <Text style={styles.sectionHeaderTitle}>Demographic</Text>

        <View style={styles.fieldsGroup}>

          {/* Date of Birth */}
          <TouchableOpacity
            style={styles.fieldBoxRow}
            activeOpacity={0.7}
            onPress={() => setActiveModal('dob')}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Date of Birth</Text>
              <Text style={dob.trim() ? styles.fieldValueBold : styles.fieldPlaceholder}>
                {dob.trim() || 'Select date of birth'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
          </TouchableOpacity>

          {/* Gender */}
          <TouchableOpacity
            style={styles.fieldBoxRow}
            activeOpacity={0.7}
            onPress={handleGenderPress}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Gender</Text>
              <Text style={gender.trim() ? styles.fieldValueBold : styles.fieldPlaceholder}>
                {gender.trim() || 'Select gender'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
          </TouchableOpacity>

          {/* Ethnicity */}
          <TouchableOpacity
            style={styles.fieldBoxRow}
            activeOpacity={0.7}
            onPress={handleEthnicityPress}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Ethnicity</Text>
              <Text style={ethnicity.trim() ? styles.fieldValueBold : styles.fieldPlaceholder}>
                {ethnicity.trim() || 'Select ethnicity'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
          </TouchableOpacity>

          {/* Disability Status */}
          <TouchableOpacity
            style={styles.fieldBoxRow}
            activeOpacity={0.7}
            onPress={handleDisabilityPress}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Disability Status</Text>
              <Text style={disability.trim() ? styles.fieldValueBold : styles.fieldPlaceholder}>
                {disability.trim() || 'Select disability status'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
          </TouchableOpacity>

          {/* Citizenship Status */}
          <TouchableOpacity
            style={styles.fieldBoxRow}
            activeOpacity={0.7}
            onPress={handleCitizenshipPress}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Citizenship Status</Text>
              <Text style={citizenship.trim() ? styles.fieldValueBold : styles.fieldPlaceholder}>
                {citizenship.trim() || 'Select citizenship status'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
          </TouchableOpacity>

        </View>

      </ScrollView>

      {/* ======================================================== */}
      {/* 1. ADDRESS MODAL (City Search - Clean White) */}
      {/* ======================================================== */}
      <Modal
        visible={activeModal === 'address'}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={[styles.cleanFullPageModal, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.sheetHeaderRow}>
            <Text style={styles.sheetHeaderTitle}>Select Address / City</Text>
            <TouchableOpacity onPress={() => setActiveModal(null)}>
              <Ionicons name="close-circle" size={26} color="#000000" />
            </TouchableOpacity>
          </View>

          <View style={styles.citySearchInputWrapper}>
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search for a city worldwide..."
              placeholderTextColor="#999999"
              value={cityQuery}
              onChangeText={setCityQuery}
              autoFocus={true}
            />
            {isSearchingCity && (
              <ActivityIndicator size="small" color="#000000" style={styles.modalSearchSpinner} />
            )}
          </View>

          {cityResults.length > 0 ? (
            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {cityResults.map((item, idx) => (
                <TouchableOpacity
                  key={`${item}-${idx}`}
                  style={styles.modalOptionRow}
                  onPress={() => {
                    setAddress(item);
                    saveProfileField('city', item);
                    setActiveModal(null);
                  }}
                >
                  <Ionicons name="location-outline" size={18} color="#666666" style={{ marginRight: 10 }} />
                  <Text style={styles.modalOptionText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.modalEmptyState}>
              <Text style={styles.modalEmptyText}>
                {cityQuery.trim().length < 2 ? 'Type at least 2 characters to search cities' : 'No cities found'}
              </Text>
            </View>
          )}
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* 2. SALARY MODAL (Dual Range Sliders) */}
      {/* ======================================================== */}
      <Modal
        visible={activeModal === 'salary'}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={[styles.cleanFullPageModal, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.sheetHeaderRow}>
            <Text style={styles.sheetHeaderTitle}>Expected Salary Range</Text>
            <TouchableOpacity onPress={() => setActiveModal(null)}>
              <Ionicons name="close-circle" size={26} color="#000000" />
            </TouchableOpacity>
          </View>

          <View style={styles.salaryDisplayBox}>
            <Text style={styles.salaryDisplayText}>
              ${Math.round(minSalary / 1000)}K - ${Math.round(maxSalary / 1000)}K
            </Text>
          </View>

          <View style={styles.sliderBlock}>
            <Text style={styles.sliderLabel}>Minimum Salary: ${Math.round(minSalary / 1000)}K</Text>
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={30000}
              maximumValue={300000}
              step={5000}
              value={minSalary}
              minimumTrackTintColor="#000000"
              maximumTrackTintColor="#E0E0E0"
              thumbTintColor="#000000"
              onValueChange={(val) => {
                setMinSalary(val);
                if (val > maxSalary) setMaxSalary(val);
              }}
            />
          </View>

          <View style={styles.sliderBlock}>
            <Text style={styles.sliderLabel}>Maximum Salary: ${Math.round(maxSalary / 1000)}K</Text>
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={30000}
              maximumValue={500000}
              step={10000}
              value={maxSalary}
              minimumTrackTintColor="#000000"
              maximumTrackTintColor="#E0E0E0"
              thumbTintColor="#000000"
              onValueChange={(val) => {
                setMaxSalary(val);
                if (val < minSalary) setMinSalary(val);
              }}
            />
          </View>

          <TouchableOpacity style={styles.sheetDoneBtn} activeOpacity={0.8} onPress={handleSaveSalary}>
            <Text style={styles.sheetDoneBtnText}>Save Salary Range</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* 3. DATE OF BIRTH MODAL (Matching iOS Settings Screenshot) */}
      {/* ======================================================== */}
      <Modal
        visible={activeModal === 'dob'}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={[styles.iosBirthdayModalContainer, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 20 }]}>
          {/* Top Bar: Close (X) and Save (Checkmark) */}
          <View style={styles.iosModalTopBar}>
            <TouchableOpacity
              style={styles.iosCircleIconBtn}
              onPress={() => setActiveModal(null)}
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iosCircleIconBtnDone}
              onPress={() => {
                const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
                const dd = String(selectedDate.getDate()).padStart(2, '0');
                const yyyy = selectedDate.getFullYear();
                const formatted = `${mm}/${dd}/${yyyy}`;
                setDob(formatted);
                saveProfileField('dob', formatted);
                setActiveModal(null);
              }}
            >
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Birthday Summary Card */}
          <View style={styles.iosBirthdayCard}>
            <Text style={styles.iosBirthdayLabel}>Birthday</Text>
            <Text style={styles.iosBirthdayValue}>
              {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>

          {/* Inline Calendar Container */}
          <View style={styles.iosCalendarCard}>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="inline"
              onChange={handleDateChange}
              maximumDate={new Date()}
              accentColor="#0A84FF"
              themeVariant="dark"
            />
          </View>
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
  scrollContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: 15,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImg: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  editPenBtn: {
    position: 'absolute',
    bottom: -2,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fieldsGroup: {
    gap: 10,
    marginBottom: 25,
  },
  fieldBox: {
    backgroundColor: '#EBEBEB',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  fieldBoxRow: {
    backgroundColor: '#EBEBEB',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  fieldInput: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    padding: 0,
    marginTop: 3,
  },
  fieldValueBold: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginTop: 3,
  },
  fieldPlaceholder: {
    fontSize: 15,
    fontWeight: '500',
    color: '#999999',
    marginTop: 3,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
  },

  /* CLEAN FULL PAGE MODAL STYLES */
  cleanFullPageModal: {
    flex: 1,
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 20,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sheetHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
  },
  citySearchInputWrapper: {
    position: 'relative',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalSearchInput: {
    height: 54,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 20,
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  modalSearchSpinner: {
    position: 'absolute',
    right: 15,
  },
  modalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 8,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  modalEmptyState: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  salaryDisplayBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  salaryDisplayText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#000000',
  },
  sliderBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 10,
  },
  sheetDoneBtn: {
    backgroundColor: '#000000',
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },
  sheetDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  /* IOS BIRTHDAY MODAL STYLES (MATCHING SCREENSHOT 1) */
  iosBirthdayModalContainer: {
    flex: 1,
    backgroundColor: '#000000',
    paddingHorizontal: 20,
  },
  iosModalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  iosCircleIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iosCircleIconBtnDone: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3A3A3C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iosBirthdayCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  iosBirthdayLabel: {
    fontSize: 17,
    color: '#8E8E93',
  },
  iosBirthdayValue: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  iosCalendarCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 12,
  },
});
