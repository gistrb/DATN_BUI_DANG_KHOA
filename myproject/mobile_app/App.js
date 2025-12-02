import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Replace with your computer's local IP address
// Use local IP instead of localtunnel to avoid HTML warning page
const API_URL = 'http://192.168.0.104:8000/api';

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
      Alert.alert('Error', 'Please enter username and password');
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

      // Log raw response text before parsing
      const responseText = await response.text();
      console.log('Login Response Text:', responseText);

      const data = JSON.parse(responseText);
      console.log('Login Response Parsed:', data);

      if (data.success) {
        setUserInfo(data.user);
        setIsLoggedIn(true);

        // Only fetch data if user has employee_id (not admin)
        if (data.user.employee_id) {
          fetchData(data.user.employee_id);
        } else {
          // Admin user - show message
          Alert.alert('Admin Login', 'You are logged in as admin. This app is for employees only.');
        }
      } else {
        Alert.alert('Login Failed', data.message);
      }
    } catch (error) {
      console.error('Login Error:', error);
      Alert.alert('Error', `Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async (employeeId) => {
    try {
      console.log('Fetching data for employee:', employeeId);

      // Fetch Stats
      const statsRes = await fetch(`${API_URL}/stats/${employeeId}/`, {
        headers: { 'Bypass-Tunnel-Reminder': 'true' }
      });
      const statsText = await statsRes.text();
      console.log('Stats Response Text:', statsText);

      const statsData = JSON.parse(statsText);
      console.log('Stats Response Parsed:', statsData);
      if (statsData.success) setStats(statsData.stats);

      // Fetch History
      const historyRes = await fetch(`${API_URL}/history/${employeeId}/`, {
        headers: { 'Bypass-Tunnel-Reminder': 'true' }
      });
      const historyText = await historyRes.text();
      console.log('History Response Text:', historyText);

      const historyData = JSON.parse(historyText);
      console.log('History Response Parsed:', historyData);
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
          <Text style={styles.title}>Attendance App</Text>
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Welcome, {userInfo?.full_name}</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Check if user is admin (no employee_id) */}
        {!userInfo?.employee_id ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Admin Account</Text>
            <Text style={styles.infoText}>
              This mobile app is designed for employees only.
              Admin features are available on the web dashboard.
            </Text>
            <Text style={[styles.infoText, { marginTop: 10, fontWeight: 'bold' }]}>
              Please use the web interface at http://localhost:5173 for admin functions.
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
