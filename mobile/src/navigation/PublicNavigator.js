import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import LoginScreen from '../screens/auth/LoginScreen';
import PublicNotificationsScreen from '../screens/public/PublicNotificationsScreen';
import RegulationsScreen from '../screens/public/RegulationsScreen';
import AboutScreen from '../screens/public/AboutScreen';
import { COLORS } from '../styles/theme';

const Tab = createBottomTabNavigator();

const PublicNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          paddingTop: 5,
          paddingBottom: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Login"
        component={LoginScreen}
        options={{
          tabBarLabel: 'Đăng nhập',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20 }}>🔐</Text>
          ),
        }}
      />
      <Tab.Screen
        name="PublicNotifications"
        component={PublicNotificationsScreen}
        options={{
          tabBarLabel: 'Thông báo',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20 }}>📢</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Regulations"
        component={RegulationsScreen}
        options={{
          tabBarLabel: 'Quy định',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20 }}>📋</Text>
          ),
        }}
      />
      <Tab.Screen
        name="About"
        component={AboutScreen}
        options={{
          tabBarLabel: 'Giới thiệu',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20 }}>ℹ️</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default PublicNavigator;
