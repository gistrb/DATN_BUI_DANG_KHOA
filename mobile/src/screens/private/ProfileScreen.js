import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../styles/theme';

const ProfileScreen = () => {
  const { userInfo, handleLogout, refreshData } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };


  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👤 Thông tin cá nhân</Text>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userInfo?.full_name?.charAt(0).toUpperCase() || 'N'}
            </Text>
          </View>
          <Text style={styles.fullName}>{userInfo?.full_name || 'Nhân viên'}</Text>
          <Text style={styles.employeeId}>Mã NV: {userInfo?.employee_id || 'N/A'}</Text>
        </View>

        {/* Employee Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Thông tin nhân viên</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Họ tên:</Text>
            <Text style={styles.value}>{userInfo?.full_name || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Mã NV:</Text>
            <Text style={styles.value}>{userInfo?.employee_id || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{userInfo?.email || 'N/A'}</Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪 Đăng xuất</Text>
        </TouchableOpacity>
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
  profileCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  fullName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  employeeId: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  card: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  successNotification: {
    backgroundColor: COLORS.onTime,
  },
  warningNotification: {
    backgroundColor: COLORS.late,
  },
  dangerNotification: {
    backgroundColor: COLORS.absent,
  },
  notificationIcon: {
    fontSize: 20,
    marginRight: SPACING.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  notificationDesc: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  value: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  logoutButton: {
    backgroundColor: COLORS.danger,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xxxl,
  },
  logoutText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  // New styles for enhanced notifications
  notificationHeader: {
    marginBottom: SPACING.md,
  },
  todayDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  timeline: {
    backgroundColor: COLORS.light,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: SPACING.md,
  },
  dotSuccess: {
    backgroundColor: COLORS.success,
  },
  dotPending: {
    backgroundColor: COLORS.border,
    borderWidth: 2,
    borderColor: COLORS.textSecondary,
  },
  timelineContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  timelineValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  timelinePending: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  timelineLine: {
    width: 2,
    height: 20,
    backgroundColor: COLORS.border,
    marginLeft: 7,
    marginVertical: SPACING.xs,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  statusLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
  },
  statusBadge: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.secondary,
  },
  statusOnTime: {
    backgroundColor: COLORS.success,
  },
  statusLate: {
    backgroundColor: COLORS.warning,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.white,
  },
  notificationMessages: {
    marginTop: SPACING.sm,
  },
  infoNotification: {
    backgroundColor: '#e3f2fd',
  },
});

export default ProfileScreen;
