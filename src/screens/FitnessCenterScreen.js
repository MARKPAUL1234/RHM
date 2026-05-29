import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
} from 'react-native';
import { HealthContext } from '../context/HealthContext';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS } from '../styles/theme';

export default function FitnessCenterScreen() {
  const { alerts } = useContext(HealthContext);

  // Check if there is an active unread critical alert in the state
  const hasCriticalAlert = alerts.some(a => a.severity === 'critical' && a.status === 'unread');

  const workouts = [
    { id: '1', type: 'Clinical Walk', duration: '20 mins', intensity: 'Low' },
    { id: '2', type: 'Static Stretching', duration: '15 mins', intensity: 'Low' },
    { id: '3', type: 'Light Cardiovascular Cycle', duration: '30 mins', intensity: 'Medium' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {hasCriticalAlert ? (
          /* Strenuous exercises lock */
          <View style={[styles.lockedCard, SHADOWS.premium]}>
            <Text style={styles.lockedIcon}>⚠️</Text>
            <View style={styles.lockedTextCol}>
              <Text style={styles.lockedTitle}>Strenuous Activities Locked</Text>
              <Text style={styles.lockedDesc}>
                Strenuous activities disabled due to elevated vitals. Prioritize recovery.
              </Text>
            </View>
          </View>
        ) : (
          /* Exercise widgets active */
          <View style={[styles.card, SHADOWS.premium]}>
            <Text style={styles.cardTitle}>🏃 Cardiovascular Activity & Workouts</Text>
            <Text style={styles.cardDesc}>
              Daily light exercise regimes suggested based on optimal baseline clinical profiles.
            </Text>

            <View style={styles.stepGrid}>
              <View style={styles.stepBox}>
                <Text style={styles.stepVal}>6,240</Text>
                <Text style={styles.stepSub}>Daily Steps</Text>
              </View>
              <View style={styles.stepBox}>
                <Text style={styles.stepVal}>10,000</Text>
                <Text style={styles.stepSub}>Goal Target</Text>
              </View>
            </View>

            <Text style={styles.workoutHeading}>Suggested Recovery Routines</Text>
            {workouts.map(item => (
              <View key={item.id} style={styles.workoutItem}>
                <View style={styles.workoutHeader}>
                  <Text style={styles.workoutType}>{item.type}</Text>
                  <Text style={styles.workoutDur}>{item.duration}</Text>
                </View>
                <Text style={styles.workoutIntensity}>Intensity: {item.intensity}</Text>
              </View>
            ))}
          </View>
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
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
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
  lockedCard: {
    backgroundColor: '#1E293B', // Charcoal black background
    borderWidth: 2,
    borderColor: COLORS.primary, // Gold border
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
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.sizes.body + 1,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  lockedDesc: {
    color: '#FFFFFF',
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
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: SPACING.md,
    alignItems: 'center',
  },
  stepVal: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  stepSub: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  workoutHeading: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  workoutItem: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.textPrimary,
  },
  workoutDur: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  workoutIntensity: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
});
