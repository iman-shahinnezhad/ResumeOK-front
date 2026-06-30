import { Tabs } from 'expo-router';
import { NativeTabs, Icon, Label, VectorIcon } from 'expo-router/unstable-native-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Platform } from 'react-native';

export default function TabLayout() {
    const isPad = Platform.OS === 'ios' && Platform.isPad;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#6366f1', // Active indigo tint
                tabBarInactiveTintColor: '#94a3b8', // Inactive slate gray
                tabBarStyle: {
                    display: isPad ? 'none' : 'flex',
                    backgroundColor: '#FFFFFF', // Guaranteed solid white background across all tabs
                    borderTopWidth: 1,
                    borderTopColor: '#F1F5F9',
                    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
                    paddingTop: 8,
                    height: Platform.OS === 'ios' ? 84 : 64,
                    elevation: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 6,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                }
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Resume',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'diamond' : 'diamond-outline'} size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="cover-letter"
                options={{
                    title: 'Cover Letter',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'ellipse' : 'ellipse-outline'} size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="library"
                options={{
                    title: 'Your Doc',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={22} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
