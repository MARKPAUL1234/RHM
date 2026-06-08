import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, StyleSheet, StatusBar, View, ActivityIndicator, Text, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from './src/navigation/AppNavigator';
import { HealthSyncManager, appwriteAccount } from './src/services/appwrite';
import { DARK_COLORS, LIGHT_COLORS, SHADOWS } from './src/styles/theme';
import { HealthContext } from './src/context/HealthContext';

// Splash Screen Component with pulse animation
function SplashScreen() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.12,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1.0,
          duration: 900,
          useNativeDriver: true,
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
      <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 40 }} />
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
  const [connectionStatus, setConnectionStatus] = useState('online'); // 'online' or 'offline'
  const [isAutomaticMode, setIsAutomaticMode] = useState(false); // Default to false for manual self-reporting focus
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode
  
  const toggleTheme = async (value) => {
    try {
      const nextMode = typeof value === 'boolean' ? value : !isDarkMode;
      setIsDarkMode(nextMode);
      await AsyncStorage.setItem('@rhmt_theme_mode', nextMode ? 'dark' : 'light');
    } catch (e) {
      console.log('Failed to save theme preference:', e);
    }
  };
  
  // Real-time journal reporting vitals state
  const [vitals, setVitals] = useState({
    heartRate: 72,
    spo2: 98,
    temperature: 36.6,
  });

  // Users Metadata Collection Schema (Medical baseline profile saved on cloud)
  const [usersMetadata, setUsersMetadata] = useState({
    user_id: 'usr_default',
    age: '24',
    weight: '70', // kg
    height: '175', // cm
    blood_group: 'O+',
    diagnosed_conditions: ['Malaria'], // e.g. Malaria, Typhoid, HIV, None
  });

  // Patient detailed metrics (for Monitoring modules)
  const [patientDetails, setPatientDetails] = useState({
    bloodPressure: '120/80',
    bloodGlucose: '95', // mg/dL
    respiratoryRate: 16, // breaths/min
  });

  // Nutrition baseline goals
  const [nutrition, setNutrition] = useState({
    calorieGoals: 2200,
    waterGoal: 3000,
  });

  // Fired collections feeds pulling from simulated Appwrite Cloud Collections
  const [alerts, setAlerts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  
  const [dndEnabled, setDndEnabled] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [logs, setLogs] = useState([]);
  
  // IoT node configuration identifier (retained)
  const [deviceId, setDeviceId] = useState('ESP32-RHM-NODE-001');

  // Check user auth session on load (Splash Screen Epoch)
  useEffect(() => {
    const verifySession = async () => {
      try {
        // Load saved theme preference
        const savedTheme = await AsyncStorage.getItem('@rhmt_theme_mode');
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === 'dark');
        }

        // 1. Attempt checking real Appwrite Auth
        const sessionUser = await appwriteAccount.get();
        setUser({
          email: sessionUser.email,
          name: sessionUser.name,
          id: sessionUser.$id,
        });
        await HealthSyncManager.logSystemAction('AUTH', `Active Appwrite session verified for ${sessionUser.name}`);
      } catch (err) {
        console.log("No active Appwrite Auth session found, checking local cache...");
        // 2. Fallback to local session storage cache for offline demo robustness
        const localSession = await AsyncStorage.getItem('@rhmt_user_session');
        if (localSession) {
          setUser(JSON.parse(localSession));
          await HealthSyncManager.logSystemAction('AUTH', 'Active local user session cached and verified offline.');
        } else {
          await HealthSyncManager.logSystemAction('AUTH', 'No active session. Redirecting to Gateway.');
        }
      } finally {
        // Hold splash screen for brief epoch to wow user with aesthetics
        setTimeout(() => {
          setIsSplashActive(false);
          setIsFetchingData(false);
        }, 1800);
      }
    };
    verifySession();
  }, []);

  // Web socket Realtime SDK hook simulation & real-time connection establishment
  useEffect(() => {
    if (!user) return;
    
    // Provision Real-time listener: client.subscribe
    // Since actual client endpoints are configured locally, wrap in try-catch to keep app responsive
    let unsubscribeAlerts;
    try {
      // Import Appwrite client instance statically
      const { client: appwriteClient } = require('./src/services/appwrite');
      if (appwriteClient) {
        unsubscribeAlerts = appwriteClient.subscribe(
          'databases.remote_health_db.collections.alerts.documents',
          response => {
            if (response.events.some(ev => ev.includes('.create'))) {
              const newAlert = response.payload;
              setAlerts(prev => [newAlert, ...prev]);
              HealthSyncManager.logSystemAction('REALTIME', `Real-time WebSocket Alert: ${newAlert.alert_message}`);
            }
          }
        );
      }
    } catch (realtimeErr) {
      console.warn("Appwrite Realtime WebSocket Subscription failed to initialize:", realtimeErr.message);
    }

    return () => {
      if (unsubscribeAlerts) {
        try {
          unsubscribeAlerts();
        } catch (e) {
          console.log("Error unsubscribing Realtime WebSocket:", e);
        }
      }
    };
  }, [user]);

  // Trigger telemetry fluctuation to simulate live MAX30100 & MLX90614 sensors (only if Automatic Mode is active)
  useEffect(() => {
    if (!isAutomaticMode) return;

    const interval = setInterval(async () => {
      const hrFluct = Math.random() > 0.7 ? (Math.random() > 0.5 ? 2 : -2) : 0;
      const spo2Fluct = Math.random() > 0.95 ? (Math.random() > 0.5 ? 1 : -1) : 0;
      const tempFluct = Math.random() > 0.8 ? (Math.random() > 0.5 ? 0.1 : -0.1) : 0;

      const nextHr = Math.min(Math.max(vitals.heartRate + hrFluct, 60), 105);
      const nextSpo2 = Math.min(Math.max(vitals.spo2 + spo2Fluct, 88), 100);
      const nextTemp = Math.min(Math.max(vitals.temperature + tempFluct, 35.5), 39.5);

      const nextVitals = {
        heartRate: parseFloat(nextHr.toFixed(0)),
        spo2: parseFloat(nextSpo2.toFixed(0)),
        temperature: parseFloat(nextTemp.toFixed(1)),
      };

      setVitals(nextVitals);

      const payload = {
        temperature: nextVitals.temperature,
        heartRate: nextVitals.heartRate,
        spo2: nextVitals.spo2,
        symptoms_array: ['Chronic Fatigue'],
        meds_taken: true,
        wellbeing_score: 4,
        timestamp: new Date().toISOString()
      };

      if (connectionStatus === 'online') {
        await HealthSyncManager.enqueueAction('vital', payload);
        await HealthSyncManager.syncNow(true);
      } else {
        await HealthSyncManager.enqueueAction('vital', payload);
      }
      refreshSyncStats();
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutomaticMode, vitals, connectionStatus]);

  // Pull queue metrics and logs periodically or when status changes
  const refreshSyncStats = async () => {
    const currentQueue = await HealthSyncManager.getQueue();
    const systemLogs = await HealthSyncManager.getSystemLogs();
    setQueueCount(currentQueue.length);
    setLogs(systemLogs);

    const recs = await HealthSyncManager.getRecommendations();
    setRecommendations(recs);
    const cloudAlerts = await HealthSyncManager.getAlerts();
    setAlerts(cloudAlerts);
  };

  // Mount baseline and pull sync parameters
  useEffect(() => {
    if (!user) return;
    const initializeProfile = async () => {
      setIsFetchingData(true);
      const meta = await HealthSyncManager.getUsersMetadata(user.id);
      setUsersMetadata(meta);
      await refreshSyncStats();
      setIsFetchingData(false);
    };
    initializeProfile();
    
    const statsInterval = setInterval(refreshSyncStats, 3000);
    return () => clearInterval(statsInterval);
  }, [user]);

  // When connection turns online, trigger auto sync of queue (BaaS offline flusher)
  useEffect(() => {
    if (connectionStatus === 'online') {
      triggerAutomaticSync();
    } else {
      HealthSyncManager.logSystemAction('CONN', 'Network disconnected. Running in offline fallback mode.');
    }
  }, [connectionStatus]);

  const triggerAutomaticSync = async () => {
    await HealthSyncManager.logSystemAction('CONN', 'Network connection established. Auto-sync initiated.');
    const result = await HealthSyncManager.syncNow(true);
    if (result.syncedCount > 0) {
      await refreshSyncStats();
    }
  };

  const handleOfflineEnqueue = async (type, payload) => {
    await HealthSyncManager.enqueueAction(type, payload);
    await refreshSyncStats();
  };

  const handleSyncQueue = async () => {
    const isOnline = connectionStatus === 'online';
    const result = await HealthSyncManager.syncNow(isOnline);
    await refreshSyncStats();
    return result;
  };

  const handleClearLogs = async () => {
    await HealthSyncManager.clearSystemLogs();
    await refreshSyncStats();
  };

  if (isSplashActive) {
    return <SplashScreen />;
  }

  const colors = isDarkMode ? DARK_COLORS : LIGHT_COLORS;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
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
          isDarkMode,
          toggleTheme,
        }}
      >
        <AppNavigator />
      </HealthContext.Provider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
