import { Tabs } from 'expo-router';
import { NativeTabs, Icon, Label, VectorIcon } from 'expo-router/unstable-native-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Platform, useColorScheme } from 'react-native';

export default function TabLayout() {
  const isPad = Platform.OS === 'ios' && Platform.isPad;
  const colorScheme = useColorScheme();
  
  const isDark = colorScheme === 'dark';
  const tabBgColor = isDark ? '#121212' : '#FFFFFF';
  const activeColor = isDark ? '#60a5fa' : '#2563eb'; // Harmonious blue tints for active tabs

  if (isPad) {
    return (
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />
    );
  }

  return (
    <NativeTabs backgroundColor={tabBgColor} tintColor={activeColor}>
      <NativeTabs.Trigger name="index">
        <Icon 
          sf={{ default: 'diamond', selected: 'diamond.fill' }} 
          androidSrc={<VectorIcon family={Ionicons} name="diamond" />} 
        />
        <Label>Resume</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="cover-letter">
        <Icon 
          sf={{ default: 'circle', selected: 'circle.fill' }} 
          androidSrc={<VectorIcon family={Ionicons} name="ellipse" />} 
        />
        <Label>Cover Letter</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="library">
        <Icon 
          sf={{ default: 'doc', selected: 'doc.fill' }}
          androidSrc={<VectorIcon family={Ionicons} name="document" />}
        />
        <Label>Your Doc</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
