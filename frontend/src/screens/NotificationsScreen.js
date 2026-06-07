import React, { useContext, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { HealthContext } from '../context/HealthContext';
import { TYPOGRAPHY, SPACING, SHADOWS, getResponsiveMetrics } from '../styles/theme';

const filters = [
  { key: 'all', label: 'All' },
  { key: 'critical', label: 'Critical' },
  { key: 'nutrition', label: 'Nutrition' },
  { key: 'emergency', label: 'Emergency' },
  { key: 'system', label: 'System' },
];

const formatDateTime = (value) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function NotificationsScreen() {
  const {
    alerts,
    recommendations,
    logs,
    emergencyEvents,
    dndEnabled,
    setDndEnabled,
    markAlertRead,
    colors,
  } = useContext(HealthContext);
  const { width } = useWindowDimensions();
  const metrics = getResponsiveMetrics(width);
  const [filter, setFilter] = useState('all');

  const allNotifications = useMemo(() => {
    const alertNotifications = alerts.map((alert) => ({
      id: `alert_${alert.id}`,
      rawId: alert.id,
      category: alert.severity === 'critical' ? 'critical' : 'system',
      title: alert.severity === 'critical' ? 'Critical clinical alert' : 'Clinical alert',
      message: alert.alert_message,
      timestamp: alert.timestamp,
      read: alert.status === 'read',
      canAcknowledge: alert.status !== 'read',
      tone: alert.severity === 'critical' ? 'critical' : 'warning',
    }));

    const recommendationNotifications = recommendations.map((rec) => ({
      id: `rec_${rec.id}`,
      category: 'nutrition',
      title: 'Care recommendation',
      message: rec.lifestyle_guideline,
      timestamp: rec.created_at,
      read: true,
      tone: 'nutrition',
    }));

    const emergencyNotifications = emergencyEvents.map((event) => ({
      id: `emergency_${event.id}`,
      category: 'emergency',
      title: `Emergency event ${event.status}`,
      message: event.sms_content,
      timestamp: event.timestamp,
      read: true,
      tone: 'critical',
    }));

    const logNotifications = logs.slice(0, 20).map((log) => ({
      id: `log_${log.id}`,
      category: log.level === 'ERROR' || log.level === 'WARN' ? 'critical' : 'system',
      title: `${log.level} backend log`,
      message: log.message,
      timestamp: log.timestamp,
      read: true,
      tone: log.level === 'ERROR' || log.level === 'WARN' ? 'critical' : 'system',
    }));

    return [
      ...alertNotifications,
      ...recommendationNotifications,
      ...emergencyNotifications,
      ...logNotifications,
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [alerts, emergencyEvents, logs, recommendations]);

  const filteredNotifications = allNotifications.filter((item) => {
    if (filter === 'all') return true;
    return item.category === filter;
  });

  const unreadCount = alerts.filter((alert) => alert.status !== 'read').length;
  const s = styles(colors, metrics);

  const toneColor = (tone) => {
    if (tone === 'critical') return colors.critical;
    if (tone === 'warning') return colors.warning;
    if (tone === 'nutrition') return colors.secondary;
    return colors.primary;
  };

  return (
    <View style={s.container}>
      <View style={s.pageFrame}>
        <View style={s.pageHeader}>
          <View>
            <Text style={s.eyebrow}>Notifications</Text>
            <Text style={s.pageTitle}>Event feed</Text>
          </View>
          <View style={s.unreadCard}>
            <Text style={s.unreadLabel}>Unread alerts</Text>
            <Text style={s.unreadValue}>{dndEnabled ? 0 : unreadCount}</Text>
          </View>
        </View>

        <View style={[s.dndControlCard, SHADOWS.subtle]}>
          <View style={s.dndLeft}>
            <Text style={s.dndTitle}>Do not disturb</Text>
            <Text style={s.dndDesc}>
              {dndEnabled
                ? 'Visual alert counts are muted while the event feed remains available.'
                : 'Critical warnings remain visible across the clinical workspace.'}
            </Text>
          </View>
          <Switch
            value={dndEnabled}
            onValueChange={setDndEnabled}
            trackColor={{ false: colors.surfaceLight, true: colors.primary }}
            thumbColor={dndEnabled ? colors.primaryLight : colors.textSecondary}
          />
        </View>

        <View style={s.filterRow}>
          {filters.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[s.filterTab, filter === item.key && s.activeFilterTab]}
              onPress={() => setFilter(item.key)}
            >
              <Text style={[s.filterTabText, filter === item.key ? s.activeFilterText : s.inactiveFilterText]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.pageInner}>
          {filteredNotifications.length === 0 ? (
            <View style={s.emptyContainer}>
              <Text style={s.emptyText}>No events found for this filter.</Text>
            </View>
          ) : (
            filteredNotifications.map((item) => {
              const itemColor = toneColor(item.tone);
              return (
                <View key={item.id} style={[s.alertCard, { borderLeftColor: itemColor }, item.read ? null : s.unreadBorder]}>
                  <View style={s.alertHeader}>
                    <View style={s.alertHeaderLeft}>
                      <View style={[s.categoryDot, { backgroundColor: itemColor }]} />
                      <Text style={s.alertCardTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                    </View>
                    <Text style={[s.categoryTag, { color: itemColor }]}>{item.category.toUpperCase()}</Text>
                  </View>

                  <Text style={s.alertCardMsg}>{item.message}</Text>

                  <View style={s.alertFooter}>
                    <Text style={s.alertTime}>{formatDateTime(item.timestamp)}</Text>
                    {item.canAcknowledge ? (
                      <TouchableOpacity style={s.ackButton} onPress={() => markAlertRead(item.rawId)}>
                        <Text style={s.ackButtonText}>Acknowledge</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={s.readState}>{item.read ? 'Read' : 'Unread'}</Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = (colors, metrics) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pageFrame: {
    padding: metrics.pagePadding,
    paddingBottom: 0,
  },
  pageInner: {
    width: '100%',
    maxWidth: metrics.contentMaxWidth,
    alignSelf: 'center',
  },
  pageHeader: {
    width: '100%',
    maxWidth: metrics.contentMaxWidth,
    alignSelf: 'center',
    flexDirection: metrics.isPhone ? 'column' : 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 4,
  },
  pageTitle: {
    color: colors.textPrimary,
    fontSize: metrics.isPhone ? 24 : 30,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  unreadCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: metrics.cardPadding,
    minWidth: metrics.isPhone ? '100%' : 180,
  },
  unreadLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  unreadValue: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: 2,
  },
  dndControlCard: {
    width: '100%',
    maxWidth: metrics.contentMaxWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: metrics.cardPadding,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  dndLeft: {
    flex: 1,
  },
  dndTitle: {
    color: colors.textPrimary,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: 15,
    marginBottom: 4,
  },
  dndDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  filterRow: {
    width: '100%',
    maxWidth: metrics.contentMaxWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  filterTab: {
    flexGrow: 1,
    flexBasis: metrics.isPhone ? '30%' : 120,
    minHeight: 38,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  activeFilterTab: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.primary,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  activeFilterText: {
    color: colors.primary,
  },
  inactiveFilterText: {
    color: colors.textSecondary,
  },
  scrollContent: {
    padding: metrics.pagePadding,
    paddingTop: SPACING.sm,
    paddingBottom: metrics.isPhone ? 96 : 40,
  },
  alertCard: {
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: metrics.cardPadding,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unreadBorder: {
    backgroundColor: colors.elevated,
  },
  alertHeader: {
    flexDirection: metrics.isTiny ? 'column' : 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: 8,
  },
  alertHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: SPACING.sm,
  },
  categoryDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  alertCardTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: 14,
  },
  categoryTag: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  alertCardMsg: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: SPACING.sm,
  },
  alertFooter: {
    flexDirection: metrics.isTiny ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: metrics.isTiny ? 'flex-start' : 'center',
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: SPACING.sm,
  },
  alertTime: {
    color: colors.textMuted,
    fontSize: 11,
  },
  ackButton: {
    minHeight: 32,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },
  ackButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  readState: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  emptyContainer: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: SPACING.lg,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
