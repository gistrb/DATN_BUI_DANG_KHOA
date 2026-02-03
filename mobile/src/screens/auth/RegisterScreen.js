import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Button, Input } from '../../components/common';
import { registerAccount } from '../../services/api';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../styles/theme';

const RegisterScreen = ({ navigation }) => {
  // Form state
  const [employeeId, setEmployeeId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Result state
  const [registrationResult, setRegistrationResult] = useState(null);

  // Register account with backend
  const handleRegister = async () => {
    // Validate inputs
    if (!employeeId.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã nhân viên');
      return;
    }
    if (!username.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên đăng nhập');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email');
      return;
    }

    setLoading(true);

    try {
      const result = await registerAccount({
        employee_id: employeeId.trim(),
        username: username.trim(),
        password: password,
        email: email.trim().toLowerCase(),
        embedding: null, // No face verification required
      });

      if (result.success) {
        setRegistrationResult({
          employee: result.data?.employee,
          username: username.trim(),
          password: password,
        });
        setSuccess(true);
      } else {
        Alert.alert('Đăng ký thất bại', result.error || 'Đã xảy ra lỗi');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Lỗi', 'Đã xảy ra lỗi khi đăng ký');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    navigation.navigate('PublicTabs', { screen: 'Login' });
  };

  // Form step
  const renderForm = () => (
    <ScrollView contentContainerStyle={styles.formContainer}>
      <View style={styles.formHeader}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../../assets/icon.png')} 
            style={styles.logo} 
            resizeMode="contain"
          />
        </View>
        <Text style={styles.title}>Đăng ký tài khoản</Text>
        <Text style={styles.subtitle}>Nhập thông tin nhân viên để tạo tài khoản</Text>
      </View>

      <View style={styles.formContent}>
        <Input
          label="Mã nhân viên"
          placeholder="Nhập mã nhân viên"
          value={employeeId}
          onChangeText={setEmployeeId}
          autoCapitalize="characters"
        />

        <Input
          label="Tên đăng nhập"
          placeholder="Nhập tên đăng nhập"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <Input
          label="Mật khẩu"
          placeholder="Nhập mật khẩu (ít nhất 6 ký tự)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Input
          label="Email"
          placeholder="Nhập email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View style={styles.buttonContainer}>
          <Button
            title="Đăng ký"
            onPress={handleRegister}
            loading={loading}
          />
        </View>

        <TouchableOpacity 
          style={styles.backLink}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backLinkText}>
            Đã có tài khoản? <Text style={styles.backLinkBold}>Đăng nhập</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // Success step
  const renderSuccess = () => (
    <ScrollView contentContainerStyle={styles.successContainer}>
      <View style={styles.successIcon}>
        <Text style={styles.successIconText}>✓</Text>
      </View>

      <Text style={styles.successTitle}>Đăng ký thành công!</Text>
      <Text style={styles.successSubtitle}>
        Tài khoản của bạn đã được tạo thành công
      </Text>

      {registrationResult && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Thông tin tài khoản</Text>
          
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Mã nhân viên:</Text>
            <Text style={styles.resultValue}>{employeeId}</Text>
          </View>

          {registrationResult.employee && (
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Họ tên:</Text>
              <Text style={styles.resultValue}>
                {registrationResult.employee.first_name} {registrationResult.employee.last_name}
              </Text>
            </View>
          )}

          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Tên đăng nhập:</Text>
            <Text style={styles.resultValue}>{registrationResult.username}</Text>
          </View>

          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Mật khẩu:</Text>
            <Text style={styles.resultValue}>••••••••</Text>
          </View>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <Button
          title="Đăng nhập ngay"
          onPress={handleGoToLogin}
        />
      </View>
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
      {success ? renderSuccess() : renderForm()}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  formContainer: {
    flexGrow: 1,
    padding: SPACING.lg,
  },
  formHeader: {
    marginTop: SPACING.xl * 2,
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  logo: {
    width: 80,
    height: 80,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  formContent: {
    flex: 1,
  },
  buttonContainer: {
    marginTop: SPACING.lg,
  },
  backLink: {
    alignItems: 'center',
    marginTop: SPACING.lg,
    padding: SPACING.sm,
  },
  backLinkText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  backLinkBold: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  // Success styles
  successContainer: {
    flexGrow: 1,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  successIconText: {
    fontSize: 50,
    color: '#fff',
  },
  successTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  successSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  resultCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  resultLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  resultValue: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '500',
  },
});

export default RegisterScreen;
