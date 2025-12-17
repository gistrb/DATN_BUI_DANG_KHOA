import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const API_URL = 'http://192.168.0.103:8000/api';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên đăng nhập và mật khẩu');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Bypass-Tunnel-Reminder': 'true'
        },
        body: JSON.stringify({ username, password }),
      });

      const responseText = await response.text();
      const data = JSON.parse(responseText);

      if (data.success) {
        setUserInfo(data.user);
        setIsLoggedIn(true);

        // Only fetch data if user has employee_id (not admin)
        if (data.user.employee_id) {
          fetchData(data.user.employee_id);
        } else {
          // Admin user - show message
          Alert.alert('Tài khoản Admin', 'Bạn đã đăng nhập với tài khoản quản trị. Ứng dụng này dành cho nhân viên.');
        }
      } else {
        // Handle specific error cases
        const statusCode = response.status;
        
        if (statusCode === 401) {
          // Invalid credentials - wrong username or password
          Alert.alert(
            'Đăng nhập thất bại',
            'Tên đăng nhập hoặc mật khẩu không đúng.\n\nVui lòng kiểm tra lại thông tin đăng nhập.',
            [{ text: 'Thử lại', style: 'default' }]
          );
        } else if (statusCode === 403) {
          // User exists but is not an employee
          Alert.alert(
            'Không có quyền truy cập',
            'Tài khoản của bạn chưa được liên kết với hồ sơ nhân viên.\n\nVui lòng liên hệ quản trị viên.',
            [{ text: 'Đã hiểu', style: 'default' }]
          );
        } else if (statusCode === 400) {
          Alert.alert('Lỗi dữ liệu', 'Dữ liệu gửi đi không hợp lệ.');
        } else {
          Alert.alert('Đăng nhập thất bại', data.message || 'Đã xảy ra lỗi không xác định.');
        }
      }
    } catch (error) {
      console.error('Login Error:', error);
      
      // Network or connection errors
      if (error.message.includes('Network request failed')) {
        Alert.alert(
          'Lỗi kết nối',
          'Không thể kết nối đến máy chủ.\n\nVui lòng kiểm tra:\n• Kết nối mạng\n• Máy chủ đang hoạt động\n• Địa chỉ IP đúng',
          [{ text: 'Thử lại', style: 'default' }]
        );
      } else if (error.message.includes('JSON')) {
        Alert.alert('Lỗi dữ liệu', 'Phản hồi từ máy chủ không hợp lệ.');
      } else {
        Alert.alert('Lỗi', `Đã xảy ra lỗi: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async (employeeId) => {
    try {
      // Fetch Stats
      const statsRes = await fetch(`${API_URL}/stats/${employeeId}/`, {
        headers: { 'Bypass-Tunnel-Reminder': 'true' }
      });
      const statsText = await statsRes.text();
      const statsData = JSON.parse(statsText);
      if (statsData.success) setStats(statsData.stats);

      // Fetch History
      const historyRes = await fetch(`${API_URL}/history/${employeeId}/`, {
        headers: { 'Bypass-Tunnel-Reminder': 'true' }
      });
      const historyText = await historyRes.text();
      const historyData = JSON.parse(historyText);
      if (historyData.success) setHistory(historyData.history);

    } catch (error) {
      console.error('Fetch Data Error:', error);
      Alert.alert('Error', `Failed to load data: ${error.message}`);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserInfo(null);
    setStats(null);
    setHistory([]);
    setUsername('');
    setPassword('');
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <View style={styles.loginBox}>
          <Text style={styles.title}>Chào mừng</Text>
          <TextInput
            style={styles.input}
            placeholder="Tên đăng nhập"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Mật khẩu"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Đăng nhập</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chào mừng, {userInfo?.full_name}</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Check if user is admin (no employee_id) */}
        {!userInfo?.employee_id ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tài khoản Admin</Text>
            <Text style={styles.infoText}>
              Tài khoản này chỉ dành cho nhân viên.
            </Text>
          </View>
        ) : (
          <>
            {/* Stats Card */}
            {stats && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Statistics ({stats.month})</Text>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{stats.diligence_score}%</Text>
                    <Text style={styles.statLabel}>Diligence</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: 'green' }]}>{stats.on_time}</Text>
                    <Text style={styles.statLabel}>On Time</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: 'orange' }]}>{stats.late}</Text>
                    <Text style={styles.statLabel}>Late</Text>
                  </View>
                </View>
              </View>
            )}

            {/* History List */}
            <Text style={styles.sectionTitle}>Recent History</Text>
            {history.map((item, index) => (
              <View key={index} style={styles.historyItem}>
                <View>
                  <Text style={styles.dateText}>{item.date}</Text>
                  <Text style={styles.timeText}>In: {item.check_in} - Out: {item.check_out}</Text>
                </View>
                <View style={[styles.badge,
                item.status_code === 'ON_TIME' ? styles.bgGreen :
                  item.status_code === 'LATE' ? styles.bgOrange : styles.bgRed
                ]}>
                  <Text style={styles.badgeText}>{item.status}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loginBox: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, color: '#333' },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16 },
  button: { backgroundColor: '#007bff', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  logoutText: { color: 'red', fontSize: 16 },
  content: { padding: 20 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 15, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  infoText: { fontSize: 14, color: '#666', lineHeight: 20 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  statLabel: { color: '#666', marginTop: 5 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  historyItem: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  timeText: { color: '#666', marginTop: 5 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5 },
  bgGreen: { backgroundColor: '#d4edda' },
  bgOrange: { backgroundColor: '#fff3cd' },
  bgRed: { backgroundColor: '#f8d7da' },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
});
