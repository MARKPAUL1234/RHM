
import React from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { TYPOGRAPHY, SPACING, LIGHT_COLORS } from '../styles/theme';

export const ToastTypes = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

export default function Toast({
  visible,
  message,
  type = ToastTypes.INFO,
  onClose,
  duration = 3000,
}) {
  const [opacity] = React.useState(new Animated.Value(0));
  const [translateY] = React.useState(new Animated.Value(-100));

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      if (duration > 0) {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
      }
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, opacity, translateY, onClose, duration]);

  const getColors = () => {
    switch (type) {
      case ToastTypes.SUCCESS:
        return {
          background: '#D1FAE5',
          border: '#6EE7B7',
          text: '#065F46',
          icon: '✓',
        };
      case ToastTypes.ERROR:
        return {
          background: '#FEE2E2',
          border: '#FCA5A5',
          text: '#991B1B',
          icon: '✕',
        };
      case ToastTypes.WARNING:
        return {
          background: '#FFFBEB',
          border: '#FDE68A',
          text: '#92400E',
          icon: '⚠',
        };
      case ToastTypes.INFO:
      default:
        return {
          background: '#DBEAFE',
          border: '#93C5FD',
          text: '#1E40AF',
          icon: 'ℹ',
        };
    }
  };

  const colors = getColors();

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View
        style={[
          styles.toast,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.icon, { color: colors.text }]}>{colors.icon}</Text>
        <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={[styles.closeText, { color: colors.text }]}>✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SPACING.borderRadius,
    padding: SPACING.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  icon: {
    fontSize: TYPOGRAPHY.sizes.h3,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginRight: SPACING.sm,
  },
  message: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  closeText: {
    fontSize: TYPOGRAPHY.sizes.h3,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
});
