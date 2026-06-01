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
import { TYPOGRAPHY, SPACING, SHADOWS } from '../styles/theme';

export default function NotificationsScreen() {
  const { alerts, dndEnabled, setDndEnabled, colors } = useContext(HealthContext);
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
    title: al.title || 'Live Clinical Alert',
    message: al.alert_message || al.message,
    timestamp: `Live, ${new Date(al.timestamp).toLocaleTimeString()}`,
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

  const s = styles(colors);

  return (
    <View style={s.container}>
      
      {/* 1. Global Do Not Disturb Controller Card */}
      <View style={s.dndControlCard}>
        <View style={s.dndLeft}>
          <Text style={s.dndTitle}>🤫 System Do Not Disturb (DND)</Text>
          <Text style={s.dndDesc}>
            {dndEnabled
              ? 'Muted. Critical warning banners are suppressed in active UI panels.'
              : 'Alerts active. Audio-visual warnings will fire immediately.'}
          </Text>
        </View>
        <Switch
          value={dndEnabled}
          onValueChange={setDndEnabled}
          trackColor={{ false: colors.surfaceLight, true: colors.primary }}
          thumbColor={dndEnabled ? colors.primaryLight : colors.textSecondary}
        />
      </View>

      {/* 2. Category Tab Switches */}
      <View style={s.filterRow}>
        {[
          { key: 'all', label: 'All Feeds' },
          { key: 'critical', label: 'Anomalies' },
          { key: 'nutrition', label: 'Nutrition' },
          { key: 'fitness', label: 'Fitness' },
        ].map(item => (
          <TouchableOpacity
            key={item.key}
            style={[s.filterTab, filter === item.key && s.activeFilterTab]}
            onPress={() => setFilter(item.key)}
          >
            <Text
              style={[
                s.filterTabText,
                filter === item.key ? s.activeFilterText : s.inactiveFilterText,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 3. Alerts Feed List */}
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {filteredNotifications.length === 0 ? (
          <View style={s.emptyContainer}>
            <Text style={s.emptyIcon}>📭</Text>
            <Text style={s.emptyText}>No alerts found in this category.</Text>
          </View>
        ) : (
          filteredNotifications.map(item => {
            // Pick category colors
            let sideColor = colors.border;
            let iconText = '🔔';
            if (item.category === 'critical') {
              sideColor = colors.critical;
              iconText = '⚠️';
            } else if (item.category === 'nutrition') {
              sideColor = colors.online;
              iconText = '🍎';
            } else if (item.category === 'fitness') {
              sideColor = colors.accent;
              iconText = '🏃';
            }

            return (
              <View
                key={item.id}
                style={[
                  s.alertCard,
                  { borderLeftColor: sideColor },
                  item.isLive && s.liveBorder,
                ]}
              >
                <View style={s.alertHeader}>
                  <View style={s.alertHeaderLeft}>
                    <Text style={s.categoryIcon}>{iconText}</Text>
                    <Text style={s.alertCardTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                  </View>
                  {item.isLive && <Text style={s.liveTag}>LIVE ALERT</Text>}
                </View>

                <Text style={s.alertCardMsg}>{item.message}</Text>
                
                <View style={s.alertFooter}>
                  <Text style={s.alertTime}>{item.timestamp}</Text>
                  <Text style={s.categoryTag}>{item.category.toUpperCase()}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  dndControlCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: SPACING.md + 4,
    margin: SPACING.md,
    borderRadius: SPACING.borderRadius,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dndLeft: {
    flex: 0.85,
  },
  dndTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: TYPOGRAPHY.sizes.body,
    marginBottom: 4,
  },
  dndDesc: {
    color: colors.textSecondary,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeFilterTab: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.primaryLight,
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  activeFilterText: {
    color: colors.primaryLight,
  },
  inactiveFilterText: {
    color: colors.textSecondary,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  alertCard: {
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
    borderRadius: SPACING.borderRadiusSm,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  liveBorder: {
    borderColor: colors.critical,
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
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 13,
  },
  liveTag: {
    color: colors.critical,
    fontSize: 8,
    fontWeight: 'bold',
    borderWidth: 1,
    borderColor: colors.critical,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  alertCardMsg: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginTop: 4,
  },
  alertTime: {
    color: colors.textMuted,
    fontSize: 10,
  },
  categoryTag: {
    color: colors.textMuted,
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
    color: colors.textSecondary,
    fontSize: TYPOGRAPHY.sizes.body,
  },
});
