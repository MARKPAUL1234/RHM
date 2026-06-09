import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { HealthContext } from '../context/HealthContext';
import { TYPOGRAPHY, SPACING, SHADOWS, getResponsiveMetrics } from '../styles/theme';

const chartTabs = [
  { key: 'wave', label: 'Waveform' },
  { key: 'pulse', label: 'Pulse trend' },
  { key: 'thermal', label: 'Temperature map' },
];

const formatTime = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function VisualizationScreen() {
  const [selectedChart, setSelectedChart] = useState('wave');
  const { vitals, healthRecords, colors } = useContext(HealthContext);
  const { width } = useWindowDimensions();
  const metrics = getResponsiveMetrics(width);
  const sweep = useRef(new Animated.Value(0)).current;

  const recordSeries = useMemo(() => healthRecords.slice(0, 12).reverse(), [healthRecords]);
  const hasRecords = recordSeries.length > 0;
  const latestHr = Number(vitals.heartRate || 0);
  const latestTemp = Number(vitals.temperature || 0);
  const chartWidth = Math.max(metrics.isPhone ? width - (metrics.pagePadding * 2) - 34 : 620, 280);
  const chartHeight = metrics.isPhone ? 160 : 190;

  useEffect(() => {
    if (selectedChart !== 'wave' || !hasRecords) return undefined;

    const animation = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 2600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    sweep.setValue(0);
    animation.start();
    return () => animation.stop();
  }, [hasRecords, selectedChart, sweep]);

  const averageHr = hasRecords
    ? Math.round(recordSeries.reduce((total, record) => total + Number(record.heart_rate || 0), 0) / recordSeries.length)
    : null;

  const insightText = (() => {
    if (!hasRecords) return 'No manual health records have been saved yet. Submit a monitoring entry to generate charts from Django health records.';
    if (latestTemp > 38.5) return 'Fever threshold is active in the latest record. Hydration and medication adherence should be checked.';
    if (latestHr > 100) return 'Pulse trend is elevated. Compare against symptoms and medication adherence in the monitoring journal.';
    return `Recent records are stable. Mean pulse is ${averageHr} bpm across ${recordSeries.length} Django record(s).`;
  })();

  const waveformPoints = [
    { x: 0, y: 54 },
    { x: 10, y: 54 },
    { x: 18, y: latestHr > 100 ? 42 : 48 },
    { x: 24, y: 54 },
    { x: 34, y: 54 },
    { x: 38, y: 68 },
    { x: 42, y: 24 },
    { x: 46, y: 84 },
    { x: 50, y: 54 },
    { x: 62, y: 54 },
    { x: 72, y: latestHr > 100 ? 34 : 42 },
    { x: 82, y: 54 },
    { x: 100, y: 54 },
  ];

  const pulseBars = recordSeries.slice(-8).map((record) => {
    const bpm = Number(record.heart_rate || 0);
    return {
      id: record.id,
      bpm,
      label: formatTime(record.timestamp),
      height: Math.max(22, Math.min(150, (bpm / 130) * 150)),
      color: bpm > 100 ? colors.warning : colors.primary,
    };
  });

  const tempCells = recordSeries.map((record) => {
    const temp = Number(record.temperature || 0);
    return {
      id: record.id,
      temp,
      label: formatTime(record.timestamp),
      color: temp > 38.5 ? colors.critical : temp > 38 ? colors.warning : colors.secondary,
    };
  });

  const s = styles(colors, metrics, chartWidth, chartHeight);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={s.pageInner}>
        <View style={s.pageHeader}>
          <View>
            <Text style={s.eyebrow}>Visualization</Text>
            <Text style={s.pageTitle}>Biometric analytics</Text>
          </View>
          <View style={s.summaryStrip}>
            <View style={s.summaryItem}>
              <Text style={s.summaryLabel}>Records</Text>
              <Text style={s.summaryValue}>{recordSeries.length}</Text>
            </View>
            <View style={s.summaryItem}>
              <Text style={s.summaryLabel}>Avg pulse</Text>
              <Text style={s.summaryValue}>{averageHr ? `${averageHr}` : '--'}</Text>
            </View>
          </View>
        </View>

        <View style={s.chartSelector}>
          {chartTabs.map((tab) => {
            const isActive = selectedChart === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[s.selectorBtn, isActive && s.activeSelectorBtn]}
                onPress={() => setSelectedChart(tab.key)}
              >
                <Text style={[s.selectorBtnText, isActive ? s.activeText : s.inactiveText]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[s.chartCard, SHADOWS.subtle]}>
          {selectedChart === 'wave' ? (
            <View>
              <View style={s.chartHeader}>
                <View>
                  <Text style={s.chartTitle}>Derived cardiac waveform</Text>
                  <Text style={s.chartSubtitle}>Rendered from latest heart-rate records.</Text>
                </View>
                <Text style={[s.statusPill, { color: hasRecords ? colors.success : colors.textMuted }]}>
                  {hasRecords ? 'Live data' : 'No records'}
                </Text>
              </View>

              <View style={s.ecgScreen}>
                {[0, 1, 2, 3, 4].map((row) => (
                  <View key={`h-${row}`} style={[s.gridLineH, { top: (chartHeight / 4) * row }]} />
                ))}
                {[0, 1, 2, 3, 4, 5, 6, 7].map((col) => (
                  <View key={`v-${col}`} style={[s.gridLineV, { left: (chartWidth / 7) * col }]} />
                ))}

                {hasRecords ? (
                  <View style={s.waveLayer}>
                    {[0, 1, 2].map((segment) => (
                      <View key={segment} style={s.waveSegment}>
                        {waveformPoints.map((point, index) => (
                          <View
                            key={`${segment}-${index}`}
                            style={[
                              s.waveDot,
                              {
                                left: (point.x / 100) * (chartWidth / 3.2) + segment * (chartWidth / 3),
                                top: (point.y / 100) * chartHeight,
                              },
                            ]}
                          />
                        ))}
                      </View>
                    ))}
                    <Animated.View
                      style={[
                        s.sweepLine,
                        {
                          transform: [
                            {
                              translateX: sweep.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, chartWidth],
                              }),
                            },
                          ],
                        },
                      ]}
                    />
                  </View>
                ) : (
                  <View style={s.emptyChartState}>
                    <Text style={s.emptyChartText}>No waveform can be derived until a Django health record exists.</Text>
                  </View>
                )}
              </View>
            </View>
          ) : null}

          {selectedChart === 'pulse' ? (
            <View>
              <View style={s.chartHeader}>
                <View>
                  <Text style={s.chartTitle}>Pulse trend</Text>
                  <Text style={s.chartSubtitle}>Recent authenticated heart-rate readings.</Text>
                </View>
                <Text style={s.statusPill}>{averageHr ? `${averageHr} bpm mean` : 'No records'}</Text>
              </View>

              {pulseBars.length === 0 ? (
                <View style={s.emptyChartState}>
                  <Text style={s.emptyChartText}>No pulse records yet.</Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.barChartContainer}>
                  {pulseBars.map((bar) => (
                    <View key={bar.id} style={s.barCol}>
                      <View style={s.barTrack}>
                        <View style={[s.barFill, { height: bar.height, backgroundColor: bar.color }]} />
                      </View>
                      <Text style={s.barValText}>{bar.bpm}</Text>
                      <Text style={s.barDayText}>{bar.label}</Text>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          ) : null}

          {selectedChart === 'thermal' ? (
            <View>
              <View style={s.chartHeader}>
                <View>
                  <Text style={s.chartTitle}>Temperature map</Text>
                  <Text style={s.chartSubtitle}>Recent body-temperature cells from Django records.</Text>
                </View>
                <Text style={s.statusPill}>{latestTemp ? `${latestTemp} C latest` : 'No records'}</Text>
              </View>

              {tempCells.length === 0 ? (
                <View style={s.emptyChartState}>
                  <Text style={s.emptyChartText}>No temperature records yet.</Text>
                </View>
              ) : (
                <View style={s.thermalMatrix}>
                  {tempCells.map((cell) => (
                    <View key={cell.id} style={s.thermalCell}>
                      <View style={[s.thermalColorDot, { backgroundColor: cell.color }]} />
                      <Text style={s.thermalTime}>{cell.label}</Text>
                      <Text style={s.thermalVal}>{cell.temp} C</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : null}
        </View>

        <View style={[s.insightCard, SHADOWS.subtle]}>
          <Text style={s.insightHeader}>Clinical quick insight</Text>
          <Text style={s.insightText}>{insightText}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = (colors, metrics, chartWidth, chartHeight) => StyleSheet.create({
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
  pageHeader: {
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
  summaryStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  summaryItem: {
    minWidth: metrics.isPhone ? '31%' : 108,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: SPACING.sm,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 10,
  },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: 2,
  },
  chartSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 5,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: SPACING.md,
    gap: 5,
  },
  selectorBtn: {
    flexGrow: 1,
    flexBasis: metrics.isPhone ? '30%' : 140,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    paddingHorizontal: SPACING.sm,
  },
  activeSelectorBtn: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectorBtnText: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  activeText: {
    color: colors.primary,
  },
  inactiveText: {
    color: colors.textSecondary,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: metrics.cardPadding,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: SPACING.md,
  },
  chartHeader: {
    flexDirection: metrics.isPhone ? 'column' : 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  chartTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  chartSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  statusPill: {
    alignSelf: metrics.isPhone ? 'flex-start' : 'center',
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weights.bold,
    backgroundColor: colors.elevated,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  ecgScreen: {
    height: chartHeight,
    width: '100%',
    maxWidth: chartWidth,
    alignSelf: 'center',
    backgroundColor: '#07111F',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  waveLayer: {
    flex: 1,
    position: 'relative',
  },
  waveSegment: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  waveDot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.secondary,
  },
  sweepLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 14,
    backgroundColor: 'rgba(20, 184, 166, 0.18)',
    borderRightWidth: 1,
    borderRightColor: colors.secondary,
  },
  emptyChartState: {
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.elevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: SPACING.md,
  },
  emptyChartText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  barChartContainer: {
    minHeight: 200,
    alignItems: 'flex-end',
    gap: SPACING.md,
    paddingTop: SPACING.md,
    paddingRight: SPACING.md,
  },
  barCol: {
    width: 62,
    alignItems: 'center',
  },
  barTrack: {
    height: 150,
    width: 18,
    backgroundColor: colors.elevated,
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 8,
  },
  barValText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: 7,
  },
  barDayText: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  thermalMatrix: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  thermalCell: {
    flexGrow: 1,
    flexBasis: metrics.isPhone ? '47%' : '22%',
    minWidth: metrics.isPhone ? 130 : 150,
    backgroundColor: colors.elevated,
    borderRadius: 8,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thermalColorDot: {
    width: 10,
    height: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  thermalTime: {
    color: colors.textMuted,
    fontSize: 11,
  },
  thermalVal: {
    color: colors.textPrimary,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: 16,
    marginTop: 3,
  },
  insightCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: metrics.cardPadding,
    borderWidth: 1,
    borderColor: colors.border,
  },
  insightHeader: {
    color: colors.textPrimary,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: 16,
    marginBottom: 6,
  },
  insightText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
});
