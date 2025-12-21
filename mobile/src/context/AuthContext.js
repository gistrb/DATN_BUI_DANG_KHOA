import React, { createContext, useState, useContext } from 'react';
import { Alert } from 'react-native';
import { login as apiLogin, fetchEmployeeData } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);

  const handleLogin = async (username, password) => {
    if (!username || !password) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên đăng nhập và mật khẩu');
      return false;
    }

    setLoading(true);
    try {
      const result = await apiLogin(username, password);

      if (result.success && result.data.success) {
        setUserInfo(result.data.user);
        setIsLoggedIn(true);

        // Only fetch data if user has employee_id (not admin)
        if (result.data.user.employee_id) {
          const employeeData = await fetchEmployeeData(result.data.user.employee_id);
          setStats(employeeData.stats);
          setHistory(employeeData.history);
        } else {
          Alert.alert('Tài khoản Admin', 'Bạn đã đăng nhập với tài khoản quản trị. Ứng dụng này dành cho nhân viên.');
        }
        return true;
      } else {
        // Handle specific error cases
        const statusCode = result.statusCode;

        if (statusCode === 401) {
          Alert.alert(
            'Đăng nhập thất bại',
            'Tên đăng nhập hoặc mật khẩu không đúng.\n\nVui lòng kiểm tra lại thông tin đăng nhập.',
            [{ text: 'Thử lại', style: 'default' }]
          );
        } else if (statusCode === 403) {
          Alert.alert(
            'Không có quyền truy cập',
            'Tài khoản của bạn chưa được liên kết với hồ sơ nhân viên.\n\nVui lòng liên hệ quản trị viên.',
            [{ text: 'Đã hiểu', style: 'default' }]
          );
        } else if (statusCode === 400) {
          Alert.alert('Lỗi dữ liệu', 'Dữ liệu gửi đi không hợp lệ.');
        } else if (result.error) {
          handleNetworkError(result.error);
        } else {
          Alert.alert('Đăng nhập thất bại', result.data?.message || 'Đã xảy ra lỗi không xác định.');
        }
        return false;
      }
    } catch (error) {
      handleNetworkError(error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleNetworkError = (errorMessage) => {
    if (errorMessage.includes('Network request failed')) {
      Alert.alert(
        'Lỗi kết nối',
        'Không thể kết nối đến máy chủ.\n\nVui lòng kiểm tra:\n• Kết nối mạng\n• Máy chủ đang hoạt động\n• Địa chỉ IP đúng',
        [{ text: 'Thử lại', style: 'default' }]
      );
    } else if (errorMessage.includes('JSON')) {
      Alert.alert('Lỗi dữ liệu', 'Phản hồi từ máy chủ không hợp lệ.');
    } else {
      Alert.alert('Lỗi', `Đã xảy ra lỗi: ${errorMessage}`);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserInfo(null);
    setStats(null);
    setHistory([]);
  };

  const refreshData = async () => {
    if (userInfo?.employee_id) {
      const employeeData = await fetchEmployeeData(userInfo.employee_id);
      setStats(employeeData.stats);
      setHistory(employeeData.history);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        userInfo,
        loading,
        stats,
        history,
        handleLogin,
        handleLogout,
        refreshData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
