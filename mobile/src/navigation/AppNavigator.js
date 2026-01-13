import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import PublicNavigator from './PublicNavigator';
import PrivateNavigator from './PrivateNavigator';

const AppNavigator = () => {
  const { isLoggedIn, userInfo } = useAuth();

  return (
    <NavigationContainer>
      {isLoggedIn && userInfo?.employee_id ? (
        <PrivateNavigator />
      ) : isLoggedIn && !userInfo?.employee_id ? (
        // Admin user - show public navigator but logged in
        <PublicNavigator />
      ) : (
        <PublicNavigator />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;
