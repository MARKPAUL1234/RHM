import React, { useContext, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { HealthContext } from '../context/HealthContext';
import { TYPOGRAPHY, SPACING, SHADOWS, getResponsiveMetrics } from '../styles/theme';

const responseOptions = ['Within 24 hours', 'Within 2 business days', 'No rush'];

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

export default function ContactUsScreen() {
  const {
    contactInquiries,
    createContactInquiry,
    colors,
  } = useContext(HealthContext);
  const { width } = useWindowDimensions();
  const metrics = getResponsiveMetrics(width);
  const [purpose, setPurpose] = useState('');
  const [message, setMessage] = useState('');
  const [preferredResponseTime, setPreferredResponseTime] = useState(responseOptions[0]);
  const [confirmation, setConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitInquiry = async () => {
    if (!purpose.trim() || !message.trim()) {
      Alert.alert('Missing details', 'Add both a purpose and a message before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const savedInquiry = await createContactInquiry({
        purpose: purpose.trim(),
        message: message.trim(),
        preferred_response_time: preferredResponseTime,
      });
      setConfirmation(`Inquiry submitted: ${savedInquiry.confirmation_code || `INQ-${savedInquiry.id}`}`);
      setPurpose('');
      setMessage('');
      setPreferredResponseTime(responseOptions[0]);
    } catch (error) {
      Alert.alert('Submission failed', error.message || 'Unable to submit the inquiry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const s = styles(colors, metrics);

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.pageInner}>
          <View style={s.pageHeader}>
            <View>
              <Text style={s.eyebrow}>Contact us</Text>
              <Text style={s.pageTitle}>Inquiry center</Text>
              <Text style={s.pageSubtitle}>Send support requests and keep a confirmed history in the backend.</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={s.summaryLabel}>Submitted inquiries</Text>
              <Text style={s.summaryValue}>{contactInquiries.length}</Text>
            </View>
          </View>

          {confirmation ? (
            <View style={s.confirmationBox}>
              <Text style={s.confirmationText}>{confirmation}</Text>
            </View>
          ) : null}

          <View style={s.contentGrid}>
            <View style={[s.card, s.formCard, SHADOWS.subtle]}>
              <Text style={s.cardTitle}>New inquiry</Text>
              <Text style={s.cardDesc}>This form saves a contact inquiry to the backend with a confirmation code.</Text>

              <View style={s.formGroup}>
                <Text style={s.label}>Purpose</Text>
                <TextInput
                  style={s.input}
                  value={purpose}
                  onChangeText={setPurpose}
                  placeholder="Example: Account support, clinical record correction, admin question"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={s.formGroup}>
                <Text style={s.label}>Preferred response time</Text>
                <View style={s.optionRow}>
                  {responseOptions.map((option) => {
                    const active = preferredResponseTime === option;
                    return (
                      <TouchableOpacity
                        key={option}
                        style={[s.optionButton, active && s.activeOptionButton]}
                        onPress={() => setPreferredResponseTime(option)}
                      >
                        <Text style={[s.optionText, active && s.activeOptionText]}>{option}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={s.formGroup}>
                <Text style={s.label}>Message</Text>
                <TextInput
                  style={[s.input, s.textArea]}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  placeholder="Write the issue, request, or question."
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <TouchableOpacity
                style={[s.submitButton, isSubmitting && s.disabledButton]}
                onPress={submitInquiry}
                disabled={isSubmitting}
              >
                <Text style={s.submitButtonText}>{isSubmitting ? 'Submitting...' : 'Submit inquiry'}</Text>
              </TouchableOpacity>
            </View>

            <View style={[s.card, s.historyCard, SHADOWS.subtle]}>
              <Text style={s.cardTitle}>Recent inquiries</Text>
              <Text style={s.cardDesc}>Confirmation, purpose, status, and requested response time.</Text>

              {contactInquiries.length === 0 ? (
                <View style={s.emptyBox}>
                  <Text style={s.emptyText}>No inquiries submitted yet.</Text>
                </View>
              ) : (
                contactInquiries.slice(0, 8).map((inquiry) => (
                  <View key={inquiry.id} style={s.inquiryRow}>
                    <View style={s.inquiryHeader}>
                      <Text style={s.inquiryCode}>{inquiry.confirmation_code || `INQ-${inquiry.id}`}</Text>
                      <Text style={s.inquiryStatus}>{inquiry.status}</Text>
                    </View>
                    <Text style={s.inquiryPurpose}>{inquiry.purpose}</Text>
                    <Text style={s.inquiryMessage} numberOfLines={3}>{inquiry.message}</Text>
                    <View style={s.inquiryFooter}>
                      <Text style={s.inquiryMeta}>{inquiry.preferred_response_time}</Text>
                      <Text style={s.inquiryMeta}>{formatDateTime(inquiry.timestamp)}</Text>
                    </View>
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
  pageSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: metrics.cardPadding,
    minWidth: metrics.isPhone ? '100%' : 210,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: 2,
  },
  confirmationBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: 8,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  confirmationText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: TYPOGRAPHY.weights.bold,
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
    flexBasis: metrics.isPhone ? '100%' : '48%',
    minWidth: metrics.isPhone ? '100%' : 380,
  },
  historyCard: {
    flexGrow: 1,
    flexBasis: metrics.isPhone ? '100%' : '48%',
    minWidth: metrics.isPhone ? '100%' : 380,
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
  formGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 6,
  },
  input: {
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
    minHeight: 130,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  optionButton: {
    flexGrow: 1,
    minHeight: 38,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  activeOptionButton: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLight,
  },
  optionText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    textAlign: 'center',
  },
  activeOptionText: {
    color: colors.primary,
  },
  submitButton: {
    minHeight: 44,
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  emptyBox: {
    minHeight: 110,
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
  inquiryRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: SPACING.md,
    marginTop: SPACING.sm,
  },
  inquiryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: 5,
  },
  inquiryCode: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  inquiryStatus: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weights.bold,
    textTransform: 'capitalize',
  },
  inquiryPurpose: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 4,
  },
  inquiryMessage: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  inquiryFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  inquiryMeta: {
    color: colors.textMuted,
    fontSize: 11,
  },
});
