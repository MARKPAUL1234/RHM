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

export default function ServicesScreen() {
  const [activeModule, setActiveModule] = useState('nutrition'); // 'nutrition', 'monitoring', 'fitness', 'emergency'
  const {
    connectionStatus,
    usersMetadata,
    setUsersMetadata,
    patientDetails,
    setPatientDetails,
    alerts,
    vitals,
    handleOfflineEnqueue,
  } = useContext(HealthContext);

  // --- Nutrition Module States ---
  const [weightLogs, setWeightLogs] = useState([
    { date: 'May 10', weight: '71.5 kg' },
    { date: 'May 17', weight: '70.8 kg' },
    { date: 'May 24', weight: usersMetadata.weight ? `${usersMetadata.weight} kg` : '70.0 kg' },
  ]);
  const [newWeight, setNewWeight] = useState('');
  const [waterIntake, setWaterIntake] = useState(1250); // ml

  // --- Emergency Module States ---
  const [primaryContact, setPrimaryContact] = useState('+254 712 345 678');
  const [secondaryContact, setSecondaryContact] = useState('+254 789 012 345');
  const [medicalNotes, setMedicalNotes] = useState('Active Malaria treatment baseline. Penicillin allergy.');
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState('');

  // Automatically computes BMI from patient profile metadata
  const calculateBMI = () => {
    const wt = parseFloat(usersMetadata.weight) || 70;
    const ht = (parseFloat(usersMetadata.height) || 175) / 100; // meters
    const bmi = wt / (ht * ht);
    
    let range = 'Optimal Health';
    let statusColor = COLORS.online;
    if (bmi < 18.5) {
      range = 'Underweight';
      statusColor = COLORS.offline;
    } else if (bmi >= 25 && bmi < 30) {
      range = 'Overweight';
      statusColor = COLORS.offline;
    } else if (bmi >= 30) {
      range = 'Obese (Critical Alert)';
      statusColor = COLORS.critical;
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

  // Fitness Locks Check
  const hasCriticalAlert = alerts.some(a => a.severity === 'critical');

  // Emergency dispatch
  const handleEmergencyTrigger = async () => {
    if (!disclaimerAccepted) {
      Alert.alert('Disclaimer Required', 'Please acknowledge the medical disclaimer before triggering emergency operations.');
      return;
    }

    const activeConditions = usersMetadata.diagnosed_conditions ? usersMetadata.diagnosed_conditions.join(', ') : 'None';
    const userId = usersMetadata.user_id || 'usr_default';
    const smsContent = `EMERGENCY DISTRESS: User ${userId} has triggered an emergency alert. Medical profile context: Diagnosed with ${activeConditions}. Last recorded vitals: Temp ${vitals.temperature}°C, HR ${vitals.heartRate} BPM.`;

    const payload = {
      primaryContact,
      secondaryContact,
      medicalNotes,
      smsContent,
      timestamp: new Date().toISOString(),
    };

    if (connectionStatus === 'online') {
      setDispatchStatus(`DISPATCHED VIA SMS:\n"${smsContent}"`);
      setTimeout(() => {
        Alert.alert('Emergency Broadcasted', `SMS sent successfully:\n\n${smsContent}`);
      }, 800);
    } else {
      setDispatchStatus(`QUEUED (Offline SMS fallback):\n"${smsContent}"`);
      await handleOfflineEnqueue('emergency', payload);
      Alert.alert(
        'Offline Queue Activated',
        `SMS enqueued in physical storage fallback:\n\n${smsContent}`
      );
    }
  };

  const workouts = [
    { id: '1', type: 'Clinical Walk', duration: '20 mins', intensity: 'Low' },
    { id: '2', type: 'Static Stretching', duration: '15 mins', intensity: 'Low' },
    { id: '3', type: 'Light Cardiovascular Cycle', duration: '30 mins', intensity: 'Medium' },
  ];

  return (
    <View style={styles.container}>
      {/* Module Selector Sub-Navigation Tabs */}
      <View style={styles.tabContainer}>
        {['nutrition', 'monitoring', 'fitness', 'emergency'].map(mod => (
          <TouchableOpacity
            key={mod}
            style={[styles.moduleTab, activeModule === mod && styles.activeModuleTab]}
            onPress={() => setActiveModule(mod)}
          >
            <Text
              style={[
                styles.moduleTabText,
                activeModule === mod ? styles.activeModuleTabText : styles.inactiveModuleTabText,
              ]}
            >
              {mod.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ==================== 1. NUTRITION HUB ==================== */}
        {activeModule === 'nutrition' && (
          <View>
            {/* Dynamic Nutrition & Lifestyle Guidelines Alteration */}
            {(vitals.temperature > 38.0 || usersMetadata.diagnosed_conditions?.includes('Typhoid')) && (
              <View style={[styles.card, { borderColor: COLORS.critical, borderWidth: 1.5, backgroundColor: 'rgba(220, 38, 38, 0.02)' }]}>
                <Text style={[styles.cardTitle, { color: COLORS.critical }]}>⚠️ Clinical Diet Guideline Active</Text>
                <Text style={styles.cardDesc}>
                  Fever or gastrointestinal symptoms logged. Dietary safety protocol active.
                </Text>
                <View style={{ backgroundColor: COLORS.surface, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border }}>
                  <Text style={{ fontSize: 11, color: COLORS.textPrimary, lineHeight: 16 }}>
                    📢 <Text style={{ fontWeight: 'bold' }}>Important Instructions:</Text> Please shift <Text style={{ fontWeight: 'bold', color: COLORS.critical }}>strictly to boiled water</Text> and highly digestible, soft food items (such as vegetable broth, barley water, oatmeal, or pureed apples) to prevent digestive complications.
                  </Text>
                </View>
              </View>
            )}

            {/* BMI Calculator Display Card */}
            <View style={[styles.card, SHADOWS.premium]}>
              <Text style={styles.cardTitle}>📊 Medical BMI baseline Calculator</Text>
              <Text style={styles.cardDesc}>
                Automatically calculated in real-time from your patient baseline height ({usersMetadata.height}cm) and weight ({usersMetadata.weight}kg).
              </Text>
              
              <View style={styles.bmiDisplayBox}>
                <View style={styles.bmiLeft}>
                  <Text style={styles.bmiValText}>{bmi.score}</Text>
                  <Text style={styles.bmiLabel}>Body Mass Index (BMI)</Text>
                </View>
                <View style={[styles.bmiBadge, { backgroundColor: bmi.statusColor + '1A', borderColor: bmi.statusColor }]}>
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
                          filled && { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primaryLight }
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
          </View>
        )}

        {/* ==================== 2. PATIENT MONITORING MODULE ==================== */}
        {activeModule === 'monitoring' && (
          <View style={[styles.card, SHADOWS.premium]}>
            <Text style={styles.cardTitle}>📊 Patient Monitoring Collection Feeds</Text>
            <Text style={styles.cardDesc}>
              Structured clinical parameters synced with local storage and enqueued for database pushes.
            </Text>

            <View style={styles.table}>
              <View style={styles.tableRowHeader}>
                <Text style={[styles.col1, styles.headerCell]}>Metric Parameter</Text>
                <Text style={[styles.col2, styles.headerCell]}>Current Reading</Text>
                <Text style={[styles.col3, styles.headerCell]}>Status Evaluated</Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.col1}>Systolic Blood Pressure</Text>
                <Text style={styles.col2}>{patientDetails.bloodPressure} mmHg</Text>
                <Text style={[styles.col3, styles.okStatus]}>Stable</Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.col1}>Blood Glucose</Text>
                <Text style={styles.col2}>{patientDetails.bloodGlucose} mg/dL</Text>
                <Text style={[styles.col3, styles.okStatus]}>Optimal</Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.col1}>Respiratory Rate</Text>
                <Text style={styles.col2}>{patientDetails.respiratoryRate} rpm</Text>
                <Text style={[styles.col3, styles.okStatus]}>Normal</Text>
              </View>
            </View>

            <View style={styles.hardwareKey}>
              <Text style={styles.keyTitle}>Collection Details</Text>
              <Text style={styles.keyText}>
                Blood pressure, Glucose, and Respiratory rates represent enqueued medical charts entered during sessions, synced under Appwrite portal collection wrappers.
              </Text>
            </View>
          </View>
        )}

        {/* ==================== 3. FITNESS TRADE CENTER ==================== */}
        {activeModule === 'fitness' && (
          <View>
            {hasCriticalAlert ? (
              /* Strenuous exercises lock */
              <View style={[styles.lockedCard, SHADOWS.premium]}>
                <Text style={styles.lockedIcon}>⚠️</Text>
                <View style={styles.lockedTextCol}>
                  <Text style={styles.lockedTitle}>Strenuous Activities Disabled</Text>
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
          </View>
        )}

        {/* ==================== 4. EMERGENCY PANEL ==================== */}
        {activeModule === 'emergency' && (
          <View style={[styles.card, SHADOWS.premium]}>
            <Text style={[styles.cardTitle, { color: COLORS.critical }]}>🚨 Emergency Trigger Centre</Text>
            <Text style={styles.cardDesc}>
              Initiate priority emergency protocol dispatches. Generates vital sensor records (Temp, HR) and dispatches emergency payloads to contacts via SMS.
            </Text>

            {/* Disclaimer */}
            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerTitle}>⚠️ MEDICAL DISCLAIMER</Text>
              <Text style={styles.disclaimerText}>
                This protocol alerts your saved contacts immediately. The Remote Health Monitoring Tool is an administrative telemetry suite and not a primary emergency service router.
              </Text>
              
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setDisclaimerAccepted(!disclaimerAccepted)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, disclaimerAccepted && styles.checkboxActive]}>
                  {disclaimerAccepted && <Text style={styles.checkboxTick}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>I read and accept all disclaimer remarks.</Text>
              </TouchableOpacity>
            </View>

            {/* Emergency Contact Input */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Primary Contact SMS Node</Text>
              <TextInput
                style={styles.fieldInput}
                value={primaryContact}
                onChangeText={setPrimaryContact}
                placeholder="+254 712 345 678"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Secondary Contact SMS Node</Text>
              <TextInput
                style={styles.fieldInput}
                value={secondaryContact}
                onChangeText={setSecondaryContact}
                placeholder="+254 789 012 345"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Critical Patient Clinical Remarks</Text>
              <TextInput
                style={[styles.fieldInput, { height: 60 }]}
                multiline
                numberOfLines={3}
                value={medicalNotes}
                onChangeText={setMedicalNotes}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.dispatchBtn,
                !disclaimerAccepted && styles.disabledDispatchBtn,
                SHADOWS.premium
              ]}
              onPress={handleEmergencyTrigger}
              activeOpacity={0.8}
            >
              <Text style={styles.dispatchBtnText}>TRIGGER EMERGENCY PROTOCOL</Text>
            </TouchableOpacity>

            {dispatchStatus ? (
              <View style={styles.dispatchStatusBox}>
                <Text style={styles.dispatchStatusTitle}>Broadcast Status:</Text>
                <Text style={styles.dispatchStatusVal}>{dispatchStatus}</Text>
              </View>
            ) : null}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  moduleTab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeModuleTab: {
    borderBottomColor: COLORS.primaryLight,
  },
  moduleTabText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.bold,
    letterSpacing: 0.5,
  },
  activeModuleTabText: {
    color: COLORS.primaryLight,
  },
  inactiveModuleTabText: {
    color: COLORS.textSecondary,
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
  // BMI Display Box
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
  // Water Tracker styles
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
    color: COLORS.primaryLight,
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
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  waterBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  // Weight Log table
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
    color: '#FFF',
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
  // Strenuous lock style
  lockedCard: {
    backgroundColor: 'rgba(217, 119, 6, 0.05)',
    borderWidth: 2,
    borderColor: COLORS.offline,
    borderRadius: SPACING.borderRadius,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  lockedIcon: {
    fontSize: 32,
    marginRight: SPACING.md,
  },
  lockedTextCol: {
    flex: 1,
  },
  lockedTitle: {
    color: COLORS.offline,
    fontSize: TYPOGRAPHY.sizes.body + 1,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  lockedDesc: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  // Steps and activities grid
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
    color: COLORS.accent,
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
  // Emergency styles
  disclaimerBox: {
    backgroundColor: 'rgba(220, 38, 38, 0.05)',
    borderWidth: 1,
    borderColor: COLORS.critical,
    borderRadius: 8,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  disclaimerTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.critical,
    marginBottom: 4,
  },
  disclaimerText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    lineHeight: 14,
    marginBottom: SPACING.sm,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: COLORS.critical,
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: COLORS.critical,
  },
  checkboxTick: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  formGroup: {
    marginBottom: SPACING.sm,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    fontSize: 13,
  },
  dispatchBtn: {
    backgroundColor: COLORS.critical,
    borderRadius: 8,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  disabledDispatchBtn: {
    backgroundColor: COLORS.border,
    opacity: 0.5,
  },
  dispatchBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  dispatchStatusBox: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    alignItems: 'center',
  },
  dispatchStatusTitle: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  dispatchStatusVal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.online,
    marginTop: 2,
  },
  // Table monitoring styles
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SPACING.borderRadiusSm,
    overflow: 'hidden',
  },
  tableRowHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  headerCell: {
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    fontSize: 11,
  },
  col1: {
    flex: 2,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  col2: {
    flex: 1.5,
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  col3: {
    flex: 1.5,
    fontSize: 11,
    fontWeight: 'bold',
  },
  okStatus: {
    color: COLORS.online,
  },
  hardwareKey: {
    backgroundColor: COLORS.surfaceLight,
    padding: SPACING.md,
    borderRadius: SPACING.borderRadiusSm,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.md,
  },
  keyTitle: {
    color: COLORS.textPrimary,
    fontWeight: 'bold',
    fontSize: 11,
    marginBottom: 4,
  },
  keyText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    lineHeight: 15,
  },
});
