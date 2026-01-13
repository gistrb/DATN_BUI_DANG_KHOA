import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/common';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../styles/theme';

const HistoryScreen = () => {
  const { history, refreshData } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📅 Lịch sử chấm công</Text>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {history.length > 0 ? (
          <>
            <Text style={styles.subtitle}>Lịch sử gần đây</Text>
            {history.map((item, index) => (
              <View key={index} style={styles.historyItem}>
                <View style={styles.dateContainer}>
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
            ))}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>Chưa có lịch sử chấm công</Text>
            <Text style={styles.emptySubtext}>
              Lịch sử sẽ hiển thị sau khi bạn thực hiện check-in/check-out
            </Text>
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
  subtitle: {
    fontSize: FONT_SIZES.lg,
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
  dateContainer: {
    flex: 1,
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
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
});

export default HistoryScreen;
