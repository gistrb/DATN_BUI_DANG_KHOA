import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import ProfileScreen from '../screens/private/ProfileScreen';
import HistoryScreen from '../screens/private/HistoryScreen';
import DiligenceScreen from '../screens/private/DiligenceScreen';
import { COLORS } from '../styles/theme';

const Tab = createBottomTabNavigator();

const PrivateNavigator = () => {
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
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Thông tin',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20 }}>👤</Text>
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'Lịch sử',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20 }}>📅</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Diligence"
        component={DiligenceScreen}
        options={{
          tabBarLabel: 'Chuyên cần',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20 }}>📊</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default PrivateNavigator;
