import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../../styles/theme';

const Badge = ({ 
  text, 
  status = 'default', // 'on_time', 'late', 'absent', 'default'
  style,
  textStyle,
}) => {
  const getColors = () => {
    switch (status.toLowerCase()) {
      case 'on_time':
        return { bg: COLORS.onTime, text: COLORS.onTimeText };
      case 'late':
        return { bg: COLORS.late, text: COLORS.lateText };
      case 'absent':
        return { bg: COLORS.absent, text: COLORS.absentText };
      default:
        return { bg: COLORS.light, text: COLORS.text };
    }
  };

  const colors = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, style]}>
      <Text style={[styles.badgeText, { color: colors.text }, textStyle]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  badgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: 'bold',
  },
});

export default Badge;
