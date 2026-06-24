import { Alert, Clipboard, Share } from 'react-native';

/**
 * Safely copies text to the clipboard.
 * Resolves by trying:
 * 1. expo-clipboard (if present and working)
 * 2. React Native's legacy core Clipboard (built-in)
 * 3. React Native Share dialog (which allows copying)
 * 4. Alert fallback
 */
export async function copyToClipboard(text: string, successMessage: string = 'Copied to clipboard.'): Promise<boolean> {
  // 1. Try expo-clipboard
  try {
    const ExpoClipboard = require('expo-clipboard');
    if (ExpoClipboard && typeof ExpoClipboard.setStringAsync === 'function') {
      await ExpoClipboard.setStringAsync(text);
      Alert.alert('Copied!', successMessage);
      return true;
    }
  } catch (e) {
    console.warn('expo-clipboard failed, trying fallback:', e);
  }

  // 2. Try react-native legacy core Clipboard (always built-in, no extra linkage)
  try {
    if (Clipboard && typeof Clipboard.setString === 'function') {
      Clipboard.setString(text);
      Alert.alert('Copied!', successMessage);
      return true;
    }
  } catch (e) {
    console.warn('react-native Clipboard failed, trying fallback:', e);
  }

  // 3. Try native Share sheet (user can choose "Copy" from the sheet)
  try {
    await Share.share({
      message: text,
    });
    return true;
  } catch (e) {
    console.error('Share fallback failed:', e);
  }

  // 4. Ultimate fallback: show the text in an alert
  Alert.alert('Copy Text', text);
  return false;
}
