import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { HealthContext } from '../context/HealthContext';
import { TYPOGRAPHY, SPACING, SHADOWS } from '../styles/theme';
import { HealthSyncManager } from '../services/appwrite';

// Pure React Native Skeleton Shimmer Loader Component
function SkeletonLoader() {
  const shimmerOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerOpacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerOpacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerOpacity]);

  return (
    <View style={skeletonStyles.container}>
      <Animated.View style={[skeletonStyles.bannerPlaceholder, { opacity: shimmerOpacity }]} />
      <Animated.View style={[skeletonStyles.chartPlaceholder, { opacity: shimmerOpacity }]} />
      <Animated.View style={[skeletonStyles.cardPlaceholder, { opacity: shimmerOpacity }]} />
      <Animated.View style={[skeletonStyles.cardPlaceholder, { opacity: shimmerOpacity }]} />
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  bannerPlaceholder: {
    height: 80,
    backgroundColor: '#2D2D2D',
    borderRadius: SPACING.borderRadiusSm,
  },
  chartPlaceholder: {
    height: 180,
    backgroundColor: '#2D2D2D',
    borderRadius: SPACING.borderRadius,
  },
  cardPlaceholder: {
    height: 120,
    backgroundColor: '#2D2D2D',
    borderRadius: SPACING.borderRadius,
  },
});

