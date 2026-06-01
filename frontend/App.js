import React, { useCallback, useState, useEffect, useRef } from 'react';
import { SafeAreaView, StyleSheet, StatusBar, View, ActivityIndicator, Text, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from './src/navigation/AppNavigator';
import djangoApi, { setAuthToken } from './src/services/django_api';
import { DARK_COLORS, LIGHT_COLORS } from './src/styles/theme';
import { HealthContext } from './src/context/HealthContext';

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
        <Text style={splashStyles.logo}>🩺</Text>
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
  const [profile, setProfile] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('online');
  const [isAutomaticMode, setIsAutomaticMode] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [vitals, setVitals] = useState({
    heartRate: 72,
    spo2: 98,
    temperature: 36.6,
  });

  const [usersMetadata, setUsersMetadata] = useState({
    user_id: 'usr_default',
    age: 24,
    weight: 70,
    height: 175,
    blood_group: 'O+',
    diagnosed_conditions: ['Malaria'],
  });

  const [patientDetails, setPatientDetails] = useState({
    bloodPressure: '120/80',
    bloodGlucose: '95',
    respiratoryRate: 16,
  });

  const [nutrition, setNutrition] = useState({
    calorieGoals: 2200,
    waterGoal: 3000,
  });

  const [alerts, setAlerts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [nutritionLogs, setNutritionLogs] = useState([]);
  const [emergencyEvents, setEmergencyEvents] = useState([]);
  const [fitnessSummary, setFitnessSummary] = useState({
    daily_steps: 0,
    goal_steps: 10000,
    locked: false,
    routines: [],
    source_record_count: 0,
  });
  const [dndEnabled, setDndEnabled] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [logs, setLogs] = useState([]);
  const [deviceId, setDeviceId] = useState('ESP32-RHM-NODE-001');

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

  const applyProfileToState = useCallback(async (profile, activeUser = user) => {
    if (!profile) return;

    setProfile(profile);

    const displayName = profile.display_name || activeUser?.name || profile.username || 'Patient';

    setUsersMetadata({
      user_id: activeUser?.id || profile.id,
      age: profile.age || 24,
      weight: profile.weight || 70,
      height: profile.height || 175,
      blood_group: profile.blood_group || 'O+',
      diagnosed_conditions: profile.diagnosed_conditions?.length ? profile.diagnosed_conditions : ['None'],
    });

    setPatientDetails({
      bloodPressure: profile.blood_pressure || '120/80',
      bloodGlucose: profile.blood_glucose || '95',
      respiratoryRate: profile.respiratory_rate || 16,
    });

    setNutrition({
      calorieGoals: profile.calorie_goals || 2200,
      waterGoal: profile.daily_water_goal_ml || 3000,
    });

    setDeviceId(profile.device_id || 'ESP32-RHM-NODE-001');

    if (activeUser && activeUser.name !== displayName) {
      const updatedUser = { ...activeUser, name: displayName };
      setUser(updatedUser);
      await AsyncStorage.setItem('@rhmt_user_session', JSON.stringify(updatedUser));
    }
  }, [user]);

  const refreshSyncStats = useCallback(async () => {
    if (!user) return;
    
    try {
      const [
        recs,
        cloudAlerts,
        systemLogs,
        records,
        nutritionEntries,
        emergencyEntries,
        fitness,
      ] = await Promise.all([
        djangoApi.getRecommendations(),
        djangoApi.getAlerts(),
        djangoApi.getSystemLogs(),
        djangoApi.getHealthRecords(),
        djangoApi.getNutritionLogs(),
        djangoApi.getEmergencyEvents(),
        djangoApi.getFitnessSummary(),
      ]);

      setRecommendations(recs);
      setAlerts(cloudAlerts);
      setLogs(systemLogs);
      setHealthRecords(records);
      setNutritionLogs(nutritionEntries);
      setEmergencyEvents(emergencyEntries);
      setFitnessSummary(fitness);

      if (records.length > 0) {
        const latest = records[0];
        setVitals({
          heartRate: latest.heart_rate,
          spo2: latest.spo2,
          temperature: latest.temperature,
        });
      }

      setConnectionStatus('online');
    } catch (e) {
      console.error("Failed to refresh backend data:", e);
      setConnectionStatus('offline');
    }
  }, [user]);

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

    let isActive = true;
    const initializeProfile = async () => {
      setIsFetchingData(true);
      try {
        const profile = await djangoApi.getProfile();
        if (isActive) {
          await applyProfileToState(profile, user);
        }
      } catch (e) {
        console.error("Failed to get profile:", e);
      }
      await refreshSyncStats();
      if (isActive) {
        setIsFetchingData(false);
      }
    };
    initializeProfile();
    
    const statsInterval = setInterval(refreshSyncStats, isAutomaticMode ? 5000 : 10000);
    return () => {
      isActive = false;
      clearInterval(statsInterval);
    };
  }, [applyProfileToState, isAutomaticMode, refreshSyncStats, user]);

  const updateProfileBaseline = async (data) => {
    const profile = await djangoApi.updateProfile(data);
    await applyProfileToState(profile);
    await refreshSyncStats();
    return profile;
  };

  const logNutritionEntry = async (data) => {
    const log = await djangoApi.createNutritionLog(data);
    if (data.entry_type === 'weight') {
      const profile = await djangoApi.getProfile();
      await applyProfileToState(profile);
    }
    await refreshSyncStats();
    return log;
  };

  const createEmergencyEvent = async (data) => {
    const event = await djangoApi.createEmergencyEvent(data);
    await refreshSyncStats();
    return event;
  };

  const handleOfflineEnqueue = async (type, payload) => {
    if (type === 'vital' && payload.event === 'water_logged') {
      await logNutritionEntry({
        entry_type: 'water',
        value: payload.amount_ml || payload.amount || 250,
        unit: 'ml',
        note: payload.total ? `Total logged: ${payload.total}` : 'Hydration entry',
      });
      return;
    }

    if (type === 'vital') {
      try {
        await djangoApi.createHealthRecord({
          temperature: payload.temperature,
          heart_rate: payload.heartRate || payload.heart_rate,
          spo2: payload.spo2,
          symptoms_array: payload.symptoms_array || [],
          meds_taken: payload.meds_taken || false,
          wellbeing_score: payload.wellbeing_score || 3,
        });
      } catch (e) {
        console.error("Failed to send record:", e);
      }
    }

    if (type === 'nutrition') {
      await logNutritionEntry(payload);
    }

    if (type === 'emergency') {
      await createEmergencyEvent(payload);
    }

    await refreshSyncStats();
  };

  const handleSyncQueue = async () => {
    await refreshSyncStats();
    return { success: true, syncedCount: 0 };
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
          profile,
          setProfile,
          isFetchingData,
          setIsFetchingData,
          connectionStatus,
          setConnectionStatus,
          isAutomaticMode,
          setIsAutomaticMode,
          vitals,
          setVitals,
          usersMetadata,
          setUsersMetadata,
          patientDetails,
          setPatientDetails,
          nutrition,
          setNutrition,
          alerts,
          setAlerts,
          recommendations,
          setRecommendations,
          healthRecords,
          setHealthRecords,
          nutritionLogs,
          setNutritionLogs,
          emergencyEvents,
          setEmergencyEvents,
          fitnessSummary,
          setFitnessSummary,
          dndEnabled,
          setDndEnabled,
          queueCount,
          logs,
          deviceId,
          setDeviceId,
          handleOfflineEnqueue,
          handleSyncQueue,
          handleClearLogs,
          refreshSyncStats,
          updateProfileBaseline,
          logNutritionEntry,
          createEmergencyEvent,
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
