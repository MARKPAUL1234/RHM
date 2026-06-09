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
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS } from '../styles/theme';
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 1. Offline Mode Pending Sync Banner */}
        <View
          style={[
            styles.networkBanner,
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
          <Text style={styles.networkBannerText}>
            {connectionStatus === 'online'
              ? '🟢 Sync Pipeline Enabled (Online Appwrite Sync)'
              : 'Saved Locally (Pending Sync)'}
          </Text>
          {queueCount > 0 && (
            <TouchableOpacity
              style={styles.syncButton}
              onPress={async () => {
                const res = await handleSyncQueue();
                if (res.success) {
                  setSyncStatusMsg('✅ Synced offline queue successfully!');
                  setTimeout(() => setSyncStatusMsg(''), 3000);
                }
              }}
              disabled={connectionStatus === 'offline'}
            >
              <Text style={[styles.syncButtonText, connectionStatus === 'offline' && styles.disabledText]}>
                Sync Now ({queueCount})
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {syncStatusMsg ? (
          <View style={styles.statusMsgBox}>
            <Text style={styles.statusMsgText}>{syncStatusMsg}</Text>
          </View>
        ) : null}

        {/* 2. Active Alarms / Critical Warning Banners (Gold/Charcoal palette) */}
        {alerts.filter(a => a.status === 'unread').length > 0 && (
          <View style={[styles.alertsContainer, SHADOWS.premium]}>
            <View style={styles.alertsHeader}>
              <Animated.Text style={[styles.alertHeaderIcon, { transform: [{ scale: pulseAnim }] }]}>
                ⚠️
              </Animated.Text>
              <Text style={styles.alertsTitle}>ACTIVE CLINICAL ALERTS ({alerts.filter(a => a.status === 'unread').length})</Text>
            </View>
            {alerts.filter(a => a.status === 'unread').slice(0, 2).map((alert) => (
              <View key={alert.alert_id} style={styles.alertItem}>
                <View style={styles.alertRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertItemTitle}>Critical Notification</Text>
                    <Text style={styles.alertItemMsg}>{alert.alert_message}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.markReadBtn} 
                    onPress={() => handleMarkAlertRead(alert.alert_id)}
                  >
                    <Text style={styles.markReadBtnText}>Acknowledge</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 3. Vitals Cards Summary */}
        <View style={styles.vitalsGrid}>
          <View style={styles.vitalCard}>
            <Text style={styles.cardLabel}>BODY TEMPERATURE</Text>
            <Text style={[styles.vitalValue, vitals.temperature > 38.0 && styles.critText]}>{vitals.temperature}°C</Text>
            <Text style={styles.cardSub}>Body Homeostasis</Text>
          </View>
          
          <View style={styles.vitalCard}>
            <Text style={styles.cardLabel}>HEART RATE</Text>
            <Text style={[styles.vitalValue, vitals.heartRate > 100 && styles.critText]}>{vitals.heartRate} BPM</Text>
            <Text style={styles.cardSub}>Capillary Pulse</Text>
          </View>
        </View>

        {/* 4. Historical Vitals SVG Chart Display */}
        <View style={[styles.card, SHADOWS.premium]}>
          <Text style={styles.cardTitle}>📈 Historical Biometric Summary (Last 4 Logs)</Text>
          <Text style={styles.cardDesc}>
            Dynamic vector projection mapping temperature fluctuations and cardiac telemetry coordinates.
          </Text>

          {/* Simple Vector Plotted Grid Chart */}
          <View style={styles.chartWrapper}>
            <View style={styles.chartYLabels}>
              <Text style={styles.yLabel}>39°C</Text>
              <Text style={styles.yLabel}>37°C</Text>
              <Text style={styles.yLabel}>35°C</Text>
            </View>
            
            <View style={styles.chartMainArea}>
              {/* Plotting points using CSS layout vectors */}
              <View style={styles.plottedGrid}>
                {/* Horizontal baseline guides */}
                <View style={styles.baselineGuide} />
                <View style={styles.baselineGuide} />
                <View style={styles.baselineGuide} />
                
                {/* Plot line coordinates */}
                <View style={styles.dotsRow}>
                  {historicalVitals.map((pt, index) => {
                    // Map temperature coordinates (range 34 to 40)
                    const tempPercent = Math.min(Math.max((pt.temp - 34) / 6, 0), 1) * 100;
                    return (
                      <View key={index} style={styles.dotContainer}>
                        <View style={[styles.vitalPlotDot, { bottom: `${tempPercent}%` }]} />
                        <Text style={styles.dotLabel}>{pt.temp}°C</Text>
                        <Text style={styles.timeLabel}>{pt.time}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 5. Real-Time Lifestyle Recommendation Feeds */}
        <View style={[styles.card, SHADOWS.premium]}>
          <Text style={styles.cardTitle}>💡 Appwrite Cloud Recommendations</Text>
          <Text style={styles.cardDesc}>
            Clinical diet guidelines and lifestyle instructions generated automatically by Serverless Triage.
          </Text>

          {recommendations.length === 0 ? (
            <View style={styles.emptyNotice}>
              <Text style={styles.emptyNoticeText}>No recommendation rules triggered. Vitals indicate stable physiological conditions.</Text>
            </View>
          ) : (
            recommendations.slice(0, 3).map((rec, index) => (
              <View key={rec.rec_id || index} style={styles.recItem}>
                <View style={styles.recHeader}>
                  <Text style={styles.recTag}>RECOMMENDATION</Text>
                  <Text style={styles.recTime}>{new Date(rec.created_at).toLocaleTimeString()}</Text>
                </View>
                <Text style={styles.recGuideline}>{rec.lifestyle_guideline}</Text>
                <View style={styles.recMetaGrid}>
                  <View style={styles.recMetaItem}>
                    <Text style={styles.recMetaLabel}>Diet Plan:</Text>
                    <Text style={styles.recMetaVal}>{rec.meal_plan}</Text>
                  </View>
                  <View style={styles.recMetaItem}>
                    <Text style={styles.recMetaLabel}>Fluid Intake Target:</Text>
                    <Text style={styles.recMetaVal}>{rec.fluid_target}</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  syncButton: {
    backgroundColor: COLORS.surface,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  syncButtonText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  disabledText: {
    color: COLORS.textMuted,
  },
  statusMsgBox: {
    backgroundColor: 'rgba(225, 173, 1, 0.05)',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  statusMsgText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 11,
  },
  alertsContainer: {
    backgroundColor: '#1E293B',
    borderColor: COLORS.primary,
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
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  alertItem: {
    marginBottom: 8,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.primary,
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
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  markReadBtnText: {
    color: COLORS.primary,
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
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.borderRadiusSm,
    padding: SPACING.sm + 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  vitalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  cardSub: {
    fontSize: 9,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.borderRadius,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sizes.body + 1,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardDesc: {
    color: COLORS.textSecondary,
    fontSize: 10,
    lineHeight: 15,
    marginBottom: SPACING.md,
  },
  // Responsive Plotted Y-Baseline Grid
  chartWrapper: {
    flexDirection: 'row',
    height: 180,
    marginTop: SPACING.md,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.textMuted,
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
    backgroundColor: COLORS.primary,
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
    color: COLORS.textMuted,
  },
  critText: {
    color: COLORS.primary,
  },
  emptyNotice: {
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyNoticeText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  recItem: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    borderBottomColor: COLORS.border,
    paddingBottom: 4,
  },
  recTag: {
    fontSize: 9,
    fontWeight: 'bold',
    backgroundColor: 'rgba(225, 173, 1, 0.08)',
    color: COLORS.primary,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  recTime: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  recGuideline: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
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
    color: COLORS.textSecondary,
    marginRight: 4,
  },
  recMetaVal: {
    color: COLORS.textMuted,
  },
});
