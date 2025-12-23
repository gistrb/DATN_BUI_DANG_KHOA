import React, { useEffect, useRef } from 'react';
import { AuthProvider } from './src/context/AuthContext';
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
    });

    // Listener for when user interacts with notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 NOTIFICATION TAPPED:', response);
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
