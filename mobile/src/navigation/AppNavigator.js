import React from 'react';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/auth/LoginScreen';
import HomeScreen from '../screens/home/HomeScreen';

const AppNavigator = () => {
  const { isLoggedIn } = useAuth();

  if (isLoggedIn) {
    return <HomeScreen />;
  }

  return <LoginScreen />;
};

export default AppNavigator;
