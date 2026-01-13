import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../styles/theme';

const RegulationsScreen = () => {
  const regulations = [
    {
      id: 1,
      title: 'Giờ làm việc',
      content: 'Nhân viên phải có mặt tại công ty từ 8:30 sáng đến 17:30 chiều, từ Thứ Hai đến Thứ Bảy.',
    },
    {
      id: 2,
      title: 'Check-in / Check-out',
      content: 'Nhân viên phải thực hiện check-in khi đến và check-out khi rời công ty thông qua hệ thống nhận diện khuôn mặt.',
    },
    {
      id: 3,
      title: 'Đi trễ',
      content: 'Check-in sau 8:30 sáng được tính là đi trễ. Đi trễ quá 3 lần/tháng sẽ ảnh hưởng đến điểm chuyên cần.',
    },
    {
      id: 4,
      title: 'Vắng mặt',
      content: 'Không check-in trong ngày làm việc sẽ được tính là vắng mặt không phép, trừ khi có đơn xin nghỉ được duyệt.',
    },
    {
      id: 5,
      title: 'Điểm chuyên cần',
      content: 'Điểm chuyên cần được tính dựa trên số ngày đi làm đúng giờ, đi trễ và vắng mặt trong tháng.',
    },
    {
      id: 6,
      title: 'Xin nghỉ phép',
      content: 'Nhân viên cần gửi đơn xin nghỉ phép ít nhất 1 ngày trước qua hệ thống hoặc liên hệ trực tiếp với quản lý.',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 Quy định chấm công</Text>
      </View>

      <ScrollView style={styles.content}>
        {regulations.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberText}>{item.id}</Text>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
            </View>
            <Text style={styles.cardContent}>{item.content}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Cập nhật lần cuối: 01/01/2026
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
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  numberBadge: {
    backgroundColor: COLORS.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  numberText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: FONT_SIZES.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  cardContent: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginLeft: 40,
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

export default RegulationsScreen;
