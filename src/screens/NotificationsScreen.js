import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { HealthContext } from '../context/HealthContext';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS } from '../styles/theme';

export default function NotificationsScreen() {
  const { alerts, dndEnabled, setDndEnabled } = useContext(HealthContext);
  const [filter, setFilter] = useState('all'); // 'all', 'critical', 'nutrition', 'fitness'

  // Pre-populated notifications representing prior logs
  const staticNotifications = [
    {
      id: 'fit_1',
      category: 'fitness',
      title: 'Fitness Reminder: Activity Window Open',
      message: 'You have been seated for 2 hours. A quick 10-minute cardiovascular stretching walk is recommended.',
      timestamp: 'Today, 10:15 AM',
      read: false,
    },
    {
      id: 'nut_1',
      category: 'nutrition',
      title: 'Hydration Target Checked',
      message: 'Calorie calibration logs show low fluid intake. Consume 500mL of water to maintain metabolic levels.',
      timestamp: 'Today, 08:30 AM',
      read: true,
    },
    {
      id: 'fit_2',
      category: 'fitness',
      title: 'Step Milestone Reached!',
      message: 'Congratulations! You passed 60% of your daily steps targets (6,240 / 10,000 steps). Keep moving.',
      timestamp: 'Yesterday, 06:12 PM',
      read: true,
    },
    {
      id: 'crit_1',
      category: 'critical',
      title: 'Device Node Offline Log',
      message: 'Node ESP32-RHM-NODE-001 temporarily disconnected. Buffering telemetry queue locally.',
      timestamp: 'Yesterday, 02:40 PM',
      read: true,
    },
    {
      id: 'nut_2',
      category: 'nutrition',
      title: 'Nutrition Goal Met',
      message: 'Blood group O+ parameters calibration completed. Meal plans loaded.',
      timestamp: 'Yesterday, 09:15 AM',
      read: true,
    },
  ];

  // Map dynamic live alarms from context to display as Critical notifications
  const liveNotifications = alerts.map((al, index) => ({
    id: `live_${index}`,
    category: al.severity === 'high' ? 'critical' : 'fitness',
    title: al.title,
    message: al.message,
    timestamp: `Live, ${al.timestamp}`,
    read: false,
    isLive: true,
  }));

  // Combine live telemetry alerts with static notifications history
  const allNotifications = [...liveNotifications, ...staticNotifications];

  // Apply filters
  const filteredNotifications = allNotifications.filter(item => {
    if (filter === 'all') return true;
    return item.category === filter;
  });

  return (
    <View style={styles.container}>
      
      {/* 1. Global Do Not Disturb Controller Card */}
      <View style={styles.dndControlCard}>
        <View style={styles.dndLeft}>
          <Text style={styles.dndTitle}>🤫 System Do Not Disturb (DND)</Text>
          <Text style={styles.dndDesc}>
            {dndEnabled
              ? 'Muted. Critical warning banners are suppressed in active UI panels.'
              : 'Alerts active. Audio-visual warnings will fire immediately.'}
          </Text>
        </View>
        <Switch
          value={dndEnabled}
          onValueChange={setDndEnabled}
          trackColor={{ false: COLORS.surfaceLight, true: COLORS.primary }}
          thumbColor={dndEnabled ? COLORS.primaryLight : COLORS.textSecondary}
        />
      </View>

      {/* 2. Category Tab Switches */}
      <View style={styles.filterRow}>
        {[
          { key: 'all', label: 'All Feeds' },
          { key: 'critical', label: 'Anomalies' },
          { key: 'nutrition', label: 'Nutrition' },
          { key: 'fitness', label: 'Fitness' },
        ].map(item => (
          <TouchableOpacity
            key={item.key}
            style={[styles.filterTab, filter === item.key && styles.activeFilterTab]}
            onPress={() => setFilter(item.key)}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === item.key ? styles.activeFilterText : styles.inactiveFilterText,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 3. Alerts Feed List */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No alerts found in this category.</Text>
          </View>
        ) : (
          filteredNotifications.map(item => {
            // Pick category colors
            let sideColor = COLORS.border;
            let iconText = '🔔';
            if (item.category === 'critical') {
              sideColor = COLORS.critical;
              iconText = '⚠️';
            } else if (item.category === 'nutrition') {
              sideColor = COLORS.online;
              iconText = '🍎';
            } else if (item.category === 'fitness') {
              sideColor = COLORS.accent;
              iconText = '🏃';
            }

            return (
              <View
                key={item.id}
                style={[
                  styles.alertCard,
                  { borderLeftColor: sideColor },
                  item.isLive && styles.liveBorder,
                ]}
              >
                <View style={styles.alertHeader}>
                  <View style={styles.alertHeaderLeft}>
                    <Text style={styles.categoryIcon}>{iconText}</Text>
                    <Text style={styles.alertCardTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                  </View>
                  {item.isLive && <Text style={styles.liveTag}>LIVE ALERT</Text>}
                </View>

                <Text style={styles.alertCardMsg}>{item.message}</Text>
                
                <View style={styles.alertFooter}>
                  <Text style={styles.alertTime}>{item.timestamp}</Text>
                  <Text style={styles.categoryTag}>{item.category.toUpperCase()}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  dndControlCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: SPACING.md + 4,
    margin: SPACING.md,
    borderRadius: SPACING.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dndLeft: {
    flex: 0.85,
  },
  dndTitle: {
    color: COLORS.textPrimary,
    fontWeight: 'bold',
    fontSize: TYPOGRAPHY.sizes.body,
    marginBottom: 4,
  },
  dndDesc: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    gap: 6,
  },
  filterTab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeFilterTab: {
    backgroundColor: COLORS.surfaceLight,
    borderColor: COLORS.primaryLight,
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  activeFilterText: {
    color: COLORS.primaryLight,
  },
  inactiveFilterText: {
    color: COLORS.textSecondary,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  alertCard: {
    backgroundColor: COLORS.surface,
    borderLeftWidth: 4,
    borderRadius: SPACING.borderRadiusSm,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  liveBorder: {
    borderColor: COLORS.critical,
    backgroundColor: 'rgba(239, 68, 68, 0.02)',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  alertHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.8,
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  alertCardTitle: {
    color: COLORS.textPrimary,
    fontWeight: 'bold',
    fontSize: 13,
  },
  liveTag: {
    color: COLORS.critical,
    fontSize: 8,
    fontWeight: 'bold',
    borderWidth: 1,
    borderColor: COLORS.critical,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  alertCardMsg: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    marginTop: 4,
  },
  alertTime: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  categoryTag: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.body,
  },
});
