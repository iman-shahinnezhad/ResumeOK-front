import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { Platform } from 'react-native';

const jobIcon = require('../../assets/images/bottom-nav/job.png');
const appIcon = require('../../assets/images/bottom-nav/application.png');
const resumeIcon = require('../../assets/images/bottom-nav/resume.png');
const profileIcon = require('../../assets/images/bottom-nav/profile.png');

export default function TabLayout() {
  const isPad = Platform.OS === 'ios' && Platform.isPad;

  if (isPad) {
    return <NativeTabs hidden />;
  }

  return (
    <NativeTabs
      tintColor="#000000"
      iconColor={{ default: '#000000', selected: '#000000' }}
      backgroundColor="#FFFFFF"
      indicatorColor="#EAEAEA"
      rippleColor="#EAEAEA"
    >
      <NativeTabs.Trigger name="jobs">
        <NativeTabs.Trigger.Label>Job Board</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={jobIcon} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="applications">
        <NativeTabs.Trigger.Label>Status</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={appIcon} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Inbox</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={resumeIcon} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>My Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={profileIcon} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="cover-letter" hidden />
      <NativeTabs.Trigger name="library" hidden />
    </NativeTabs>
  );
}


