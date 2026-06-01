import React, { useState, useContext, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HealthContext } from '../context/HealthContext';
import { TYPOGRAPHY, SPACING, SHADOWS } from '../styles/theme';
import { HealthSyncManager } from '../services/appwrite';

export default function AccountAdminScreen() {
  const [activeSubView, setActiveSubView] = useState('account'); // 'account', 'admin'
  const {
    user,
    setUser,
    deviceId,
    setDeviceId,
    logs,
    usersMetadata,
    setUsersMetadata,
    handleClearLogs,
    refreshSyncStats,
    colors,
  } = useContext(HealthContext);

  // --- Profile Baseline States ---
  const [profileName, setProfileName] = useState(user ? user.name : 'Patient Alpha');
  const [ageInput, setAgeInput] = useState(usersMetadata.age ? String(usersMetadata.age) : '24');
  const [weightInput, setWeightInput] = useState(usersMetadata.weight ? String(usersMetadata.weight) : '70');
  const [heightInput, setHeightInput] = useState(usersMetadata.height ? String(usersMetadata.height) : '175');
  const [bloodGroupInput, setBloodGroupInput] = useState(usersMetadata.blood_group || 'O+');
  const [selectedConditions, setSelectedConditions] = useState(usersMetadata.diagnosed_conditions || ['None']);

  // --- Settings states ---
  const [realtimeSync, setRealtimeSync] = useState(true);
  const [wifiOnly, setWifiOnly] = useState(false);
  const [cloudBackups, setCloudBackups] = useState(true);

  // --- Simulated Database Collections feeds ---
  const [cloudRecords, setCloudRecords] = useState([]);
  const [cloudAlerts, setCloudAlerts] = useState([]);
  const [cloudRecommendations, setCloudRecommendations] = useState([]);

  const conditionsList = ['Malaria', 'Typhoid', 'HIV', 'None'];

  const fetchCloudCollections = async () => {
    const records = await HealthSyncManager.getCloudDatabaseRecords();
    setCloudRecords(records);
    const alertsList = await HealthSyncManager.getAlerts();
    setCloudAlerts(alertsList);
    const recsList = await HealthSyncManager.getRecommendations();
    setCloudRecommendations(recsList);
  };

  useEffect(() => {
    fetchCloudCollections();
    const interval = setInterval(fetchCloudCollections, 2000);
    return () => clearInterval(interval);
  }, []);

  const toggleCondition = (condition) => {
    if (condition === 'None') {
      setSelectedConditions(['None']);
      return;
    }

    let updated = selectedConditions.filter(c => c !== 'None');
    if (updated.includes(condition)) {
      updated = updated.filter(c => c !== condition);
      if (updated.length === 0) updated = ['None'];
    } else {
      updated = [...updated, condition];
    }
    setSelectedConditions(updated);
  };

  const handleUpdateProfile = async () => {
    const updatedMetadata = {
      user_id: user ? user.id : 'usr_default',
      age: parseInt(ageInput) || 24,
      weight: parseFloat(weightInput) || 70.0,
      height: parseFloat(heightInput) || 175.0,
      blood_group: bloodGroupInput,
      diagnosed_conditions: selectedConditions,
    };

    setUsersMetadata(updatedMetadata);
    await HealthSyncManager.saveUsersMetadata(updatedMetadata);
    
    if (user) {
      const updatedUser = { ...user, name: profileName };
      setUser(updatedUser);
      await AsyncStorage.setItem('@rhmt_user_session', JSON.stringify(updatedUser));
    }
    
    Alert.alert('Profile Baseline Recalibrated', 'Patient users_metadata and medical baseline saved successfully.');
  };

  const handlePurgeData = () => {
    Alert.alert(
      '🚨 Purge Local & Cloud Data?',
      'This operation is irreversible. It will wipe all local caches, delete enqueued records from physical storage, and zero your Appwrite cloud database.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purge Everything',
          style: 'destructive',
          onPress: async () => {
            setUser(null);
            await AsyncStorage.removeItem('@rhmt_user_session');
            handleClearLogs();
            await HealthSyncManager.clearCloudDatabase();
            await fetchCloudCollections();
            Alert.alert('Data Purged', 'Local registers and external cloud database collections zeroed.');
          },
        },
      ]
    );
  };

  const triggerHardwareBackup = () => {
    Alert.alert(
      'SPIFFS Backup Initialized',
      'Local offline queue mirrored into secondary physical LittleFS/SPIFFS flash partition.'
    );
  };

  const triggerHardwareRestore = () => {
    Alert.alert(
      'Data Restored',
      'Retrieved enqueued registers from LittleFS SPIFFS cache.'
    );
  };

  const handleSignOut = async () => {
    try {
      setUser(null);
      await AsyncStorage.removeItem('@rhmt_user_session');
      await HealthSyncManager.logSystemAction('AUTH', 'User signed out securely.');
    } catch (e) {
      console.log(e);
    }
  };

  const s = styles(colors);

  return (
    <View style={s.container}>
      {/* Sub-Header Navigation Switch */}
      <View style={s.subHeader}>
        <TouchableOpacity
          style={[s.subTab, activeSubView === 'account' && s.activeSubTab]}
          onPress={() => setActiveSubView('account')}
        >
          <Text style={[s.subTabText, activeSubView === 'account' ? s.activeText : s.inactiveText]}>
            Account & Baseline
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.subTab, activeSubView === 'admin' && s.activeSubTab]}
          onPress={() => setActiveSubView('admin')}
        >
          <Text style={[s.subTabText, activeSubView === 'admin' ? s.activeText : s.inactiveText]}>
            Admin Cloud Console
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ==================== 1. ACCOUNT BASELINE VIEW ==================== */}
        {activeSubView === 'account' && (
          <View>
            {/* Medical Profiling Baseline Card */}
            <View style={[s.card, SHADOWS.premium]}>
              <Text style={s.cardTitle}>👤 Patient Profile Baseline (users_metadata)</Text>
              <Text style={s.cardDesc}>Configure baseline parameters synced with Appwrite Cloud for contextual guideline generation.</Text>
              
              <View style={s.formGroup}>
                <Text style={s.label}>Patient Identifier (Read-only)</Text>
                <TextInput style={[s.input, s.disabledInput]} editable={false} value="RHM-PAT-2026-981" />
              </View>

              <View style={s.formGroup}>
                <Text style={s.label}>Full Name</Text>
                <TextInput style={s.input} value={profileName} onChangeText={setProfileName} />
              </View>

              <View style={s.formRow}>
                <View style={s.formCol}>
                  <Text style={s.label}>Age (years)</Text>
                  <TextInput style={s.input} keyboardType="numeric" value={ageInput} onChangeText={setAgeInput} />
                </View>
                <View style={s.formCol}>
                  <Text style={s.label}>Blood Group</Text>
                  <TextInput style={s.input} value={bloodGroupInput} onChangeText={setBloodGroupInput} />
                </View>
              </View>

              <View style={s.formRow}>
                <View style={s.formCol}>
                  <Text style={s.label}>Baseline Weight (kg)</Text>
                  <TextInput style={s.input} keyboardType="numeric" value={weightInput} onChangeText={setWeightInput} />
                </View>
                <View style={s.formCol}>
                  <Text style={s.label}>Baseline Height (cm)</Text>
                  <TextInput style={s.input} keyboardType="numeric" value={heightInput} onChangeText={setHeightInput} />
                </View>
              </View>

              {/* Diagnosed Conditions Checkboxes */}
              <Text style={s.formSectionTitle}>Diagnosed Illness Baseline</Text>
              <View style={s.conditionsRow}>
                {conditionsList.map(condition => {
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

              <TouchableOpacity style={s.saveBtn} onPress={handleUpdateProfile} activeOpacity={0.8}>
                <Text style={s.saveBtnText}>Save & Sync Profile Baseline</Text>
              </TouchableOpacity>
            </View>

            {/* Sync & Network Preferences Card */}
            <View style={[s.card, SHADOWS.premium]}>
              <Text style={s.cardTitle}>⚙️ Sync & Network Preferences</Text>
              <Text style={s.cardDesc}>Adjust synchronization parameters for offline-first resilience.</Text>
              
              <View style={s.prefRow}>
                <View style={s.prefLeft}>
                  <Text style={s.prefTitle}>Real-time Stream Sync</Text>
                  <Text style={s.prefDesc}>Establishes Appwrite WebSocket listener channels for realtime state feeds.</Text>
                </View>
                <Switch
                  value={realtimeSync}
                  onValueChange={setRealtimeSync}
                  trackColor={{ false: colors.surfaceLight, true: colors.primary }}
                  thumbColor={realtimeSync ? colors.primary : colors.border}
                />
              </View>

              <View style={s.prefRow}>
                <View style={s.prefLeft}>
                  <Text style={s.prefTitle}>Wi-Fi Only Syncing</Text>
                  <Text style={s.prefDesc}>Restricts heavy clinical uploads to Wi-Fi bands to protect data bounds.</Text>
                </View>
                <Switch
                  value={wifiOnly}
                  onValueChange={setWifiOnly}
                  trackColor={{ false: colors.surfaceLight, true: colors.primary }}
                  thumbColor={wifiOnly ? colors.primary : colors.border}
                />
              </View>

              <View style={s.prefRow}>
                <View style={s.prefLeft}>
                  <Text style={s.prefTitle}>Automated Cloud Backups</Text>
                  <Text style={s.prefDesc}>Generates hourly trend backups in Appwrite Storage collections.</Text>
                </View>
                <Switch
                  value={cloudBackups}
                  onValueChange={setCloudBackups}
                  trackColor={{ false: colors.surfaceLight, true: colors.primary }}
                  thumbColor={cloudBackups ? colors.primary : colors.border}
                />
              </View>
            </View>

            {/* Session Actions Card */}
            <View style={[s.card, SHADOWS.premium]}>
              <Text style={s.cardTitle}>🔐 Session Actions</Text>
              <Text style={s.cardDesc}>Disconnect account from active monitoring node.</Text>
              <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
                <Text style={s.signOutBtnText}>Disconnect Account Session</Text>
              </TouchableOpacity>
            </View>

            {/* Privacy Zone Card */}
            <View style={[s.card, s.dangerCard, SHADOWS.premium]}>
              <Text style={[s.cardTitle, { color: colors.primary }]}>⚠️ Privacy & Security Zone</Text>
              <Text style={s.cardDesc}>Purges enqueued logs, profile baselines, and clears local offline caches.</Text>
              
              <Text style={s.dangerWarning}>
                Warning: Purging data will delete all unsynced measurements in the offline queue and erase local profiling metadata documents.
              </Text>

              <TouchableOpacity style={s.dangerBtn} onPress={handlePurgeData} activeOpacity={0.8}>
                <Text style={s.dangerBtnText}>Purge Account Baseline & Cache</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ==================== 2. ADMIN CLOUD CONSOLE ==================== */}
        {activeSubView === 'admin' && (
          <View>
            {/* Simulated Appwrite Cloud NoSQL Databases Display */}
            <View style={[s.card, SHADOWS.premium]}>
              <Text style={s.cardTitle}>🌐 Appwrite Cloud Collections Registry</Text>
              <Text style={s.cardDesc}>
                Real-time view of records kept permanently in the external Appwrite Cloud Database. Sync enqueued logs to see them appear here instantly.
              </Text>

              {/* Collection Registry: health_records */}
              <Text style={s.collectionHeading}>📁 health_records Collection</Text>
              <View style={s.dbBox}>
                {cloudRecords.length === 0 ? (
                  <Text style={s.dbEmptyText}>No synced journal entries found in cloud database.</Text>
                ) : (
                  <ScrollView style={s.dbScroll} nestedScrollEnabled contentContainerStyle={s.dbContent}>
                    {cloudRecords.map((rec) => (
                      <View key={rec.record_id} style={s.dbRow}>
                        <View style={s.dbRowHeader}>
                          <Text style={s.dbDocId}>ID: {rec.record_id}</Text>
                          <Text style={s.dbBadge}>HEALTH_RECORD</Text>
                        </View>
                        <Text style={s.dbDataText}>
                          🌡️ Temp: {rec.temperature}°C | ❤️ HR: {rec.heart_rate} BPM | 🫁 SpO2: {rec.spo2}%
                        </Text>
                        <Text style={s.dbDataText}>
                          Symptoms: {rec.symptoms_array.join(', ') || 'None'} | Meds Taken: {rec.meds_taken ? 'Yes' : 'No'} | Wellbeing: {rec.wellbeing_score}/5
                        </Text>
                        <View style={s.dbRowFooter}>
                          <Text style={s.dbMetaText}>User: {rec.user_id}</Text>
                          <Text style={s.dbMetaText}>{new Date(rec.timestamp).toLocaleTimeString()}</Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Collection Registry: recommendations */}
              <Text style={s.collectionHeading}>📁 recommendations Collection</Text>
              <View style={s.dbBox}>
                {cloudRecommendations.length === 0 ? (
                  <Text style={s.dbEmptyText}>No generated cloud recommendations found in BaaS collections.</Text>
                ) : (
                  <ScrollView style={s.dbScroll} nestedScrollEnabled contentContainerStyle={s.dbContent}>
                    {cloudRecommendations.map((rec) => (
                      <View key={rec.rec_id} style={s.dbRow}>
                        <View style={s.dbRowHeader}>
                          <Text style={s.dbDocId}>ID: {rec.rec_id}</Text>
                          <Text style={s.dbBadgeGold}>RECOMMENDATION</Text>
                        </View>
                        <Text style={s.dbDataTextBold}>{rec.lifestyle_guideline}</Text>
                        <Text style={s.dbDataText}>Diet: {rec.meal_plan} | Fluids: {rec.fluid_target}</Text>
                        <View style={s.dbRowFooter}>
                          <Text style={s.dbMetaText}>User: {rec.user_id}</Text>
                          <Text style={s.dbMetaText}>{new Date(rec.created_at).toLocaleTimeString()}</Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Collection Registry: alerts */}
              <Text style={s.collectionHeading}>📁 alerts Collection</Text>
              <View style={s.dbBox}>
                {cloudAlerts.length === 0 ? (
                  <Text style={s.dbEmptyText}>No unread alarms or critical warnings enqueued in cloud databases.</Text>
                ) : (
                  <ScrollView style={s.dbScroll} nestedScrollEnabled contentContainerStyle={s.dbContent}>
                    {cloudAlerts.map((alert) => (
                      <View key={alert.alert_id} style={s.dbRow}>
                        <View style={s.dbRowHeader}>
                          <Text style={s.dbDocId}>ID: {alert.alert_id}</Text>
                          <Text style={s.dbBadgeRed}>
                            ALERT ({alert.severity.toUpperCase()})
                          </Text>
                        </View>
                        <Text style={s.dbDataTextBold}>{alert.alert_message}</Text>
                        <View style={s.dbRowFooter}>
                          <Text style={s.dbMetaText}>User: {alert.user_id}</Text>
                          <Text style={s.dbMetaText}>Status: {alert.status}</Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            </View>

            {/* IoT Diagnostics card */}
            <View style={[s.card, SHADOWS.premium]}>
              <Text style={s.cardTitle}>📟 ESP32 Microcontroller Node Identifier</Text>
              <Text style={s.cardDesc}>Configure local network configuration settings.</Text>

              <View style={s.formGroup}>
                <Text style={s.label}>Node Config Identifier</Text>
                <TextInput style={s.input} value={deviceId} onChangeText={setDeviceId} />
              </View>
            </View>

            {/* Backups card */}
            <View style={[s.card, SHADOWS.premium]}>
              <Text style={s.cardTitle}>💾 Physical LittleFS / SPIFFS Cache Recovery</Text>
              <Text style={s.cardDesc}>Backup locally enqueued entries to flash partition blocks.</Text>

              <View style={s.simButtonRow}>
                <TouchableOpacity style={s.simBtnCol} onPress={triggerHardwareBackup}>
                  <Text style={s.simBtnColText}>Backup to LittleFS</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[s.simBtnCol, { backgroundColor: colors.surfaceLight }]} onPress={triggerHardwareRestore}>
                  <Text style={[s.simBtnColText, { color: colors.textPrimary }]}>Restore LittleFS</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* System Logs console */}
            <View style={[s.card, SHADOWS.premium]}>
              <View style={s.terminalHeader}>
                <Text style={s.terminalTitle}>📜 System Log Trails</Text>
                <TouchableOpacity onPress={handleClearLogs}>
                  <Text style={s.terminalClearText}>Clear Logs</Text>
                </TouchableOpacity>
              </View>

              <View style={s.terminal}>
                <ScrollView nestedScrollEnabled style={s.terminalScroll} contentContainerStyle={s.terminalContent}>
                  {logs.length === 0 ? (
                    <Text style={s.terminalLineMuted}>No logging entries recorded in system registers.</Text>
                  ) : (
                    logs.map(log => {
                      let levelColor = colors.textSecondary;
                      if (log.level === 'ERROR' || log.level === 'SYNC_FAILED') levelColor = colors.primary;
                      if (log.level === 'SYNC_SUCCESS' || log.level === 'RULE_TRIGGER') levelColor = colors.primary;
                      if (log.level === 'QUEUE') levelColor = colors.primaryLight;

                      const formattedTime = new Date(log.timestamp).toLocaleTimeString();

                      return (
                        <Text key={log.id} style={s.terminalLine}>
                          <Text style={s.terminalTime}>[{formattedTime}] </Text>
                          <Text style={{ color: levelColor, fontWeight: 'bold' }}>{log.level}</Text>
                          <Text style={s.terminalMsg}>: {log.message}</Text>
                        </Text>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            </View>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = (colors) => StyleSheet.create({
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
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeSubTab: {
    borderBottomColor: colors.primary,
  },
  subTabText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeText: {
    color: colors.primary,
  },
  inactiveText: {
    color: colors.textSecondary,
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
  dangerCard: {
    borderColor: 'rgba(225, 173, 1, 0.2)',
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
  formGroup: {
    marginBottom: SPACING.md,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: SPACING.md,
  },
  formCol: {
    flex: 1,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: SPACING.borderRadiusSm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 13,
  },
  disabledInput: {
    color: colors.textMuted,
    opacity: 0.8,
  },
  formSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  conditionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.lg,
  },
  conditionChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  conditionChipChecked: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(225, 173, 1, 0.05)',
  },
  conditionChipText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  conditionChipTextChecked: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: SPACING.md,
    borderRadius: SPACING.borderRadiusSm,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 13,
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  prefLeft: {
    flex: 0.8,
  },
  prefTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 2,
  },
  prefDesc: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
  },
  signOutBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: SPACING.md,
    borderRadius: SPACING.borderRadiusSm,
    alignItems: 'center',
  },
  signOutBtnText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  dangerWarning: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    backgroundColor: 'rgba(225, 173, 1, 0.04)',
    padding: SPACING.md,
    borderRadius: SPACING.borderRadiusSm,
    borderWidth: 1,
    borderColor: 'rgba(225, 173, 1, 0.1)',
    marginBottom: SPACING.md,
  },
  dangerBtn: {
    borderColor: colors.primary,
    borderWidth: 1,
    paddingVertical: SPACING.md,
    borderRadius: SPACING.borderRadiusSm,
    alignItems: 'center',
  },
  dangerBtnText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  simButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  simBtnCol: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: SPACING.md,
    borderRadius: SPACING.borderRadiusSm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  simBtnColText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  terminalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  terminalTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  terminalClearText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: 'bold',
  },
  terminal: {
    height: 160,
    backgroundColor: '#0A0A0A',
    borderRadius: SPACING.borderRadiusSm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: SPACING.md,
  },
  terminalScroll: {
    flex: 1,
  },
  terminalContent: {
    paddingBottom: 10,
  },
  terminalLine: {
    fontSize: 10,
    lineHeight: 14,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  terminalLineMuted: {
    fontSize: 10,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 40,
  },
  terminalTime: {
    color: colors.textMuted,
  },
  terminalMsg: {
    color: colors.textSecondary,
  },
  collectionHeading: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: SPACING.md,
    marginBottom: 6,
  },
  dbBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
    padding: 10,
    marginBottom: SPACING.md,
  },
  dbEmptyText: {
    fontSize: 10,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  dbScroll: {
    height: 140,
  },
  dbContent: {
    gap: 8,
  },
  dbRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 8,
  },
  dbRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    paddingBottom: 2,
  },
  dbDocId: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.primaryLight,
  },
  dbBadge: {
    fontSize: 8,
    fontWeight: 'bold',
    backgroundColor: 'rgba(225, 173, 1, 0.08)',
    color: colors.primary,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  dbBadgeGold: {
    fontSize: 8,
    fontWeight: 'bold',
    backgroundColor: 'rgba(225, 173, 1, 0.08)',
    color: colors.primary,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  dbBadgeRed: {
    fontSize: 8,
    fontWeight: 'bold',
    backgroundColor: 'rgba(225, 173, 1, 0.08)',
    color: colors.primary,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
});
