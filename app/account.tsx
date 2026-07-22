import { Feather, MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Icon, VectorIcon } from 'expo-router/unstable-native-tabs';
import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

export default function Account() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, guestCredit, logout } = useAuth();

  const [modalVisible, setModalVisible] = useState(false);

  const handleCloseAccount = async () => {
    setModalVisible(false);
    await logout(); // Wipe session and trigger layout reload
    router.dismissAll();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0c142c', '#080b14', '#05070c']} style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <View style={[styles.header, { marginTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Icon sf={{ default: 'chevron.backward', selected: 'chevron.backward' }} androidSrc={<VectorIcon family={MaterialIcons} name="arrow-back" />} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.creditsBadge} activeOpacity={0.8} onPress={() => router.push('/pricing' as any)}>
          <Icon sf={{ default: 'bolt.circle.fill', selected: 'bolt.circle.fill' }} androidSrc={<VectorIcon family={MaterialIcons} name="bolt" />} />
          <Text style={[styles.creditsText, { marginLeft: 6 }]}>{user?.credit ?? guestCredit} Credits</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>

        {/* Name Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={user?.name || 'User'}
            editable={false}
          />
        </View>

        {/* Email Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={user?.email || 'Guest User'}
            editable={false}
          />
        </View>

        {/* Close Account Button */}
        <TouchableOpacity
          style={styles.closeAccountButton}
          activeOpacity={0.8}
          onPress={() => setModalVisible(true)}
        >
          <View style={styles.closeAccountLeft}>
            <MaterialIcons name="logout" size={20} color="#e53935" style={{ transform: [{ rotate: '180deg' }] }} />
            <Text style={styles.closeAccountText}>Close Account</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#e53935" />
        </TouchableOpacity>

        <Text style={styles.disclaimerText}>
          This action will erase the account and all personal data associated with this account.
        </Text>

      </View>

      {/* Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Close Account</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to close your account? This action cannot be undone.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalButtonConfirm} onPress={handleCloseAccount}>
                <Text style={styles.modalButtonConfirmText}>Yes, Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05070c',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditsBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  creditsText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  inputContainer: {
    backgroundColor: '#1c1f2e',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  input: {
    color: '#e0e0e0',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  closeAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1c1f2e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginTop: 8,
  },
  closeAccountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeAccountText: {
    color: '#e53935',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  disclaimerText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#1a1d29',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalMessage: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  modalButtonCancelText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  modalButtonConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#e53935',
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
