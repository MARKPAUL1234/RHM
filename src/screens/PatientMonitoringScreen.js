import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { HealthContext } from '../context/HealthContext';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS } from '../styles/theme';
import { HealthSyncManager } from '../services/appwrite';

export default function PatientMonitoringScreen() {
  const {
    connectionStatus,
    setVitals,
    handleOfflineEnqueue,
    refreshSyncStats,
  } = useContext(HealthContext);

  // --- Self-Reporting Form States ---
  const [journalTemp, setJournalTemp] = useState(36.6);
  const [journalHr, setJournalHr] = useState(72);
  const [journalSpO2, setJournalSpO2] = useState(98);
  const [wellbeing, setWellbeing] = useState(4);
  const [medsTaken, setMedsTaken] = useState(true);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  
  // Guardrail popup state
  const [isGuardrailModalVisible, setIsGuardrailModalVisible] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');

  // Available symptoms checklists
  const symptomsList = [
    { label: 'Chills 🥶', value: 'Chills' },
    { label: 'Severe Headache 🤯', value: 'Severe Headache' },
    { label: 'Muscle Aches 🩻', value: 'Muscle Aches' },
    { label: 'Weakness 🫠', value: 'Weakness' },
    { label: 'Stomach Pain 🤢', value: 'Stomach Pain' },
    { label: 'Chronic Fatigue 🥱', value: 'Chronic Fatigue' },
  ];

  const toggleSymptom = (symptom) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
  };

  const adjustFormMetric = (key, delta, min, max, decimal = 0) => {
    if (key === 'temp') {
      const val = Math.min(Math.max(journalTemp + delta, min), max);
      setJournalTemp(parseFloat(val.toFixed(decimal)));
    } else if (key === 'hr') {
      const val = Math.min(Math.max(journalHr + delta, min), max);
      setJournalHr(parseInt(val.toFixed(0)));
    } else if (key === 'spo2') {
      const val = Math.min(Math.max(journalSpO2 + delta, min), max);
      setJournalSpO2(parseInt(val.toFixed(0)));
    }
  };

  // Submit handler with Safety UI Guardrail checks
  const handleSubmitJournal = (bypass = false) => {
    const isTempCritical = journalTemp > 38.5;
    const isSpo2Critical = journalSpO2 < 92;

    if ((isTempCritical || isSpo2Critical) && !bypass) {
      // Trigger the Safety UI Guardrail modal dialogue and pause submission
      setIsGuardrailModalVisible(true);
      return;
    }

    const payload = {
      temperature: journalTemp,
      heartRate: journalHr,
      spo2: journalSpO2,
      symptoms_array: selectedSymptoms,
      meds_taken: medsTaken,
      wellbeing_score: wellbeing,
      timestamp: new Date().toISOString()
    };

    // Update context instantly
    setVitals({
      heartRate: journalHr,
      spo2: journalSpO2,
      temperature: journalTemp
    });

    submitJournalRecord(payload);
  };

  const submitJournalRecord = async (payload) => {
    setSyncStatusMsg('Processing baseline submission...');
    const isOnline = connectionStatus === 'online';
    
    if (isOnline) {
      await handleOfflineEnqueue('vital', payload);
      const result = await HealthSyncManager.syncNow(true);
      if (result.success) {
        setSyncStatusMsg('✅ Synced to Appwrite Cloud successfully!');
      } else {
        setSyncStatusMsg('Saved Offline (Pending Sync)');
      }
    } else {
      await handleOfflineEnqueue('vital', payload);
      setSyncStatusMsg('Saved Offline (Pending Sync)');
    }

    // Reset Form fields
    setSelectedSymptoms([]);
    setWellbeing(4);
    setMedsTaken(true);
    await refreshSyncStats();

    setTimeout(() => {
      setSyncStatusMsg('');
    }, 4000);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {syncStatusMsg ? (
          <View style={styles.statusMsgBox}>
            <Text style={styles.statusMsgText}>{syncStatusMsg}</Text>
          </View>
        ) : null}

        {/* The Smart Self-Reporting Journal Form */}
        <View style={[styles.card, SHADOWS.premium]}>
          <Text style={styles.cardTitle}>📝 Daily Self-Reporting Patient Journal</Text>
          <Text style={styles.cardDesc}>
            Log your daily physiological markers. The enqueued entries will be verified locally and synced with your cloud medical file.
          </Text>

          {/* Metric Adjuster: Temperature (Restricted 34°C to 42°C) */}
          <View style={styles.formRow}>
            <View style={styles.adjusterMeta}>
              <Text style={styles.adjusterLabel}>🌡️ Body Temperature (°C)</Text>
              <Text style={[styles.adjusterValText, journalTemp > 38.5 && styles.critText]}>{journalTemp}°C</Text>
            </View>
            <View style={styles.adjusterControl}>
              <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustFormMetric('temp', -0.1, 34.0, 42.0, 1)}>
                <Text style={styles.adjustBtnText}>−</Text>
              </TouchableOpacity>
              <View style={styles.sliderTrack}>
                <View style={[styles.sliderFill, { width: `${((journalTemp - 34) / 8) * 100}%` }]} />
              </View>
              <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustFormMetric('temp', 0.1, 34.0, 42.0, 1)}>
                <Text style={styles.adjustBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Metric Adjuster: Heart Rate (Restricted 40 to 200 BPM) */}
          <View style={styles.formRow}>
            <View style={styles.adjusterMeta}>
              <Text style={styles.adjusterLabel}>❤️ Heart Rate (BPM)</Text>
              <Text style={[styles.adjusterValText, journalHr > 100 && styles.critText]}>{journalHr} BPM</Text>
            </View>
            <View style={styles.adjusterControl}>
              <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustFormMetric('hr', -2, 40, 200)}>
                <Text style={styles.adjustBtnText}>−</Text>
              </TouchableOpacity>
              <View style={styles.sliderTrack}>
                <View style={[styles.sliderFill, { width: `${((journalHr - 40) / 160) * 100}%` }]} />
              </View>
              <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustFormMetric('hr', 2, 40, 200)}>
                <Text style={styles.adjustBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Metric Adjuster: SpO2 (Restricted 50% to 100%) */}
          <View style={styles.formRow}>
            <View style={styles.adjusterMeta}>
              <Text style={styles.adjusterLabel}>🫁 Capillary Oxygen (SpO2 %)</Text>
              <Text style={[styles.adjusterValText, journalSpO2 < 92 && styles.critText]}>{journalSpO2}%</Text>
            </View>
            <View style={styles.adjusterControl}>
              <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustFormMetric('spo2', -1, 50, 100)}>
                <Text style={styles.adjustBtnText}>−</Text>
              </TouchableOpacity>
              <View style={styles.sliderTrack}>
                <View style={[styles.sliderFill, { width: `${((journalSpO2 - 50) / 50) * 100}%` }]} />
              </View>
              <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustFormMetric('spo2', 1, 50, 100)}>
                <Text style={styles.adjustBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Symptoms Checklist Matrix */}
          <Text style={styles.formSectionTitle}>Qualitative Symptoms Checked</Text>
          <View style={styles.symptomsGrid}>
            {symptomsList.map(s => {
              const checked = selectedSymptoms.includes(s.value);
              return (
                <TouchableOpacity
                  key={s.value}
                  style={[styles.symptomBox, checked && styles.symptomBoxChecked]}
                  onPress={() => toggleSymptom(s.value)}
                >
                  <Text style={[styles.symptomText, checked && styles.symptomTextChecked]}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Subjective Wellbeing Slider */}
          <View style={styles.wellbeingRow}>
            <Text style={styles.wellbeingLabel}>🧠 Subjective Wellbeing (1-5):</Text>
            <View style={styles.wellbeingButtons}>
              {[1, 2, 3, 4, 5].map(score => (
                <TouchableOpacity
                  key={score}
                  style={[styles.scoreBtn, wellbeing === score && styles.scoreBtnSelected]}
                  onPress={() => setWellbeing(score)}
                >
                  <Text style={[styles.scoreText, wellbeing === score && styles.scoreTextSelected]}>{score}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Medication Adherence Check */}
          <View style={styles.medsRow}>
            <View style={styles.medsLeft}>
              <Text style={styles.medsTitle}>💊 Medication Adherence Check</Text>
              <Text style={styles.medsDesc}>Acknowledge if you took your scheduled prescription metrics today.</Text>
            </View>
            <Switch
              value={medsTaken}
              onValueChange={setMedsTaken}
              trackColor={{ false: COLORS.surfaceLight, true: COLORS.primary }}
              thumbColor={medsTaken ? COLORS.primary : COLORS.border}
            />
          </View>

          <TouchableOpacity style={[styles.submitBtn, SHADOWS.premium]} onPress={() => handleSubmitJournal(false)}>
            <Text style={styles.submitBtnText}>Submit Daily Journal Log</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Safety UI Guardrail Warning Modal */}
      {isGuardrailModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, SHADOWS.premium]}>
            <Text style={styles.modalHeader}>🚨 CRITICAL PARAMETERS DETECTED</Text>
            <Text style={styles.modalText}>
              Warning: Critical parameters detected. Please verify input data accuracy or activate the Emergency Trigger immediately.
            </Text>
            
            <View style={styles.modalMetricsBox}>
              {journalTemp > 38.5 && (
                <Text style={styles.modalMetricLine}>• Temperature elevated: {journalTemp}°C</Text>
              )}
              {journalSpO2 < 92 && (
                <Text style={styles.modalMetricLine}>• SpO2 Oxygen low: {journalSpO2}%</Text>
              )}
            </View>

            <Text style={styles.modalWarningText}>
              The parameters logged represent severe hypoxia or fever flare-ups. Recalibrate input vectors or confirm to sync enqueued records.
            </Text>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCloseBtn]}
                onPress={() => setIsGuardrailModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>Recalibrate (Go Back)</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBypassBtn]}
                onPress={() => {
                  setIsGuardrailModalVisible(false);
                  handleSubmitJournal(true); // Bypass submit
                }}
              >
                <Text style={styles.modalBypassText}>Confirm & Log Entry</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  formRow: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  adjusterMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  adjusterLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  adjusterValText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  adjusterControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  adjustBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  sliderTrack: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  critText: {
    color: COLORS.primary,
  },
  formSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.md,
  },
  symptomBox: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  symptomBoxChecked: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(225, 173, 1, 0.05)',
  },
  symptomText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  symptomTextChecked: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  wellbeingRow: {
    marginVertical: SPACING.md,
    gap: 8,
  },
  wellbeingLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  wellbeingButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  scoreBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  scoreBtnSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(225, 173, 1, 0.08)',
  },
  scoreText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  scoreTextSelected: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  medsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  medsLeft: {
    flex: 0.8,
  },
  medsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  medsDesc: {
    fontSize: 9,
    color: COLORS.textMuted,
    lineHeight: 13,
    marginTop: 2,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 10,
    padding: SPACING.lg,
  },
  modalCard: {
    width: '90%',
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.borderRadius,
    padding: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  modalHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: SPACING.md,
    letterSpacing: 0.3,
  },
  modalText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    lineHeight: 16,
    marginBottom: SPACING.sm,
    fontWeight: 'bold',
  },
  modalMetricsBox: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  modalMetricLine: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  modalWarningText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    lineHeight: 15,
    marginBottom: SPACING.lg,
    fontStyle: 'italic',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseBtn: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCloseText: {
    color: COLORS.textSecondary,
    fontWeight: 'bold',
    fontSize: 11,
  },
  modalBypassBtn: {
    backgroundColor: COLORS.primary,
  },
  modalBypassText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 11,
  },
});
