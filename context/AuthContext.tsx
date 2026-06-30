import * as Application from 'expo-application';
import * as FileSystem from 'expo-file-system/legacy';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { initPurchases, syncSubscriptionStatusWithStoreKit } from '../utils/purchases';
import { clearSession, getSession, saveSession, User } from '../utils/session';

const GUEST_CREDIT_FILE = `${FileSystem.documentDirectory}guest_credit.txt`;
const GUEST_ID_FILE = `${FileSystem.documentDirectory}guest_id.txt`;

interface AuthContextType {
  user: User | null;
  guestCredit: number;
  guestId: string;
  isLoggedIn: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  deductCredits: (amount?: number) => Promise<boolean>;
  refundCredits: (amount: number) => Promise<boolean>;
  updateUser: (user: User) => Promise<void>;
  refreshCredits: () => Promise<void>;
  checkServerConnection: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define local API URL of your Node.js server (use the local IP address for real devices!)
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://188.166.164.115:3030';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [guestCredit, setGuestCredit] = useState<number>(0);
  const [guestId, setGuestId] = useState<string>('guest_device');
  const [isLoading, setIsLoading] = useState(true);

  // Load session from storage on mount
  useEffect(() => {
    async function loadUserSession() {
      try {
        const session = await getSession();
        if (session) {
          setUser(session.user);
          await initPurchases(session.user.id);
          
          // Sync subscription status with Apple StoreKit on startup
          syncSubscriptionStatusWithStoreKit(session.user.id, session.accessToken, API_URL).then(async (updatedUser) => {
            if (updatedUser) {
              setUser(updatedUser);
              await saveSession({ ...session, user: updatedUser });
            }
          });
        } else {
          let currentGuestId = '';
          const idInfo = await FileSystem.getInfoAsync(GUEST_ID_FILE);
          if (idInfo.exists) {
            currentGuestId = await FileSystem.readAsStringAsync(GUEST_ID_FILE);
          } else {
            // Get a persistent hardware-based ID
            let hardwareId = '';
            if (Platform.OS === 'ios') {
              hardwareId = await Application.getIosIdForVendorAsync() || '';
            } else if (Platform.OS === 'android') {
              hardwareId = Application.getAndroidId();
            }
            // Fallback to random if not available
            if (!hardwareId) hardwareId = Math.random().toString(36).substring(2, 12);

            currentGuestId = `guest_device_${hardwareId}`;
            await FileSystem.writeAsStringAsync(GUEST_ID_FILE, currentGuestId);
          }
          setGuestId(currentGuestId);

          // Fetch credit from backend for this guestId
          try {
            const res = await fetch(`${API_URL}/api/guest/${currentGuestId}/credits`);
            if (res.ok) {
              const data = await res.json();
              if (data.success && typeof data.credit === 'number') {
                setGuestCredit(data.credit);
                await FileSystem.writeAsStringAsync(GUEST_CREDIT_FILE, data.credit.toString());
              }
            } else {
              // Fallback to local if server fails
              const info = await FileSystem.getInfoAsync(GUEST_CREDIT_FILE);
              if (info.exists) {
                const content = await FileSystem.readAsStringAsync(GUEST_CREDIT_FILE);
                setGuestCredit(parseInt(content, 10));
              }
            }
          } catch (e) {
            // Fallback to local
            const info = await FileSystem.getInfoAsync(GUEST_CREDIT_FILE);
            if (info.exists) {
              const content = await FileSystem.readAsStringAsync(GUEST_CREDIT_FILE);
              setGuestCredit(parseInt(content, 10));
            }
          }

          await initPurchases();
        }
      } catch (err) {
        console.error('Failed to load session:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadUserSession();
  }, []);


  const logout = async () => {
    try {
      setIsLoading(true);
      await clearSession();
      setUser(null);
    } catch (err) {
      console.error('Failed to logout:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCredits = async () => {
    try {
      const res = await fetch(`${API_URL}/api/guest/${guestId}/credits`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && typeof data.credit === 'number') {
          setGuestCredit(data.credit);
          await FileSystem.writeAsStringAsync(GUEST_CREDIT_FILE, data.credit.toString());
        }
      }
    } catch (e) {
      console.error('Failed to refresh credits:', e);
    }
  };

  const deductCredits = async (amount: number = 2): Promise<boolean> => {
    if (!user) {
      if (guestCredit >= amount) {
        try {
          const response = await fetch(`${API_URL}/api/credits/deduct`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ deviceId: guestId, amount }),
          });

          if (!response.ok) {
            if (response.status === 403) {
              return false; // Insufficient credits
            }
            throw new Error(`Server returned status ${response.status}`);
          }

          const data = await response.json();
          if (data.success && typeof data.credit === 'number') {
            setGuestCredit(data.credit);
            await FileSystem.writeAsStringAsync(GUEST_CREDIT_FILE, data.credit.toString());
            return true;
          }
        } catch (err: any) {
          console.error('Failed to deduct guest credits on server:', err);
          if (err.message && err.message.includes('Server returned status')) {
            throw err;
          }
          throw new Error('Server connection failed. Please check your internet.');
        }
        // Fallback local-only
        const newCredit = guestCredit - amount;
        setGuestCredit(newCredit);
        await FileSystem.writeAsStringAsync(GUEST_CREDIT_FILE, newCredit.toString());
        return true;
      }
      return false;
    }
    try {
      const session = await getSession();
      if (!session) return false;

      const response = await fetch(`${API_URL}/api/credits/deduct`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      });

      if (!response.ok) {
        if (response.status === 403) {
          return false; // Insufficient credits
        }
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      const updatedSession = { ...session, user: data.user };
      await saveSession(updatedSession);
      setUser(data.user);

      return true;
    } catch (err: any) {
      console.error('Failed to deduct credits:', err);
      throw err;
    }
  };

  const refundCredits = async (amount: number): Promise<boolean> => {
    if (!user) {
      try {
        const response = await fetch(`${API_URL}/api/credits/refund`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ deviceId: guestId, amount }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && typeof data.credit === 'number') {
            setGuestCredit(data.credit);
            await FileSystem.writeAsStringAsync(GUEST_CREDIT_FILE, data.credit.toString());
            return true;
          }
        }
      } catch (err) {
        console.error('Failed to refund guest credits on server:', err);
      }
      // Fallback local-only
      const newCredit = guestCredit + amount;
      setGuestCredit(newCredit);
      await FileSystem.writeAsStringAsync(GUEST_CREDIT_FILE, newCredit.toString());
      return true;
    }
    try {
      const session = await getSession();
      if (!session) return false;

      const response = await fetch(`${API_URL}/api/credits/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      const updatedSession = { ...session, user: data.user };
      await saveSession(updatedSession);
      setUser(data.user);

      return true;
    } catch (err) {
      console.error('Failed to refund credits:', err);
      return false;
    }
  };

  const checkServerConnection = async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 3000); // 3-second timeout

      const response = await fetch(`${API_URL}/api/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(id);
      return response.ok;
    } catch (err) {
      console.log('Server connection check failed:', err);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        guestCredit,
        guestId,
        isLoggedIn: !!user,
        isLoading,
        logout,
        deductCredits,
        refundCredits,
        updateUser: async (newUser: User) => {
          if (newUser.id.startsWith('guest_device_')) {
            setGuestCredit(newUser.credit);
            await FileSystem.writeAsStringAsync(GUEST_CREDIT_FILE, newUser.credit.toString());
          } else {
            setUser(newUser);
            const session = await getSession();
            if (session) await saveSession({ ...session, user: newUser });
          }
        },
        refreshCredits,
        checkServerConnection,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
