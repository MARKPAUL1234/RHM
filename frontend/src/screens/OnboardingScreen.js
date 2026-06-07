import React, { useContext, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { HealthContext } from '../context/HealthContext';
import { TYPOGRAPHY, SPACING } from '../styles/theme';

const STEPS = [
  {
    key: 'gender',
    question: 'What is your gender?',
    optional: false,
  },
  {
    key: 'age',
    question: 'What is your age?',
    suffix: 'years',
    placeholder: 'e.g. 24',
    optional: false,
  },
  {
    key: 'weight',
    question: 'What is your weight?',
    suffix: 'kg',
    placeholder: 'e.g. 68',
    optional: false,
  },
  {
    key: 'height',
    question: 'What is your height?',
    suffix: 'cm',
    placeholder: 'e.g. 170',
    optional: false,
  },
  {
    key: 'blood_group',
    question: 'What is your blood group?',
    optional: true,
  },
  {
    key: 'diagnosed_conditions',
    question: 'Any diagnosed medical conditions?',
    placeholder: 'e.g. Hypertension, Type 2 Diabetes',
    hint: 'Separate with commas. Leave blank to skip.',
    optional: true,
  },
];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not', label: 'Prefer not to say' },
];

const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function OnboardingScreen({ onComplete }) {
  const { colors, updateProfileBaseline } = useContext(HealthContext);

  const [step, setStep] = useState(0);
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [conditions, setConditions] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isLastStep = step === STEPS.length - 1;
  const current = STEPS[step];

  const canProceed = () => {
    switch (current.key) {
      case 'gender':
        return gender !== '';
      case 'age':
        return age.trim() !== '' && Number(age) > 0 && Number(age) < 150;
      case 'weight':
        return weight.trim() !== '' && Number(weight) > 0 && Number(weight) < 500;
      case 'height':
        return height.trim() !== '' && Number(height) > 0 && Number(height) < 300;
      case 'blood_group':
        return true;
      case 'diagnosed_conditions':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canProceed()) {
      setError('Please fill in this field to continue.');
      return;
    }
    setError('');
    if (isLastStep) {
      handleComplete();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        gender: gender || null,
        age: age ? Number(age) : null,
        weight: weight ? Number(weight) : null,
        height: height ? Number(height) : null,
        blood_group: bloodGroup || '',
        diagnosed_conditions: conditions
          ? conditions.split(',').map((item) => item.trim()).filter(Boolean)
          : [],
      };
      await updateProfileBaseline(payload);
      onComplete?.();
    } catch (e) {
      setError(e.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const s = styles(colors);

  return (
    <View style={s.container}>
      <View style={s.topSection}>
        <Text style={s.brand}>RHMT</Text>
        <Text style={s.stepCounter}>{step + 1} of {STEPS.length}</Text>
      </View>

      <View style={s.questionArea}>
        {error ? (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={s.question}>{current.question}</Text>

        {current.key === 'gender' ? (
          <View style={s.radioGroup}>
            {GENDER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[s.radioRow, gender === opt.value && s.radioRowActive]}
                onPress={() => setGender(opt.value)}
                activeOpacity={0.7}
              >
                <View style={s.radioOuter}>
                  {gender === opt.value ? <View style={s.radioInner} /> : null}
                </View>
                <Text style={[s.radioLabel, gender === opt.value && s.radioLabelActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : current.key === 'blood_group' ? (
          <View style={s.radioGroup}>
            {BLOOD_GROUP_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[s.radioRow, bloodGroup === opt && s.radioRowActive]}
                onPress={() => setBloodGroup(opt === bloodGroup ? '' : opt)}
                activeOpacity={0.7}
              >
                <View style={s.radioOuter}>
                  {bloodGroup === opt ? <View style={s.radioInner} /> : null}
                </View>
                <Text style={[s.radioLabel, bloodGroup === opt && s.radioLabelActive]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[s.radioRow, bloodGroup === '' && !bloodGroup && s.radioRowActive]}
              onPress={() => setBloodGroup('')}
              activeOpacity={0.7}
            >
              <View style={s.radioOuter}>
                {bloodGroup === '' ? <View style={s.radioInner} /> : null}
              </View>
              <Text style={[s.radioLabel, bloodGroup === '' && s.radioLabelActive]}>
                Skip this question
              </Text>
            </TouchableOpacity>
          </View>
        ) : current.key === 'diagnosed_conditions' ? (
          <View>
            <TextInput
              style={s.textInput}
              placeholder={current.placeholder}
              placeholderTextColor={colors.textMuted}
              value={conditions}
              onChangeText={setConditions}
              multiline
              numberOfLines={3}
            />
            {current.hint ? <Text style={s.hint}>{current.hint}</Text> : null}
          </View>
        ) : (
          <View style={s.inputRow}>
            <TextInput
              style={s.textInput}
              placeholder={current.placeholder}
              placeholderTextColor={colors.textMuted}
              value={
                current.key === 'age' ? age :
                current.key === 'weight' ? weight :
                current.key === 'height' ? height :
                ''
              }
              onChangeText={
                current.key === 'age' ? setAge :
                current.key === 'weight' ? setWeight :
                current.key === 'height' ? setHeight :
                () => {}
              }
              keyboardType="numeric"
              maxLength={5}
            />
            {current.suffix ? <Text style={s.suffix}>{current.suffix}</Text> : null}
          </View>
        )}
      </View>

      <View style={s.bottomArea}>
        <TouchableOpacity
          style={[s.continueButton, (!canProceed() || saving) && s.continueButtonDisabled]}
          onPress={handleNext}
          activeOpacity={0.7}
          disabled={saving || !canProceed()}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={s.continueText}>{isLastStep ? 'Complete' : 'Continue'}</Text>
          )}
        </TouchableOpacity>

        <View style={s.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[s.dot, i === step && s.dotActive]} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'web' ? 40 : 60,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    fontSize: 16,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: colors.primary,
    letterSpacing: 1,
  },
  stepCounter: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    color: colors.textMuted,
  },
  questionArea: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },
  errorBox: {
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  question: {
    fontSize: 26,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: colors.textPrimary,
    marginBottom: 28,
    lineHeight: 34,
  },
  radioGroup: {
    gap: 10,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
  },
  radioRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  radioLabel: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  radioLabelActive: {
    color: colors.primary,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textInput: {
    flex: 1,
    minHeight: 52,
    backgroundColor: colors.elevated,
    borderRadius: 10,
    paddingHorizontal: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 20,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  suffix: {
    fontSize: 18,
    color: colors.textMuted,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    minWidth: 50,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
  },
  bottomArea: {
    alignItems: 'center',
    gap: 20,
  },
  continueButton: {
    width: '100%',
    maxWidth: 420,
    minHeight: 50,
    backgroundColor: colors.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 24,
    borderRadius: 4,
  },
});
