import { Tabs } from 'expo-router';
import { NativeTabs, Icon, Label, VectorIcon } from 'expo-router/unstable-native-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Platform } from 'react-native';

export default function TabLayout() {
  const isPad = Platform.OS === 'ios' && Platform.isPad;

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
    <NativeTabs>
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
          src={require('../../assets/images/file.png')}
        />
        <Label>Your Doc</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

