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
import { TYPOGRAPHY, SPACING, SHADOWS } from '../styles/theme';
import { HealthSyncManager } from '../services/appwrite';

export default function PatientMonitoringScreen() {
  const {
    connectionStatus,
    setVitals,
    handleOfflineEnqueue,
    refreshSyncStats,
    colors,
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

  const s = styles(colors);

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        
        {syncStatusMsg ? (
          <View style={s.statusMsgBox}>
            <Text style={s.statusMsgText}>{syncStatusMsg}</Text>
          </View>
        ) : null}

        {/* The Smart Self-Reporting Journal Form */}
        <View style={[s.card, SHADOWS.premium]}>
          <Text style={s.cardTitle}>📝 Daily Self-Reporting Patient Journal</Text>
          <Text style={s.cardDesc}>
            Log your daily physiological markers. The enqueued entries will be verified locally and synced with your cloud medical file.
          </Text>

          {/* Metric Adjuster: Temperature (Restricted 34°C to 42°C) */}
          <View style={s.formRow}>
            <View style={s.adjusterMeta}>
              <Text style={s.adjusterLabel}>🌡️ Body Temperature (°C)</Text>
              <Text style={[s.adjusterValText, journalTemp > 38.5 && s.critText]}>{journalTemp}°C</Text>
            </View>
            <View style={s.adjusterControl}>
              <TouchableOpacity style={s.adjustBtn} onPress={() => adjustFormMetric('temp', -0.1, 34.0, 42.0, 1)}>
                <Text style={s.adjustBtnText}>−</Text>
              </TouchableOpacity>
              <View style={s.sliderTrack}>
                <View style={[s.sliderFill, { width: `${((journalTemp - 34) / 8) * 100}%` }]} />
              </View>
              <TouchableOpacity style={s.adjustBtn} onPress={() => adjustFormMetric('temp', 0.1, 34.0, 42.0, 1)}>
                <Text style={s.adjustBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Metric Adjuster: Heart Rate (Restricted 40 to 200 BPM) */}
          <View style={s.formRow}>
            <View style={s.adjusterMeta}>
              <Text style={s.adjusterLabel}>❤️ Heart Rate (BPM)</Text>
              <Text style={[s.adjusterValText, journalHr > 100 && s.critText]}>{journalHr} BPM</Text>
            </View>
            <View style={s.adjusterControl}>
              <TouchableOpacity style={s.adjustBtn} onPress={() => adjustFormMetric('hr', -2, 40, 200)}>
                <Text style={s.adjustBtnText}>−</Text>
              </TouchableOpacity>
              <View style={s.sliderTrack}>
                <View style={[s.sliderFill, { width: `${((journalHr - 40) / 160) * 100}%` }]} />
              </View>
              <TouchableOpacity style={s.adjustBtn} onPress={() => adjustFormMetric('hr', 2, 40, 200)}>
                <Text style={s.adjustBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Metric Adjuster: SpO2 (Restricted 50% to 100%) */}
          <View style={s.formRow}>
            <View style={s.adjusterMeta}>
              <Text style={s.adjusterLabel}>🫁 Capillary Oxygen (SpO2 %)</Text>
              <Text style={[s.adjusterValText, journalSpO2 < 92 && s.critText]}>{journalSpO2}%</Text>
            </View>
            <View style={s.adjusterControl}>
              <TouchableOpacity style={s.adjustBtn} onPress={() => adjustFormMetric('spo2', -1, 50, 100)}>
                <Text style={s.adjustBtnText}>−</Text>
              </TouchableOpacity>
              <View style={s.sliderTrack}>
                <View style={[s.sliderFill, { width: `${((journalSpO2 - 50) / 50) * 100}%` }]} />
              </View>
              <TouchableOpacity style={s.adjustBtn} onPress={() => adjustFormMetric('spo2', 1, 50, 100)}>
                <Text style={s.adjustBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Symptoms Checklist Matrix */}
          <Text style={s.formSectionTitle}>Qualitative Symptoms Checked</Text>
          <View style={s.symptomsGrid}>
            {symptomsList.map(symptom => {
              const checked = selectedSymptoms.includes(symptom.value);
              return (
                <TouchableOpacity
                  key={symptom.value}
                  style={[s.symptomBox, checked && s.symptomBoxChecked]}
                  onPress={() => toggleSymptom(symptom.value)}
                >
                  <Text style={[s.symptomText, checked && s.symptomTextChecked]}>{symptom.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Subjective Wellbeing Slider */}
          <View style={s.wellbeingRow}>
            <Text style={s.wellbeingLabel}>🧠 Subjective Wellbeing (1-5):</Text>
            <View style={s.wellbeingButtons}>
              {[1, 2, 3, 4, 5].map(score => (
                <TouchableOpacity
                  key={score}
                  style={[s.scoreBtn, wellbeing === score && s.scoreBtnSelected]}
                  onPress={() => setWellbeing(score)}
                >
                  <Text style={[s.scoreText, wellbeing === score && s.scoreTextSelected]}>{score}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Medication Adherence Check */}
          <View style={s.medsRow}>
            <View style={s.medsLeft}>
              <Text style={s.medsTitle}>💊 Medication Adherence Check</Text>
              <Text style={s.medsDesc}>Acknowledge if you took your scheduled prescription metrics today.</Text>
            </View>
            <Switch
              value={medsTaken}
              onValueChange={setMedsTaken}
              trackColor={{ false: colors.surfaceLight, true: colors.primary }}
              thumbColor={medsTaken ? colors.primary : colors.border}
            />
          </View>

          <TouchableOpacity style={[s.submitBtn, SHADOWS.premium]} onPress={() => handleSubmitJournal(false)}>
            <Text style={s.submitBtnText}>Submit Daily Journal Log</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Safety UI Guardrail Warning Modal */}
      {isGuardrailModalVisible && (
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, SHADOWS.premium]}>
            <Text style={s.modalHeader}>🚨 CRITICAL PARAMETERS DETECTED</Text>
            <Text style={s.modalText}>
              Warning: Critical parameters detected. Please verify input data accuracy or activate the Emergency Trigger immediately.
            </Text>
            
            <View style={s.modalMetricsBox}>
              {journalTemp > 38.5 && (
                <Text style={s.modalMetricLine}>• Temperature elevated: {journalTemp}°C</Text>
              )}
              {journalSpO2 < 92 && (
                <Text style={s.modalMetricLine}>• SpO2 Oxygen low: {journalSpO2}%</Text>
              )}
            </View>

            <Text style={s.modalWarningText}>
              The parameters logged represent severe hypoxia or fever flare-ups. Recalibrate input vectors or confirm to sync enqueued records.
            </Text>

            <View style={s.modalButtonsRow}>
              <TouchableOpacity
                style={[s.modalBtn, s.modalCloseBtn]}
                onPress={() => setIsGuardrailModalVisible(false)}
              >
                <Text style={s.modalCloseText}>Recalibrate (Go Back)</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[s.modalBtn, s.modalBypassBtn]}
                onPress={() => {
                  setIsGuardrailModalVisible(false);
                  handleSubmitJournal(true); // Bypass submit
                }}
              >
                <Text style={s.modalBypassText}>Confirm & Log Entry</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  statusMsgBox: {
    backgroundColor: 'rgba(225, 173, 1, 0.05)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  statusMsgText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 11,
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
  formRow: {
    marginBottom: SPACING.md,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  adjusterMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  adjusterLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  adjusterValText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
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
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  sliderTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  critText: {
    color: colors.primary,
  },
  formSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textPrimary,
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
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  symptomBoxChecked: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(225, 173, 1, 0.05)',
  },
  symptomText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  symptomTextChecked: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  wellbeingRow: {
    marginVertical: SPACING.md,
    gap: 8,
  },
  wellbeingLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.textPrimary,
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
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  scoreBtnSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(225, 173, 1, 0.08)',
  },
  scoreText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  scoreTextSelected: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  medsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: SPACING.md,
  },
  medsLeft: {
    flex: 0.8,
  },
  medsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  medsDesc: {
    fontSize: 9,
    color: colors.textMuted,
    lineHeight: 13,
    marginTop: 2,
  },
  submitBtn: {
    backgroundColor: colors.primary,
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
    backgroundColor: colors.surface,
    borderRadius: SPACING.borderRadius,
    padding: SPACING.lg,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  modalHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: SPACING.md,
    letterSpacing: 0.3,
  },
  modalText: {
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 16,
    marginBottom: SPACING.sm,
    fontWeight: 'bold',
  },
  modalMetricsBox: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: SPACING.md,
  },
  modalMetricLine: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  modalWarningText: {
    fontSize: 10,
    color: colors.textSecondary,
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
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCloseText: {
    color: colors.textSecondary,
    fontWeight: 'bold',
    fontSize: 11,
  },
  modalBypassBtn: {
    backgroundColor: colors.primary,
  },
  modalBypassText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 11,
  },
});
