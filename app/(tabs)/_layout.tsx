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

    // Static background for all tabs
    const tabBg = '#F8F9FA';
    const tint = '#2563eb';
    return (
        <NativeTabs backgroundColor={tabBg} tintColor={tint} disableTransparentOnScrollEdge={true}>
            <NativeTabs.Trigger name="index" options={{ backgroundColor: tabBg, disableTransparentOnScrollEdge: true }}>
                <Icon
                    src={{
                        default: require('../../assets/images/resume.svg'),
                        selected: require('../../assets/images/resume-h.svg')
                    }}
                />
                <Label>Resume</Label>
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="cover-letter" options={{ backgroundColor: tabBg, disableTransparentOnScrollEdge: true }}>
                <Icon
                    src={{
                        default: require('../../assets/images/cover.svg'),
                        selected: require('../../assets/images/cover-h.svg')
                    }}
                />
                <Label>Cover Letter</Label>
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="library" options={{ backgroundColor: tabBg, disableTransparentOnScrollEdge: true }}>
                <Icon
                    src={{
                        default: require('../../assets/images/doc.svg'),
                        selected: require('../../assets/images/doc-h.svg')
                    }}
                />
                <Label>Your Doc</Label>
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
