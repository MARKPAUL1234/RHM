import React, { useEffect, useState, useContext } from 'react';
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

export default function EmergencyPanelScreen() {
  const {
    connectionStatus,
    profile,
    usersMetadata,
    vitals,
    updateProfileBaseline,
    createEmergencyEvent,
    colors,
  } = useContext(HealthContext);

  const [primaryContact, setPrimaryContact] = useState(profile?.emergency_primary_contact || '');
  const [secondaryContact, setSecondaryContact] = useState(profile?.emergency_secondary_contact || '');
  const [medicalNotes, setMedicalNotes] = useState(profile?.medical_notes || '');
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState('');

  useEffect(() => {
    if (!profile) return;
    setPrimaryContact(profile.emergency_primary_contact || '');
    setSecondaryContact(profile.emergency_secondary_contact || '');
    setMedicalNotes(profile.medical_notes || '');
  }, [profile]);

  // Emergency trigger
  const handleEmergencyTrigger = async () => {
    if (!disclaimerAccepted) {
      Alert.alert('Disclaimer Required', 'Please acknowledge the medical disclaimer before triggering emergency operations.');
      return;
    }

    const activeConditions = usersMetadata.diagnosed_conditions ? usersMetadata.diagnosed_conditions.join(', ') : 'None';
    const userId = usersMetadata.user_id || profile?.username || 'unknown';
    const smsContent = `EMERGENCY DISTRESS: User ${userId} has triggered an emergency alert. Medical profile context: Diagnosed with ${activeConditions}. Last recorded vitals: Temp ${vitals.temperature}°C, SpO2 ${vitals.spo2}%.`;

    try {
      await updateProfileBaseline({
        emergency_primary_contact: primaryContact,
        emergency_secondary_contact: secondaryContact,
        medical_notes: medicalNotes,
      });

      await createEmergencyEvent({
        primary_contact: primaryContact,
        secondary_contact: secondaryContact,
        medical_notes: medicalNotes,
        sms_content: smsContent,
        status: connectionStatus === 'online' ? 'dispatched' : 'queued',
      });

      const statusLabel = connectionStatus === 'online' ? 'RECORDED AS DISPATCHED' : 'RECORDED AS QUEUED';
      setDispatchStatus(`${statusLabel} IN DJANGO BACKEND:\n"${smsContent}"`);
      Alert.alert('Emergency Event Saved', `Backend event and critical alert created:\n\n${smsContent}`);
    } catch (e) {
      setDispatchStatus(`FAILED TO SAVE EMERGENCY EVENT:\n${e.message}`);
      Alert.alert('Emergency Save Failed', e.message);
    }
  };

  const s = styles(colors);

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={[s.card, SHADOWS.premium]}>
          <Text style={[s.cardTitle, { color: colors.primary }]}>🚨 Emergency Trigger Centre</Text>
          <Text style={s.cardDesc}>
            Initiate priority emergency protocol dispatches. Generates vital sensor records and dispatches emergency payloads to contacts via SMS.
          </Text>

          {/* Disclaimer */}
          <View style={s.disclaimerBox}>
            <Text style={s.disclaimerTitle}>⚠️ MEDICAL DISCLAIMER</Text>
            <Text style={s.disclaimerText}>
              This protocol alerts your saved contacts immediately. The Remote Health Monitoring Tool is an administrative telemetry suite and not a primary emergency service router.
            </Text>
            
            <TouchableOpacity
              style={s.checkboxRow}
              onPress={() => setDisclaimerAccepted(!disclaimerAccepted)}
              activeOpacity={0.8}
            >
              <View style={[s.checkbox, disclaimerAccepted && s.checkboxActive]}>
                {disclaimerAccepted && <Text style={s.checkboxTick}>✓</Text>}
              </View>
              <Text style={s.checkboxLabel}>I read and accept all disclaimer remarks.</Text>
            </TouchableOpacity>
          </View>

          {/* Emergency Contact Input */}
          <View style={s.formGroup}>
            <Text style={s.fieldLabel}>Primary Contact SMS Node</Text>
            <TextInput
              style={s.fieldInput}
              value={primaryContact}
              onChangeText={setPrimaryContact}
              placeholder="+254 712 345 678"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={s.formGroup}>
            <Text style={s.fieldLabel}>Secondary Contact SMS Node</Text>
            <TextInput
              style={s.fieldInput}
              value={secondaryContact}
              onChangeText={setSecondaryContact}
              placeholder="+254 789 012 345"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={s.formGroup}>
            <Text style={s.fieldLabel}>Critical Patient Clinical Remarks</Text>
            <TextInput
              style={[s.fieldInput, { height: 60 }]}
              multiline
              numberOfLines={3}
              value={medicalNotes}
              onChangeText={setMedicalNotes}
            />
          </View>

          <TouchableOpacity
            style={[
              s.dispatchBtn,
              !disclaimerAccepted && s.disabledDispatchBtn,
              SHADOWS.premium
            ]}
            onPress={handleEmergencyTrigger}
            activeOpacity={0.8}
          >
            <Text style={s.dispatchBtnText}>TRIGGER EMERGENCY PROTOCOL</Text>
          </TouchableOpacity>

          {dispatchStatus ? (
            <View style={s.dispatchStatusBox}>
              <Text style={s.dispatchStatusTitle}>SMS Gateway Status:</Text>
              <Text style={s.dispatchStatusVal}>{dispatchStatus}</Text>
            </View>
          ) : null}
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
  disclaimerBox: {
    backgroundColor: 'rgba(225, 173, 1, 0.05)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  disclaimerTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  disclaimerText: {
    fontSize: 10,
    color: colors.textSecondary,
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
    borderColor: colors.primary,
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
  },
  checkboxTick: {
    color: '#000000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  formGroup: {
    marginBottom: SPACING.sm,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 13,
  },
  dispatchBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  disabledDispatchBtn: {
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  dispatchBtnText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 13,
  },
  dispatchStatusBox: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  dispatchStatusTitle: {
    fontSize: 10,
    color: colors.textMuted,
  },
  dispatchStatusVal: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 4,
    lineHeight: 16,
  },
});
