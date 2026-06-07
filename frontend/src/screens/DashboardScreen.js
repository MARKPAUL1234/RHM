import React, { useContext, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { HealthContext } from '../context/HealthContext';
import { TYPOGRAPHY, SPACING, SHADOWS, getResponsiveMetrics } from '../styles/theme';

const formatReading = (value, suffix = '') => {
  if (value === null || value === undefined || value === '') return 'No data';
  return `${value}${suffix}`;
};

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

function EmptyState({ text, colors }) {
  return (
    <View style={[emptyStyles(colors).box]}>
      <Text style={emptyStyles(colors).text}>{text}</Text>
    </View>
  );
}

const emptyStyles = (colors) => StyleSheet.create({
  box: {
    minHeight: 76,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  text: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default function DashboardScreen() {
  const {
    isFetchingData,
    connectionStatus,
    vitals,
    healthRecords,
    alerts,
    recommendations,
    emergencyEvents,
    fitnessSummary,
    queueCount,
    handleSyncQueue,
    markAlertRead,
    colors,
  } = useContext(HealthContext);
  const { width } = useWindowDimensions();
  const metrics = getResponsiveMetrics(width);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');

  const latestRecord = healthRecords[0] || null;
  const unreadAlerts = alerts.filter((alert) => alert.status !== 'read');
  const criticalAlerts = unreadAlerts.filter((alert) => alert.severity === 'critical');

  const trendRecords = useMemo(() => healthRecords.slice(0, 8).reverse(), [healthRecords]);
  const averageHeartRate = trendRecords.length
    ? Math.round(trendRecords.reduce((sum, record) => sum + Number(record.heart_rate || 0), 0) / trendRecords.length)
    : null;

  const statCards = [
    {
      label: 'Temperature',
      value: formatReading(vitals.temperature, ' C'),
      detail: latestRecord ? `Last captured ${formatDateTime(latestRecord.timestamp)}` : 'Awaiting first health record',
      tone: Number(vitals.temperature) > 38.5 ? 'critical' : 'normal',
    },
    {
      label: 'Heart Rate',
      value: formatReading(vitals.heartRate, ' bpm'),
      detail: averageHeartRate ? `Average ${averageHeartRate} bpm across recent records` : 'No recent trend yet',
      tone: Number(vitals.heartRate) > 100 ? 'warning' : 'normal',
    },
    {
      label: 'Oxygen Saturation',
      value: formatReading(vitals.spo2, '%'),
      detail: Number(vitals.spo2) < 92 ? 'Low oxygen threshold crossed' : 'Backend triage threshold 92%',
      tone: Number(vitals.spo2) < 92 ? 'critical' : 'normal',
    },
    {
      label: 'Activity Plan',
      value: fitnessSummary.locked ? 'Recovery' : `${fitnessSummary.daily_steps || 0} steps`,
      detail: fitnessSummary.locked ? 'Exercise is locked by clinical rules' : `Goal ${fitnessSummary.goal_steps || 10000} steps`,
      tone: fitnessSummary.locked ? 'warning' : 'normal',
    },
  ];

  const syncQueue = async () => {
    const result = await handleSyncQueue();
    if (result.success) {
      setSyncStatusMsg(`Synced ${result.syncedCount || 0} queued record(s).`);
    } else {
      setSyncStatusMsg(result.error || 'Queue sync was not completed.');
    }
    setTimeout(() => setSyncStatusMsg(''), 3200);
  };

  if (isFetchingData) {
    return (
      <View style={[styles(colors, metrics).loadingState]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles(colors, metrics).loadingText}>Loading authenticated health data...</Text>
      </View>
    );
  }

  const s = styles(colors, metrics);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={s.pageInner}>
        <View style={s.hero}>
          <View style={s.heroCopy}>
            <Text style={s.eyebrow}>Clinical Command Center</Text>
            <Text style={s.pageTitle}>Patient overview</Text>
            <Text style={s.pageSubtitle}>
              Live Django records, generated alerts, recommendations, and offline queue state in one operational view.
            </Text>
          </View>
          <View style={s.heroStatus}>
            <Text style={s.statusLabel}>Connection</Text>
            <Text style={[s.statusValue, { color: connectionStatus === 'online' ? colors.online : colors.offline }]}>
              {connectionStatus === 'online' ? 'Online sync' : 'Offline queue'}
            </Text>
            <Text style={s.statusMeta}>{queueCount} pending record(s)</Text>
          </View>
        </View>

        <View style={s.syncBanner}>
          <View style={s.syncCopy}>
            <Text style={s.syncTitle}>{queueCount > 0 ? 'Offline queue pending' : 'Backend sync healthy'}</Text>
            <Text style={s.syncText}>
              {queueCount > 0
                ? 'Measurements saved while offline can be pushed to Django when connectivity is available.'
                : 'Recent records, alerts, recommendations, nutrition logs, and emergency events are refreshed from Django.'}
            </Text>
          </View>
          <TouchableOpacity
            style={[s.secondaryButton, (connectionStatus !== 'online' || queueCount === 0) && s.disabledButton]}
            onPress={syncQueue}
            disabled={connectionStatus !== 'online' || queueCount === 0}
          >
            <Text style={s.secondaryButtonText}>Sync queue</Text>
          </TouchableOpacity>
        </View>

        {syncStatusMsg ? (
          <View style={s.inlineNotice}>
            <Text style={s.inlineNoticeText}>{syncStatusMsg}</Text>
          </View>
        ) : null}

        {criticalAlerts.length > 0 ? (
          <View style={[s.alertPanel, SHADOWS.premium]}>
            <View style={s.sectionHeader}>
              <View>
                <Text style={s.sectionKicker}>Immediate attention</Text>
                <Text style={s.sectionTitle}>Active clinical alerts</Text>
              </View>
              <Text style={s.alertCount}>{criticalAlerts.length}</Text>
            </View>
            {criticalAlerts.slice(0, 3).map((alert) => (
              <View key={alert.id} style={s.alertRow}>
                <View style={s.alertCopy}>
                  <Text style={s.alertSeverity}>{alert.severity.toUpperCase()}</Text>
                  <Text style={s.alertMessage}>{alert.alert_message}</Text>
                  <Text style={s.alertTime}>{formatDateTime(alert.timestamp)}</Text>
                </View>
                <TouchableOpacity style={s.primarySmallButton} onPress={() => markAlertRead(alert.id)}>
                  <Text style={s.primarySmallButtonText}>Acknowledge</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}

        <View style={s.statGrid}>
          {statCards.map((card) => {
            const toneColor = card.tone === 'critical' ? colors.critical : card.tone === 'warning' ? colors.warning : colors.secondary;
            return (
              <View key={card.label} style={[s.statCard, SHADOWS.subtle]}>
                <View style={[s.statMarker, { backgroundColor: toneColor }]} />
                <Text style={s.statLabel}>{card.label}</Text>
                <Text style={[s.statValue, { color: toneColor }]}>{card.value}</Text>
                <Text style={s.statDetail}>{card.detail}</Text>
              </View>
            );
          })}
        </View>

        <View style={s.contentGrid}>
          <View style={[s.card, s.largeCard, SHADOWS.subtle]}>
            <View style={s.sectionHeader}>
              <View>
                <Text style={s.sectionKicker}>Vitals trend</Text>
                <Text style={s.sectionTitle}>Recent biometric records</Text>
              </View>
              <Text style={s.sectionMeta}>{trendRecords.length} records</Text>
            </View>
            {trendRecords.length === 0 ? (
              <EmptyState colors={colors} text="Submit a monitoring journal entry to populate authenticated trend data." />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chartScroller}>
                {trendRecords.map((record) => {
                  const temp = Number(record.temperature || 0);
                  const pulse = Number(record.heart_rate || 0);
                  const oxygen = Number(record.spo2 || 0);
                  const pulseHeight = Math.max(18, Math.min(128, (pulse / 130) * 128));
                  const tempHeight = Math.max(18, Math.min(128, ((temp - 34) / 8) * 128));
                  return (
                    <View key={record.id} style={s.chartColumn}>
                      <View style={s.chartBars}>
                        <View style={[s.bar, { height: tempHeight, backgroundColor: temp > 38.5 ? colors.critical : colors.warning }]} />
                        <View style={[s.bar, { height: pulseHeight, backgroundColor: pulse > 100 ? colors.warning : colors.primary }]} />
                      </View>
                      <Text style={s.chartValue}>{oxygen}%</Text>
                      <Text style={s.chartLabel}>
                        {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}
            <View style={s.legendRow}>
              <Text style={s.legendText}>Temperature and pulse bars; oxygen label below each record.</Text>
            </View>
          </View>

          <View style={[s.card, s.sideCard, SHADOWS.subtle]}>
            <View style={s.sectionHeader}>
              <View>
                <Text style={s.sectionKicker}>Rules engine</Text>
                <Text style={s.sectionTitle}>Care recommendations</Text>
              </View>
            </View>
            {recommendations.length === 0 ? (
              <EmptyState colors={colors} text="No recommendation rules have triggered for this patient yet." />
            ) : (
              recommendations.slice(0, 3).map((rec) => (
                <View key={rec.id} style={s.recommendationItem}>
                  <Text style={s.recommendationTitle}>{rec.fluid_target}</Text>
                  <Text style={s.recommendationText}>{rec.lifestyle_guideline}</Text>
                  <Text style={s.recommendationMeta}>{formatDateTime(rec.created_at)}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={s.contentGrid}>
          <View style={[s.card, s.sideCard, SHADOWS.subtle]}>
            <View style={s.sectionHeader}>
              <View>
                <Text style={s.sectionKicker}>Alerts feed</Text>
                <Text style={s.sectionTitle}>Unread notifications</Text>
              </View>
              <Text style={s.sectionMeta}>{unreadAlerts.length}</Text>
            </View>
            {unreadAlerts.length === 0 ? (
              <EmptyState colors={colors} text="No unread alerts from Django." />
            ) : (
              unreadAlerts.slice(0, 4).map((alert) => (
                <View key={alert.id} style={s.feedRow}>
                  <View style={[s.feedDot, { backgroundColor: alert.severity === 'critical' ? colors.critical : colors.warning }]} />
                  <View style={s.feedCopy}>
                    <Text style={s.feedTitle}>{alert.severity}</Text>
                    <Text style={s.feedText}>{alert.alert_message}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={[s.card, s.sideCard, SHADOWS.subtle]}>
            <View style={s.sectionHeader}>
              <View>
                <Text style={s.sectionKicker}>Emergency</Text>
                <Text style={s.sectionTitle}>Recent dispatch events</Text>
              </View>
              <Text style={s.sectionMeta}>{emergencyEvents.length}</Text>
            </View>
            {emergencyEvents.length === 0 ? (
              <EmptyState colors={colors} text="No emergency dispatch events recorded." />
            ) : (
              emergencyEvents.slice(0, 3).map((event) => (
                <View key={event.id} style={s.feedRow}>
                  <View style={[s.feedDot, { backgroundColor: event.status === 'queued' ? colors.warning : colors.critical }]} />
                  <View style={s.feedCopy}>
                    <Text style={s.feedTitle}>{event.status}</Text>
                    <Text style={s.feedText}>{event.primary_contact}</Text>
                    <Text style={s.feedMeta}>{formatDateTime(event.timestamp)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = (colors, metrics) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: metrics.pagePadding,
    paddingBottom: metrics.isPhone ? 96 : 40,
  },
  pageInner: {
    width: '100%',
    maxWidth: metrics.contentMaxWidth,
    alignSelf: 'center',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: SPACING.sm,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  hero: {
    flexDirection: metrics.isPhone ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: metrics.isPhone ? 'stretch' : 'flex-end',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
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
  pageSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    maxWidth: 680,
  },
  heroStatus: {
    minWidth: metrics.isPhone ? '100%' : 210,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: metrics.cardPadding,
  },
  statusLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: 2,
  },
  statusMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  syncBanner: {
    flexDirection: metrics.isPhone ? 'column' : 'row',
    alignItems: metrics.isPhone ? 'stretch' : 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: metrics.cardPadding,
    marginBottom: SPACING.md,
  },
  syncCopy: {
    flex: 1,
  },
  syncTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 3,
  },
  syncText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  secondaryButton: {
    minHeight: 40,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  disabledButton: {
    opacity: 0.45,
  },
  inlineNotice: {
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  inlineNoticeText: {
    color: colors.textPrimary,
    fontSize: 12,
    textAlign: 'center',
  },
  alertPanel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.critical,
    borderRadius: 8,
    padding: metrics.cardPadding,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionKicker: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 3,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  sectionMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  alertCount: {
    minWidth: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.critical,
    color: '#FFFFFF',
    textAlign: 'center',
    paddingTop: 7,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  alertRow: {
    flexDirection: metrics.isPhone ? 'column' : 'row',
    alignItems: metrics.isPhone ? 'stretch' : 'center',
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: SPACING.md,
    marginTop: SPACING.sm,
  },
  alertCopy: {
    flex: 1,
  },
  alertSeverity: {
    color: colors.critical,
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 3,
  },
  alertMessage: {
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 19,
  },
  alertTime: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  primarySmallButton: {
    minHeight: 36,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.critical,
  },
  primarySmallButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: metrics.isPhone ? '100%' : metrics.isTablet ? '47%' : '22%',
    minWidth: metrics.isPhone ? '100%' : 210,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: metrics.cardPadding,
    position: 'relative',
    overflow: 'hidden',
  },
  statMarker: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 23,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 6,
  },
  statDetail: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  contentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: metrics.cardPadding,
  },
  largeCard: {
    flexGrow: 1,
    flexBasis: metrics.isPhone ? '100%' : '60%',
    minWidth: metrics.isPhone ? '100%' : 460,
  },
  sideCard: {
    flexGrow: 1,
    flexBasis: metrics.isPhone ? '100%' : '34%',
    minWidth: metrics.isPhone ? '100%' : 320,
  },
  chartScroller: {
    minHeight: 174,
    alignItems: 'flex-end',
    gap: SPACING.md,
    paddingTop: SPACING.md,
    paddingRight: SPACING.md,
  },
  chartColumn: {
    width: 68,
    alignItems: 'center',
  },
  chartBars: {
    height: 136,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  bar: {
    width: 15,
    borderRadius: 6,
  },
  chartValue: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: 8,
  },
  chartLabel: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  legendRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
  },
  legendText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  recommendationItem: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: SPACING.md,
    marginTop: SPACING.sm,
  },
  recommendationTitle: {
    color: colors.secondary,
    fontSize: 13,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 4,
  },
  recommendationText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  recommendationMeta: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 6,
  },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: SPACING.md,
    marginTop: SPACING.sm,
  },
  feedDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginTop: 5,
  },
  feedCopy: {
    flex: 1,
    minWidth: 0,
  },
  feedTitle: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  feedText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  feedMeta: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 4,
  },
});
