import React, { useContext, useMemo, useState } from 'react';
import {
  Alert,
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { HealthContext } from '../context/HealthContext';
import { TYPOGRAPHY, SPACING, SHADOWS, getResponsiveMetrics } from '../styles/theme';

export default function FitnessCenterScreen() {
  const { alerts, fitnessSummary, healthRecords, fitnessLogs, logFitnessEntry, usersMetadata, colors } = useContext(HealthContext);
  const { width } = useWindowDimensions();
  const metrics = getResponsiveMetrics(width);
  const [activityName, setActivityName] = useState('Walking');
  const [stepsInput, setStepsInput] = useState('');
  const [durationInput, setDurationInput] = useState('');
  const [heartRateInput, setHeartRateInput] = useState('');
  const [intensity, setIntensity] = useState('low');
  const [goalNote, setGoalNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const hasCriticalAlert = fitnessSummary.locked || alerts.some((alert) => alert.severity === 'critical' && alert.status !== 'read');
  const workouts = fitnessSummary.routines || [];
  const goalSteps = Number(fitnessSummary.goal_steps || 10000);
  const dailySteps = Number(fitnessSummary.daily_steps || 0);
  const stepProgress = goalSteps > 0 ? Math.min((dailySteps / goalSteps) * 100, 100) : 0;
  const latestRecord = fitnessSummary.latest_record || healthRecords[0] || null;
  const todayKey = new Date().toDateString();
  const todaysFitnessLogs = useMemo(
    () => fitnessLogs.filter((log) => new Date(log.timestamp).toDateString() === todayKey),
    [fitnessLogs, todayKey]
  );
  const totalDuration = todaysFitnessLogs.reduce((sum, log) => sum + Number(log.duration_minutes || 0), 0);
  const totalWorkoutSteps = todaysFitnessLogs.reduce((sum, log) => sum + Number(log.steps || 0), 0);

  const handleLogActivity = async () => {
    const parsedSteps = Number(stepsInput || 0);
    const parsedDuration = Number(durationInput || 0);
    const parsedHeartRate = heartRateInput.trim() ? Number(heartRateInput) : null;

    if (!activityName.trim() || (!parsedSteps && !parsedDuration)) {
      Alert.alert('Invalid activity', 'Add an activity name plus steps or duration.');
      return;
    }

    setIsSaving(true);
    try {
      await logFitnessEntry({
        activity_name: activityName.trim(),
        steps: Number.isFinite(parsedSteps) ? Math.max(0, Math.round(parsedSteps)) : 0,
        duration_minutes: Number.isFinite(parsedDuration) ? Math.max(0, Math.round(parsedDuration)) : 0,
        heart_rate: Number.isFinite(parsedHeartRate) ? Math.round(parsedHeartRate) : null,
        intensity,
        goal_note: goalNote.trim(),
      });
      setActivityName('Walking');
      setStepsInput('');
      setDurationInput('');
      setHeartRateInput('');
      setIntensity('low');
      setGoalNote('');
      Alert.alert('Activity saved', 'Manual fitness activity was synced to Django.');
    } catch (error) {
      Alert.alert('Save failed', error.message || 'Unable to sync the activity entry.');
    } finally {
      setIsSaving(false);
    }
  };

  const s = styles(colors, metrics);

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.pageInner}>
          <View style={s.pageHeader}>
            <View>
              <Text style={s.eyebrow}>Fitness center</Text>
              <Text style={s.pageTitle}>Activity plan</Text>
            </View>
            <View style={[s.statusCard, { borderColor: hasCriticalAlert ? colors.warning : colors.success }]}>
              <Text style={s.statusLabel}>Plan status</Text>
              <Text style={[s.statusValue, { color: hasCriticalAlert ? colors.warning : colors.success }]}>
                {hasCriticalAlert ? 'Recovery mode' : 'Active mode'}
              </Text>
            </View>
          </View>

          {hasCriticalAlert ? (
            <View style={[s.lockedCard, SHADOWS.subtle]}>
              <Text style={s.lockedTitle}>Strenuous activity locked</Text>
              <Text style={s.lockedDesc}>
                Backend triage has detected elevated risk. Keep activity light and prioritize recovery until alerts are acknowledged or vitals normalize.
              </Text>
            </View>
          ) : null}

          <View style={s.contentGrid}>
            <View style={[s.card, s.activityFormCard, SHADOWS.subtle]}>
              <Text style={s.cardTitle}>Manual activity entry</Text>
              <Text style={s.cardDesc}>Log steps, workouts, duration, intensity, and optional pulse without connected devices.</Text>

              <View style={s.inputGrid}>
                <TextInput
                  style={[s.input, s.activityInput]}
                  value={activityName}
                  onChangeText={setActivityName}
                  placeholder="Workout or activity"
                  placeholderTextColor={colors.textMuted}
                />
                <TextInput
                  style={s.input}
                  value={stepsInput}
                  onChangeText={setStepsInput}
                  placeholder="Steps"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
                <TextInput
                  style={s.input}
                  value={durationInput}
                  onChangeText={setDurationInput}
                  placeholder="Minutes"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
                <TextInput
                  style={s.input}
                  value={heartRateInput}
                  onChangeText={setHeartRateInput}
                  placeholder="Heart rate"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[s.input, s.activityInput]}
                  value={goalNote}
                  onChangeText={setGoalNote}
                  placeholder="Goal or note"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={s.intensityRow}>
                {['recovery', 'low', 'moderate', 'high'].map((item) => {
                  const active = intensity === item;
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[s.intensityButton, active && s.activeIntensityButton]}
                      onPress={() => setIntensity(item)}
                    >
                      <Text style={[s.intensityText, active && s.activeIntensityText]}>{item}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity style={[s.primaryButton, isSaving && s.disabledButton]} onPress={handleLogActivity} disabled={isSaving}>
                <Text style={s.primaryButtonText}>{isSaving ? 'Saving...' : 'Save activity'}</Text>
              </TouchableOpacity>
            </View>

            <View style={[s.card, s.todayCard, SHADOWS.subtle]}>
              <Text style={s.cardTitle}>Today's activity</Text>
              <Text style={s.cardDesc}>Manual entries from the fitness log.</Text>

              <View style={s.todayMetricGrid}>
                <View style={s.todayMetricBox}>
                  <Text style={s.todayMetricValue}>{totalWorkoutSteps}</Text>
                  <Text style={s.todayMetricLabel}>Logged steps</Text>
                </View>
                <View style={s.todayMetricBox}>
                  <Text style={s.todayMetricValue}>{totalDuration}</Text>
                  <Text style={s.todayMetricLabel}>Minutes</Text>
                </View>
                <View style={s.todayMetricBox}>
                  <Text style={s.todayMetricValue}>{usersMetadata.age || '--'}</Text>
                  <Text style={s.todayMetricLabel}>Age baseline</Text>
                </View>
              </View>

              {fitnessLogs.length === 0 ? (
                <View style={s.emptyBox}>
                  <Text style={s.emptyText}>No activity logs saved yet.</Text>
                </View>
              ) : (
                fitnessLogs.slice(0, 5).map((log) => (
                  <View key={log.id} style={s.activityLogRow}>
                    <View>
                      <Text style={s.activityLogTitle}>{log.activity_name}</Text>
                      <Text style={s.activityLogMeta}>{log.intensity} / {log.duration_minutes} min</Text>
                    </View>
                    <Text style={s.activityLogSteps}>{log.steps} steps</Text>
                  </View>
                ))
              )}
            </View>
          </View>

          <View style={s.contentGrid}>
            <View style={[s.card, s.stepsCard, SHADOWS.subtle]}>
              <Text style={s.cardTitle}>Daily movement</Text>
              <Text style={s.cardDesc}>
                Daily steps come from today's manual activity logs, with a profile-goal fallback before the first activity entry.
              </Text>

              <View style={s.stepsHero}>
                <Text style={s.stepVal}>{dailySteps}</Text>
                <Text style={s.stepSub}>of {goalSteps} steps</Text>
              </View>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${stepProgress}%`, backgroundColor: hasCriticalAlert ? colors.warning : colors.success }]} />
              </View>

              <View style={s.metricGrid}>
                <View style={s.metricBox}>
                  <Text style={s.metricLabel}>Source records</Text>
                  <Text style={s.metricValue}>{fitnessSummary.source_record_count || 0}</Text>
                </View>
                <View style={s.metricBox}>
                  <Text style={s.metricLabel}>Manual logs today</Text>
                  <Text style={s.metricValue}>{fitnessSummary.manual_activity_count || todaysFitnessLogs.length}</Text>
                </View>
                <View style={s.metricBox}>
                  <Text style={s.metricLabel}>Latest pulse</Text>
                  <Text style={s.metricValue}>{latestRecord ? `${latestRecord.heart_rate} bpm` : '--'}</Text>
                </View>
              </View>
            </View>

            <View style={[s.card, s.routinesCard, SHADOWS.subtle]}>
              <Text style={s.cardTitle}>{hasCriticalAlert ? 'Recovery routines' : 'Suggested routines'}</Text>
              <Text style={s.cardDesc}>Routine options are returned by Django based on alert state and latest vitals.</Text>

              {workouts.length === 0 ? (
                <View style={s.emptyBox}>
                  <Text style={s.emptyText}>No routine recommendations are available yet.</Text>
                </View>
              ) : (
                workouts.map((item) => (
                  <View key={item.id} style={s.workoutItem}>
                    <View style={s.workoutHeader}>
                      <Text style={s.workoutType}>{item.type}</Text>
                      <Text style={s.workoutDur}>{item.duration}</Text>
                    </View>
                    <Text style={s.workoutIntensity}>Intensity: {item.intensity}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
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
  statusCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: 8,
    padding: metrics.cardPadding,
    minWidth: metrics.isPhone ? '100%' : 220,
  },
  statusLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  statusValue: {
    fontSize: 17,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: 3,
  },
  lockedCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 8,
    padding: metrics.cardPadding,
    marginBottom: SPACING.md,
  },
  lockedTitle: {
    color: colors.warning,
    fontSize: 16,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 5,
  },
  lockedDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  contentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: metrics.cardPadding,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activityFormCard: {
    flexGrow: 1,
    flexBasis: metrics.isPhone ? '100%' : '58%',
    minWidth: metrics.isPhone ? '100%' : 440,
  },
  todayCard: {
    flexGrow: 1,
    flexBasis: metrics.isPhone ? '100%' : '34%',
    minWidth: metrics.isPhone ? '100%' : 320,
  },
  stepsCard: {
    flexGrow: 1,
    flexBasis: metrics.isPhone ? '100%' : '48%',
    minWidth: metrics.isPhone ? '100%' : 380,
  },
  routinesCard: {
    flexGrow: 1,
    flexBasis: metrics.isPhone ? '100%' : '48%',
    minWidth: metrics.isPhone ? '100%' : 380,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 4,
  },
  cardDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  inputGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  input: {
    flexGrow: 1,
    flexBasis: metrics.isPhone ? '47%' : '22%',
    minWidth: metrics.isPhone ? 130 : 140,
    minHeight: 42,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    color: colors.textPrimary,
    fontSize: 14,
  },
  activityInput: {
    flexBasis: metrics.isPhone ? '100%' : '46%',
  },
  intensityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  intensityButton: {
    flexGrow: 1,
    minHeight: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  activeIntensityButton: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLight,
  },
  intensityText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    textTransform: 'capitalize',
  },
  activeIntensityText: {
    color: colors.primary,
  },
  primaryButton: {
    minHeight: 42,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  disabledButton: {
    opacity: 0.55,
  },
  todayMetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  todayMetricBox: {
    flexGrow: 1,
    flexBasis: metrics.isPhone ? '30%' : '30%',
    minWidth: 92,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: SPACING.md,
  },
  todayMetricValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  todayMetricLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 3,
  },
  activityLogRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: SPACING.md,
    marginTop: SPACING.sm,
  },
  activityLogTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  activityLogMeta: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 3,
    textTransform: 'capitalize',
  },
  activityLogSteps: {
    color: colors.success,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  stepsHero: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  stepVal: {
    fontSize: 38,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: colors.textPrimary,
  },
  stepSub: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  progressTrack: {
    height: 12,
    backgroundColor: colors.elevated,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: SPACING.md,
  },
  progressFill: {
    height: '100%',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  metricBox: {
    flexGrow: 1,
    flexBasis: metrics.isPhone ? '100%' : '30%',
    minWidth: 130,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: SPACING.md,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 4,
  },
  metricValue: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  emptyBox: {
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.elevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: SPACING.md,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  workoutItem: {
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginBottom: 4,
  },
  workoutType: {
    flex: 1,
    fontSize: 13,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: colors.textPrimary,
  },
  workoutDur: {
    fontSize: 12,
    color: colors.textMuted,
  },
  workoutIntensity: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
