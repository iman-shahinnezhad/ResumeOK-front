import * as FileSystem from 'expo-file-system/legacy';

const SESSION_FILE = `${FileSystem.documentDirectory}session.json`;

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  plan: string;
  credit: number;
  hasCompletedOnboarding?: boolean;
  profile?: any;
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
    const knownFiles = [
      'session.json',
      'user_onboarding_profile.json',
      'resume_builder_form_data.json',
      'onboarding_completed.txt',
      'has_seen_onboarding.txt',
      'has_seen_referral.txt',
      'resumes.json',
      'cover_letters.json',
      'greenhouse_config.json',
      'applied_jobs.json',
      'skipped_jobs.json',
      'claimed_tasks.json',
      'audit_matches.json',
      'resume_builder_latest.json',
      'guest_credit.txt',
      'guest_id.txt'
    ];

    const dir = FileSystem.documentDirectory;
    if (dir) {
      for (const name of knownFiles) {
        await FileSystem.deleteAsync(`${dir}${name}`, { idempotent: true }).catch(() => {});
      }
      const files = await FileSystem.readDirectoryAsync(dir).catch(() => []);
      for (const file of files) {
        await FileSystem.deleteAsync(`${dir}${file}`, { idempotent: true }).catch(() => {});
      }
    }
  } catch (err) {
    console.error('Failed to clear session and local storage:', err);
  }
}
