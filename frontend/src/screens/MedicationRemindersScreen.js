import React, { useContext, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Modal,
} from 'react-native';
import { HealthContext } from '../context/HealthContext';
import { TYPOGRAPHY, SPACING, SHADOWS, getResponsiveMetrics, LIGHT_COLORS } from '../styles/theme';
import { useToast } from '../context/ToastContext';
import { ToastTypes } from '../components/Toast';

// Helper function to convert 24-hour HH:MM to 12-hour format with AM/PM
const time24To12 = (time24) => {
  if (!time24) return { hour: 8, minute: 0, period: 'AM' };
  const [hours, minutes] = time24.split(':').map(Number);
  const hour12 = hours % 12 || 12;
  const period = hours >= 12 ? 'PM' : 'AM';
  return { hour: hour12, minute: minutes, period };
};

// Helper function to convert 12-hour format to 24-hour HH:MM
const time12To24 = (hour, minute, period) => {
  let hour24 = hour;
  if (period === 'PM' && hour !== 12) {
    hour24 += 12;
  } else if (period === 'AM' && hour === 12) {
    hour24 = 0;
  }
  const hourStr = String(hour24).padStart(2, '0');
  const minuteStr = String(minute).padStart(2, '0');
  return `${hourStr}:${minuteStr}`;
};

// Generate options for hours, minutes, AM/PM
const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1);
const minuteOptions = Array.from({ length: 12 }, (_, i) => i * 5);
const periodOptions = ['AM', 'PM'];

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes));
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const frequencyLabels = {
  once: 'Once daily',
  twice: 'Twice daily',
  thrice: 'Three times daily',
  custom: 'Custom',
};

