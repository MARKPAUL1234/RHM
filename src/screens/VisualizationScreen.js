import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { HealthContext } from '../context/HealthContext';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS } from '../styles/theme';

export default function VisualizationScreen() {
  const [selectedChart, setSelectedChart] = useState('ecg'); // 'ecg', 'slopes', 'thermal'
  const { vitals, nutrition } = useContext(HealthContext);
  
  // Animation value to shift the ECG sweep line
  const ecgSweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (selectedChart === 'ecg') {
      const animation = Animated.loop(
        Animated.timing(ecgSweep, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        })
      );
      animation.start();
      return () => animation.stop();
    }
  }, [selectedChart]);

  // Generate Insight summary dynamically
  const generateInsight = () => {
    if (vitals.heartRate > 100) {
      return '⚠️ CARDIOVASCULAR WARNING: Tachycardia slope detected. Heart rate exceeded 100 BPM. Keep resting; thermal mappings indicate normal range, but autonomic arousal is elevated.';
    }
    return `✅ GENERAL HEALTH PROFILE: Cardiac ECG exhibits normal sinus rhythm. Weekly Heart Rate slope indicates stable cardiovascular capacity (Mean: 73 BPM). Thermal Mapping over time shows standard circadian rhythm fluctuation. Calorie intake of ${nutrition.calorieGoals} kcal aligns with current activity profiles.`;
  };

  // Mock ECG path coordinates for rendering a visual wave
  const mockEcgPoints = [
    { x: 0, y: 30 }, { x: 10, y: 30 }, { x: 20, y: 30 }, 
    { x: 25, y: 20 }, { x: 28, y: 30 }, // P Wave
    { x: 35, y: 30 }, 
    { x: 38, y: 45 }, { x: 42, y: 0 }, { x: 46, y: 60 }, { x: 49, y: 30 }, // QRS Complex
    { x: 55, y: 30 }, 
    { x: 65, y: 15 }, { x: 75, y: 30 }, // T Wave
    { x: 85, y: 30 }, { x: 95, y: 30 }, { x: 100, y: 30 }
  ];

  // Map points to scale
  const ecgWidth = Dimensions.get('window').width - 64; // Card padding
  const ecgHeight = 120;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      
      {/* Chart Switcher Buttons */}
      <View style={styles.chartSelector}>
        <TouchableOpacity
          style={[styles.selectorBtn, selectedChart === 'ecg' && styles.activeSelectorBtn]}
          onPress={() => setSelectedChart('ecg')}
        >
          <Text style={[styles.selectorBtnText, selectedChart === 'ecg' ? styles.activeText : styles.inactiveText]}>
            AD8232 ECG
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.selectorBtn, selectedChart === 'slopes' && styles.activeSelectorBtn]}
          onPress={() => setSelectedChart('slopes')}
        >
          <Text style={[styles.selectorBtnText, selectedChart === 'slopes' ? styles.activeText : styles.inactiveText]}>
            HR Slopes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.selectorBtn, selectedChart === 'thermal' && styles.activeSelectorBtn]}
          onPress={() => setSelectedChart('thermal')}
        >
          <Text style={[styles.selectorBtnText, selectedChart === 'thermal' ? styles.activeText : styles.inactiveText]}>
            Thermal Map
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Chart Viewer Card */}
      <View style={styles.chartCard}>
        
        {/* ECG Waveform Screen */}
        {selectedChart === 'ecg' && (
          <View>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Cardiac AD8232 Waveform</Text>
                <Text style={styles.chartSubtitle}>Real-time Single Lead Electrocardiogram (ECG)</Text>
              </View>
              <Text style={styles.liveIndicator}>● LIVE SWEEP</Text>
            </View>

            {/* Simulated Grid Screen */}
            <View style={styles.ecgScreen}>
              {/* Backgrid Lines */}
              <View style={styles.gridOverlay}>
                {[...Array(6)].map((_, i) => (
                  <View key={`h-${i}`} style={[styles.gridLineH, { top: (ecgHeight / 5) * i }]} />
                ))}
                {[...Array(12)].map((_, i) => (
                  <View key={`v-${i}`} style={[styles.gridLineV, { left: (ecgWidth / 11) * i }]} />
                ))}
              </View>

              {/* Render ECG Wave Line */}
              <View style={styles.waveContainer}>
                {[0, 1, 2].map((waveIndex) => (
                  <View key={waveIndex} style={styles.waveSegment}>
                    {mockEcgPoints.map((pt, i) => {
                      // Interpolate points into layout
                      const leftPos = (pt.x / 100) * (ecgWidth / 3.1) + (waveIndex * (ecgWidth / 3));
                      const topPos = (pt.y / 60) * ecgHeight;

                      return (
                        <View
                          key={i}
                          style={[
                            styles.ecgDot,
                            {
                              left: leftPos,
                              top: topPos,
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                ))}
                
                {/* Sweep Scanner Overlay */}
                <Animated.View
                  style={[
                    styles.sweepLine,
                    {
                      transform: [
                        {
                          translateX: ecgSweep.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, ecgWidth],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.chartMeta}>
              <Text style={styles.metaText}>Sensors: AD8232 Heart Rate Monitor Shield</Text>
              <Text style={styles.metaText}>Freq: 60Hz Filter</Text>
            </View>
          </View>
        )}

        {/* HR Slopes (7 Day Bar Chart) */}
        {selectedChart === 'slopes' && (
          <View>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Heart Rate Slopes</Text>
                <Text style={styles.chartSubtitle}>Daily resting heart rate mean (Past 7 Days)</Text>
              </View>
              <Text style={styles.periodText}>Weekly</Text>
            </View>

            {/* Custom Bar Graph */}
            <View style={styles.barChartContainer}>
              {[
                { day: 'Mon', bpm: 72, state: 'normal' },
                { day: 'Tue', bpm: 74, state: 'normal' },
                { day: 'Wed', bpm: 89, state: 'elevated' }, // minor spike
                { day: 'Thu', bpm: 75, state: 'normal' },
                { day: 'Fri', bpm: 71, state: 'normal' },
                { day: 'Sat', bpm: 68, state: 'normal' },
                { day: 'Sun', bpm: vitals.heartRate, state: vitals.heartRate > 100 ? 'critical' : 'normal' },
              ].map((bar, i) => {
                const maxBarHeight = 130;
                // Scale height based on max BPM (assume 120 bpm max scale)
                const barHeight = (bar.bpm / 120) * maxBarHeight;
                
                let barColor = COLORS.secondary;
                if (bar.state === 'elevated') barColor = COLORS.offline;
                if (bar.state === 'critical') barColor = COLORS.critical;

                return (
                  <View key={i} style={styles.barCol}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: barHeight,
                            backgroundColor: barColor,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barValText}>{bar.bpm}</Text>
                    <Text style={styles.barDayText}>{bar.day}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.chartMeta}>
              <Text style={styles.metaText}>Baseline Mean: 72.8 BPM</Text>
              <Text style={styles.metaText}>Variability (HRV): 45ms</Text>
            </View>
          </View>
        )}

        {/* Thermal Mapping Screen */}
        {selectedChart === 'thermal' && (
          <View>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Thermal Mapping Over Time</Text>
                <Text style={styles.chartSubtitle}>MLX90614 ambient vs body skin temp (12hr increments)</Text>
              </View>
              <Text style={styles.periodText}>12h Grid</Text>
            </View>

            {/* Grid Matrix mapping */}
            <View style={styles.thermalMatrix}>
              {[
                { time: '08:00', temp: 36.4, color: COLORS.online },
                { time: '10:00', temp: 36.6, color: COLORS.online },
                { time: '12:00', temp: 36.7, color: COLORS.online },
                { time: '14:00', temp: 37.1, color: COLORS.online },
                { time: '16:00', temp: 36.8, color: COLORS.online },
                { time: '18:00', temp: 36.6, color: COLORS.online },
                { time: '20:00', temp: 36.4, color: COLORS.online },
                { time: '22:00', temp: 36.5, color: COLORS.online },
                { time: 'Live', temp: vitals.temperature, color: vitals.temperature > 38.0 ? COLORS.critical : COLORS.online },
              ].map((cell, i) => (
                <View key={i} style={styles.thermalCell}>
                  <View style={[styles.thermalColorDot, { backgroundColor: cell.color }]} />
                  <Text style={styles.thermalTime}>{cell.time}</Text>
                  <Text style={styles.thermalVal}>{cell.temp}°C</Text>
                </View>
              ))}
            </View>

            <View style={styles.chartMeta}>
              <Text style={styles.metaText}>Module: Melexis MLX90614 Contactless IR</Text>
              <Text style={styles.metaText}>Status: Calibrated Homeostasis</Text>
            </View>
          </View>
        )}

      </View>

      {/* Quick Insight Summary Card */}
      <View style={styles.insightCard}>
        <Text style={styles.insightHeader}>💡 Clinical Quick Insight Summary</Text>
        <Text style={styles.insightText}>{generateInsight()}</Text>
      </View>

      {/* Educational Note */}
      <View style={styles.eduCard}>
        <Text style={styles.eduTitle}>Dissertation Scope: AD8232 ECG</Text>
        <Text style={styles.eduText}>
          The AD8232 analog front-end maps electrical depolarizations of the myocardium. Feeds synchronize down to the Appwrite Database JSON documents.
        </Text>
      </View>

    </ScrollView>
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
  chartSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.borderRadius,
    padding: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    gap: 4,
  },
  selectorBtn: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    borderRadius: SPACING.borderRadius - 4,
  },
  activeSelectorBtn: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.1)',
  },
  selectorBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  activeText: {
    color: COLORS.primaryLight,
  },
  inactiveText: {
    color: COLORS.textSecondary,
  },
  chartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.borderRadius,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  chartTitle: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sizes.body + 1,
    fontWeight: 'bold',
  },
  chartSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  liveIndicator: {
    color: COLORS.critical,
    fontSize: 9,
    fontWeight: 'bold',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: COLORS.critical,
  },
  periodText: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: COLORS.secondary,
  },
  // ECG Grid styling
  ecgScreen: {
    height: 130,
    backgroundColor: '#05070A',
    borderRadius: SPACING.borderRadiusSm,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    position: 'relative',
    marginVertical: SPACING.sm,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 0.5,
    backgroundColor: 'rgba(13, 148, 136, 0.06)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 0.5,
    backgroundColor: 'rgba(13, 148, 136, 0.06)',
  },
  waveContainer: {
    flex: 1,
    position: 'relative',
  },
  waveSegment: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  ecgDot: {
    position: 'absolute',
    width: 2.5,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: COLORS.primaryLight,
  },
  sweepLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 12,
    backgroundColor: 'rgba(45, 212, 191, 0.18)',
    borderRightWidth: 1,
    borderRightColor: COLORS.primaryLight,
  },
  chartMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  metaText: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  // HR Slopes bar styles
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
    marginVertical: SPACING.sm,
    paddingHorizontal: 8,
  },
  barCol: {
    alignItems: 'center',
  },
  barTrack: {
    height: 130,
    width: 14,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 7,
  },
  barValText: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 6,
  },
  barDayText: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  // Thermal Map layout
  thermalMatrix: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginVertical: SPACING.sm,
  },
  thermalCell: {
    width: '30%',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: SPACING.borderRadiusSm,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  thermalColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  thermalTime: {
    color: COLORS.textMuted,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  thermalVal: {
    color: COLORS.textPrimary,
    fontWeight: 'bold',
    fontSize: 13,
    marginTop: 2,
  },
  // Insight styles
  insightCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.borderRadius,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  insightHeader: {
    color: COLORS.textPrimary,
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 6,
  },
  insightText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  eduCard: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: SPACING.borderRadius,
    padding: SPACING.md + 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  eduTitle: {
    color: COLORS.textSecondary,
    fontWeight: 'bold',
    fontSize: 11,
    marginBottom: 4,
  },
  eduText: {
    color: COLORS.textMuted,
    fontSize: 10,
    lineHeight: 15,
  },
});
