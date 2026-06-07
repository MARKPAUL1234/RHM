import React, { useContext, useEffect, useState } from 'react';
import {
  Alert,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HealthContext } from '../context/HealthContext';
import { TYPOGRAPHY, SPACING, SHADOWS, getResponsiveMetrics } from '../styles/theme';
import { setAuthToken } from '../services/django_api';

const OFFLINE_QUEUE_KEY = '@rhmt_offline_queue';
const conditionsList = ['Malaria', 'Typhoid', 'HIV', 'Hypertension', 'Diabetes', 'None'];

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

export default function AccountAdminScreen({ initialSubView = 'account', lockedSubView = false }) {
  const [activeSubView, setActiveSubView] = useState(initialSubView);
  const {
    user,
    setUser,
    profile,
    logs,
    alerts,
    recommendations,
    emergencyEvents,
    healthRecords,
    nutritionLogs,
    foodLogs,
    fitnessLogs,
    usersMetadata,
    setUsersMetadata,
    connectionStatus,
    setConnectionStatus,
    isAutomaticMode,
    setIsAutomaticMode,
    handleClearLogs,
    refreshSyncStats,
    updateProfileBaseline,
    colors,
  } = useContext(HealthContext);
  const { width } = useWindowDimensions();
  const metrics = getResponsiveMetrics(width);

  const [profileName, setProfileName] = useState(user ? user.name : '');
  const [ageInput, setAgeInput] = useState(usersMetadata.age ? String(usersMetadata.age) : '');
  const [weightInput, setWeightInput] = useState(usersMetadata.weight ? String(usersMetadata.weight) : '');
  const [heightInput, setHeightInput] = useState(usersMetadata.height ? String(usersMetadata.height) : '');
  const [bloodGroupInput, setBloodGroupInput] = useState(usersMetadata.blood_group || '');
  const [dailyWaterInput, setDailyWaterInput] = useState(profile?.daily_water_goal_ml ? String(profile.daily_water_goal_ml) : '');
  const [dailyStepInput, setDailyStepInput] = useState(profile?.daily_step_goal ? String(profile.daily_step_goal) : '');
  const [selectedConditions, setSelectedConditions] = useState(
    usersMetadata.diagnosed_conditions?.length ? usersMetadata.diagnosed_conditions : ['None']
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setProfileName(profile.display_name || user?.name || profile.username || 'Patient');
    setAgeInput(profile.age ? String(profile.age) : '');
    setWeightInput(profile.weight ? String(profile.weight) : '');
    setHeightInput(profile.height ? String(profile.height) : '');
    setBloodGroupInput(profile.blood_group || '');
    setDailyWaterInput(profile.daily_water_goal_ml ? String(profile.daily_water_goal_ml) : '');
    setDailyStepInput(profile.daily_step_goal ? String(profile.daily_step_goal) : '');
    setSelectedConditions(profile.diagnosed_conditions?.length ? profile.diagnosed_conditions : ['None']);
  }, [profile, user]);

  useEffect(() => {
    setActiveSubView(initialSubView);
  }, [initialSubView]);

  const toggleCondition = (condition) => {
    if (condition === 'None') {
      setSelectedConditions(['None']);
      return;
    }

    setSelectedConditions((current) => {
      let updated = current.filter((item) => item !== 'None');
      if (updated.includes(condition)) {
        updated = updated.filter((item) => item !== condition);
      } else {
        updated = [...updated, condition];
      }
      return updated.length ? updated : ['None'];
    });
  };

  const parseOptionalNumber = (value) => {
    if (String(value).trim() === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      const diagnosedConditions = selectedConditions.includes('None') ? [] : selectedConditions;
      const updatedMetadata = {
        user_id: usersMetadata.user_id || user?.id || null,
        age: parseOptionalNumber(ageInput),
        weight: parseOptionalNumber(weightInput),
        height: parseOptionalNumber(heightInput),
        blood_group: bloodGroupInput,
        diagnosed_conditions: diagnosedConditions,
      };

      const updatedProfile = await updateProfileBaseline({
        display_name: profileName,
        age: updatedMetadata.age,
        weight: updatedMetadata.weight,
        height: updatedMetadata.height,
        blood_group: updatedMetadata.blood_group,
        diagnosed_conditions: updatedMetadata.diagnosed_conditions,
        daily_water_goal_ml: parseOptionalNumber(dailyWaterInput) || 0,
        daily_step_goal: parseOptionalNumber(dailyStepInput) || 0,
      });

      setUsersMetadata({
        ...updatedMetadata,
        user_id: updatedProfile.user_id || updatedMetadata.user_id,
      });

      if (user) {
        const updatedUser = { ...user, name: profileName };
        setUser(updatedUser);
        await AsyncStorage.setItem('@rhmt_user_session', JSON.stringify(updatedUser));
      }

      Alert.alert('Profile saved', 'Patient baseline was synced to Django.');
    } catch (error) {
      Alert.alert('Save failed', error.message || 'Unable to sync the profile baseline.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setUser(null);
    setAuthToken(null);
    await AsyncStorage.removeItem('@rhmt_user_session');
    await AsyncStorage.removeItem('@rhmt_auth_token');
  };

  const handlePurgeLocalSession = () => {
    Alert.alert(
      'Clear local cache?',
      'This clears local auth, the offline queue, and the in-memory log display. Django records are retained.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear cache',
          style: 'destructive',
          onPress: async () => {
            setUser(null);
            setAuthToken(null);
            await AsyncStorage.removeItem('@rhmt_user_session');
            await AsyncStorage.removeItem('@rhmt_auth_token');
            await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
            handleClearLogs();
            Alert.alert('Local cache cleared', 'Backend records were not deleted.');
          },
        },
      ]
    );
  };

  const refreshBackend = async () => {
    await refreshSyncStats();
    Alert.alert('Backend refreshed', 'Latest Django collections were loaded.');
  };

  const collectionCards = [
    {
      title: 'Health records',
      count: healthRecords.length,
      empty: 'No health records synced yet.',
      rows: healthRecords.slice(0, 6).map((record) => ({
        id: `health_${record.id}`,
        title: `Record ${record.id}`,
        detail: `${record.temperature} C | ${record.heart_rate} bpm | ${record.spo2}% SpO2`,
        meta: formatDateTime(record.timestamp),
      })),
    },
    {
      title: 'Alerts',
      count: alerts.length,
      empty: 'No backend alerts found.',
      rows: alerts.slice(0, 6).map((alert) => ({
        id: `alert_${alert.id}`,
        title: `${alert.severity} / ${alert.status}`,
        detail: alert.alert_message,
        meta: formatDateTime(alert.timestamp),
      })),
    },
    {
      title: 'Recommendations',
      count: recommendations.length,
      empty: 'No backend recommendations found.',
      rows: recommendations.slice(0, 6).map((rec) => ({
        id: `rec_${rec.id}`,
        title: rec.fluid_target,
        detail: rec.lifestyle_guideline,
        meta: formatDateTime(rec.created_at),
      })),
    },
    {
      title: 'Nutrition logs',
      count: nutritionLogs.length,
      empty: 'No nutrition logs found.',
      rows: nutritionLogs.slice(0, 6).map((log) => ({
        id: `nutrition_${log.id}`,
        title: `${log.entry_type}: ${log.value} ${log.unit}`,
        detail: log.note || 'Nutrition entry',
        meta: formatDateTime(log.timestamp),
      })),
    },
    {
      title: 'Food logs',
      count: foodLogs.length,
      empty: 'No food logs found.',
      rows: foodLogs.slice(0, 6).map((log) => ({
        id: `food_${log.id}`,
        title: `${log.food_name} / ${log.calories} kcal`,
        detail: `${log.meal_type}: ${log.carbs_g}g carbs, ${log.protein_g}g protein, ${log.fat_g}g fat`,
        meta: formatDateTime(log.timestamp),
      })),
    },
    {
      title: 'Fitness logs',
      count: fitnessLogs.length,
      empty: 'No fitness logs found.',
      rows: fitnessLogs.slice(0, 6).map((log) => ({
        id: `fitness_${log.id}`,
        title: `${log.activity_name} / ${log.steps} steps`,
        detail: `${log.duration_minutes} min, ${log.intensity} intensity${log.heart_rate ? `, ${log.heart_rate} bpm` : ''}`,
        meta: formatDateTime(log.timestamp),
      })),
    },
    {
      title: 'Emergency events',
      count: emergencyEvents.length,
      empty: 'No emergency events found.',
      rows: emergencyEvents.slice(0, 6).map((event) => ({
        id: `emergency_${event.id}`,
        title: `${event.status} -> ${event.primary_contact}`,
        detail: event.sms_content,
        meta: formatDateTime(event.timestamp),
      })),
    },
  ];

  const s = styles(colors, metrics);

  return (
    <View style={s.container}>
      {!lockedSubView ? (
        <View style={s.subHeader}>
          {[
            { key: 'account', label: 'Account baseline' },
            { key: 'admin', label: 'Backend console' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[s.subTab, activeSubView === tab.key && s.activeSubTab]}
              onPress={() => setActiveSubView(tab.key)}
            >
              <Text style={[s.subTabText, activeSubView === tab.key ? s.activeText : s.inactiveText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.pageInner}>
          {activeSubView === 'account' ? (
            <View>
              <View style={s.pageHeader}>
                <View>
                  <Text style={s.eyebrow}>Portal</Text>
                  <Text style={s.pageTitle}>Patient profile</Text>
                </View>
                <View style={s.identityCard}>
                  <Text style={s.identityLabel}>Signed in as</Text>
                  <Text style={s.identityValue}>{profile?.username || user?.username || 'Patient'}</Text>
                </View>
              </View>

              <View style={[s.card, SHADOWS.subtle]}>
                <Text style={s.cardTitle}>Clinical baseline</Text>
                <Text style={s.cardDesc}>These fields are saved to the Django profile and used by recommendation rules.</Text>

                <View style={s.formGroup}>
                  <Text style={s.label}>Patient identifier</Text>
                  <TextInput
                    style={[s.input, s.disabledInput]}
                    editable={false}
                    value={String(profile?.username || user?.username || user?.id || '')}
                  />
                </View>

                <View style={s.formGroup}>
                  <Text style={s.label}>Display name</Text>
                  <TextInput style={s.input} value={profileName} onChangeText={setProfileName} />
                </View>

                <View style={s.formGrid}>
                  <View style={s.formCol}>
                    <Text style={s.label}>Age</Text>
                    <TextInput style={s.input} keyboardType="numeric" value={ageInput} onChangeText={setAgeInput} />
                  </View>
                  <View style={s.formCol}>
                    <Text style={s.label}>Blood group</Text>
                    <TextInput style={s.input} value={bloodGroupInput} onChangeText={setBloodGroupInput} />
                  </View>
                  <View style={s.formCol}>
                    <Text style={s.label}>Weight (kg)</Text>
                    <TextInput style={s.input} keyboardType="numeric" value={weightInput} onChangeText={setWeightInput} />
                  </View>
                  <View style={s.formCol}>
                    <Text style={s.label}>Height (cm)</Text>
                    <TextInput style={s.input} keyboardType="numeric" value={heightInput} onChangeText={setHeightInput} />
                  </View>
                  <View style={s.formCol}>
                    <Text style={s.label}>Water goal (mL)</Text>
                    <TextInput style={s.input} keyboardType="numeric" value={dailyWaterInput} onChangeText={setDailyWaterInput} />
                  </View>
                  <View style={s.formCol}>
                    <Text style={s.label}>Step goal</Text>
                    <TextInput style={s.input} keyboardType="numeric" value={dailyStepInput} onChangeText={setDailyStepInput} />
                  </View>
                </View>

                <Text style={s.formSectionTitle}>Diagnosed conditions</Text>
                <View style={s.conditionsRow}>
                  {conditionsList.map((condition) => {
                    const checked = selectedConditions.includes(condition);
                    return (
                      <TouchableOpacity
                        key={condition}
                        style={[s.conditionChip, checked && s.conditionChipChecked]}
                        onPress={() => toggleCondition(condition)}
                      >
                        <Text style={[s.conditionChipText, checked && s.conditionChipTextChecked]}>
                          {condition}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity style={[s.saveBtn, saving && s.disabledButton]} onPress={handleUpdateProfile} disabled={saving}>
                  <Text style={s.saveBtnText}>{saving ? 'Saving...' : 'Save profile baseline'}</Text>
                </TouchableOpacity>
              </View>

              <View style={s.contentGrid}>
                <View style={[s.card, s.halfCard, SHADOWS.subtle]}>
                  <Text style={s.cardTitle}>Sync settings</Text>
                  <Text style={s.cardDesc}>Controls here update application state for the current session.</Text>

                  <View style={s.prefRow}>
                    <View style={s.prefLeft}>
                      <Text style={s.prefTitle}>Automatic refresh</Text>
                      <Text style={s.prefDesc}>Poll Django endpoints while signed in.</Text>
                    </View>
                    <Switch
                      value={isAutomaticMode}
                      onValueChange={setIsAutomaticMode}
                      trackColor={{ false: colors.surfaceLight, true: colors.primary }}
                      thumbColor={isAutomaticMode ? colors.primaryLight : colors.textSecondary}
                    />
                  </View>

                  <View style={s.prefRow}>
                    <View style={s.prefLeft}>
                      <Text style={s.prefTitle}>Simulated connectivity</Text>
                      <Text style={s.prefDesc}>Switches the offline queue behavior for testing.</Text>
                    </View>
                    <Switch
                      value={connectionStatus === 'online'}
                      onValueChange={(value) => setConnectionStatus(value ? 'online' : 'offline')}
                      trackColor={{ false: colors.surfaceLight, true: colors.success }}
                      thumbColor={connectionStatus === 'online' ? colors.success : colors.textSecondary}
                    />
                  </View>
                </View>

                <View style={[s.card, s.halfCard, SHADOWS.subtle]}>
                  <Text style={s.cardTitle}>Session actions</Text>
                  <Text style={s.cardDesc}>Local session actions do not delete backend clinical records.</Text>
                  <TouchableOpacity style={s.outlineBtn} onPress={handleSignOut}>
                    <Text style={s.outlineBtnText}>Sign out</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.dangerBtn} onPress={handlePurgeLocalSession}>
                    <Text style={s.dangerBtnText}>Clear local cache</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <View>
              <View style={s.pageHeader}>
                <View>
                  <Text style={s.eyebrow}>Backend console</Text>
                  <Text style={s.pageTitle}>Django collections</Text>
                </View>
                <View style={s.consoleActions}>
                  <TouchableOpacity style={s.saveBtn} onPress={refreshBackend}>
                    <Text style={s.saveBtnText}>Refresh</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[s.card, SHADOWS.subtle]}>
                <Text style={s.cardTitle}>Manual records administration</Text>
                <Text style={s.cardDesc}>
                  This project uses manually entered patient records only. Admin tools review backend data, refresh collections, and inspect logs without hardware setup.
                </Text>
                <View style={s.manualAdminGrid}>
                  <View style={s.manualAdminBox}>
                    <Text style={s.manualAdminValue}>{healthRecords.length}</Text>
                    <Text style={s.manualAdminLabel}>Manual health records</Text>
                  </View>
                  <View style={s.manualAdminBox}>
                    <Text style={s.manualAdminValue}>{nutritionLogs.length + foodLogs.length}</Text>
                    <Text style={s.manualAdminLabel}>Nutrition and food logs</Text>
                  </View>
                  <View style={s.manualAdminBox}>
                    <Text style={s.manualAdminValue}>{fitnessLogs.length}</Text>
                    <Text style={s.manualAdminLabel}>Manual fitness logs</Text>
                  </View>
                  <View style={s.manualAdminBox}>
                    <Text style={s.manualAdminValue}>{alerts.length}</Text>
                    <Text style={s.manualAdminLabel}>Clinical alerts</Text>
                  </View>
                </View>
              </View>

              <View style={s.collectionGrid}>
                {collectionCards.map((collection) => (
                  <View key={collection.title} style={[s.card, s.collectionCard, SHADOWS.subtle]}>
                    <View style={s.collectionHeader}>
                      <Text style={s.cardTitle}>{collection.title}</Text>
                      <Text style={s.countBadge}>{collection.count}</Text>
                    </View>
                    {collection.rows.length === 0 ? (
                      <View style={s.emptyBox}>
                        <Text style={s.emptyText}>{collection.empty}</Text>
                      </View>
                    ) : (
                      collection.rows.map((row) => (
                        <View key={row.id} style={s.dbRow}>
                          <Text style={s.dbRowTitle}>{row.title}</Text>
                          <Text style={s.dbRowDetail} numberOfLines={3}>{row.detail}</Text>
                          <Text style={s.dbRowMeta}>{row.meta}</Text>
                        </View>
                      ))
                    )}
                  </View>
                ))}
              </View>

              <View style={[s.card, SHADOWS.subtle]}>
                <View style={s.terminalHeader}>
                  <Text style={s.cardTitle}>System logs</Text>
                  <TouchableOpacity onPress={handleClearLogs}>
                    <Text style={s.clearText}>Clear display</Text>
                  </TouchableOpacity>
                </View>

                <View style={s.terminal}>
                  <ScrollView nestedScrollEnabled contentContainerStyle={s.terminalContent}>
                    {logs.length === 0 ? (
                      <Text style={s.terminalLineMuted}>No system logs loaded.</Text>
                    ) : (
                      logs.slice(0, 30).map((log) => (
                        <Text key={log.id} style={s.terminalLine}>
                          <Text style={s.terminalTime}>[{formatDateTime(log.timestamp)}] </Text>
                          <Text style={{ color: log.level === 'ERROR' || log.level === 'WARN' ? colors.warning : colors.secondary, fontWeight: TYPOGRAPHY.weights.bold }}>
                            {log.level}
                          </Text>
                          <Text style={s.terminalMsg}>: {log.message}</Text>
                        </Text>
                      ))
                    )}
                  </ScrollView>
                </View>
              </View>
            </View>
          )}
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
  subHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  subTab: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    paddingHorizontal: SPACING.sm,
  },
  activeSubTab: {
    borderBottomColor: colors.primary,
  },
  subTabText: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
    textAlign: 'center',
  },
  activeText: {
    color: colors.primary,
  },
  inactiveText: {
    color: colors.textSecondary,
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
  identityCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: metrics.cardPadding,
    minWidth: metrics.isPhone ? '100%' : 220,
  },
  identityLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  identityValue: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: 3,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: metrics.cardPadding,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: SPACING.md,
  },
  halfCard: {
    flexGrow: 1,
    flexBasis: metrics.isPhone ? '100%' : '48%',
    minWidth: metrics.isPhone ? '100%' : 360,
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
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  formCol: {
    flexGrow: 1,
    flexBasis: metrics.isPhone ? '100%' : '30%',
    minWidth: metrics.isPhone ? '100%' : 220,
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
  disabledInput: {
    color: colors.textMuted,
  },
  formSectionTitle: {
    fontSize: 13,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: colors.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  conditionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  conditionChip: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
  },
  conditionChipChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLight,
  },
  conditionChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  conditionChipTextChecked: {
    color: colors.primary,
  },
  saveBtn: {
    minHeight: 42,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: 13,
  },
  disabledButton: {
    opacity: 0.55,
  },
  contentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  prefLeft: {
    flex: 1,
  },
  prefTitle: {
    color: colors.textPrimary,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: 13,
    marginBottom: 2,
  },
  prefDesc: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  outlineBtn: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  outlineBtnText: {
    color: colors.primary,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  dangerBtn: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: colors.critical,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerBtnText: {
    color: colors.critical,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  consoleActions: {
    alignItems: metrics.isPhone ? 'stretch' : 'flex-end',
  },
  manualAdminGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  manualAdminBox: {
    flexGrow: 1,
    flexBasis: metrics.isPhone ? '100%' : '30%',
    minWidth: 150,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: SPACING.md,
  },
  manualAdminValue: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 4,
  },
  manualAdminLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  collectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  collectionCard: {
    flexGrow: 1,
    flexBasis: metrics.isPhone ? '100%' : '48%',
    minWidth: metrics.isPhone ? '100%' : 360,
  },
  collectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  countBadge: {
    minWidth: 32,
    height: 28,
    borderRadius: 8,
    color: '#FFFFFF',
    backgroundColor: colors.primary,
    textAlign: 'center',
    paddingTop: 6,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  emptyBox: {
    minHeight: 86,
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
  dbRow: {
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  dbRowTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 4,
  },
  dbRowDetail: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  dbRowMeta: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 6,
  },
  terminalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  clearText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  terminal: {
    maxHeight: 260,
    minHeight: 160,
    backgroundColor: '#07111F',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: SPACING.md,
  },
  terminalContent: {
    paddingBottom: 10,
  },
  terminalLine: {
    fontSize: 11,
    lineHeight: 17,
    marginBottom: 5,
    fontFamily: 'monospace',
  },
  terminalLineMuted: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 46,
  },
  terminalTime: {
    color: colors.textMuted,
  },
  terminalMsg: {
    color: colors.textSecondary,
  },
});
