import { Tabs } from 'expo-router';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
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

    // Static background for all tabs
    const tabBg = '#F8F9FA';
    const tint = '#007AFF';

    return (
        <NativeTabs
            backgroundColor={tabBg}
            tintColor={tint}
            disableTransparentOnScrollEdge={true}
            labelStyle={{
                default: {
                    color: '#64748B',
                    fontSize: 11,
                    fontWeight: '600',
                },
                selected: {
                    color: tint,
                    fontSize: 11,
                    fontWeight: '700',
                }
            }}
        >
            {/* 1. Jobs Tab */}
            <NativeTabs.Trigger name="jobs" options={{ backgroundColor: tabBg, disableTransparentOnScrollEdge: true }}>
                <Icon
                    src={{
                        default: require('../../assets/images/bottom-nav/job.png'),
                        selected: require('../../assets/images/bottom-nav/job.png')
                    }}
                />
                <Label>Jobs</Label>
            </NativeTabs.Trigger>

            {/* 2. Applications Tab */}
            <NativeTabs.Trigger name="applications" options={{ backgroundColor: tabBg, disableTransparentOnScrollEdge: true }}>
                <Icon
                    src={{
                        default: require('../../assets/images/bottom-nav/Application.png'),
                        selected: require('../../assets/images/bottom-nav/Application.png')
                    }}
                />
                <Label>Applications</Label>
            </NativeTabs.Trigger>

            {/* 3. Resume Tab */}
            <NativeTabs.Trigger name="index" options={{ backgroundColor: tabBg, disableTransparentOnScrollEdge: true }}>
                <Icon
                    src={{
                        default: require('../../assets/images/bottom-nav/resume.png'),
                        selected: require('../../assets/images/bottom-nav/resume.png')
                    }}
                />
                <Label>Resume</Label>
            </NativeTabs.Trigger>

            {/* 4. Profile Tab */}
            <NativeTabs.Trigger name="account" options={{ backgroundColor: tabBg, disableTransparentOnScrollEdge: true }}>
                <Icon
                    src={{
                        default: require('../../assets/images/bottom-nav/profile.png'),
                        selected: require('../../assets/images/bottom-nav/profile.png')
                    }}
                />
                <Label>Profile</Label>
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
