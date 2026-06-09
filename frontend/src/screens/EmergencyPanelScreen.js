import React, { useContext, useEffect, useState } from 'react';
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
import { TYPOGRAPHY, SPACING, SHADOWS, getResponsiveMetrics } from '../styles/theme';

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

export default function EmergencyPanelScreen() {
  const {
    connectionStatus,
    profile,
    usersMetadata,
    vitals,
    emergencyEvents,
    updateProfileBaseline,
    createEmergencyEvent,
    colors,
  } = useContext(HealthContext);
  const { width } = useWindowDimensions();
  const metrics = getResponsiveMetrics(width);

  const [primaryContact, setPrimaryContact] = useState(profile?.emergency_primary_contact || '');
  const [secondaryContact, setSecondaryContact] = useState(profile?.emergency_secondary_contact || '');
  const [medicalNotes, setMedicalNotes] = useState(profile?.medical_notes || '');
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setPrimaryContact(profile.emergency_primary_contact || '');
    setSecondaryContact(profile.emergency_secondary_contact || '');
    setMedicalNotes(profile.medical_notes || '');
  }, [profile]);

  const handleEmergencyTrigger = async () => {
    if (!disclaimerAccepted) {
      Alert.alert('Acknowledgement required', 'Review and accept the emergency acknowledgement before saving an event.');
      return;
    }

    if (!primaryContact.trim()) {
      Alert.alert('Primary contact required', 'Add a primary emergency contact before dispatch.');
      return;
    }

    const activeConditions = usersMetadata.diagnosed_conditions?.length
      ? usersMetadata.diagnosed_conditions.join(', ')
      : 'None recorded';
    const patientName = profile?.display_name || profile?.username || 'Patient';
    const smsContent = `EMERGENCY DISTRESS: ${patientName} triggered an emergency alert. Conditions: ${activeConditions}. Latest vitals: Temp ${vitals.temperature ?? 'N/A'} C, HR ${vitals.heartRate ?? 'N/A'} bpm. Notes: ${medicalNotes || 'None'}.`;

    setIsDispatching(true);
    try {
      await updateProfileBaseline({
        emergency_primary_contact: primaryContact,
        emergency_secondary_contact: secondaryContact,
        medical_notes: medicalNotes,
      });

      const event = await createEmergencyEvent({
        primary_contact: primaryContact,
        secondary_contact: secondaryContact,
        medical_notes: medicalNotes,
        sms_content: smsContent,
        status: connectionStatus === 'online' ? 'dispatched' : 'queued',
      });

      const statusLabel = event.status === 'queued' ? 'Queued in Django' : 'Recorded as dispatched';
      setDispatchStatus(`${statusLabel}: ${smsContent}`);
      Alert.alert('Emergency event saved', `${statusLabel}. A critical alert was created in the backend.`);
    } catch (error) {
      setDispatchStatus(`Failed to save emergency event: ${error.message}`);
      Alert.alert('Emergency save failed', error.message || 'Unable to save the emergency event.');
    } finally {
      setIsDispatching(false);
    }
  };

  const s = styles(colors, metrics);

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.pageInner}>
          <View style={s.pageHeader}>
            <View>
              <Text style={s.eyebrow}>Emergency panel</Text>
              <Text style={s.pageTitle}>Response protocol</Text>
            </View>
            <View style={s.connectionCard}>
              <Text style={s.connectionLabel}>Dispatch mode</Text>
              <Text style={[s.connectionValue, { color: connectionStatus === 'online' ? colors.critical : colors.warning }]}>
                {connectionStatus === 'online' ? 'Dispatched' : 'Queued'}
              </Text>
            </View>
          </View>

          <View style={s.contentGrid}>
            <View style={[s.card, s.formCard, SHADOWS.subtle]}>
              <Text style={s.cardTitle}>Emergency contacts</Text>
              <Text style={s.cardDesc}>
                Contact and notes are saved to the patient profile before a backend emergency event is created.
              </Text>

              <View style={s.disclaimerBox}>
                <Text style={s.disclaimerTitle}>Emergency acknowledgement</Text>
                <Text style={s.disclaimerText}>
                  RHMT records and alerts contacts, but it is not a replacement for local emergency services. Use official emergency channels when urgent care is required.
                </Text>
                <TouchableOpacity
                  style={s.checkboxRow}
                  onPress={() => setDisclaimerAccepted((value) => !value)}
                  activeOpacity={0.8}
                >
                  <View style={[s.checkbox, disclaimerAccepted && s.checkboxActive]}>
                    {disclaimerAccepted ? <Text style={s.checkboxTick}>OK</Text> : null}
                  </View>
                  <Text style={s.checkboxLabel}>I understand and want to create an emergency backend event.</Text>
                </TouchableOpacity>
              </View>

              <View style={s.formGroup}>
                <Text style={s.fieldLabel}>Primary contact</Text>
                <TextInput
                  style={s.fieldInput}
                  value={primaryContact}
                  onChangeText={setPrimaryContact}
                  placeholder="+254 712 345 678"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={s.formGroup}>
                <Text style={s.fieldLabel}>Secondary contact</Text>
                <TextInput
                  style={s.fieldInput}
                  value={secondaryContact}
                  onChangeText={setSecondaryContact}
                  placeholder="+254 789 012 345"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={s.formGroup}>
                <Text style={s.fieldLabel}>Clinical notes</Text>
                <TextInput
                  style={[s.fieldInput, s.textArea]}
                  multiline
                  numberOfLines={4}
                  value={medicalNotes}
                  onChangeText={setMedicalNotes}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[s.dispatchBtn, (!disclaimerAccepted || isDispatching) && s.disabledDispatchBtn]}
                onPress={handleEmergencyTrigger}
                activeOpacity={0.8}
                disabled={!disclaimerAccepted || isDispatching}
              >
                <Text style={s.dispatchBtnText}>{isDispatching ? 'Saving event...' : 'Create emergency event'}</Text>
              </TouchableOpacity>

              {dispatchStatus ? (
                <View style={s.dispatchStatusBox}>
                  <Text style={s.dispatchStatusTitle}>Latest dispatch status</Text>
                  <Text style={s.dispatchStatusVal}>{dispatchStatus}</Text>
                </View>
              ) : null}
            </View>

            <View style={[s.card, s.sideCard, SHADOWS.subtle]}>
              <Text style={s.cardTitle}>Recent emergency events</Text>
              <Text style={s.cardDesc}>Events are read from the Django emergency-events endpoint.</Text>

              {emergencyEvents.length === 0 ? (
                <View style={s.emptyBox}>
                  <Text style={s.emptyText}>No emergency event has been recorded yet.</Text>
                </View>
              ) : (
                emergencyEvents.slice(0, 6).map((event) => (
                  <View key={event.id} style={s.eventRow}>
                    <View style={s.eventHeader}>
                      <Text style={[s.eventStatus, { color: event.status === 'queued' ? colors.warning : colors.critical }]}>
                        {event.status}
                      </Text>
                      <Text style={s.eventTime}>{formatDateTime(event.timestamp)}</Text>
                    </View>
                    <Text style={s.eventContact}>{event.primary_contact}</Text>
                    <Text style={s.eventMessage} numberOfLines={4}>{event.sms_content}</Text>
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
  connectionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: metrics.cardPadding,
    minWidth: metrics.isPhone ? '100%' : 200,
  },
  connectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  connectionValue: {
    fontSize: 17,
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
    padding: metrics.cardPadding,
    borderWidth: 1,
    borderColor: colors.border,
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
    fontSize: 9,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  disclaimerBox: {
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 8,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  disclaimerTitle: {
    fontSize: 13,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: colors.warning,
    marginBottom: 5,
  },
  disclaimerText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.warning,
  },
  checkboxTick: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 17,
  },
  formGroup: {
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  fieldInput: {
    minHeight: 42,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 14,
  },
  textArea: {
    minHeight: 92,
  },
  dispatchBtn: {
    backgroundColor: colors.critical,
    borderRadius: 8,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  disabledDispatchBtn: {
    backgroundColor: colors.border,
    opacity: 0.65,
  },
  dispatchBtnText: {
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: 13,
  },
  dispatchStatusBox: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  dispatchStatusTitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
  },
  dispatchStatusVal: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    color: colors.textPrimary,
    lineHeight: 18,
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
  eventRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: SPACING.md,
    marginTop: SPACING.sm,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: 4,
  },
  eventStatus: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
    textTransform: 'capitalize',
  },
  eventTime: {
    color: colors.textMuted,
    fontSize: 11,
  },
  eventContact: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 4,
  },
  eventMessage: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});
