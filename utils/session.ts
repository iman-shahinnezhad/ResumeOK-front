import * as FileSystem from 'expo-file-system/legacy';

const SESSION_FILE = `${FileSystem.documentDirectory}session.json`;

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  plan: string;
  credit: number;
}

export interface Session {
  user: User;
  accessToken: string;
}

export async function saveSession(session: Session): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(SESSION_FILE, JSON.stringify(session));
  } catch (err) {
    console.error('Failed to save session:', err);
  }
}

export async function getSession(): Promise<Session | null> {
  try {
    const info = await FileSystem.getInfoAsync(SESSION_FILE);
    if (info.exists) {
      const content = await FileSystem.readAsStringAsync(SESSION_FILE);
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Failed to read session:', err);
  }
  return null;
}

export async function clearSession(): Promise<void> {
  try {
    await FileSystem.deleteAsync(SESSION_FILE, { idempotent: true });
  } catch (err) {
    console.error('Failed to clear session:', err);
  }
}
