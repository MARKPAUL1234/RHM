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
import { TYPOGRAPHY, SPACING, SHADOWS } from '../styles/theme';

export default function NutritionHubScreen() {
  const {
    usersMetadata,
    setUsersMetadata,
    nutrition,
    nutritionLogs,
    vitals,
    logNutritionEntry,
    colors,
  } = useContext(HealthContext);

  const [newWeight, setNewWeight] = useState('');

  const weightLogs = nutritionLogs
    .filter(log => log.entry_type === 'weight')
    .slice(0, 5)
    .map(log => ({
      date: new Date(log.timestamp).toLocaleDateString(),
      weight: `${log.value} ${log.unit}`,
    }));
  const displayedWeightLogs = weightLogs.length > 0
    ? weightLogs
    : [{ date: 'Profile baseline', weight: `${usersMetadata.weight || 70} kg` }];
  const waterGoal = nutrition.waterGoal || 3000;
  const todayKey = new Date().toDateString();
  const waterIntake = nutritionLogs
    .filter(log => log.entry_type === 'water' && new Date(log.timestamp).toDateString() === todayKey)
    .reduce((total, log) => total + Number(log.value || 0), 0);
  const glassCount = Math.max(1, Math.ceil(waterGoal / 250));

  // Automatically computes BMI from patient profile metadata
  const calculateBMI = () => {
    const wt = parseFloat(usersMetadata.weight) || 70;
    const ht = (parseFloat(usersMetadata.height) || 175) / 100; // meters
    const bmi = wt / (ht * ht);
    
    let range = 'Optimal Health';
    let statusColor = colors.primary;
    if (bmi < 18.5) {
      range = 'Underweight';
      statusColor = colors.primaryLight;
    } else if (bmi >= 25 && bmi < 30) {
      range = 'Overweight';
      statusColor = colors.primaryLight;
    } else if (bmi >= 30) {
      range = 'Obese (Critical Alert)';
      statusColor = colors.primary;
    }
    
    return {
      score: bmi.toFixed(1),
      range,
      statusColor,
    };
  };

  const bmi = calculateBMI();

  // Log weight alteration and sync profile weight
  const handleLogWeight = async () => {
    if (!newWeight || isNaN(newWeight)) {
      Alert.alert('Invalid Weight', 'Please input a valid weight metric.');
      return;
    }
    const parsedWeight = parseFloat(newWeight);
    const updatedMeta = {
      ...usersMetadata,
      weight: parsedWeight,
    };
    setUsersMetadata(updatedMeta);
    await logNutritionEntry({
      entry_type: 'weight',
      value: parsedWeight,
      unit: 'kg',
      note: 'Profile baseline weight update',
    });
    setNewWeight('');
    Alert.alert('Weight Logged', 'Patient baseline profile weight synced to the backend.');
  };

  // Water click-to-add tracker
  const handleAddWater = async () => {
    await logNutritionEntry({
      entry_type: 'water',
      value: 250,
      unit: 'ml',
      note: 'Hydration tracker entry',
    });
  };

  const isFeverLogged = vitals.temperature > 38.0;
  const isTyphoidActive = usersMetadata.diagnosed_conditions?.includes('Typhoid');

  const s = styles(colors);

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Dynamic Nutrition & Lifestyle Guidelines Alteration */}
        {(isFeverLogged || isTyphoidActive) && (
          <View style={[s.card, { borderColor: colors.primary, borderWidth: 2, backgroundColor: 'rgba(225, 173, 1, 0.03)' }]}>
            <Text style={[s.cardTitle, { color: colors.primary }]}>⚠️ Clinical Diet Guideline Active</Text>
            <Text style={s.cardDesc}>
              Fever or gastrointestinal symptoms logged. Dietary safety protocol active.
            </Text>
            <View style={s.instructionBox}>
              <Text style={s.instructionText}>
                📢 <Text style={{ fontWeight: 'bold' }}>Important Instructions:</Text> Please shift <Text style={{ fontWeight: 'bold', color: colors.primary }}>strictly to boiled water</Text> and highly digestible, soft food items (such as vegetable broth, barley water, oatmeal, or pureed apples) to prevent digestive complications.
              </Text>
            </View>
          </View>
        )}

        {/* BMI Calculator Display Card */}
        <View style={[s.card, SHADOWS.premium]}>
          <Text style={s.cardTitle}>📊 Medical BMI Baseline Calculator</Text>
          <Text style={s.cardDesc}>
            Automatically calculated in real-time from your patient baseline height ({usersMetadata.height}cm) and weight ({usersMetadata.weight}kg).
          </Text>
          
          <View style={s.bmiDisplayBox}>
            <View style={s.bmiLeft}>
              <Text style={s.bmiValText}>{bmi.score}</Text>
              <Text style={s.bmiLabel}>Body Mass Index (BMI)</Text>
            </View>
            <View style={[s.bmiBadge, { backgroundColor: 'rgba(225, 173, 1, 0.08)', borderColor: bmi.statusColor }]}>
              <Text style={[s.bmiBadgeText, { color: bmi.statusColor }]}>{bmi.range}</Text>
            </View>
          </View>
        </View>

        {/* Click-to-add fluid tracker */}
        <View style={[s.card, SHADOWS.premium]}>
          <Text style={s.cardTitle}>💧 Hydration Tracker (Daily Goal: {(waterGoal / 1000).toFixed(1)}L)</Text>
          <Text style={s.cardDesc}>
            Incrementally log your daily water intake. Goal calibrated dynamically against treatment baseline.
          </Text>

          <View style={s.waterBox}>
            <Text style={s.waterVal}>{waterIntake} mL</Text>
            <Text style={s.waterSub}>Logged of {waterGoal} mL goal</Text>

            {/* Visual Glass cells */}
            <View style={s.glassesGrid}>
              {[...Array(glassCount)].map((_, i) => {
                const filled = waterIntake >= (i + 1) * 250;
                return (
                  <View
                    key={i}
                    style={[
                      s.glassCell,
                      filled && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                  />
                );
              })}
            </View>

            <TouchableOpacity style={s.waterAddBtn} onPress={handleAddWater} activeOpacity={0.8}>
              <Text style={s.waterBtnText}>+ Click to log 250mL</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Weight alterations card */}
        <View style={[s.card, SHADOWS.premium]}>
          <Text style={s.cardTitle}>⚖️ Weight Alteration Logs</Text>
          <Text style={s.cardDesc}>Input changes in weight to recalibrate clinical baselines.</Text>

          <View style={s.weightInputRow}>
            <TextInput
              style={s.weightInput}
              placeholder="e.g. 70.5"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={newWeight}
              onChangeText={setNewWeight}
            />
            <TouchableOpacity style={s.weightLogBtn} onPress={handleLogWeight}>
              <Text style={s.weightLogBtnText}>Log Weight</Text>
            </TouchableOpacity>
          </View>

          <View style={s.weightTable}>
            {displayedWeightLogs.map((log, index) => (
              <View key={index} style={s.weightTableRow}>
                <Text style={s.weightTableCol1}>{log.date}</Text>
                <Text style={s.weightTableCol2}>{log.weight}</Text>
              </View>
            ))}
          </View>
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
  instructionBox: {
    backgroundColor: colors.surfaceLight,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
  },
  instructionText: {
    fontSize: 11,
    color: colors.textPrimary,
    lineHeight: 16,
  },
  bmiDisplayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bmiLeft: {
    flex: 1,
  },
  bmiValText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  bmiLabel: {
    fontSize: 10,
    color: colors.textSecondary,
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
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: SPACING.md,
  },
  waterVal: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.primary,
  },
  waterSub: {
    fontSize: 10,
    color: colors.textSecondary,
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
    borderColor: colors.border,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  waterAddBtn: {
    backgroundColor: colors.primary,
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
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 14,
  },
  weightLogBtn: {
    backgroundColor: colors.primary,
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
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  weightTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  weightTableCol1: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  weightTableCol2: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
});