export default function DashboardScreen() {
  const {
    isFetchingData,
    connectionStatus,
    vitals,
    alerts,
    setAlerts,
    recommendations,
    queueCount,
    handleSyncQueue,
    refreshSyncStats,
    colors,
  } = useContext(HealthContext);

  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 600,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 600,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Handle Mark as Read for local session alerts
  const handleMarkAlertRead = async (alertId) => {
    try {
      const updatedAlerts = alerts.map(a => 
        a.alert_id === alertId ? { ...a, status: 'read' } : a
      );
      setAlerts(updatedAlerts);
      
      // Update in Appwrite simulated DB
      const currentAlerts = await HealthSyncManager.getAlerts();
      const updatedCloud = currentAlerts.map(a => 
        a.alert_id === alertId ? { ...a, status: 'read' } : a
      );
      await AsyncStorage.setItem('@rhmt_cloud_alerts', JSON.stringify(updatedCloud));
      await HealthSyncManager.logSystemAction('INFO', `Alert marked as read: ${alertId}`);
      await refreshSyncStats();
    } catch (e) {
      console.log("Failed to update alert state:", e);
    }
  };

  // Mock historical vitals dataset for SVG drawing
  const historicalVitals = [
    { time: '08:00', temp: 36.5, hr: 72 },
    { time: '10:00', temp: 36.8, hr: 76 },
    { time: '12:00', temp: 37.2, hr: 82 },
    { time: '14:00', temp: vitals.temperature, hr: vitals.heartRate }, // Live data coordinate point
  ];

  if (isFetchingData) {
    return <SkeletonLoader />;
  }

  const s = styles(colors);

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 1. Offline Mode Pending Sync Banner */}
        <View
          style={[
            s.networkBanner,
            {
              backgroundColor:
                connectionStatus === 'online'
                  ? 'rgba(225, 173, 1, 0.05)'
                  : 'rgba(102, 102, 102, 0.05)',
              borderColor:
                connectionStatus === 'online'
                  ? 'rgba(225, 173, 1, 0.15)'
                  : 'rgba(102, 102, 102, 0.15)',
            },
          ]}
        >
          <Text style={s.networkBannerText}>
            {connectionStatus === 'online'
              ? '🟢 Sync Pipeline Enabled (Online Appwrite Sync)'
              : 'Saved Locally (Pending Sync)'}
          </Text>
          {queueCount > 0 && (
            <TouchableOpacity
              style={s.syncButton}
              onPress={async () => {
                const res = await handleSyncQueue();
                if (res.success) {
                  setSyncStatusMsg('✅ Synced offline queue successfully!');
                  setTimeout(() => setSyncStatusMsg(''), 3000);
                }
              }}
              disabled={connectionStatus === 'offline'}
            >
              <Text style={[s.syncButtonText, connectionStatus === 'offline' && s.disabledText]}>
                Sync Now ({queueCount})
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {syncStatusMsg ? (
          <View style={s.statusMsgBox}>
            <Text style={s.statusMsgText}>{syncStatusMsg}</Text>
          </View>
        ) : null}

        {/* 2. Active Alarms / Critical Warning Banners (Gold/Charcoal palette) */}
        {alerts.filter(a => a.status === 'unread').length > 0 && (
          <View style={[s.alertsContainer, SHADOWS.premium]}>
            <View style={s.alertsHeader}>
              <Animated.Text style={[s.alertHeaderIcon, { transform: [{ scale: pulseAnim }] }]}>
                ⚠️
              </Animated.Text>
              <Text style={s.alertsTitle}>ACTIVE CLINICAL ALERTS ({alerts.filter(a => a.status === 'unread').length})</Text>
            </View>
            {alerts.filter(a => a.status === 'unread').slice(0, 2).map((alert) => (
              <View key={alert.alert_id} style={s.alertItem}>
                <View style={s.alertRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.alertItemTitle}>Critical Notification</Text>
                    <Text style={s.alertItemMsg}>{alert.alert_message}</Text>
                  </View>
                  <TouchableOpacity 
                    style={s.markReadBtn} 
                    onPress={() => handleMarkAlertRead(alert.alert_id)}
                  >
                    <Text style={s.markReadBtnText}>Acknowledge</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 3. Vitals Cards Summary */}
        <View style={s.vitalsGrid}>
          <View style={s.vitalCard}>
            <Text style={s.cardLabel}>BODY TEMPERATURE</Text>
            <Text style={[s.vitalValue, vitals.temperature > 38.0 && s.critText]}>{vitals.temperature}°C</Text>
            <Text style={s.cardSub}>Body Homeostasis</Text>
          </View>
          
          <View style={s.vitalCard}>
            <Text style={s.cardLabel}>HEART RATE</Text>
            <Text style={[s.vitalValue, vitals.heartRate > 100 && s.critText]}>{vitals.heartRate} BPM</Text>
            <Text style={s.cardSub}>Capillary Pulse</Text>
          </View>

          <View style={s.vitalCard}>
            <Text style={s.cardLabel}>OXYGEN LEVEL</Text>
            <Text style={[s.vitalValue, vitals.spo2 < 92 && s.critText]}>{vitals.spo2}%</Text>
            <Text style={s.cardSub}>SpO2 Perfused</Text>
          </View>
        </View>

        {/* 4. Historical Vitals SVG Chart Display */}
        <View style={[s.card, SHADOWS.premium]}>
          <Text style={s.cardTitle}>📈 Historical Biometric Summary (Last 4 Logs)</Text>
          <Text style={s.cardDesc}>
            Dynamic vector projection mapping temperature fluctuations and cardiac telemetry coordinates.
          </Text>

          {/* Simple Vector Plotted Grid Chart */}
          <View style={s.chartWrapper}>
            <View style={s.chartYLabels}>
              <Text style={s.yLabel}>39°C</Text>
              <Text style={s.yLabel}>37°C</Text>
              <Text style={s.yLabel}>35°C</Text>
            </View>
            
            <View style={s.chartMainArea}>
              {/* Plotting points using CSS layout vectors */}
              <View style={s.plottedGrid}>
                {/* Horizontal baseline guides */}
                <View style={s.baselineGuide} />
                <View style={s.baselineGuide} />
                <View style={s.baselineGuide} />
                
                {/* Plot line coordinates */}
                <View style={s.dotsRow}>
                  {historicalVitals.map((pt, index) => {
                    // Map temperature coordinates (range 34 to 40)
                    const tempPercent = Math.min(Math.max((pt.temp - 34) / 6, 0), 1) * 100;
                    return (
                      <View key={index} style={s.dotContainer}>
                        <View style={[s.vitalPlotDot, { bottom: `${tempPercent}%` }]} />
                        <Text style={s.dotLabel}>{pt.temp}°C</Text>
                        <Text style={s.timeLabel}>{pt.time}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 5. Real-Time Lifestyle Recommendation Feeds */}
        <View style={[s.card, SHADOWS.premium]}>
          <Text style={s.cardTitle}>💡 Appwrite Cloud Recommendations</Text>
          <Text style={s.cardDesc}>
            Clinical diet guidelines and lifestyle instructions generated automatically by Serverless Triage.
          </Text>

          {recommendations.length === 0 ? (
            <View style={s.emptyNotice}>
              <Text style={s.emptyNoticeText}>No recommendation rules triggered. Vitals indicate stable physiological conditions.</Text>
            </View>
          ) : (
            recommendations.slice(0, 3).map((rec, index) => (
              <View key={rec.rec_id || index} style={s.recItem}>
                <View style={s.recHeader}>
                  <Text style={s.recTag}>RECOMMENDATION</Text>
                  <Text style={s.recTime}>{new Date(rec.created_at).toLocaleTimeString()}</Text>
                </View>
                <Text style={s.recGuideline}>{rec.lifestyle_guideline}</Text>
                <View style={s.recMetaGrid}>
                  <View style={s.recMetaItem}>
                    <Text style={s.recMetaLabel}>Diet Plan:</Text>
                    <Text style={s.recMetaVal}>{rec.meal_plan}</Text>
                  </View>
                  <View style={s.recMetaItem}>
                    <Text style={s.recMetaLabel}>Fluid Intake Target:</Text>
                    <Text style={s.recMetaVal}>{rec.fluid_target}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  networkBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: SPACING.borderRadiusSm,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  networkBannerText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  syncButton: {
    backgroundColor: colors.surface,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  syncButtonText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  disabledText: {
    color: colors.textMuted,
  },
  statusMsgBox: {
    backgroundColor: 'rgba(225, 173, 1, 0.05)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  statusMsgText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 11,
  },
  alertsContainer: {
    backgroundColor: '#1E293B',
    borderColor: colors.primary,
    borderWidth: 2,
    borderRadius: SPACING.borderRadius,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  alertsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  alertHeaderIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  alertsTitle: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  alertItem: {
    marginBottom: 8,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
    paddingLeft: 8,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  alertItemTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  alertItemMsg: {
    color: '#CCCCCC',
    fontSize: 11,
    lineHeight: 16,
  },
  markReadBtn: {
    backgroundColor: colors.surfaceLight,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  markReadBtnText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: 'bold',
  },
  vitalsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: SPACING.md,
  },
  vitalCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: SPACING.borderRadiusSm,
    padding: SPACING.sm + 4,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  vitalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  cardSub: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: SPACING.borderRadius,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: TYPOGRAPHY.sizes.body + 1,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardDesc: {
    color: colors.textSecondary,
    fontSize: 10,
    lineHeight: 15,
    marginBottom: SPACING.md,
  },
  chartWrapper: {
    flexDirection: 'row',
    height: 180,
    marginTop: SPACING.md,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingBottom: 20,
  },
  chartYLabels: {
    width: 36,
    justifyContent: 'space-between',
    paddingVertical: 8,
    alignItems: 'flex-end',
    paddingRight: 6,
  },
  yLabel: {
    color: colors.textMuted,
    fontSize: 9,
  },
  chartMainArea: {
    flex: 1,
    position: 'relative',
  },
  plottedGrid: {
    flex: 1,
    position: 'relative',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  baselineGuide: {
    height: 1,
    backgroundColor: '#2D2D2D',
    width: '100%',
  },
  dotsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dotContainer: {
    alignItems: 'center',
    position: 'relative',
    height: '100%',
    width: 48,
  },
  vitalPlotDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    zIndex: 2,
  },
  dotLabel: {
    position: 'absolute',
    bottom: 30,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  timeLabel: {
    position: 'absolute',
    bottom: -18,
    fontSize: 9,
    color: colors.textMuted,
  },
  critText: {
    color: colors.primary,
  },
  emptyNotice: {
    padding: SPACING.md,
    backgroundColor: colors.background,
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyNoticeText: {
    fontSize: 10,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  recItem: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: SPACING.sm,
  },
  recHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    paddingBottom: 4,
  },
  recTag: {
    fontSize: 9,
    fontWeight: 'bold',
    backgroundColor: 'rgba(225, 173, 1, 0.08)',
    color: colors.primary,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  recTime: {
    fontSize: 9,
    color: colors.textMuted,
  },
  recGuideline: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.textPrimary,
    lineHeight: 16,
    marginBottom: 6,
  },
  recMetaGrid: {
    gap: 4,
  },
  recMetaItem: {
    flexDirection: 'row',
    fontSize: 10,
  },
  recMetaLabel: {
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginRight: 4,
  },
  recMetaVal: {
    color: colors.textMuted,
  },
});
