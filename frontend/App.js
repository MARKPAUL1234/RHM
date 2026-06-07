import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SafeAreaView, StyleSheet, StatusBar, View, ActivityIndicator, Text, Animated, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from './src/navigation/AppNavigator';
import djangoApi, { setAuthToken, setRefreshToken } from './src/services/django_api';
import { DARK_COLORS, LIGHT_COLORS } from './src/styles/theme';
import { HealthContext } from './src/context/HealthContext';

const OFFLINE_QUEUE_KEY = '@rhmt_offline_queue';
const EMPTY_VITALS = {
  heartRate: null,
  spo2: null,
  temperature: null,
};
const EMPTY_FITNESS_SUMMARY = {
  daily_steps: 0,
  goal_steps: 10000,
  locked: false,
  routines: [],
  source_record_count: 0,
  manual_activity_count: 0,
  latest_record: null,
};

const vitalsFromRecord = (record) => ({
  heartRate: record ? record.heart_rate : null,
  spo2: record ? record.spo2 : null,
  temperature: record ? record.temperature : null,
});

function SplashScreen() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.12,
          duration: 900,
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 1.0,
          duration: 900,
          useNativeDriver: false,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return (
    <View style={splashStyles.container}>
      <View style={splashStyles.backgroundRing} />
      <View style={splashStyles.backgroundRingSmall} />
      <Animated.View style={[splashStyles.brandMark, { transform: [{ scale: pulse }] }]}>
        <Text style={splashStyles.logo}>RH</Text>
        <View style={splashStyles.pulseDot} />
      </Animated.View>
      <Animated.View style={{ transform: [{ scale: pulse.interpolate({ inputRange: [1, 1.12], outputRange: [1, 1.02] }) }], alignItems: 'center' }}>
        <Text style={splashStyles.title}>RHMT</Text>
        <Text style={splashStyles.subtitle}>Manual Health Journaling Dashboard</Text>
        <Text style={splashStyles.description}>Secure patient vitals, lifestyle insights, and history records.</Text>
      </Animated.View>
      <View style={splashStyles.statusCard}>
        <ActivityIndicator size="small" color="#047857" />
        <Text style={splashStyles.statusText}>Preparing your secure health workspace...</Text>
      </View>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    overflow: 'hidden',
  },
  backgroundRing: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    borderWidth: 42,
    borderColor: '#D1FAE5',
    opacity: 0.65,
    top: -98,
    right: -94,
  },
  backgroundRingSmall: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 34,
    borderColor: '#DBEAFE',
    opacity: 0.72,
    bottom: -70,
    left: -72,
  },
  brandMark: {
    width: 92,
    height: 92,
    borderRadius: 22,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    position: 'relative',
    ...Platform.select({
      web: {
        boxShadow: '0 14px 24px rgba(6, 78, 59, 0.22)',
      },
      default: {
        shadowColor: '#064E3B',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.22,
        shadowRadius: 24,
        elevation: 5,
      },
    }),
  },
  logo: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
  },
  pulseDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  title: {
    color: '#0F172A',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
  },
  subtitle: {
    color: '#047857',
    fontSize: 12,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '800',
    textAlign: 'center',
  },
  description: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    maxWidth: 340,
    textAlign: 'center',
    fontWeight: '500',
  },
  statusCard: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDE6F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    marginTop: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 18px rgba(15, 23, 42, 0.08)',
      },
      default: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
        elevation: 2,
      },
    }),
  },
  statusText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default function App() {
  const [user, setUser] = useState(null);
  const [isSplashActive, setIsSplashActive] = useState(true);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('online');
  const [isAutomaticMode, setIsAutomaticMode] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [vitals, setVitals] = useState(EMPTY_VITALS);

  const [usersMetadata, setUsersMetadata] = useState({
    user_id: null,
    age: null,
    weight: null,
    height: null,
    gender: '',
    blood_group: '',
    diagnosed_conditions: [],
  });

  const [patientDetails, setPatientDetails] = useState({
    bloodPressure: '',
    bloodGlucose: '',
    respiratoryRate: null,
  });

  const [nutrition, setNutrition] = useState({
    calorieGoals: 0,
    waterGoal: 0,
  });

  const [profile, setProfile] = useState(null);
  const [healthRecords, setHealthRecords] = useState([]);
  const [nutritionLogs, setNutritionLogs] = useState([]);
  const [foodLogs, setFoodLogs] = useState([]);
  const [fitnessLogs, setFitnessLogs] = useState([]);
  const [fitnessSummary, setFitnessSummary] = useState(EMPTY_FITNESS_SUMMARY);
  const [healthScores, setHealthScores] = useState([]);
  const [healthSummary, setHealthSummary] = useState(null);
  const [medicationReminders, setMedicationReminders] = useState([]);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [patientOverview, setPatientOverview] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [emergencyEvents, setEmergencyEvents] = useState([]);
  const [contactInquiries, setContactInquiries] = useState([]);
  const [appointmentRequests, setAppointmentRequests] = useState([]);
  const [careMessages, setCareMessages] = useState([]);
  const [dndEnabled, setDndEnabled] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState({
    criticalAlerts: true,
    medicationReminders: true,
    appointmentUpdates: true,
    doctorReplies: true,
  });
  const [refreshError, setRefreshError] = useState('');
  const [lastRefreshAt, setLastRefreshAt] = useState(null);
  const [queueCount, setQueueCount] = useState(0);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@rhmt_theme_mode');
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === 'dark');
        }
      } catch (e) {
        console.log('Failed to load theme preference:', e);
      }
    };
    loadThemePreference();
  }, []);

  useEffect(() => {
    const loadNotificationPreferences = async () => {
      try {
        const raw = await AsyncStorage.getItem('@rhmt_notification_preferences');
        const savedDnd = await AsyncStorage.getItem('@rhmt_dnd_enabled');
        if (raw) {
          setNotificationPreferences((current) => ({ ...current, ...JSON.parse(raw) }));
        }
        if (savedDnd !== null) {
          setDndEnabled(savedDnd === 'true');
        }
      } catch (e) {
        console.log('Failed to load notification preferences:', e);
      }
    };
    loadNotificationPreferences();
  }, []);

  const toggleTheme = async (value) => {
    try {
      const nextMode = typeof value === 'boolean' ? value : !isDarkMode;
      setIsDarkMode(nextMode);
      await AsyncStorage.setItem('@rhmt_theme_mode', nextMode ? 'dark' : 'light');
    } catch (e) {
      console.log('Failed to save theme preference:', e);
    }
  };

  const updateNotificationPreference = async (key, value) => {
    setNotificationPreferences((current) => {
      const nextPreferences = { ...current, [key]: value };
      AsyncStorage.setItem('@rhmt_notification_preferences', JSON.stringify(nextPreferences));
      return nextPreferences;
    });
  };

  const updateDndEnabled = async (value) => {
    setDndEnabled(value);
    await AsyncStorage.setItem('@rhmt_dnd_enabled', String(value));
  };

  const clearLocalCache = async () => {
    await AsyncStorage.multiRemove([
      OFFLINE_QUEUE_KEY,
      '@rhmt_notification_preferences',
      '@rhmt_dnd_enabled',
    ]);
    setQueueCount(0);
    setNotificationPreferences({
      criticalAlerts: true,
      medicationReminders: true,
      appointmentUpdates: true,
      doctorReplies: true,
    });
    setDndEnabled(false);
  };

  const clearSession = useCallback(async () => {
    setUser(null);
    setAuthToken(null);
    setRefreshToken(null);
    setProfile(null);
    setHealthRecords([]);
    setHealthScores([]);
    setHealthSummary(null);
    setAlerts([]);
    setRecommendations([]);
    setAppointmentRequests([]);
    setCareMessages([]);
    setRefreshError('');
    await AsyncStorage.removeItem('@rhmt_user_session');
    await AsyncStorage.removeItem('@rhmt_auth_token');
    await AsyncStorage.removeItem('@rhmt_refresh_token');
  }, []);

  const isAuthError = (error) => {
    const message = String(error?.message || '').toLowerCase();
    return (
      message.includes('session expired') ||
      message.includes('token_not_valid') ||
      message.includes('credentials were not provided') ||
      message.includes('authentication credentials')
    );
  };

  const colors = isDarkMode ? DARK_COLORS : LIGHT_COLORS;

  const refreshQueueCount = useCallback(async () => {
    try {
      const rawQueue = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      const queue = rawQueue ? JSON.parse(rawQueue) : [];
      setQueueCount(queue.length);
      return queue;
    } catch (e) {
      setQueueCount(0);
      return [];
    }
  }, []);

  const applyProfile = useCallback((profileData) => {
    if (!profileData) return;

    setProfile(profileData);
    setUsersMetadata({
      user_id: profileData.user_id || user?.id || null,
      display_name: profileData.display_name || user?.username || '',
      role: profileData.role || 'patient',
      age: profileData.age ?? null,
      weight: profileData.weight ?? null,
      height: profileData.height ?? null,
      gender: profileData.gender || '',
      blood_group: profileData.blood_group || '',
      diagnosed_conditions: Array.isArray(profileData.diagnosed_conditions)
        ? profileData.diagnosed_conditions
        : [],
      daily_water_goal_ml: profileData.daily_water_goal_ml ?? null,
      daily_step_goal: profileData.daily_step_goal ?? null,
      emergency_primary_contact: profileData.emergency_primary_contact || '',
      emergency_secondary_contact: profileData.emergency_secondary_contact || '',
      medical_notes: profileData.medical_notes || '',
    });
    setPatientDetails({
      bloodPressure: profileData.blood_pressure || '',
      bloodGlucose: profileData.blood_glucose || '',
      respiratoryRate: profileData.respiratory_rate ?? null,
    });
    setNutrition((current) => ({
      ...current,
      waterGoal: profileData.daily_water_goal_ml ?? 0,
    }));
  }, [user]);

  const refreshSyncStats = useCallback(async () => {
    if (!user) return;

    try {
      await djangoApi.ensureAuthenticated();
      const [
        records,
        recs,
        cloudAlerts,
        emergencyRows,
        contactRows,
        systemLogs,
        nutritionLogRows,
        foodLogRows,
        fitnessLogRows,
        fitness,
        scores,
        summary,
        medicationRows,
        report,
        patientRows,
        appointmentRows,
        messageRows,
      ] = await Promise.all([
        djangoApi.getHealthRecords(),
        djangoApi.getRecommendations(),
        djangoApi.getAlerts(),
        djangoApi.getEmergencyEvents(),
        djangoApi.getContactInquiries(),
        djangoApi.getSystemLogs(),
        djangoApi.getNutritionLogs(),
        djangoApi.getFoodLogs(),
        djangoApi.getFitnessLogs(),
        djangoApi.getFitnessSummary(),
        djangoApi.getHealthScores(),
        djangoApi.getHealthSummary(),
        djangoApi.getMedicationReminders(),
        djangoApi.getWeeklyReport(),
        djangoApi.getPatientOverview(),
        djangoApi.getAppointmentRequests(),
        djangoApi.getCareMessages(),
      ]);

      setHealthRecords(records);
      setRecommendations(recs);
      setAlerts(cloudAlerts);
      setEmergencyEvents(emergencyRows);
      setContactInquiries(contactRows);
      setLogs(systemLogs);
      setNutritionLogs(nutritionLogRows);
      setFoodLogs(foodLogRows);
      setFitnessLogs(fitnessLogRows);
      setFitnessSummary(fitness || EMPTY_FITNESS_SUMMARY);
      setHealthScores(scores);
      setHealthSummary(summary);
      setMedicationReminders(medicationRows);
      setWeeklyReport(report);
      setPatientOverview(Array.isArray(patientRows) ? patientRows : patientRows?.rows || []);
      setAppointmentRequests(appointmentRows);
      setCareMessages(messageRows);
      setVitals(vitalsFromRecord(records[0]));
      await refreshQueueCount();
      setConnectionStatus('online');
      setRefreshError('');
      setLastRefreshAt(new Date().toISOString());
    } catch (e) {
      if (isAuthError(e)) {
        await clearSession();
        setConnectionStatus('online');
        return;
      }
      setConnectionStatus('offline');
      setRefreshError(e?.message || 'Unable to refresh live backend data.');
      console.error("Failed to refresh Django data:", e);
    }
  }, [clearSession, refreshQueueCount, user]);

  const updateProfileBaseline = async (data) => {
    const updatedProfile = await djangoApi.updateProfile(data);
    applyProfile(updatedProfile);
    return updatedProfile;
  };

  const logNutritionEntry = async (payload) => {
    const savedLog = await djangoApi.createNutritionLog(payload);
    const [profileData] = await Promise.all([
      djangoApi.getProfile(),
      refreshSyncStats(),
    ]);
    applyProfile(profileData);
    return savedLog;
  };

  const logFoodEntry = async (payload) => {
    const savedLog = await djangoApi.createFoodLog(payload);
    await refreshSyncStats();
    return savedLog;
  };

  const logFitnessEntry = async (payload) => {
    const savedLog = await djangoApi.createFitnessLog(payload);
    await refreshSyncStats();
    return savedLog;
  };

  const createEmergencyEvent = async (payload) => {
    const event = await djangoApi.createEmergencyEvent(payload);
    await refreshSyncStats();
    return event;
  };

  const createMedicationReminder = async (payload) => {
    const reminder = await djangoApi.createMedicationReminder(payload);
    await refreshSyncStats();
    return reminder;
  };

  const markMedicationTaken = async (reminderId) => {
    const reminder = await djangoApi.markMedicationTaken(reminderId);
    await refreshSyncStats();
    return reminder;
  };

  const markMedicationMissed = async (reminderId) => {
    const reminder = await djangoApi.markMedicationMissed(reminderId);
    await refreshSyncStats();
    return reminder;
  };

  const exportWeeklyReport = async () => djangoApi.getWeeklyReportExport();

  const reviewHealthRecord = async (recordId, payload) => {
    const record = await djangoApi.reviewHealthRecord(recordId, payload);
    await refreshSyncStats();
    return record;
  };

  const createContactInquiry = async (payload) => {
    const inquiry = await djangoApi.createContactInquiry(payload);
    await refreshSyncStats();
    return inquiry;
  };

  const createAppointmentRequest = async (payload) => {
    const appointment = await djangoApi.createAppointmentRequest(payload);
    await refreshSyncStats();
    return appointment;
  };

  const createCareMessage = async (payload) => {
    const message = await djangoApi.createCareMessage(payload);
    await refreshSyncStats();
    return message;
  };

  const markAlertRead = async (alertId) => {
    const updatedAlert = await djangoApi.updateAlert(alertId, { status: 'read' });
    setAlerts((currentAlerts) =>
      currentAlerts.map((alert) =>
        alert.id === alertId ? updatedAlert : alert
      )
    );
    await refreshSyncStats();
    return updatedAlert;
  };

  useEffect(() => {
    const verifySession = async () => {
      try {
        const savedToken = await AsyncStorage.getItem('@rhmt_auth_token');
        const savedRefreshToken = await AsyncStorage.getItem('@rhmt_refresh_token');
        const savedUser = await AsyncStorage.getItem('@rhmt_user_session');
        
        if (savedToken && savedUser) {
          setAuthToken(savedToken);
          setRefreshToken(savedRefreshToken);
          try {
            const currentUser = await djangoApi.getCurrentUser();
            setUser({
              id: currentUser.id,
              username: currentUser.username,
              email: currentUser.email || `${currentUser.username}@rhmt.app`,
              name: currentUser.username,
            });
          } catch (sessionError) {
            if (savedRefreshToken) {
              await djangoApi.refreshSession();
              const currentUser = await djangoApi.getCurrentUser();
              setUser({
                id: currentUser.id,
                username: currentUser.username,
                email: currentUser.email || `${currentUser.username}@rhmt.app`,
                name: currentUser.username,
              });
            } else {
              throw sessionError;
            }
          }
        }
      } catch (err) {
        setAuthToken(null);
        setRefreshToken(null);
        await clearSession();
        console.log("No active auth session found");
      } finally {
        setIsSessionReady(true);
        setTimeout(() => {
          setIsSplashActive(false);
          setIsFetchingData(false);
        }, 1800);
      }
    };
    verifySession();
  }, [clearSession]);

  useEffect(() => {
    if (!user || !isSessionReady) return;

    const initializeProfile = async () => {
      setIsFetchingData(true);
      try {
        const profileData = await djangoApi.getProfile();
        applyProfile(profileData);
      } catch (e) {
        console.error("Failed to get profile:", e);
      }
      await refreshSyncStats();
      setIsFetchingData(false);
    };

    initializeProfile();
    
    const currentRole = String(profile?.role || usersMetadata?.role || user?.role || 'patient').toLowerCase();
    const isClinicalSession = ['clinician', 'doctor', 'caregiver', 'admin'].includes(currentRole);
    const refreshDelay = isAutomaticMode || isClinicalSession ? 5000 : 10000;
    const statsInterval = setInterval(refreshSyncStats, refreshDelay);
    return () => clearInterval(statsInterval);
  }, [applyProfile, isAutomaticMode, isSessionReady, profile?.role, refreshSyncStats, user, usersMetadata?.role]);

  const handleOfflineEnqueue = async (type, payload) => {
    if (type !== 'vital') return null;

    const recordPayload = {
      temperature: payload.temperature,
      heart_rate: payload.heartRate || payload.heart_rate,
      spo2: payload.spo2,
      symptoms_array: payload.symptoms_array || [],
      meds_taken: payload.meds_taken || false,
      wellbeing_score: payload.wellbeing_score || 3,
    };

    if (connectionStatus === 'online') {
      try {
        const savedRecord = await djangoApi.createHealthRecord(recordPayload);
        await refreshSyncStats();
        return savedRecord;
      } catch (e) {
        console.error("Failed to send record:", e);
      }
    }

    const queue = await refreshQueueCount();
    const queueItem = {
      id: `vital_${Date.now()}`,
      type,
      payload: recordPayload,
      timestamp: new Date().toISOString(),
    };
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify([...queue, queueItem]));
    await refreshQueueCount();
    return queueItem;
  };

  const handleSyncQueue = async () => {
    if (connectionStatus !== 'online') {
      return { success: false, syncedCount: 0, error: 'App is offline' };
    }

    const queue = await refreshQueueCount();
    if (queue.length === 0) {
      return { success: true, syncedCount: 0 };
    }

    const failedItems = [];
    let syncedCount = 0;

    for (const item of queue) {
      try {
        if (item.type === 'vital') {
          await djangoApi.createHealthRecord(item.payload);
          syncedCount += 1;
        }
      } catch (e) {
        failedItems.push(item);
      }
    }

    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(failedItems));
    await refreshQueueCount();
    await refreshSyncStats();
    return {
      success: failedItems.length === 0,
      syncedCount,
      pendingCount: failedItems.length,
    };
  };

  const handleClearLogs = async () => {
    setLogs([]);
  };

  if (isSplashActive) {
    return <SplashScreen />;
  }

  const s = styles(colors);

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <HealthContext.Provider
        value={{
          user,
          setUser,
          isFetchingData,
          setIsFetchingData,
          connectionStatus,
          setConnectionStatus,
          isAutomaticMode,
          setIsAutomaticMode,
          vitals,
          setVitals,
          profile,
          setProfile,
          usersMetadata,
          setUsersMetadata,
          patientDetails,
          setPatientDetails,
          nutrition,
          setNutrition,
          healthRecords,
          setHealthRecords,
          nutritionLogs,
          setNutritionLogs,
          foodLogs,
          setFoodLogs,
          fitnessLogs,
          setFitnessLogs,
          fitnessSummary,
          setFitnessSummary,
          healthScores,
          setHealthScores,
          healthSummary,
          setHealthSummary,
          medicationReminders,
          setMedicationReminders,
          weeklyReport,
          setWeeklyReport,
          patientOverview,
          setPatientOverview,
          alerts,
          setAlerts,
          recommendations,
          setRecommendations,
          emergencyEvents,
          setEmergencyEvents,
          contactInquiries,
          setContactInquiries,
          appointmentRequests,
          setAppointmentRequests,
          careMessages,
          setCareMessages,
          dndEnabled,
          setDndEnabled: updateDndEnabled,
          notificationPreferences,
          updateNotificationPreference,
          refreshError,
          lastRefreshAt,
          queueCount,
          logs,
          handleOfflineEnqueue,
          handleSyncQueue,
          handleClearLogs,
          clearLocalCache,
          updateProfileBaseline,
          logNutritionEntry,
          logFoodEntry,
          logFitnessEntry,
          createMedicationReminder,
          markMedicationTaken,
          markMedicationMissed,
          exportWeeklyReport,
          reviewHealthRecord,
          createEmergencyEvent,
          createContactInquiry,
          createAppointmentRequest,
          createCareMessage,
          markAlertRead,
          refreshSyncStats,
          isDarkMode,
          colors,
          toggleTheme,
        }}
      >
        <AppNavigator />
      </HealthContext.Provider>
    </SafeAreaView>
  );
}

const styles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
