import React, { useEffect, useRef } from 'react';
import { AuthProvider } from './src/context/AuthContext';
import { triggerRealtimeRefresh } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import * as Notifications from 'expo-notifications';

export default function App() {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Listener for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📩 NOTIFICATION RECEIVED:', notification);
      console.log('📩 Title:', notification.request.content.title);
      console.log('📩 Body:', notification.request.content.body);
      
      // Check if this is a realtime attendance update
      const data = notification.request.content.data;
      if (data?.realtime_update === 'true' && data?.type === 'attendance') {
        console.log('🔄 Realtime attendance update detected, refreshing data...');
        triggerRealtimeRefresh();
      }
    });

    // Listener for when user interacts with notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 NOTIFICATION TAPPED:', response);
      
      // Also refresh data when user taps on attendance notification
      const data = response.notification.request.content.data;
      if (data?.type === 'attendance') {
        console.log('🔄 Attendance notification tapped, refreshing data...');
        triggerRealtimeRefresh();
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
