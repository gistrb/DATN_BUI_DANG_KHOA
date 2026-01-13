import React from 'react';
import { View, Text, ScrollView, StyleSheet, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../styles/theme';

const AboutScreen = () => {
  const features = [
    { icon: '👤', title: 'Nhận diện khuôn mặt', desc: 'Chấm công bằng công nghệ nhận diện khuôn mặt AI' },
    { icon: '🔒', title: 'Bảo mật cao', desc: 'Chống giả mạo với kiểm tra liveness' },
    { icon: '📊', title: 'Thống kê chi tiết', desc: 'Theo dõi chuyên cần và lịch sử chấm công' },
    { icon: '🔔', title: 'Thông báo tức thì', desc: 'Nhận thông báo ngay khi chấm công' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ℹ️ Giới thiệu</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* App Info */}
        <View style={styles.appInfo}>
          <View style={styles.iconContainer}>
            <Text style={styles.appIcon}>📱</Text>
          </View>
          <Text style={styles.appName}>Face Attendance</Text>
          <Text style={styles.appVersion}>Phiên bản 1.0.0</Text>
        </View>

        {/* Description */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📝 Mô tả</Text>
          <Text style={styles.description}>
            Ứng dụng chấm công thông minh sử dụng công nghệ nhận diện khuôn mặt AI. 
            Giúp quản lý chấm công nhân viên một cách chính xác, nhanh chóng và bảo mật.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>✨ Tính năng</Text>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Technology */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔧 Công nghệ</Text>
          <View style={styles.techContainer}>
            {['React Native', 'InsightFace', 'Firebase FCM', 'Django'].map((tech) => (
              <View key={tech} style={styles.techBadge}>
                <Text style={styles.techText}>{tech}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Contact */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📧 Liên hệ hỗ trợ</Text>
          <Text style={styles.contactText}>Email: support@faceattendance.com</Text>
          <Text style={styles.contactText}>Hotline: 1900-xxxx</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 Face Attendance System</Text>
          <Text style={styles.footerText}>Đồ án tốt nghiệp</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.xl,
    backgroundColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  content: {
    padding: SPACING.xl,
  },
  appInfo: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
    marginBottom: SPACING.md,
  },
  appIcon: {
    fontSize: 40,
  },
  appName: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  appVersion: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  card: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  description: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  featureDesc: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  techContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  techBadge: {
    backgroundColor: COLORS.light,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
  },
  techText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    fontWeight: '600',
  },
  contactText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  footer: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
});

export default AboutScreen;
