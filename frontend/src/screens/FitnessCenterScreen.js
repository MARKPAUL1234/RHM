import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
} from 'react-native';
import { HealthContext } from '../context/HealthContext';
import { TYPOGRAPHY, SPACING, SHADOWS } from '../styles/theme';

export default function FitnessCenterScreen() {
  const { alerts, fitnessSummary, colors } = useContext(HealthContext);

  // Check if there is an active unread critical alert in the state
  const hasCriticalAlert = fitnessSummary.locked || alerts.some(a => a.severity === 'critical' && a.status === 'unread');

  const workouts = fitnessSummary.routines || [];

  const s = styles(colors);

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        
        {hasCriticalAlert ? (
          /* Strenuous exercises lock */
          <View style={[s.lockedCard, SHADOWS.premium]}>
            <Text style={s.lockedIcon}>⚠️</Text>
            <View style={s.lockedTextCol}>
              <Text style={s.lockedTitle}>Strenuous Activities Locked</Text>
              <Text style={s.lockedDesc}>
                Strenuous activities disabled due to elevated vitals. Prioritize recovery.
              </Text>
            </View>
          </View>
        ) : (
          /* Exercise widgets active */
          <View style={[s.card, SHADOWS.premium]}>
            <Text style={s.cardTitle}>🏃 Cardiovascular Activity & Workouts</Text>
            <Text style={s.cardDesc}>
              Daily light exercise regimes suggested based on optimal baseline clinical profiles.
            </Text>

            <View style={s.stepGrid}>
              <View style={s.stepBox}>
                <Text style={s.stepVal}>{fitnessSummary.daily_steps || 0}</Text>
                <Text style={s.stepSub}>Daily Steps</Text>
              </View>
              <View style={s.stepBox}>
                <Text style={s.stepVal}>{fitnessSummary.goal_steps || 10000}</Text>
                <Text style={s.stepSub}>Goal Target</Text>
              </View>
            </View>

            <Text style={s.workoutHeading}>Suggested Recovery Routines</Text>
            {workouts.map(item => (
              <View key={item.id} style={s.workoutItem}>
                <View style={s.workoutHeader}>
                  <Text style={s.workoutType}>{item.type}</Text>
                  <Text style={s.workoutDur}>{item.duration}</Text>
                </View>
                <Text style={s.workoutIntensity}>Intensity: {item.intensity}</Text>
              </View>
            ))}
          </View>
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
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
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
  lockedCard: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 2,
    borderColor: colors.primary, // Gold border
    borderRadius: SPACING.borderRadius,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.premium,
  },
  lockedIcon: {
    fontSize: 32,
    marginRight: SPACING.md,
  },
  lockedTextCol: {
    flex: 1,
  },
  lockedTitle: {
    color: colors.primary,
    fontSize: TYPOGRAPHY.sizes.body + 1,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  lockedDesc: {
    color: colors.textPrimary,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: 'bold',
  },
  stepGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: SPACING.lg,
  },
  stepBox: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: SPACING.md,
    alignItems: 'center',
  },
  stepVal: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
  },
  stepSub: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2,
  },
  workoutHeading: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: SPACING.sm,
  },
  workoutItem: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  workoutType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  workoutDur: {
    fontSize: 10,
    color: colors.textMuted,
  },
  workoutIntensity: {
    fontSize: 10,
    color: colors.textSecondary,
  },
});
