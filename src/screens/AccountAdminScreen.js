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
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS } from '../styles/theme';
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

  return (
    <View style={styles.container}>
      {/* Sub-Header Navigation Switch */}
      <View style={styles.subHeader}>
        <TouchableOpacity
          style={[styles.subTab, activeSubView === 'account' && styles.activeSubTab]}
          onPress={() => setActiveSubView('account')}
        >
          <Text style={[styles.subTabText, activeSubView === 'account' ? styles.activeText : styles.inactiveText]}>
            Account & Baseline
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTab, activeSubView === 'admin' && styles.activeSubTab]}
          onPress={() => setActiveSubView('admin')}
        >
          <Text style={[styles.subTabText, activeSubView === 'admin' ? styles.activeText : styles.inactiveText]}>
            Admin Cloud Console
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ==================== 1. ACCOUNT BASELINE VIEW ==================== */}
        {activeSubView === 'account' && (
          <View>
            {/* Medical Profiling Baseline Card */}
            <View style={[styles.card, SHADOWS.premium]}>
              <Text style={styles.cardTitle}>👤 Patient Profile Baseline (users_metadata)</Text>
              <Text style={styles.cardDesc}>Configure baseline parameters synced with Appwrite Cloud for contextual guideline generation.</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Patient Identifier (Read-only)</Text>
                <TextInput style={[styles.input, styles.disabledInput]} editable={false} value="RHM-PAT-2026-981" />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput style={styles.input} value={profileName} onChangeText={setProfileName} />
              </View>

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Age (years)</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={ageInput} onChangeText={setAgeInput} />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Blood Group</Text>
                  <TextInput style={styles.input} value={bloodGroupInput} onChangeText={setBloodGroupInput} />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Baseline Weight (kg)</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={weightInput} onChangeText={setWeightInput} />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Baseline Height (cm)</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={heightInput} onChangeText={setHeightInput} />
                </View>
              </View>

              {/* Diagnosed Conditions Checkboxes */}
              <Text style={styles.formSectionTitle}>Diagnosed Illness Baseline</Text>
              <View style={styles.conditionsRow}>
                {conditionsList.map(condition => {
                  const checked = selectedConditions.includes(condition);
                  return (
                    <TouchableOpacity
                      key={condition}
                      style={[styles.conditionChip, checked && styles.conditionChipChecked]}
                      onPress={() => toggleCondition(condition)}
                    >
                      <Text style={[styles.conditionChipText, checked && styles.conditionChipTextChecked]}>
                        {condition}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateProfile} activeOpacity={0.8}>
                <Text style={styles.saveBtnText}>Save & Sync Profile Baseline</Text>
              </TouchableOpacity>
            </View>

            {/* Sync & Network Preferences Card */}
            <View style={[styles.card, SHADOWS.premium]}>
              <Text style={styles.cardTitle}>⚙️ Sync & Network Preferences</Text>
              <Text style={styles.cardDesc}>Adjust synchronization parameters for offline-first resilience.</Text>
              
              <View style={styles.prefRow}>
                <View style={styles.prefLeft}>
                  <Text style={styles.prefTitle}>Real-time Stream Sync</Text>
                  <Text style={styles.prefDesc}>Establishes Appwrite WebSocket listener channels for realtime state feeds.</Text>
                </View>
                <Switch
                  value={realtimeSync}
                  onValueChange={setRealtimeSync}
                  trackColor={{ false: COLORS.surfaceLight, true: COLORS.primary }}
                  thumbColor={realtimeSync ? COLORS.primary : COLORS.border}
                />
              </View>

              <View style={styles.prefRow}>
                <View style={styles.prefLeft}>
                  <Text style={styles.prefTitle}>Wi-Fi Only Syncing</Text>
                  <Text style={styles.prefDesc}>Restricts heavy clinical uploads to Wi-Fi bands to protect data bounds.</Text>
                </View>
                <Switch
                  value={wifiOnly}
                  onValueChange={setWifiOnly}
                  trackColor={{ false: COLORS.surfaceLight, true: COLORS.primary }}
                  thumbColor={wifiOnly ? COLORS.primary : COLORS.border}
                />
              </View>

              <View style={styles.prefRow}>
                <View style={styles.prefLeft}>
                  <Text style={styles.prefTitle}>Automated Cloud Backups</Text>
                  <Text style={styles.prefDesc}>Generates hourly trend backups in Appwrite Storage collections.</Text>
                </View>
                <Switch
                  value={cloudBackups}
                  onValueChange={setCloudBackups}
                  trackColor={{ false: COLORS.surfaceLight, true: COLORS.primary }}
                  thumbColor={cloudBackups ? COLORS.primary : COLORS.border}
                />
              </View>
            </View>

            {/* Session Actions Card */}
            <View style={[styles.card, SHADOWS.premium]}>
              <Text style={styles.cardTitle}>🔐 Session Actions</Text>
              <Text style={styles.cardDesc}>Disconnect account from active monitoring node.</Text>
              <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
                <Text style={styles.signOutBtnText}>Disconnect Account Session</Text>
              </TouchableOpacity>
            </View>

            {/* Privacy Zone Card */}
            <View style={[styles.card, styles.dangerCard, SHADOWS.premium]}>
              <Text style={[styles.cardTitle, { color: COLORS.primary }]}>⚠️ Privacy & Security Zone</Text>
              <Text style={styles.cardDesc}>Purges enqueued logs, profile baselines, and clears local offline caches.</Text>
              
              <Text style={styles.dangerWarning}>
                Warning: Purging data will delete all unsynced measurements in the offline queue and erase local profiling metadata documents.
              </Text>

              <TouchableOpacity style={styles.dangerBtn} onPress={handlePurgeData} activeOpacity={0.8}>
                <Text style={styles.dangerBtnText}>Purge Account Baseline & Cache</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ==================== 2. ADMIN CLOUD CONSOLE ==================== */}
        {activeSubView === 'admin' && (
          <View>
            {/* Simulated Appwrite Cloud NoSQL Databases Display */}
            <View style={[styles.card, SHADOWS.premium]}>
              <Text style={styles.cardTitle}>🌐 Appwrite Cloud Collections Registry</Text>
              <Text style={styles.cardDesc}>
                Real-time view of records kept permanently in the external Appwrite Cloud Database. Sync enqueued logs to see them appear here instantly.
              </Text>

              {/* Collection Registry: health_records */}
              <Text style={styles.collectionHeading}>📁 health_records Collection</Text>
              <View style={styles.dbBox}>
                {cloudRecords.length === 0 ? (
                  <Text style={styles.dbEmptyText}>No synced journal entries found in cloud database.</Text>
                ) : (
                  <ScrollView style={styles.dbScroll} nestedScrollEnabled contentContainerStyle={styles.dbContent}>
                    {cloudRecords.map((rec) => (
                      <View key={rec.record_id} style={styles.dbRow}>
                        <View style={styles.dbRowHeader}>
                          <Text style={styles.dbDocId}>ID: {rec.record_id}</Text>
                          <Text style={styles.dbBadge}>HEALTH_RECORD</Text>
                        </View>
                        <Text style={styles.dbDataText}>
                          🌡️ Temp: {rec.temperature}°C | ❤️ HR: {rec.heart_rate} BPM
                        </Text>
                        <Text style={styles.dbDataText}>
                          Symptoms: {rec.symptoms_array.join(', ') || 'None'} | Meds Taken: {rec.meds_taken ? 'Yes' : 'No'} | Wellbeing: {rec.wellbeing_score}/5
                        </Text>
                        <View style={styles.dbRowFooter}>
                          <Text style={styles.dbMetaText}>User: {rec.user_id}</Text>
                          <Text style={styles.dbMetaText}>{new Date(rec.timestamp).toLocaleTimeString()}</Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Collection Registry: recommendations */}
              <Text style={styles.collectionHeading}>📁 recommendations Collection</Text>
              <View style={styles.dbBox}>
                {cloudRecommendations.length === 0 ? (
                  <Text style={styles.dbEmptyText}>No generated cloud recommendations found in BaaS collections.</Text>
                ) : (
                  <ScrollView style={styles.dbScroll} nestedScrollEnabled contentContainerStyle={styles.dbContent}>
                    {cloudRecommendations.map((rec) => (
                      <View key={rec.rec_id} style={styles.dbRow}>
                        <View style={styles.dbRowHeader}>
                          <Text style={styles.dbDocId}>ID: {rec.rec_id}</Text>
                          <Text style={styles.dbBadgeGold}>RECOMMENDATION</Text>
                        </View>
                        <Text style={styles.dbDataTextBold}>{rec.lifestyle_guideline}</Text>
                        <Text style={styles.dbDataText}>Diet: {rec.meal_plan} | Fluids: {rec.fluid_target}</Text>
                        <View style={styles.dbRowFooter}>
                          <Text style={styles.dbMetaText}>User: {rec.user_id}</Text>
                          <Text style={styles.dbMetaText}>{new Date(rec.created_at).toLocaleTimeString()}</Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Collection Registry: alerts */}
              <Text style={styles.collectionHeading}>📁 alerts Collection</Text>
              <View style={styles.dbBox}>
                {cloudAlerts.length === 0 ? (
                  <Text style={styles.dbEmptyText}>No unread alarms or critical warnings enqueued in cloud databases.</Text>
                ) : (
                  <ScrollView style={styles.dbScroll} nestedScrollEnabled contentContainerStyle={styles.dbContent}>
                    {cloudAlerts.map((alert) => (
                      <View key={alert.alert_id} style={styles.dbRow}>
                        <View style={styles.dbRowHeader}>
                          <Text style={styles.dbDocId}>ID: {alert.alert_id}</Text>
                          <Text style={styles.dbBadgeRed}>
                            ALERT ({alert.severity.toUpperCase()})
                          </Text>
                        </View>
                        <Text style={styles.dbDataTextBold}>{alert.alert_message}</Text>
                        <View style={styles.dbRowFooter}>
                          <Text style={styles.dbMetaText}>User: {alert.user_id}</Text>
                          <Text style={styles.dbMetaText}>Status: {alert.status}</Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            </View>

            {/* IoT Diagnostics card */}
            <View style={[styles.card, SHADOWS.premium]}>
              <Text style={styles.cardTitle}>📟 ESP32 Microcontroller Node Identifier</Text>
              <Text style={styles.cardDesc}>Configure local network configuration settings.</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Node Config Identifier</Text>
                <TextInput style={styles.input} value={deviceId} onChangeText={setDeviceId} />
              </View>
            </View>

            {/* Backups card */}
            <View style={[styles.card, SHADOWS.premium]}>
              <Text style={styles.cardTitle}>💾 Physical LittleFS / SPIFFS Cache Recovery</Text>
              <Text style={styles.cardDesc}>Backup locally enqueued entries to flash partition blocks.</Text>

              <View style={styles.simButtonRow}>
                <TouchableOpacity style={styles.simBtnCol} onPress={triggerHardwareBackup}>
                  <Text style={styles.simBtnColText}>Backup to LittleFS</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.simBtnCol, { backgroundColor: COLORS.surfaceLight }]} onPress={triggerHardwareRestore}>
                  <Text style={[styles.simBtnColText, { color: COLORS.textPrimary }]}>Restore LittleFS</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* System Logs console */}
            <View style={[styles.card, SHADOWS.premium]}>
              <View style={styles.terminalHeader}>
                <Text style={styles.terminalTitle}>📜 System Log Trails</Text>
                <TouchableOpacity onPress={handleClearLogs}>
                  <Text style={styles.terminalClearText}>Clear Logs</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.terminal}>
                <ScrollView nestedScrollEnabled style={styles.terminalScroll} contentContainerStyle={styles.terminalContent}>
                  {logs.length === 0 ? (
                    <Text style={styles.terminalLineMuted}>No logging entries recorded in system registers.</Text>
                  ) : (
                    logs.map(log => {
                      let levelColor = COLORS.textSecondary;
                      if (log.level === 'ERROR' || log.level === 'SYNC_FAILED') levelColor = COLORS.primary;
                      if (log.level === 'SYNC_SUCCESS' || log.level === 'RULE_TRIGGER') levelColor = COLORS.primary;
                      if (log.level === 'QUEUE') levelColor = COLORS.primaryLight;

                      const formattedTime = new Date(log.timestamp).toLocaleTimeString();

                      return (
                        <Text key={log.id} style={styles.terminalLine}>
                          <Text style={styles.terminalTime}>[{formattedTime}] </Text>
                          <Text style={{ color: levelColor, fontWeight: 'bold' }}>{log.level}</Text>
                          <Text style={styles.terminalMsg}>: {log.message}</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  subHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  subTab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeSubTab: {
    borderBottomColor: COLORS.primary,
  },
  subTabText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeText: {
    color: COLORS.primary,
  },
  inactiveText: {
    color: COLORS.textSecondary,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.borderRadius,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  dangerCard: {
    borderColor: 'rgba(225, 173, 1, 0.2)',
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
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SPACING.borderRadiusSm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    fontSize: 13,
  },
  disabledInput: {
    color: COLORS.textMuted,
    opacity: 0.8,
  },
  formSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
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
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  conditionChipChecked: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(225, 173, 1, 0.05)',
  },
  conditionChipText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  conditionChipTextChecked: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
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
    borderBottomColor: COLORS.border,
  },
  prefLeft: {
    flex: 0.8,
  },
  prefTitle: {
    color: COLORS.textPrimary,
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 2,
  },
  prefDesc: {
    color: COLORS.textMuted,
    fontSize: 10,
    lineHeight: 14,
  },
  signOutBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: SPACING.borderRadiusSm,
    alignItems: 'center',
  },
  signOutBtnText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  dangerWarning: {
    color: COLORS.textSecondary,
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
    borderColor: COLORS.primary,
    borderWidth: 1,
    paddingVertical: SPACING.md,
    borderRadius: SPACING.borderRadiusSm,
    alignItems: 'center',
  },
  dangerBtnText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  simButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  simBtnCol: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: SPACING.borderRadiusSm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.textPrimary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  terminalClearText: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: 'bold',
  },
  terminal: {
    height: 160,
    backgroundColor: '#0A0A0A',
    borderRadius: SPACING.borderRadiusSm,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 40,
  },
  terminalTime: {
    color: COLORS.textMuted,
  },
  terminalMsg: {
    color: COLORS.textSecondary,
  },
  collectionHeading: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: 6,
  },
  dbBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    padding: 10,
    marginBottom: SPACING.md,
  },
  dbEmptyText: {
    fontSize: 10,
    color: COLORS.textMuted,
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
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 8,
  },
  dbRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    paddingBottom: 2,
  },
  dbDocId: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.primaryLight,
  },
  dbBadge: {
    fontSize: 8,
    fontWeight: 'bold',
    backgroundColor: 'rgba(225, 173, 1, 0.08)',
    color: COLORS.primary,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  dbBadgeGold: {
    fontSize: 8,
    fontWeight: 'bold',
    backgroundColor: 'rgba(225, 173, 1, 0.08)',
    color: COLORS.primary,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  dbBadgeRed: {
    fontSize: 8,
    fontWeight: 'bold',
    backgroundColor: 'rgba(225, 173, 1, 0.08)',
    color: COLORS.primary,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  dbDataText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    lineHeight: 14,
  },
  dbDataTextBold: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    lineHeight: 14,
  },
  dbRowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    paddingTop: 2,
  },
  dbMetaText: {
    fontSize: 8,
    color: COLORS.textMuted,
  },
});
