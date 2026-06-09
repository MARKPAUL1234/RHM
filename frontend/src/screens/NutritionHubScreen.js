import React, { useContext, useMemo, useState } from 'react';
import {
  Alert,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { HealthContext } from '../context/HealthContext';
import djangoApi from '../services/django_api';
import { TYPOGRAPHY, SPACING, SHADOWS, getResponsiveMetrics } from '../styles/theme';

const todayKey = () => new Date().toDateString();
const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

const formatDate = (value) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export default function NutritionHubScreen() {
  const {
    usersMetadata,
    setUsersMetadata,
    nutrition,
    nutritionLogs,
    foodLogs,
    recommendations,
    vitals,
    logNutritionEntry,
    logFoodEntry,
    colors,
  } = useContext(HealthContext);
  const { width } = useWindowDimensions();
  const metrics = getResponsiveMetrics(width);
  const [newWeight, setNewWeight] = useState('');
  const [foodName, setFoodName] = useState('');
  const [mealType, setMealType] = useState('breakfast');
  const [calories, setCalories] = useState('');
  const [carbs, setCarbs] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [foodNote, setFoodNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingRec, setIsGeneratingRec] = useState(false);

  const weightLogs = useMemo(
    () => nutritionLogs.filter((log) => log.entry_type === 'weight').slice(0, 8),
    [nutritionLogs]
  );

  const waterGoal = Number(nutrition.waterGoal || 0);
  const waterIntake = nutritionLogs
    .filter((log) => log.entry_type === 'water' && new Date(log.timestamp).toDateString() === todayKey())
    .reduce((total, log) => total + Number(log.value || 0), 0);
  const waterProgress = waterGoal > 0 ? Math.min((waterIntake / waterGoal) * 100, 100) : 0;
  const glassCount = waterGoal > 0 ? Math.ceil(waterGoal / 250) : 0;
  const todaysFoodLogs = useMemo(
    () => foodLogs.filter((log) => new Date(log.timestamp).toDateString() === todayKey()),
    [foodLogs]
  );
  const macroTotals = todaysFoodLogs.reduce(
    (totals, log) => ({
      calories: totals.calories + Number(log.calories || 0),
      carbs: totals.carbs + Number(log.carbs_g || 0),
      protein: totals.protein + Number(log.protein_g || 0),
      fat: totals.fat + Number(log.fat_g || 0),
    }),
    { calories: 0, carbs: 0, protein: 0, fat: 0 }
  );

  const calculateBMI = () => {
    const weight = Number(usersMetadata.weight);
    const height = Number(usersMetadata.height) / 100;

    if (!Number.isFinite(weight) || !Number.isFinite(height) || weight <= 0 || height <= 0) {
      return {
        score: '--',
        range: 'Baseline needed',
        statusColor: colors.textMuted,
      };
    }

    const bmi = weight / (height * height);
    if (bmi < 18.5) return { score: bmi.toFixed(1), range: 'Underweight', statusColor: colors.warning };
    if (bmi < 25) return { score: bmi.toFixed(1), range: 'Healthy range', statusColor: colors.success };
    if (bmi < 30) return { score: bmi.toFixed(1), range: 'Overweight', statusColor: colors.warning };
    return { score: bmi.toFixed(1), range: 'Clinical review', statusColor: colors.critical };
  };

  const bmi = calculateBMI();

  const handleLogWeight = async () => {
    const parsedWeight = Number(newWeight);
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      Alert.alert('Invalid weight', 'Enter a valid weight in kilograms.');
      return;
    }

    setIsSaving(true);
    try {
      setUsersMetadata({
        ...usersMetadata,
        weight: parsedWeight,
      });
      await logNutritionEntry({
        entry_type: 'weight',
        value: parsedWeight,
        unit: 'kg',
        note: 'Profile baseline weight update',
      });
      setNewWeight('');
      Alert.alert('Weight saved', 'The weight entry was synced to the backend.');
    } catch (error) {
      Alert.alert('Save failed', error.message || 'Unable to sync the weight entry.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateRecommendations = async () => {
    setIsGeneratingRec(true);
    try {
      await djangoApi.post('/recommendations/generate/');
      Alert.alert('Recommendations updated!', 'Your personalized nutrition recommendations have been refreshed.');
    } catch (error) {
      Alert.alert('Update failed', error.message || 'Unable to generate recommendations.');
    } finally {
      setIsGeneratingRec(false);
    }
  };

  const handleAddWater = async () => {
    setIsSaving(true);
    try {
      await logNutritionEntry({
        entry_type: 'water',
        value: 250,
        unit: 'ml',
        note: 'Hydration tracker entry',
      });
    } catch (error) {
      Alert.alert('Save failed', error.message || 'Unable to sync the hydration entry.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogFood = async () => {
    const parsedCalories = Number(calories);
    const parsedCarbs = Number(carbs || 0);
    const parsedProtein = Number(protein || 0);
    const parsedFat = Number(fat || 0);

    if (!foodName.trim() || !Number.isFinite(parsedCalories) || parsedCalories <= 0) {
      Alert.alert('Invalid meal', 'Enter a food name and calories before saving.');
      return;
    }

    setIsSaving(true);
    try {
      await logFoodEntry({
        meal_type: mealType,
        food_name: foodName.trim(),
        calories: Math.round(parsedCalories),
        carbs_g: Number.isFinite(parsedCarbs) ? parsedCarbs : 0,
        protein_g: Number.isFinite(parsedProtein) ? parsedProtein : 0,
        fat_g: Number.isFinite(parsedFat) ? parsedFat : 0,
        note: foodNote.trim(),
      });
      setFoodName('');
      setCalories('');
      setCarbs('');
      setProtein('');
      setFat('');
      setFoodNote('');
      Alert.alert('Meal saved', 'Food and macro details were synced to the backend.');
    } catch (error) {
      Alert.alert('Save failed', error.message || 'Unable to sync the food entry.');
    } finally {
      setIsSaving(false);
    }
  };

  const clinicalDietActive = Number(vitals.temperature) > 38.0 || usersMetadata.diagnosed_conditions?.includes('Typhoid');
  const s = styles(colors, metrics);

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.pageInner}>
          <View style={s.pageHeader}>
            <View>
              <Text style={s.eyebrow}>Nutrition hub</Text>
              <Text style={s.pageTitle}>Diet, hydration, and body metrics</Text>
            </View>
            <View style={s.profileCard}>
              <Text style={s.profileLabel}>Clinical baseline</Text>
              <Text style={s.profileValue}>
                {usersMetadata.weight || '--'} kg / {usersMetadata.height || '--'} cm
              </Text>
            </View>
          </View>

          {clinicalDietActive ? (
            <View style={[s.noticeCard, SHADOWS.subtle]}>
              <Text style={s.noticeTitle}>Diet caution active</Text>
              <Text style={s.noticeText}>
                Fever or gastrointestinal risk is present. Prioritize boiled water, soft digestible meals, and medication adherence checks.
              </Text>
            </View>
          ) : null}

          <View style={s.contentGrid}>
            <View style={[s.card, s.bmiCard, SHADOWS.subtle]}>
              <Text style={s.cardTitle}>BMI baseline</Text>
              <Text style={s.cardDesc}>Calculated from the authenticated backend profile height and weight.</Text>

              <View style={s.bmiDisplayBox}>
                <View>
                  <Text style={s.bmiValText}>{bmi.score}</Text>
                  <Text style={s.bmiLabel}>Body mass index</Text>
                </View>
                <View style={[s.bmiBadge, { borderColor: bmi.statusColor }]}>
                  <Text style={[s.bmiBadgeText, { color: bmi.statusColor }]}>{bmi.range}</Text>
                </View>
              </View>
            </View>

            <View style={[s.card, s.hydrationCard, SHADOWS.subtle]}>
              <Text style={s.cardTitle}>Hydration tracker</Text>
              <Text style={s.cardDesc}>Daily intake logs are saved as backend nutrition records.</Text>

              <View style={s.progressHeader}>
                <Text style={s.waterVal}>{waterIntake} mL</Text>
                <Text style={s.waterSub}>{waterGoal ? `${waterGoal} mL goal` : 'No water goal set'}</Text>
              </View>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${waterProgress}%` }]} />
              </View>

              {glassCount > 0 ? (
                <View style={s.glassesGrid}>
                  {[...Array(glassCount)].map((_, index) => {
                    const filled = waterIntake >= (index + 1) * 250;
                    return <View key={index} style={[s.glassCell, filled && s.glassCellFilled]} />;
                  })}
                </View>
              ) : null}

              <TouchableOpacity style={[s.primaryButton, isSaving && s.disabledButton]} onPress={handleAddWater} disabled={isSaving}>
                <Text style={s.primaryButtonText}>Log 250 mL</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.contentGrid}>
            <View style={[s.card, s.foodFormCard, SHADOWS.subtle]}>
              <Text style={s.cardTitle}>Food and macros</Text>
              <Text style={s.cardDesc}>Meals are saved as manual food logs with calories, carbs, protein, and fat.</Text>

              <View style={s.mealTypeRow}>
                {mealTypes.map((type) => {
                  const active = mealType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[s.mealTypeButton, active && s.activeMealTypeButton]}
                      onPress={() => setMealType(type)}
                    >
                      <Text style={[s.mealTypeText, active && s.activeMealTypeText]}>{type}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={s.foodInputGrid}>
                <TextInput
                  style={[s.foodInput, s.foodNameInput]}
                  placeholder="Food name"
                  placeholderTextColor={colors.textMuted}
                  value={foodName}
                  onChangeText={setFoodName}
                />
                <TextInput
                  style={s.foodInput}
                  placeholder="Calories"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={calories}
                  onChangeText={setCalories}
                />
                <TextInput
                  style={s.foodInput}
                  placeholder="Carbs g"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={carbs}
                  onChangeText={setCarbs}
                />
                <TextInput
                  style={s.foodInput}
                  placeholder="Protein g"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={protein}
                  onChangeText={setProtein}
                />
                <TextInput
                  style={s.foodInput}
                  placeholder="Fat g"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={fat}
                  onChangeText={setFat}
                />
                <TextInput
                  style={[s.foodInput, s.foodNameInput]}
                  placeholder="Note"
                  placeholderTextColor={colors.textMuted}
                  value={foodNote}
                  onChangeText={setFoodNote}
                />
              </View>

              <TouchableOpacity style={[s.primaryButton, isSaving && s.disabledButton]} onPress={handleLogFood} disabled={isSaving}>
                <Text style={s.primaryButtonText}>Save food log</Text>
              </TouchableOpacity>
            </View>

            <View style={[s.card, s.macroCard, SHADOWS.subtle]}>
              <Text style={s.cardTitle}>Today's intake</Text>
              <Text style={s.cardDesc}>Calories and macros from food logs entered today.</Text>

              <View style={s.macroGrid}>
                <View style={s.macroBox}>
                  <Text style={s.macroValue}>{Math.round(macroTotals.calories)}</Text>
                  <Text style={s.macroLabel}>kcal</Text>
                </View>
                <View style={s.macroBox}>
                  <Text style={s.macroValue}>{macroTotals.carbs.toFixed(0)}g</Text>
                  <Text style={s.macroLabel}>Carbs</Text>
                </View>
                <View style={s.macroBox}>
                  <Text style={s.macroValue}>{macroTotals.protein.toFixed(0)}g</Text>
                  <Text style={s.macroLabel}>Protein</Text>
                </View>
                <View style={s.macroBox}>
                  <Text style={s.macroValue}>{macroTotals.fat.toFixed(0)}g</Text>
                  <Text style={s.macroLabel}>Fat</Text>
                </View>
              </View>

              {foodLogs.length === 0 ? (
                <View style={s.emptyBox}>
                  <Text style={s.emptyText}>No food logs saved yet.</Text>
                </View>
              ) : (
                foodLogs.slice(0, 5).map((log) => (
                  <View key={log.id} style={s.foodLogRow}>
                    <View>
                      <Text style={s.foodLogTitle}>{log.food_name}</Text>
                      <Text style={s.foodLogMeta}>{log.meal_type} / {formatDate(log.timestamp)}</Text>
                    </View>
                    <Text style={s.foodLogCalories}>{log.calories} kcal</Text>
                  </View>
                ))
              )}
            </View>
          </View>

          <View style={s.contentGrid}>
            <View style={[s.card, s.weightCard, SHADOWS.subtle]}>
              <Text style={s.cardTitle}>Weight history</Text>
              <Text style={s.cardDesc}>New weight entries update both nutrition logs and the profile baseline.</Text>

              <View style={s.weightInputRow}>
                <TextInput
                  style={s.weightInput}
                  placeholder="Weight in kg"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={newWeight}
                  onChangeText={setNewWeight}
                />
                <TouchableOpacity style={[s.primaryButton, s.logWeightButton, isSaving && s.disabledButton]} onPress={handleLogWeight} disabled={isSaving}>
                  <Text style={s.primaryButtonText}>Save</Text>
                </TouchableOpacity>
              </View>

              <View style={s.table}>
                {weightLogs.length === 0 ? (
                  <View style={s.emptyBox}>
                    <Text style={s.emptyText}>
                      {usersMetadata.weight ? `Profile baseline: ${usersMetadata.weight} kg` : 'No weight records yet.'}
                    </Text>
                  </View>
                ) : (
                  weightLogs.map((log) => (
                    <View key={log.id} style={s.tableRow}>
                      <Text style={s.tableDate}>{formatDate(log.timestamp)}</Text>
                      <Text style={s.tableValue}>{log.value} {log.unit}</Text>
                      <Text style={s.tableNote} numberOfLines={1}>{log.note || 'Weight log'}</Text>
                    </View>
                  ))
                )}
              </View>
            </View>

            <View style={[s.card, s.recommendationCard, SHADOWS.subtle]}>
              <View style={s.recommendationHeader}>
                <View>
                  <Text style={s.cardTitle}>Personalized Diet Recommendations</Text>
                  <Text style={s.cardDesc}>Based on your blood group and health profile</Text>
                </View>
                <TouchableOpacity 
                  style={[s.primaryButton, s.smallButton, isGeneratingRec && s.disabledButton]} 
                  onPress={handleGenerateRecommendations}
                  disabled={isGeneratingRec}
                >
                  <Text style={s.primaryButtonText}>
                    {isGeneratingRec ? 'Generating...' : 'Refresh'}
                  </Text>
                </TouchableOpacity>
              </View>

              {recommendations.length === 0 ? (
                <View style={s.emptyBox}>
                  <Text style={s.emptyText}>Log your vitals to generate personalized nutrition recommendations!</Text>
                </View>
              ) : (
                recommendations.slice(0, 3).map((rec, index) => (
                  <View key={rec.id || index} style={s.recommendationItem}>
                    <Text style={s.recommendationTitle}>Fluid Target: {rec.fluid_target}</Text>
                    <Text style={s.recommendationText}>{rec.meal_plan}</Text>
                    <Text style={s.recommendationMeta}>{rec.lifestyle_guideline}</Text>
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
  profileCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: metrics.cardPadding,
    minWidth: metrics.isPhone ? '100%' : 220,
  },
  profileLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  profileValue: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: 3,
  },
  noticeCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 8,
    padding: metrics.cardPadding,
    marginBottom: SPACING.md,
  },
  noticeTitle: {
    color: colors.warning,
    fontSize: 15,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 4,
  },
  noticeText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
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
    padding: metrics.cardPadding,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bmiCard: {
    flexGrow: 1,
    flexBasis: metrics.isPhone ? '100%' : '34%',
    minWidth: metrics.isPhone ? '100%' : 320,
  },
  hydrationCard: {
    flexGrow: 1,
    flexBasis: metrics.isPhone ? '100%' : '58%',
    minWidth: metrics.isPhone ? '100%' : 440,
  },
  foodFormCard: {
    flexGrow: 1,
    flexBasis: metrics.isPhone ? '100%' : '58%',
    minWidth: metrics.isPhone ? '100%' : 440,
  },
  macroCard: {
    flexGrow: 1,
    flexBasis: metrics.isPhone ? '100%' : '34%',
    minWidth: metrics.isPhone ? '100%' : 320,
  },
  weightCard: {
    flexGrow: 1,
    flexBasis: metrics.isPhone ? '100%' : '48%',
    minWidth: metrics.isPhone ? '100%' : 360,
  },
  recommendationCard: {
    flexGrow: 1,
    flexBasis: metrics.isPhone ? '100%' : '48%',
    minWidth: metrics.isPhone ? '100%' : 360,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  smallButton: {
    minHeight: 32,
    paddingHorizontal: SPACING.sm,
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
  bmiDisplayBox: {
    flexDirection: metrics.isTiny ? 'column' : 'row',
    alignItems: metrics.isTiny ? 'flex-start' : 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    backgroundColor: colors.elevated,
    borderRadius: 8,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bmiValText: {
    fontSize: 34,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: colors.textPrimary,
  },
  bmiLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bmiBadge: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  bmiBadgeText: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  waterVal: {
    fontSize: 28,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: colors.secondary,
  },
  waterSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  progressTrack: {
    height: 10,
    backgroundColor: colors.elevated,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: SPACING.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.secondary,
  },
  glassesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: SPACING.md,
  },
  glassCell: {
    width: 22,
    height: 28,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    backgroundColor: colors.elevated,
  },
  glassCellFilled: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
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
  mealTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  mealTypeButton: {
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
  activeMealTypeButton: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLight,
  },
  mealTypeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    textTransform: 'capitalize',
  },
  activeMealTypeText: {
    color: colors.primary,
  },
  foodInputGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  foodInput: {
    flexGrow: 1,
    flexBasis: metrics.isPhone ? '47%' : '30%',
    minWidth: metrics.isPhone ? 130 : 150,
    minHeight: 42,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    color: colors.textPrimary,
    fontSize: 14,
  },
  foodNameInput: {
    flexBasis: metrics.isPhone ? '100%' : '47%',
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  macroBox: {
    flexGrow: 1,
    flexBasis: metrics.isPhone ? '47%' : '45%',
    minWidth: 112,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: SPACING.md,
  },
  macroValue: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  macroLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 3,
  },
  foodLogRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: SPACING.md,
    marginTop: SPACING.sm,
  },
  foodLogTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  foodLogMeta: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 3,
    textTransform: 'capitalize',
  },
  foodLogCalories: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  weightInputRow: {
    flexDirection: metrics.isTiny ? 'column' : 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  weightInput: {
    flex: 1,
    minHeight: 42,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    color: colors.textPrimary,
    fontSize: 14,
  },
  logWeightButton: {
    minWidth: metrics.isTiny ? '100%' : 100,
  },
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: metrics.isTiny ? 'column' : 'row',
    justifyContent: 'space-between',
    gap: SPACING.xs,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.elevated,
  },
  tableDate: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  tableValue: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: colors.textPrimary,
    flex: 1,
  },
  tableNote: {
    fontSize: 11,
    color: colors.textMuted,
    flex: 1.2,
  },
  emptyBox: {
    minHeight: 82,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.elevated,
    padding: SPACING.md,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
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
    color: colors.textPrimary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
    whiteSpace: 'pre-wrap',
  },
  recommendationMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});
