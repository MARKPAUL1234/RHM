import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { HealthContext } from '../context/HealthContext';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS } from '../styles/theme';

export default function NutritionHubScreen() {
  const {
    connectionStatus,
    usersMetadata,
    setUsersMetadata,
    vitals,
    handleOfflineEnqueue,
  } = useContext(HealthContext);

  const [weightLogs, setWeightLogs] = useState([
    { date: 'May 10', weight: '71.5 kg' },
    { date: 'May 17', weight: '70.8 kg' },
    { date: 'May 24', weight: usersMetadata.weight ? `${usersMetadata.weight} kg` : '70.0 kg' },
  ]);
  const [newWeight, setNewWeight] = useState('');
  const [waterIntake, setWaterIntake] = useState(1250); // mL

  // Automatically computes BMI from patient profile metadata
  const calculateBMI = () => {
    const wt = parseFloat(usersMetadata.weight) || 70;
    const ht = (parseFloat(usersMetadata.height) || 175) / 100; // meters
    const bmi = wt / (ht * ht);
    
    let range = 'Optimal Health';
    let statusColor = COLORS.primary;
    if (bmi < 18.5) {
      range = 'Underweight';
      statusColor = COLORS.primaryLight;
    } else if (bmi >= 25 && bmi < 30) {
      range = 'Overweight';
      statusColor = COLORS.primaryLight;
    } else if (bmi >= 30) {
      range = 'Obese (Critical Alert)';
      statusColor = COLORS.primary;
    }
    
    return {
      score: bmi.toFixed(1),
      range,
      statusColor,
    };
  };

  const bmi = calculateBMI();

  // Log weight alteration and sync profile weight
  const handleLogWeight = () => {
    if (!newWeight || isNaN(newWeight)) {
      Alert.alert('Invalid Weight', 'Please input a valid weight metric.');
      return;
    }
    const updatedMeta = {
      ...usersMetadata,
      weight: newWeight,
    };
    setUsersMetadata(updatedMeta);
    setWeightLogs([...weightLogs, { date: 'Today', weight: `${newWeight} kg` }]);
    setNewWeight('');
    Alert.alert('Weight Logged', 'Patient baseline profile weight updated successfully.');
  };

  // Water click-to-add tracker
  const handleAddWater = () => {
    setWaterIntake(current => {
      const next = current + 250;
      handleOfflineEnqueue('vital', { event: 'water_logged', amount: '250ml', total: `${next}ml` });
      return next;
    });
  };

  const isFeverLogged = vitals.temperature > 38.0;
  const isTyphoidActive = usersMetadata.diagnosed_conditions?.includes('Typhoid');

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Dynamic Nutrition & Lifestyle Guidelines Alteration */}
        {(isFeverLogged || isTyphoidActive) && (
          <View style={[styles.card, { borderColor: COLORS.primary, borderWidth: 2, backgroundColor: 'rgba(225, 173, 1, 0.03)' }]}>
            <Text style={[styles.cardTitle, { color: COLORS.primary }]}>⚠️ Clinical Diet Guideline Active</Text>
            <Text style={styles.cardDesc}>
              Fever or gastrointestinal symptoms logged. Dietary safety protocol active.
            </Text>
            <View style={styles.instructionBox}>
              <Text style={styles.instructionText}>
                📢 <Text style={{ fontWeight: 'bold' }}>Important Instructions:</Text> Please shift <Text style={{ fontWeight: 'bold', color: COLORS.primary }}>strictly to boiled water</Text> and highly digestible, soft food items (such as vegetable broth, barley water, oatmeal, or pureed apples) to prevent digestive complications.
              </Text>
            </View>
          </View>
        )}

        {/* BMI Calculator Display Card */}
        <View style={[styles.card, SHADOWS.premium]}>
          <Text style={styles.cardTitle}>📊 Medical BMI Baseline Calculator</Text>
          <Text style={styles.cardDesc}>
            Automatically calculated in real-time from your patient baseline height ({usersMetadata.height}cm) and weight ({usersMetadata.weight}kg).
          </Text>
          
          <View style={styles.bmiDisplayBox}>
            <View style={styles.bmiLeft}>
              <Text style={styles.bmiValText}>{bmi.score}</Text>
              <Text style={styles.bmiLabel}>Body Mass Index (BMI)</Text>
            </View>
            <View style={[styles.bmiBadge, { backgroundColor: 'rgba(225, 173, 1, 0.08)', borderColor: bmi.statusColor }]}>
              <Text style={[styles.bmiBadgeText, { color: bmi.statusColor }]}>{bmi.range}</Text>
            </View>
          </View>
        </View>

        {/* Click-to-add fluid tracker */}
        <View style={[styles.card, SHADOWS.premium]}>
          <Text style={styles.cardTitle}>💧 Hydration Tracker (Daily Goal: 3.0L)</Text>
          <Text style={styles.cardDesc}>
            Incrementally log your daily water intake. Goal calibrated dynamically against treatment baseline.
          </Text>

          <View style={styles.waterBox}>
            <Text style={styles.waterVal}>{waterIntake} mL</Text>
            <Text style={styles.waterSub}>Logged of 3000 mL goal</Text>

            {/* Visual Glass cells */}
            <View style={styles.glassesGrid}>
              {[...Array(12)].map((_, i) => {
                const filled = waterIntake >= (i + 1) * 250;
                return (
                  <View
                    key={i}
                    style={[
                      styles.glassCell,
                      filled && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }
                    ]}
                  />
                );
              })}
            </View>

            <TouchableOpacity style={styles.waterAddBtn} onPress={handleAddWater} activeOpacity={0.8}>
              <Text style={styles.waterBtnText}>+ Click to log 250mL</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Weight alterations card */}
        <View style={[styles.card, SHADOWS.premium]}>
          <Text style={styles.cardTitle}>⚖️ Weight Alteration Logs</Text>
          <Text style={styles.cardDesc}>Input changes in weight to recalibrate clinical baselines.</Text>

          <View style={styles.weightInputRow}>
            <TextInput
              style={styles.weightInput}
              placeholder="e.g. 70.5"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={newWeight}
              onChangeText={setNewWeight}
            />
            <TouchableOpacity style={styles.weightLogBtn} onPress={handleLogWeight}>
              <Text style={styles.weightLogBtnText}>Log Weight</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weightTable}>
            {weightLogs.map((log, index) => (
              <View key={index} style={styles.weightTableRow}>
                <Text style={styles.weightTableCol1}>{log.date}</Text>
                <Text style={styles.weightTableCol2}>{log.weight}</Text>
              </View>
            ))}
          </View>
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
  instructionBox: {
    backgroundColor: COLORS.surfaceLight,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
  },
  instructionText: {
    fontSize: 11,
    color: COLORS.textPrimary,
    lineHeight: 16,
  },
  bmiDisplayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bmiLeft: {
    flex: 1,
  },
  bmiValText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  bmiLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  bmiBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  bmiBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  waterBox: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: SPACING.md,
  },
  waterVal: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  waterSub: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  glassesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  glassCell: {
    width: 20,
    height: 30,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  waterAddBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  waterBtnText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  weightInputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SPACING.md,
  },
  weightInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  weightLogBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  weightLogBtnText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  weightTable: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  weightTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  weightTableCol1: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  weightTableCol2: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
});
