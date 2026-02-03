import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../styles/theme';

const PublicNotificationsScreen = () => {
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📢 Thông báo chấm công</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Work Schedule Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⏰ Giờ làm việc</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Bắt đầu:</Text>
            <Text style={styles.value}>8:30 sáng</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Kết thúc:</Text>
            <Text style={styles.value}>17:30 chiều</Text>
          </View>
        </View>

        {/* Reminder Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔔 Nhắc nhở</Text>
          <Text style={styles.description}>
            Hệ thống sẽ gửi thông báo nhắc nhở chấm công trước 15 phút khi đến giờ làm việc.
          </Text>
          <View style={styles.reminderInfo}>
            <Text style={styles.reminderTime}>📲 8:15 sáng</Text>
            <Text style={styles.reminderText}>Nhắc nhở check-in</Text>
          </View>
        </View>



        {/* Note */}
        <View style={styles.noteCard}>
          <Text style={styles.noteText}>
            💡 Đăng nhập để nhận thông báo chấm công cá nhân
          </Text>
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
  card: {
    backgroundColor: COLORS.white,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  label: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  value: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  description: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  reminderInfo: {
    backgroundColor: COLORS.light,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderTime: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginRight: SPACING.md,
  },
  reminderText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  dayBadge: {
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
  },
  dayText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: FONT_SIZES.sm,
  },
  dayOff: {
    backgroundColor: COLORS.danger,
  },
  dayOffText: {
    color: COLORS.white,
  },
  noteCard: {
    backgroundColor: COLORS.light,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
  },
  noteText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default PublicNotificationsScreen;
