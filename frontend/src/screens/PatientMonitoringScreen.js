import React, { useContext, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  useWindowDimensions,
} from 'react-native';
import { HealthContext } from '../context/HealthContext';
import { TYPOGRAPHY, SPACING, SHADOWS, getResponsiveMetrics } from '../styles/theme';

const symptomsList = [
  { label: 'Chills', value: 'Chills' },
  { label: 'Severe headache', value: 'Severe Headache' },
  { label: 'Muscle aches', value: 'Muscle Aches' },
  { label: 'Weakness', value: 'Weakness' },
  { label: 'Stomach pain', value: 'Stomach Pain' },
  { label: 'Chronic fatigue', value: 'Chronic Fatigue' },
];

const formatDateTime = (value) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function PatientMonitoringScreen() {
  const {
    connectionStatus,
    setVitals,
    handleOfflineEnqueue,
    refreshSyncStats,
    healthRecords,
    patientDetails,
    colors,
  } = useContext(HealthContext);
  const { width } = useWindowDimensions();
  const metrics = getResponsiveMetrics(width);

  const [journalTemp, setJournalTemp] = useState(36.6);
  const [journalHr, setJournalHr] = useState(72);
  const [wellbeing, setWellbeing] = useState(4);
  const [medsTaken, setMedsTaken] = useState(true);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [isGuardrailModalVisible, setIsGuardrailModalVisible] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleSymptom = (symptom) => {
    setSelectedSymptoms((current) =>
      current.includes(symptom)
        ? current.filter((item) => item !== symptom)
        : [...current, symptom]
    );
  };

  const adjustFormMetric = (key, delta, min, max, decimal = 0) => {
    const updateValue = (value) => {
      const nextValue = Math.min(Math.max(value + delta, min), max);
      return decimal ? Number(nextValue.toFixed(decimal)) : Math.round(nextValue);
    };

    if (key === 'temp') setJournalTemp((value) => updateValue(value));
    if (key === 'hr') setJournalHr((value) => updateValue(value));
  };

  const handleSubmitJournal = (bypass = false) => {
    const isTempCritical = journalTemp > 38.5;

    if (isTempCritical && !bypass) {
      setIsGuardrailModalVisible(true);
      return;
    }

    submitJournalRecord({
      temperature: journalTemp,
      heartRate: journalHr,
      symptoms_array: selectedSymptoms,
      meds_taken: medsTaken,
      wellbeing_score: wellbeing,
    });
  };

  const submitJournalRecord = async (payload) => {
    setIsSubmitting(true);
    setSyncStatusMsg(connectionStatus === 'online' ? 'Sending record to Django...' : 'Saving record to offline queue...');

    try {
      setVitals({
        heartRate: journalHr,
        temperature: journalTemp,
      });

      await handleOfflineEnqueue('vital', payload);
      await refreshSyncStats();
      setSelectedSymptoms([]);
      setWellbeing(4);
      setMedsTaken(true);
      setSyncStatusMsg(connectionStatus === 'online' ? 'Record synced to Django.' : 'Record saved locally for later sync.');
    } catch (error) {
      setSyncStatusMsg(error.message || 'Unable to save the monitoring record.');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSyncStatusMsg(''), 3600);
    }
  };

  const latestRecord = healthRecords[0];
  const baselineRows = [
    { label: 'Blood pressure', value: patientDetails.bloodPressure ? `${patientDetails.bloodPressure} mmHg` : 'Not recorded' },
    { label: 'Blood glucose', value: patientDetails.bloodGlucose ? `${patientDetails.bloodGlucose} mg/dL` : 'Not recorded' },
    { label: 'Respiratory rate', value: patientDetails.respiratoryRate ? `${patientDetails.respiratoryRate} rpm` : 'Not recorded' },
  ];

  const s = styles(colors, metrics);

  const renderMetricAdjuster = ({ keyName, label, value, unit, min, max, step, decimal, tone }) => {
    const widthPercent = Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);
    return (
      <View style={s.metricControl}>
        <View style={s.metricHeader}>
          <Text style={s.metricLabel}>{label}</Text>
          <Text style={[s.metricValue, { color: tone }]}>{value}{unit}</Text>
        </View>
        <View style={s.adjusterControl}>
          <TouchableOpacity style={s.adjustBtn} onPress={() => adjustFormMetric(keyName, -step, min, max, decimal)}>
            <Text style={s.adjustBtnText}>-</Text>
          </TouchableOpacity>
          <View style={s.sliderTrack}>
            <View style={[s.sliderFill, { width: `${widthPercent}%`, backgroundColor: tone }]} />
          </View>
          <TouchableOpacity style={s.adjustBtn} onPress={() => adjustFormMetric(keyName, step, min, max, decimal)}>
            <Text style={s.adjustBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.pageInner}>
          <View style={s.pageHeader}>
            <View>
              <Text style={s.eyebrow}>Patient monitoring</Text>
              <Text style={s.pageTitle}>Daily clinical journal</Text>
            </View>
            <View style={s.headerBadge}>
              <Text style={s.headerBadgeLabel}>Latest record</Text>
              <Text style={s.headerBadgeValue}>{latestRecord ? formatDateTime(latestRecord.timestamp) : 'None yet'}</Text>
            </View>
          </View>

          {syncStatusMsg ? (
            <View style={s.statusMsgBox}>
              <Text style={s.statusMsgText}>{syncStatusMsg}</Text>
            </View>
          ) : null}

          <View style={s.contentGrid}>
            <View style={[s.card, s.formCard, SHADOWS.subtle]}>
              <Text style={s.cardTitle}>New biometric entry</Text>
              <Text style={s.cardDesc}>
                Saved records are posted to Django when online or held in the offline queue when connectivity is unavailable.
              </Text>

              {renderMetricAdjuster({
                keyName: 'temp',
                label: 'Body temperature',
                value: journalTemp,
                unit: ' C',
                min: 34,
                max: 42,
                step: 0.1,
                decimal: 1,
                tone: journalTemp > 38.5 ? colors.critical : colors.warning,
              })}

              {renderMetricAdjuster({
                keyName: 'hr',
                label: 'Heart rate',
                value: journalHr,
                unit: ' bpm',
                min: 40,
                max: 200,
                step: 2,
                decimal: 0,
                tone: journalHr > 100 ? colors.warning : colors.primary,
              })}

              <Text style={s.formSectionTitle}>Symptoms</Text>
              <View style={s.symptomsGrid}>
                {symptomsList.map((symptom) => {
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

              <View style={s.wellbeingRow}>
                <Text style={s.formSectionTitle}>Wellbeing score</Text>
                <View style={s.wellbeingButtons}>
                  {[1, 2, 3, 4, 5].map((score) => (
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

              <View style={s.medsRow}>
                <View style={s.medsLeft}>
                  <Text style={s.medsTitle}>Medication taken</Text>
                  <Text style={s.medsDesc}>Attach medication adherence to this journal entry.</Text>
                </View>
                <Switch
                  value={medsTaken}
                  onValueChange={setMedsTaken}
                  trackColor={{ false: colors.surfaceLight, true: colors.secondary }}
                  thumbColor={medsTaken ? colors.secondary : colors.border}
                />
              </View>

              <TouchableOpacity
                style={[s.submitBtn, isSubmitting && s.disabledBtn]}
                onPress={() => handleSubmitJournal(false)}
                disabled={isSubmitting}
              >
                <Text style={s.submitBtnText}>{isSubmitting ? 'Saving...' : 'Submit journal entry'}</Text>
              </TouchableOpacity>
            </View>

            <View style={[s.card, s.sideCard, SHADOWS.subtle]}>
              <Text style={s.cardTitle}>Backend baseline</Text>
              <Text style={s.cardDesc}>Profile measurements loaded from the authenticated Django profile.</Text>

              {baselineRows.map((row) => (
                <View key={row.label} style={s.baselineRow}>
                  <Text style={s.baselineLabel}>{row.label}</Text>
                  <Text style={s.baselineValue}>{row.value}</Text>
                </View>
              ))}

              <Text style={[s.cardTitle, s.recentTitle]}>Recent Django records</Text>
              {healthRecords.length === 0 ? (
                <View style={s.emptyBox}>
                  <Text style={s.emptyText}>No health records saved yet.</Text>
                </View>
              ) : (
                healthRecords.slice(0, 6).map((record) => (
                  <View key={record.id} style={s.recordRow}>
                    <View>
                      <Text style={s.recordTitle}>{formatDateTime(record.timestamp)}</Text>
                      <Text style={s.recordMeta}>
                        Symptoms: {record.symptoms_array?.length ? record.symptoms_array.join(', ') : 'None'}
                      </Text>
                    </View>
                    <View style={s.recordVitals}>
                      <Text style={s.recordVital}>{record.temperature} C</Text>
                      <Text style={s.recordVital}>{record.heart_rate} bpm</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {isGuardrailModalVisible ? (
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, SHADOWS.premium]}>
            <Text style={s.modalHeader}>Critical parameters detected</Text>
            <Text style={s.modalText}>
              Confirm that these readings are accurate before saving them. Elevated temperature will trigger backend alert rules.
            </Text>
            <View style={s.modalMetricsBox}>
              {journalTemp > 38.5 ? <Text style={s.modalMetricLine}>Temperature: {journalTemp} C</Text> : null}
            </View>
            <View style={s.modalButtonsRow}>
              <TouchableOpacity style={[s.modalBtn, s.modalCloseBtn]} onPress={() => setIsGuardrailModalVisible(false)}>
                <Text style={s.modalCloseText}>Review entry</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, s.modalBypassBtn]}
                onPress={() => {
                  setIsGuardrailModalVisible(false);
                  handleSubmitJournal(true);
                }}
              >
                <Text style={s.modalBypassText}>Confirm and save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
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
  headerBadge: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: metrics.cardPadding,
    minWidth: metrics.isPhone ? '100%' : 220,
  },
  headerBadgeLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  headerBadgeValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: 3,
  },
  contentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: metrics.cardPadding,
  },
  formCard: {
    flexGrow: 1,
    flexBasis: metrics.isPhone ? '100%' : '58%',
    minWidth: metrics.isPhone ? '100%' : 440,
  },
  sideCard: {
    flexGrow: 1,
    flexBasis: metrics.isPhone ? '100%' : '34%',
    minWidth: metrics.isPhone ? '100%' : 320,
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
  statusMsgBox: {
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statusMsgText: {
    color: colors.textPrimary,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    fontSize: 12,
    textAlign: 'center',
  },
  metricControl: {
    backgroundColor: colors.elevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  metricLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  adjusterControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  adjustBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustBtnText: {
    fontSize: 18,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: colors.textPrimary,
  },
  sliderTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 8,
  },
  formSectionTitle: {
    fontSize: 13,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: colors.textPrimary,
    marginBottom: SPACING.sm,
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  symptomBox: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
  },
  symptomBoxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLight,
  },
  symptomText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  symptomTextChecked: {
    color: colors.primary,
  },
  wellbeingRow: {
    marginBottom: SPACING.md,
  },
  wellbeingButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  scoreBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.elevated,
  },
  scoreBtnSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  scoreText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  scoreTextSelected: {
    color: '#FFFFFF',
  },
  medsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: SPACING.md,
  },
  medsLeft: {
    flex: 1,
  },
  medsTitle: {
    fontSize: 13,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: colors.textPrimary,
  },
  medsDesc: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
    marginTop: 2,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.55,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  baselineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: SPACING.sm,
  },
  baselineLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  baselineValue: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
    textAlign: 'right',
    flex: 1,
  },
  recentTitle: {
    marginTop: SPACING.lg,
  },
  emptyBox: {
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.elevated,
    padding: SPACING.md,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  recordRow: {
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: SPACING.md,
  },
  recordTitle: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 3,
  },
  recordMeta: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  recordVitals: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  recordVital: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weights.bold,
    backgroundColor: colors.elevated,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  modalOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 20,
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: metrics.cardPadding,
    borderWidth: 1,
    borderColor: colors.critical,
  },
  modalHeader: {
    fontSize: 17,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: colors.critical,
    marginBottom: SPACING.sm,
  },
  modalText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 19,
    marginBottom: SPACING.md,
  },
  modalMetricsBox: {
    backgroundColor: colors.elevated,
    borderRadius: 8,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: SPACING.md,
  },
  modalMetricLine: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: colors.critical,
    marginBottom: 4,
  },
  modalButtonsRow: {
    flexDirection: metrics.isPhone ? 'column' : 'row',
    gap: SPACING.sm,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseBtn: {
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCloseText: {
    color: colors.textSecondary,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: 12,
  },
  modalBypassBtn: {
    backgroundColor: colors.critical,
  },
  modalBypassText: {
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: 12,
  },
});
