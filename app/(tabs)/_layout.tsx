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
            <NativeTabs.Trigger name="index" options={{ backgroundColor: tabBg, disableTransparentOnScrollEdge: true }}>
                <Icon
                    src={{
                        default: require('../../assets/images/resume.png'),
                        selected: require('../../assets/images/resume-active.png')
                    }}
                />
                <Label>Resume</Label>
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="cover-letter" options={{ backgroundColor: tabBg, disableTransparentOnScrollEdge: true }}>
                <Icon
                    src={{
                        default: require('../../assets/images/cover.png'),
                        selected: require('../../assets/images/cover-active.png')
                    }}
                />
                <Label>Cover Letter</Label>
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="library" options={{ backgroundColor: tabBg, disableTransparentOnScrollEdge: true }}>
                <Icon
                    src={{
                        default: require('../../assets/images/doc.png'),
                        selected: require('../../assets/images/doc-active.png')
                    }}
                />
                <Label>Your Doc</Label>
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