// Reusable Time Picker Component
function TimePicker({ value, onChange, label, colors }) {
  const [isOpen, setIsOpen] = useState(false);
  const { hour, minute, period } = time24To12(value);

  const handleSelect = (newHour, newMinute, newPeriod) => {
    const newTime24 = time12To24(newHour, newMinute, newPeriod);
    onChange(newTime24);
    setIsOpen(false);
  };

  return (
    <View style={{ marginBottom: SPACING.md }}>
      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
      
      <TouchableOpacity 
        style={[styles.input, { backgroundColor: colors.surfaceLight, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
        onPress={() => setIsOpen(true)}
      >
        <Text style={{ color: colors.textPrimary }}>
          {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')} {period}
        </Text>
        <Text style={{ color: colors.textMuted }}>▼</Text>
      </TouchableOpacity>

      {isOpen && (
        <Modal transparent visible={isOpen} animationType="fade" onRequestClose={() => setIsOpen(false)}>
          <TouchableOpacity 
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: SPACING.md }}
            activeOpacity={1}
            onPress={() => setIsOpen(false)}
          >
            <View 
              style={{ 
                backgroundColor: colors.surface, borderRadius: SPACING.borderRadius, padding: SPACING.lg, width: '100%', maxWidth: 340, ...SHADOWS.large }}
              onStartShouldSetResponder={() => true}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              <Text style={{ fontSize: TYPOGRAPHY.sizes.h3, fontWeight: TYPOGRAPHY.weights.bold, color: colors.textPrimary, marginBottom: SPACING.md }}>
                Select Time
              </Text>
              
              <View style={{ flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md }}>
                {/* Hours */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: TYPOGRAPHY.sizes.caption, fontWeight: TYPOGRAPHY.weights.bold, color: colors.textSecondary, marginBottom: SPACING.xs }}>
                    Hour
                  </Text>
                  <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                    {hourOptions.map(h => (
                      <TouchableOpacity
                        key={h}
                        style={[
                          { padding: SPACING.sm, borderRadius: SPACING.borderRadiusSm, marginBottom: SPACING.xs, alignItems: 'center' },
                          h === hour && { backgroundColor: colors.primary + '20' }
                        ]}
                        onPress={() => handleSelect(h, minute, period)}
                      >
                        <Text style={[
                          { fontWeight: TYPOGRAPHY.weights.semiBold },
                          h === hour && { color: colors.primary }
                        ]}>
                          {h}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Minutes */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: TYPOGRAPHY.sizes.caption, fontWeight: TYPOGRAPHY.weights.bold, color: colors.textSecondary, marginBottom: SPACING.xs }}>
                    Minute
                  </Text>
                  <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                    {minuteOptions.map(m => (
                      <TouchableOpacity
                        key={m}
                        style={[
                          { padding: SPACING.sm, borderRadius: SPACING.borderRadiusSm, marginBottom: SPACING.xs, alignItems: 'center' },
                          m === minute && { backgroundColor: colors.primary + '20' }
                        ]}
                        onPress={() => handleSelect(hour, m, period)}
                      >
                        <Text style={[
                          { fontWeight: TYPOGRAPHY.weights.semiBold },
                          m === minute && { color: colors.primary }
                        ]}>
                          {String(m).padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* AM/PM */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: TYPOGRAPHY.sizes.caption, fontWeight: TYPOGRAPHY.weights.bold, color: colors.textSecondary, marginBottom: SPACING.xs }}>
                    Period
                  </Text>
                  {periodOptions.map(p => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        { padding: SPACING.sm, borderRadius: SPACING.borderRadiusSm, marginBottom: SPACING.xs, alignItems: 'center' },
                        p === period && { backgroundColor: colors.primary + '20' }
                      ]}
                      onPress={() => handleSelect(hour, minute, p)}
                    >
                      <Text style={[
                        { fontWeight: TYPOGRAPHY.weights.semiBold },
                        p === period && { color: colors.primary }
                      ]}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity 
                style={{ backgroundColor: colors.primary, borderRadius: SPACING.borderRadiusSm, padding: SPACING.md, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => setIsOpen(false)}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: TYPOGRAPHY.weights.bold, fontSize: TYPOGRAPHY.sizes.body }}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

export default function MedicationRemindersScreen() {
  const ctx = useContext(HealthContext);
  const {
    medicationReminders = [],
    createMedicationReminder,
    markMedicationTaken,
    markMedicationMissed,
  } = ctx || {};
  const colors = ctx?.colors || LIGHT_COLORS;
  const { width } = useWindowDimensions();
  const metrics = getResponsiveMetrics(width);
  const [isAdding, setIsAdding] = useState(false);
  const [medicineName, setMedicineName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('once');
  const [scheduledTime, setScheduledTime] = useState('08:00');
  const [scheduledTime2, setScheduledTime2] = useState('12:00');
  const [scheduledTime3, setScheduledTime3] = useState('18:00');
  const [notes, setNotes] = useState('');
  const [doctorInstructions, setDoctorInstructions] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  const handleAddReminder = async () => {
    if (!medicineName.trim()) return;
    setIsSaving(true);
    try {
      const data = {
        medicine_name: medicineName.trim(),
        dosage: dosage.trim(),
        frequency,
        scheduled_time: scheduledTime,
        notes: notes.trim(),
        doctor_instructions: doctorInstructions.trim(),
      };
      if (frequency === 'twice' || frequency === 'thrice') {
        data.scheduled_time_2 = scheduledTime2;
      }
      if (frequency === 'thrice') {
        data.scheduled_time_3 = scheduledTime3;
      }
      await createMedicationReminder(data);
      setMedicineName('');
      setDosage('');
      setFrequency('once');
      setScheduledTime('08:00');
      setScheduledTime2('12:00');
      setScheduledTime3('18:00');
      setNotes('');
      setDoctorInstructions('');
      setIsAdding(false);
      showToast('Medication reminder added successfully!', ToastTypes.SUCCESS);
    } catch (e) {
      console.error('Error adding reminder:', e);
      showToast('Failed to add medication reminder', ToastTypes.ERROR);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkTaken = async (reminderId) => {
    try {
      await markMedicationTaken(reminderId);
      showToast('Marked as taken!', ToastTypes.SUCCESS);
    } catch (e) {
      console.error('Error marking as taken:', e);
      showToast('Failed to mark as taken', ToastTypes.ERROR);
    }
  };

  const handleMarkMissed = async (reminderId) => {
    try {
      await markMedicationMissed(reminderId);
      showToast('Marked as missed', ToastTypes.WARNING);
    } catch (e) {
      console.error('Error marking as missed:', e);
      showToast('Failed to mark as missed', ToastTypes.ERROR);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { padding: metrics.pagePadding }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Medication Reminders
        </Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setIsAdding(!isAdding)}
        >
          <Text style={styles.addButtonText}>
            {isAdding ? 'Cancel' : '+ Add Reminder'}
          </Text>
        </TouchableOpacity>
      </View>

      {isAdding && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.subtle]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            New Reminder
          </Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Medicine Name *
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
              placeholder="e.g., Paracetamol"
              placeholderTextColor={colors.textMuted}
              value={medicineName}
              onChangeText={setMedicineName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Dosage
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
              placeholder="e.g., 500mg"
              placeholderTextColor={colors.textMuted}
              value={dosage}
              onChangeText={setDosage}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Frequency
            </Text>
            <View style={styles.frequencyOptions}>
              {[
                { key: 'once', label: 'Once' },
                { key: 'twice', label: 'Twice' },
                { key: 'thrice', label: 'Three times' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.frequencyOption,
                    { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                    frequency === option.key && [styles.frequencyOptionActive, { backgroundColor: colors.primary, borderColor: colors.primary }]
                  ]}
                  onPress={() => setFrequency(option.key)}
                >
                  <Text style={[
                    styles.frequencyOptionText,
                    { color: colors.textPrimary },
                    frequency === option.key && { color: '#FFFFFF' }
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TimePicker 
            label={frequency === 'once' ? 'Time' : 'Time 1'} 
            value={scheduledTime} 
            onChange={setScheduledTime}
            colors={colors}
          />

          {(frequency === 'twice' || frequency === 'thrice') && (
            <TimePicker 
              label="Time 2" 
              value={scheduledTime2} 
              onChange={setScheduledTime2}
              colors={colors}
            />
          )}

          {frequency === 'thrice' && (
            <TimePicker 
              label="Time 3" 
              value={scheduledTime3} 
              onChange={setScheduledTime3}
              colors={colors}
            />
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Doctor's Instructions
            </Text>
            <TextInput
              style={[styles.input, styles.textarea, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
              placeholder="Special instructions"
              placeholderTextColor={colors.textMuted}
              value={doctorInstructions}
              onChangeText={setDoctorInstructions}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Notes
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
              placeholder="Additional notes"
              placeholderTextColor={colors.textMuted}
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleAddReminder}
            disabled={isSaving}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : 'Save Reminder'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {medicationReminders.map((reminder) => (
        <View key={reminder.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.subtle]}>
          <View style={styles.reminderHeader}>
            <View style={styles.reminderInfo}>
              <Text style={[styles.medicineName, { color: colors.textPrimary }]}>
                {reminder.medicine_name}
              </Text>
              {reminder.dosage && (
                <Text style={[styles.dosageText, { color: colors.textSecondary }]}>
                  {reminder.dosage}
                </Text>
              )}
            </View>
            <View style={[styles.reminderStatus, { backgroundColor: colors.surfaceLight }]}>
              <Text style={[styles.statusText, { color: colors.textPrimary }]}>
                {reminder.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={[styles.reminderDetails, { borderTopColor: colors.border }]}>
            <Text style={[styles.detailsText, { color: colors.textSecondary }]}>
              {frequencyLabels[reminder.frequency]}
            </Text>
            <View style={styles.timesRow}>
              {[reminder.scheduled_time, reminder.scheduled_time_2, reminder.scheduled_time_3]
                .filter(Boolean)
                .map((time, idx) => (
                  <View key={idx} style={[styles.timeBadge, { backgroundColor: colors.surfaceLight }]}>
                    <Text style={[styles.timeText, { color: colors.primary }]}>
                      {formatTime(time)}
                    </Text>
                  </View>
                ))}
            </View>
            {reminder.doctor_instructions && (
              <Text style={[styles.instructionsText, { color: colors.textMuted }]}>
                Instructions: {reminder.doctor_instructions}
              </Text>
            )}
            {reminder.notes && (
              <Text style={[styles.detailsText, { color: colors.textSecondary }]}>
                {reminder.notes}
              </Text>
            )}
            {reminder.doses_taken_today > 0 && (
              <Text style={[styles.dosesText, { color: colors.primary }]}>
                Doses taken today: {reminder.doses_taken_today}
              </Text>
            )}
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.success }]}
              onPress={() => handleMarkTaken(reminder.id)}
            >
              <Text style={styles.actionButtonText}>Mark Taken</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.warning }]}
              onPress={() => handleMarkMissed(reminder.id)}
            >
              <Text style={styles.actionButtonText}>Mark Missed</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {medicationReminders.length === 0 && !isAdding && (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
            No medication reminders yet
          </Text>
          <Text style={[styles.emptyStateSubtext, { color: colors.textMuted }]}>
            Tap "Add Reminder" to get started
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: SPACING.xl * 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.h2,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  addButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: SPACING.borderRadiusSm,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: TYPOGRAPHY.sizes.body,
  },
  card: {
    borderRadius: SPACING.borderRadius,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.sizes.h3,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: SPACING.md,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: SPACING.xs,
  },
  input: {
    borderRadius: SPACING.borderRadiusSm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderWidth: 1,
    fontSize: TYPOGRAPHY.sizes.body,
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  frequencyOptions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  frequencyOption: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: SPACING.borderRadiusSm,
    borderWidth: 1,
    alignItems: 'center',
  },
  frequencyOptionActive: {
  },
  frequencyOptionText: {
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  saveButton: {
    borderRadius: SPACING.borderRadiusSm,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: TYPOGRAPHY.sizes.body,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  reminderInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: TYPOGRAPHY.sizes.h3,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  dosageText: {
    fontSize: TYPOGRAPHY.sizes.body,
    marginTop: SPACING.xs,
  },
  reminderStatus: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: SPACING.borderRadiusSm,
  },
  statusText: {
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  reminderDetails: {
    borderTopWidth: 1,
    paddingTop: SPACING.md,
  },
  detailsText: {
    fontSize: TYPOGRAPHY.sizes.body,
    marginBottom: SPACING.xs,
  },
  instructionsText: {
    fontSize: TYPOGRAPHY.sizes.body,
    marginBottom: SPACING.xs,
    fontStyle: 'italic',
  },
  dosesText: {
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: SPACING.sm,
  },
  timesRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    flexWrap: 'wrap',
    marginBottom: SPACING.sm,
  },
  timeBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: SPACING.borderRadiusSm,
  },
  timeText: {
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: SPACING.borderRadiusSm,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: TYPOGRAPHY.sizes.body,
  },
  emptyState: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: TYPOGRAPHY.sizes.h3,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  emptyStateSubtext: {
    fontSize: TYPOGRAPHY.sizes.body,
    marginTop: SPACING.sm,
  },
});
