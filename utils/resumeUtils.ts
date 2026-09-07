export interface ResumeItem {
  id: string;
  name: string;
  uri?: string;
  date?: string;
  size?: string | number;
  isDefault?: boolean;
}

/**
 * Ensures the default resume (isDefault: true) is ALWAYS at index 0 (first position).
 * If no resume is marked as default, the first resume is automatically set as default.
 */
export function sortResumesWithDefaultFirst<T extends { isDefault?: boolean }>(list: T[]): T[] {
  if (!Array.isArray(list) || list.length === 0) return [];
  
  const defaultIndex = list.findIndex((r) => !!r.isDefault);
  
  if (defaultIndex === -1) {
    return list.map((item, idx) => (idx === 0 ? { ...item, isDefault: true } : { ...item, isDefault: false })) as T[];
  }
  
  const defaultItem = { ...list[defaultIndex], isDefault: true } as T;
  const otherItems = list
    .filter((_, idx) => idx !== defaultIndex)
    .map((item) => ({ ...item, isDefault: false })) as T[];
    
  return [defaultItem, ...otherItems];
}
