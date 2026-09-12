import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const safeHapticImpact = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
  if (Platform.OS === 'web') return;
  try {
    Haptics.impactAsync(style).catch(() => {});
  } catch (e) {}
};

export const safeHapticSelection = () => {
  if (Platform.OS === 'web') return;
  try {
    Haptics.selectionAsync().catch(() => {});
  } catch (e) {}
};

export const safeHapticNotification = (type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success) => {
  if (Platform.OS === 'web') return;
  try {
    Haptics.notificationAsync(type).catch(() => {});
  } catch (e) {}
};
