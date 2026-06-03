import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SafeAreaView, StyleSheet, StatusBar, View, ActivityIndicator, Text, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from './src/navigation/AppNavigator';
import djangoApi, { setAuthToken } from './src/services/django_api';
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
      <Animated.View style={{ transform: [{ scale: pulse }], alignItems: 'center' }}>
        <Text style={splashStyles.logo}>RH</Text>
        <Text style={splashStyles.title}>RHMT</Text>
        <Text style={splashStyles.subtitle}>Remote Health Monitoring Tool</Text>
      </Animated.View>
      <ActivityIndicator size="small" color="#E1AD01" style={{ marginTop: 40 }} />
      <Text style={splashStyles.statusText}>Checking Secure Auth Session...</Text>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 64,
    marginBottom: 10,
  },
  title: {
    color: '#E1AD01',
    fontSize: 26,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 10,
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    opacity: 0.8,
  },
  statusText: {
    color: '#888888',
    fontSize: 11,
    marginTop: 20,
    letterSpacing: 0.5,
  },
});

export default function App() {
  const [user, setUser] = useState(null);
  const [isSplashActive, setIsSplashActive] = useState(true);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('online');
  const [isAutomaticMode, setIsAutomaticMode] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [vitals, setVitals] = useState(EMPTY_VITALS);

  const [usersMetadata, setUsersMetadata] = useState({
    user_id: null,
    age: null,
    weight: null,
    height: null,
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
  const [alerts, setAlerts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [emergencyEvents, setEmergencyEvents] = useState([]);
  const [contactInquiries, setContactInquiries] = useState([]);
  const [dndEnabled, setDndEnabled] = useState(false);
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

  const toggleTheme = async () => {
    try {
      const nextMode = !isDarkMode;
      setIsDarkMode(nextMode);
      await AsyncStorage.setItem('@rhmt_theme_mode', nextMode ? 'dark' : 'light');
    } catch (e) {
      console.log('Failed to save theme preference:', e);
    }
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
      age: profileData.age ?? null,
      weight: profileData.weight ?? null,
      height: profileData.height ?? null,
      blood_group: profileData.blood_group || '',
      diagnosed_conditions: Array.isArray(profileData.diagnosed_conditions)
        ? profileData.diagnosed_conditions
        : [],
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
      setVitals(vitalsFromRecord(records[0]));
      await refreshQueueCount();
    } catch (e) {
      console.error("Failed to refresh Django data:", e);
    }
  }, [refreshQueueCount, user]);

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

  const createContactInquiry = async (payload) => {
    const inquiry = await djangoApi.createContactInquiry(payload);
    await refreshSyncStats();
    return inquiry;
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
        const savedUser = await AsyncStorage.getItem('@rhmt_user_session');
        
        if (savedToken && savedUser) {
          setAuthToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch (err) {
        console.log("No active auth session found");
      } finally {
        setTimeout(() => {
          setIsSplashActive(false);
          setIsFetchingData(false);
        }, 1800);
      }
    };
    verifySession();
  }, []);

  useEffect(() => {
    if (!user) return;

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
    
    const statsInterval = setInterval(refreshSyncStats, isAutomaticMode ? 5000 : 10000);
    return () => clearInterval(statsInterval);
  }, [applyProfile, isAutomaticMode, refreshSyncStats, user]);

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
          alerts,
          setAlerts,
          recommendations,
          setRecommendations,
          emergencyEvents,
          setEmergencyEvents,
          contactInquiries,
          setContactInquiries,
          dndEnabled,
          setDndEnabled,
          queueCount,
          logs,
          handleOfflineEnqueue,
          handleSyncQueue,
          handleClearLogs,
          updateProfileBaseline,
          logNutritionEntry,
          logFoodEntry,
          logFitnessEntry,
          createEmergencyEvent,
          createContactInquiry,
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
