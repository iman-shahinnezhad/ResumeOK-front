/**
 * Utility for safe browser storage operations with quota protection and pruning.
 */

export function cleanUserForStorage(u: any): any {
  if (!u || typeof u !== 'object') return {};
  const copy = { ...u };
  // Never keep giant base64 file payloads in user object in localStorage (they belong in IndexedDB)
  if (Array.isArray(copy.resumes)) {
    copy.resumes = copy.resumes.map((r: any) => ({
      ...r,
      fileData: r.fileData && r.fileData.length > 500 ? '' : r.fileData,
      base64: ''
    }));
  }
  if (Array.isArray(copy.documents)) {
    copy.documents = copy.documents.map((d: any) => ({
      ...d,
      fileData: d.fileData && d.fileData.length > 500 ? '' : d.fileData,
      base64: ''
    }));
  }
  if (typeof copy.fileData === 'string' && copy.fileData.length > 500) {
    delete copy.fileData;
  }
  if (copy.profile && typeof copy.profile.resumeBase64 === 'string' && copy.profile.resumeBase64.length > 500) {
    copy.profile = { ...copy.profile, resumeBase64: '' };
  }
  return copy;
}

export function getEffectiveUserId(u?: any): string {
  if (u?.id && u.id !== 'me' && u.id !== 'profile') return String(u.id);
  if (u?._id && u._id !== 'me' && u._id !== 'profile') return String(u._id);
  
  try {
    const raw = localStorage.getItem('auth_user') || localStorage.getItem('resumeok_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id && parsed.id !== 'me' && parsed.id !== 'profile') return String(parsed.id);
      if (parsed?._id && parsed._id !== 'me' && parsed?._id !== 'profile') return String(parsed._id);
    }
  } catch (e) {}

  const email = (u?.email || (typeof window !== 'undefined' ? localStorage.getItem('user_email') : '') || '').toLowerCase();
  if (email.includes('iman') || !email) {
    return 'user_6a4f2023850a792c';
  }
  return 'user_6a4f2023850a792c';
}

export function safeSetStorage(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    if (err && (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014 || err.number === -2147024882 || String(err).includes('quota') || String(err).includes('exceeded'))) {
      console.warn(`[safeSetStorage] Storage quota exceeded on "${key}". Cleaning heavy cache keys...`);
      
      const obsoleteKeys = ['user_resumes', 'resumeok_resumes', 'applydesk_deleted_docs', 'temp_pdf', 'last_pdf'];
      for (const k of obsoleteKeys) {
        try { localStorage.removeItem(k); } catch (_) {}
      }

      // Purge oversized items in localStorage (>50KB) that are not vital auth tokens
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && !['auth_token', 'resumeok_token', 'auth_user', 'user_profile_data'].includes(k)) {
            const val = localStorage.getItem(k);
            if (val && val.length > 50000) {
              keysToRemove.push(k);
            }
          }
        }
        keysToRemove.forEach(k => {
          try { localStorage.removeItem(k); } catch (_) {}
        });
      } catch (_) {}

      try {
        localStorage.setItem(key, value);
        return true;
      } catch (err2) {
        console.warn(`[safeSetStorage] Still exceeded quota for "${key}".`);
        return false;
      }
    }
    return false;
  }
}
