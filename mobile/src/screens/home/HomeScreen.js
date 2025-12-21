import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Card, Badge } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../styles/theme';

const HomeScreen = () => {
  const { userInfo, stats, history, handleLogout } = useAuth();

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chào mừng, {userInfo?.full_name}</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Check if user is admin (no employee_id) */}
        {!userInfo?.employee_id ? (
          <Card title="Tài khoản Admin">
            <Text style={styles.infoText}>
              Ứng dụng này chỉ dành cho nhân viên. Vui lòng sử dụng trang web quản trị.
            </Text>
          </Card>
        ) : (
          <>
            {/* Stats Card */}
            {stats && (
              <Card title={`Thống kê (${stats.month})`}>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{stats.diligence_score}%</Text>
                    <Text style={styles.statLabel}>Chuyên cần</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: COLORS.success }]}>
                      {stats.on_time}
                    </Text>
                    <Text style={styles.statLabel}>Đúng giờ</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: COLORS.warning }]}>
                      {stats.late}
                    </Text>
                    <Text style={styles.statLabel}>Đi trễ</Text>
                  </View>
                </View>
              </Card>
            )}

            {/* History List */}
            <Text style={styles.sectionTitle}>Lịch sử gần đây</Text>
            {history.length > 0 ? (
              history.map((item, index) => (
                <View key={index} style={styles.historyItem}>
                  <View>
                    <Text style={styles.dateText}>{item.date}</Text>
                    <Text style={styles.timeText}>
                      Vào: {item.check_in} - Ra: {item.check_out}
                    </Text>
                  </View>
                  <Badge
                    text={item.status}
                    status={item.status_code}
                  />
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Chưa có lịch sử điểm danh</Text>
            )}
          </>
        )}
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
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  content: {
    padding: SPACING.xl,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statLabel: {
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    fontSize: FONT_SIZES.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    marginBottom: SPACING.lg,
    color: COLORS.text,
  },
  historyItem: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  dateText: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  timeText: {
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    fontSize: FONT_SIZES.sm,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
    marginTop: SPACING.xl,
  },
});

export default HomeScreen;
