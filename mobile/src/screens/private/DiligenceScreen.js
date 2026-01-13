import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../styles/theme';

const DiligenceScreen = () => {
  const { stats, refreshData } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  // Calculate diligence level
  const getDiligenceLevel = (score) => {
    if (score >= 90) return { label: 'Xuất sắc', color: COLORS.success };
    if (score >= 75) return { label: 'Tốt', color: COLORS.primary };
    if (score >= 50) return { label: 'Trung bình', color: COLORS.warning };
    return { label: 'Cần cải thiện', color: COLORS.danger };
  };

  const diligenceLevel = stats ? getDiligenceLevel(stats.diligence_score) : null;

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📊 Chuyên cần</Text>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {stats ? (
          <>
            {/* Month Display */}
            <Text style={styles.monthTitle}>{stats.month}</Text>

            {/* Main Score Card */}
            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>Điểm chuyên cần</Text>
              <Text style={[styles.scoreValue, { color: diligenceLevel.color }]}>
                {stats.diligence_score}%
              </Text>
              <View style={[styles.levelBadge, { backgroundColor: diligenceLevel.color }]}>
                <Text style={styles.levelText}>{diligenceLevel.label}</Text>
              </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: COLORS.success }]}>
                  {stats.on_time}
                </Text>
                <Text style={styles.statLabel}>Đúng giờ</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: COLORS.warning }]}>
                  {stats.late}
                </Text>
                <Text style={styles.statLabel}>Đi trễ</Text>
              </View>
            </View>

            {/* Info Card */}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>💡 Cách tính điểm chuyên cần</Text>
              <Text style={styles.infoText}>
                Điểm chuyên cần được tính dựa trên số ngày đi làm đúng giờ so với tổng số ngày làm việc trong tháng.
              </Text>
              <View style={styles.formulaBox}>
                <Text style={styles.formulaText}>
                  Điểm = (Số ngày đúng giờ / Tổng ngày làm việc) × 100
                </Text>
              </View>
            </View>

            {/* Level Guide */}
            <View style={styles.levelGuide}>
              <Text style={styles.levelGuideTitle}>Thang điểm</Text>
              <View style={styles.levelRow}>
                <View style={[styles.levelDot, { backgroundColor: COLORS.success }]} />
                <Text style={styles.levelRangeText}>90-100%: Xuất sắc</Text>
              </View>
              <View style={styles.levelRow}>
                <View style={[styles.levelDot, { backgroundColor: COLORS.primary }]} />
                <Text style={styles.levelRangeText}>75-89%: Tốt</Text>
              </View>
              <View style={styles.levelRow}>
                <View style={[styles.levelDot, { backgroundColor: COLORS.warning }]} />
                <Text style={styles.levelRangeText}>50-74%: Trung bình</Text>
              </View>
              <View style={styles.levelRow}>
                <View style={[styles.levelDot, { backgroundColor: COLORS.danger }]} />
                <Text style={styles.levelRangeText}>Dưới 50%: Cần cải thiện</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>Chưa có dữ liệu thống kê</Text>
          </View>
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
  monthTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  scoreCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  scoreLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  levelBadge: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.round,
    marginTop: SPACING.md,
  },
  levelText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: FONT_SIZES.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  statValue: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  infoTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  formulaBox: {
    backgroundColor: COLORS.light,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
  },
  formulaText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  levelGuide: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xxxl,
    ...SHADOWS.sm,
  },
  levelGuideTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  levelDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SPACING.md,
  },
  levelRangeText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl * 2,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: SPACING.lg,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
});

export default DiligenceScreen;
