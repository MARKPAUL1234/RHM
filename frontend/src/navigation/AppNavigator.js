import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HealthContext } from '../context/HealthContext';
import { SHADOWS, TYPOGRAPHY, getResponsiveMetrics } from '../styles/theme';
import djangoApi, { setAuthToken } from '../services/django_api';
import HomeScreen from '../screens/HomeScreen';

const PATIENT_NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard Overview', icon: 'grid' },
  { key: 'log', label: 'Log Daily Vitals', icon: 'plus' },
  { key: 'insights', label: 'Medical & Lifestyle Insights', icon: 'spark' },
  { key: 'profile', label: 'Profile & History Ledger', icon: 'user' },
  { key: 'settings', label: 'Settings', icon: 'bell' },
];

const CLINICAL_NAV_ITEMS = [
  { key: 'dashboard', label: 'Clinical Overview', icon: 'grid' },
  { key: 'log', label: 'Patient Reviews', icon: 'plus' },
  { key: 'insights', label: 'Appointments & Alerts', icon: 'spark' },
  { key: 'profile', label: 'Patients & Reports', icon: 'user' },
  { key: 'settings', label: 'Settings', icon: 'bell' },
];

const CLINICAL_ROLES = ['clinician', 'doctor', 'caregiver', 'admin'];

const normalizeRole = (role) => String(role || 'patient').toLowerCase();
const isClinicalRole = (role) => CLINICAL_ROLES.includes(normalizeRole(role));
const getNavItemsForRole = (role) => (isClinicalRole(role) ? CLINICAL_NAV_ITEMS : PATIENT_NAV_ITEMS);
const getRoleLabel = (role) => {
  const normalized = normalizeRole(role);
  if (normalized === 'clinician' || normalized === 'doctor') return 'Doctor';
  if (normalized === 'admin') return 'Admin';
  if (normalized === 'caregiver') return 'Caregiver';
  return 'Patient';
};

const SYMPTOMS = ['Headaches', 'Palpitations', 'Nausea', 'Fatigue', 'Dizziness', 'Chest tightness'];

const EMPTY_LATEST_LOG = {
  id: 'empty',
  loggedAt: null,
  date: 'No records yet',
  temperature: null,
  spo2: null,
  pulse: null,
  symptoms: [],
  status: 'Awaiting log',
};

const safeNumber = (value, fallback) => {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getGreeting = (date = new Date()) => {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const getClockLabel = (date = new Date()) =>
  date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

const getDisplayName = (user, profile, metadata) =>
  profile?.display_name ||
  metadata?.display_name ||
  user?.name ||
  user?.username ||
  'Patient';

const getFirstName = (name) => {
  const cleanName = String(name || '').trim();
  if (!cleanName) return 'Patient';
  return cleanName.split(/\s+/)[0];
};

const getInitials = (name) => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return (parts[0] || 'P').slice(0, 2).toUpperCase();
};

const getTodayLabel = () =>
  new Date().toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const getIsoDate = (date = new Date()) => date.toISOString().slice(0, 10);

const isSameDay = (isoDate) => {
  if (!isoDate) return false;
  const candidate = new Date(isoDate);
  const today = new Date();
  return (
    candidate.getFullYear() === today.getFullYear() &&
    candidate.getMonth() === today.getMonth() &&
    candidate.getDate() === today.getDate()
  );
};

const createLogFromRecord = (record, index) => ({
  id: record.id || `record-${index}`,
  loggedAt: record.created_at || record.timestamp || null,
  date: record.created_at || record.timestamp
    ? new Date(record.created_at || record.timestamp).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : `Record ${index + 1}`,
  temperature: safeNumber(record.temperature, 36.8),
  spo2: safeNumber(record.spo2, 98),
  pulse: safeNumber(record.heart_rate || record.pulse, 74),
  symptoms: Array.isArray(record.symptoms_array) ? record.symptoms_array : [],
  status: getClinicalStatus(record.temperature, record.spo2, record.heart_rate || record.pulse),
});

const getClinicalStatus = (temperature, spo2, pulse) => {
  const temp = safeNumber(temperature, 0);
  const oxygen = safeNumber(spo2, 0);
  const heartRate = safeNumber(pulse, 0);
  if (temp >= 38 || oxygen < 92 || heartRate > 120 || heartRate < 45) return 'Urgent';
  if (temp >= 37.5 || oxygen < 95 || heartRate > 100) return 'Review';
  return 'Stable';
};

const getChartTop = (value, min, max) => {
  const normalized = (safeNumber(value, min) - min) / (max - min);
  return 128 - Math.min(Math.max(normalized, 0), 1) * 104;
};

const getChartLabel = (log) => {
  if (log.loggedAt) {
    return new Date(log.loggedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  return String(log.date).split(',')[0];
};

const average = (values, fallback = 0) => {
  const clean = values.map(Number).filter(Number.isFinite);
  if (clean.length === 0) return fallback;
  return clean.reduce((total, value) => total + value, 0) / clean.length;
};

const calculateDashboardStats = (logs) => {
  if (logs.length === 0) {
    return [
      { label: 'Avg Temp', value: '--', detail: 'No manual entries yet' },
      { label: 'Avg SpO2', value: '--', detail: 'No oxygen history yet' },
      { label: 'Avg Pulse', value: '--', detail: 'No pulse history yet' },
      { label: 'Stable Logs', value: '--', detail: 'Start with today\'s vitals' },
    ];
  }

  const source = logs;
  const stableCount = source.filter((log) => log.status === 'Stable').length;
  const symptomEntries = source.filter((log) => Array.isArray(log.symptoms) && log.symptoms.length > 0).length;
  return [
    {
      label: 'Avg Temp',
      value: `${average(source.map((log) => log.temperature), 36.8).toFixed(1)} C`,
      detail: 'Across visible entries',
    },
    {
      label: 'Avg SpO2',
      value: `${Math.round(average(source.map((log) => log.spo2), 98))}%`,
      detail: 'Oxygen trend quality',
    },
    {
      label: 'Avg Pulse',
      value: `${Math.round(average(source.map((log) => log.pulse), 74))} bpm`,
      detail: 'Manual resting pulse',
    },
    {
      label: 'Stable Logs',
      value: `${Math.round((stableCount / source.length) * 100)}%`,
      detail: `${symptomEntries} entries with symptoms`,
    },
  ];
};

const getTemperatureTone = (temperature) => {
  if (temperature === null || temperature === undefined) return '#94A3B8';
  if (temperature >= 38) return '#DC2626';
  if (temperature >= 37.5) return '#D97706';
  if (temperature < 35.8) return '#0284C7';
  return '#059669';
};

const formatVitalValue = (value, suffix, decimals = 0) => {
  const parsed = safeNumber(value, null);
  if (parsed === null) return '--';
  const display = decimals > 0 ? parsed.toFixed(decimals) : Math.round(parsed);
  return `${display}${suffix ? ` ${suffix}` : ''}`;
};

const buildNutritionPlan = (bloodGroup, latest, logs) => {
  const normalizedGroup = String(bloodGroup || '').toUpperCase();
  const temperature = safeNumber(latest.temperature, null);
  const spo2 = safeNumber(latest.spo2, null);
  const pulse = safeNumber(latest.pulse, null);
  const symptoms = latest.symptoms || [];
  const hasNausea = symptoms.some((item) => /nausea|stomach/i.test(item));
  const hasHeadache = symptoms.some((item) => /headache|dizziness/i.test(item));

  const planByGroup = normalizedGroup.startsWith('A')
    ? {
        recommended: ['Leafy greens', 'Oats or millet', 'Beans and lentils'],
        restrict: ['Heavy fried meals', 'Processed meats', 'Excess dairy'],
      }
    : normalizedGroup.startsWith('B')
      ? {
          recommended: ['Eggs or yoghurt', 'Green vegetables', 'Bananas or sweet potatoes'],
          restrict: ['Sugary drinks', 'Deep fried snacks', 'Late caffeine'],
        }
      : normalizedGroup.startsWith('AB')
        ? {
            recommended: ['Fish or beans', 'Vegetables', 'Warm fluids'],
            restrict: ['Excess salt', 'Large late meals', 'Highly processed foods'],
          }
        : {
            recommended: ['Lean fish or beans', 'Leafy greens', 'Hydrating fruits'],
            restrict: ['Excess sugar', 'Deep fried meals', 'High sodium snacks'],
          };

  const recommended = [...planByGroup.recommended];
  const restrict = [...planByGroup.restrict];

  if (temperature !== null && temperature >= 37.5) {
    recommended.unshift('Warm water and electrolytes');
    restrict.unshift('Alcohol and intense training');
  }

  if (spo2 !== null && spo2 < 95) {
    recommended.unshift('Small frequent meals');
    restrict.unshift('Smoke or dusty environments');
  }

  if (pulse !== null && pulse > 100) {
    recommended.unshift('Caffeine-free fluids');
    restrict.unshift('Energy drinks');
  }

  if (hasNausea) {
    recommended.unshift('Bland soft meals');
    restrict.unshift('Spicy foods');
  }

  if (hasHeadache) {
    recommended.unshift('Water plus light minerals');
  }

  if (logs.length === 0) {
    recommended.unshift('Log vitals before personalized meal guidance');
  }

  return {
    recommended: [...new Set(recommended)].slice(0, 5),
    restrict: [...new Set(restrict)].slice(0, 5),
  };
};

const buildFitnessTasks = (latest, logs) => {
  const temperature = safeNumber(latest.temperature, null);
  const spo2 = safeNumber(latest.spo2, null);
  const pulse = safeNumber(latest.pulse, null);
  const symptoms = latest.symptoms || [];
  const tasks = [];

  if (logs.length === 0) {
    return [
      'Log today\'s vitals before activity planning',
      'Complete a 2 minute symptom check',
      'Set water and sleep targets for today',
      'Review emergency contact details',
    ];
  }

  if ((spo2 !== null && spo2 < 92) || (temperature !== null && temperature >= 38.5)) {
    return [
      'Pause exercise and recheck vitals',
      'Rest in an upright comfortable position',
      'Notify a trusted contact if symptoms worsen',
      'Prepare a clinician follow-up note',
    ];
  }

  if (pulse !== null && pulse > 100) {
    tasks.push('Complete 5 minutes of guided breathing');
    tasks.push('Take a low-intensity walk only if symptoms are clear');
  } else {
    tasks.push('20 minute low-impact walk');
    tasks.push('10 minute mobility stretch');
  }

  if (temperature !== null && temperature >= 37.5) {
    tasks.push('Prioritize rest and hydration over exercise');
  } else {
    tasks.push('Track water intake before evening');
  }

  if (symptoms.length > 0) {
    tasks.push(`Review symptom pattern: ${symptoms.slice(0, 2).join(', ')}`);
  } else {
    tasks.push('Log an evening wellness score');
  }

  return [...new Set(tasks)].slice(0, 5);
};

const buildCareInsights = (latest, logs) => {
  const temperature = safeNumber(latest.temperature, null);
  const spo2 = safeNumber(latest.spo2, null);
  const pulse = safeNumber(latest.pulse, null);
  const symptomCount = latest.symptoms?.length || 0;

  if (logs.length === 0) {
    return [
      { label: 'Personalization', value: 'Waiting', detail: 'Save your first vitals log to unlock trend-based guidance.' },
      { label: 'Next action', value: 'Log vitals', detail: 'Temperature, SpO2, pulse, and symptoms are enough to begin.' },
      { label: 'History depth', value: '0 logs', detail: 'The dashboard becomes stronger with daily entries.' },
    ];
  }

  const risk =
    (spo2 !== null && spo2 < 92) || (temperature !== null && temperature >= 38.5)
      ? 'High'
      : (spo2 !== null && spo2 < 95) || (pulse !== null && pulse > 100) || symptomCount > 1
        ? 'Watch'
        : 'Stable';

  const nextAction =
    risk === 'High'
      ? 'Recheck now'
      : risk === 'Watch'
        ? 'Review tonight'
        : 'Maintain routine';

  return [
    { label: 'Care status', value: risk, detail: `${logs.length} manual log${logs.length === 1 ? '' : 's'} in view.` },
    { label: 'Next action', value: nextAction, detail: latest.date || 'Latest manual entry reviewed.' },
    { label: 'Symptom load', value: `${symptomCount}`, detail: symptomCount ? latest.symptoms.slice(0, 3).join(', ') : 'No active symptoms recorded.' },
  ];
};

const getRiskColor = (riskLevel) => {
  if (riskLevel === 'urgent') return '#DC2626';
  if (riskLevel === 'watch') return '#D97706';
  return '#047857';
};

const getProfileCompletion = (profile) => {
  const required = [
    ['age', 'Age'],
    ['weight', 'Weight'],
    ['height', 'Height'],
    ['blood_group', 'Blood group'],
    ['emergency_primary_contact', 'Emergency contact'],
  ];
  const missing = required
    .filter(([key]) => profile?.[key] === null || profile?.[key] === undefined || String(profile?.[key]).trim() === '')
    .map(([, label]) => label);

  return {
    complete: missing.length === 0,
    missing,
    percent: Math.round(((required.length - missing.length) / required.length) * 100),
  };
};

const formatDateTime = (value) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const IconGlyph = ({ name, active, size = 22 }) => {
  const lineColor = active ? '#047857' : '#4F6B8A';
  const softColor = active ? '#A7F3D0' : '#DDE6F0';
  const fillColor = active ? '#10B981' : '#94A3B8';
  const stroke = Math.max(2, Math.round(size / 10));

  if (name === 'plus') {
    return (
      <View style={[iconStyles.box, { width: size, height: size }]}>
        <View style={[iconStyles.medicalRing, { borderColor: softColor, width: size * 0.9, height: size * 0.9, borderRadius: size * 0.45 }]} />
        <View style={[iconStyles.medicalVLine, { backgroundColor: lineColor, width: stroke + 1, height: size * 0.58 }]} />
        <View style={[iconStyles.medicalHLine, { backgroundColor: lineColor, height: stroke + 1, width: size * 0.58 }]} />
      </View>
    );
  }

  if (name === 'spark') {
    return (
      <View style={[iconStyles.box, { width: size, height: size }]}>
        <View style={[iconStyles.heartBeatBase, { backgroundColor: softColor, height: stroke }]} />
        <View style={[iconStyles.heartBeatLeft, { backgroundColor: lineColor, height: stroke, width: size * 0.35 }]} />
        <View style={[iconStyles.heartBeatPeak, { backgroundColor: lineColor, width: stroke, height: size * 0.5 }]} />
        <View style={[iconStyles.heartBeatRight, { backgroundColor: lineColor, height: stroke, width: size * 0.37 }]} />
        <View style={[iconStyles.chartNode, { backgroundColor: fillColor, left: size * 0.08, top: size * 0.58 }]} />
        <View style={[iconStyles.chartNode, { backgroundColor: fillColor, right: size * 0.05, top: size * 0.24 }]} />
      </View>
    );
  }

  if (name === 'user') {
    return (
      <View style={[iconStyles.box, { width: size, height: size }]}>
        <View style={[iconStyles.idCard, { borderColor: softColor, width: size * 0.9, height: size * 0.76 }]} />
        <View style={[iconStyles.userHead, { borderColor: lineColor, borderWidth: stroke, width: size * 0.28, height: size * 0.28 }]} />
        <View style={[iconStyles.userBody, { borderColor: lineColor, borderWidth: stroke, width: size * 0.54, height: size * 0.28 }]} />
      </View>
    );
  }

  if (name === 'bell') {
    return (
      <View style={[iconStyles.box, { width: size, height: size }]}>
        <View style={[iconStyles.bellDome, { borderColor: lineColor, borderWidth: stroke, width: size * 0.62, height: size * 0.55 }]} />
        <View style={[iconStyles.bellCap, { backgroundColor: fillColor, width: size * 0.2, height: stroke }]} />
        <View style={[iconStyles.bellBase, { backgroundColor: lineColor, height: stroke + 1, width: size * 0.76 }]} />
        <View style={[iconStyles.bellClapper, { backgroundColor: fillColor, width: size * 0.2, height: size * 0.2, borderRadius: size * 0.1 }]} />
      </View>
    );
  }

  return (
    <View style={[iconStyles.dashboardGrid, { width: size, height: size }]}>
      {[0, 1, 2, 3].map((item) => (
        <View
          key={item}
          style={[
            iconStyles.dashboardTile,
            {
              backgroundColor: item === 0 || item === 3 ? lineColor : softColor,
              borderColor: item === 0 || item === 3 ? lineColor : '#CBD5E1',
            },
          ]}
        />
      ))}
    </View>
  );
};

function AppNavigator() {
  const {
    user,
    setUser,
    profile,
    vitals,
    setVitals,
    healthRecords,
    setHealthRecords,
    usersMetadata,
    setUsersMetadata,
    healthScores,
    healthSummary,
    medicationReminders,
    recommendations,
    alerts,
    appointmentRequests,
    careMessages,
    weeklyReport,
    patientOverview,
    isFetchingData,
    connectionStatus,
    setConnectionStatus,
    queueCount,
    handleSyncQueue,
    clearLocalCache,
    refreshError,
    lastRefreshAt,
    isDarkMode,
    toggleTheme,
    dndEnabled,
    setDndEnabled,
    notificationPreferences,
    updateNotificationPreference,
    handleOfflineEnqueue,
    updateProfileBaseline,
    refreshSyncStats,
    createMedicationReminder,
    markMedicationTaken,
    markMedicationMissed,
    exportWeeklyReport,
    reviewHealthRecord,
    markAlertRead,
    createAppointmentRequest,
    createCareMessage,
  } = useContext(HealthContext);
  const { width } = useWindowDimensions();
  const metrics = getResponsiveMetrics(width);
  const isDesktop = width >= 980;
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isBannerVisible, setIsBannerVisible] = useState(true);
  const [lastLoggedAt, setLastLoggedAt] = useState(null);

  const storedLogs = useMemo(() => {
    if (!Array.isArray(healthRecords) || healthRecords.length === 0) return [];
    return healthRecords.slice(0, 6).map(createLogFromRecord);
  }, [healthRecords]);

  const logs = storedLogs;
  const latest = logs[0] || EMPTY_LATEST_LOG;
  const latestDatabaseLogAt = storedLogs[0]?.loggedAt || lastLoggedAt;
  const hasLoggedToday = isSameDay(latestDatabaseLogAt);
  const patientName = getDisplayName(user, profile, usersMetadata);
  const patientFirstName = getFirstName(patientName);
  const patientInitials = getInitials(patientName);
  const patientRole = normalizeRole(usersMetadata?.role || profile?.role || user?.role || 'patient');
  const isClinicalUser = isClinicalRole(patientRole);
  const profileCompletion = getProfileCompletion(profile || usersMetadata);
  const navItems = useMemo(() => getNavItemsForRole(patientRole), [patientRole]);
  const s = styles(metrics, isDesktop);

  useEffect(() => {
    if (!navItems.some((item) => item.key === activeTab)) {
      setActiveTab(navItems[0]?.key || 'dashboard');
    }
  }, [activeTab, navItems]);

  const handleLogout = async () => {
    setAuthToken(null);
    await djangoApi.logout?.();
    setUser?.(null);
    await AsyncStorage.removeItem('@rhmt_user_session');
    await AsyncStorage.removeItem('@rhmt_auth_token');
    await AsyncStorage.removeItem('@rhmt_refresh_token');
  };

  if (!user) {
    return <HomeScreen />;
  }

  const saveManualLog = async (payload) => {
    try {
      const savedRecord = await handleOfflineEnqueue?.('vital', {
        temperature: payload.temperature,
        spo2: payload.spo2,
        heartRate: payload.pulse,
        symptoms_array: payload.symptoms,
        meds_taken: false,
        wellbeing_score: payload.symptoms.length > 0 ? 3 : 5,
      });
      const savedToDatabase = Boolean(savedRecord && !savedRecord.type);
      if (savedToDatabase) {
        setLastLoggedAt(new Date().toISOString());
        setVitals?.({
          temperature: savedRecord.temperature,
          spo2: savedRecord.spo2,
          heartRate: savedRecord.heart_rate,
        });
      }
      await refreshSyncStats?.();
      return {
        savedToDatabase,
        queued: Boolean(savedRecord?.type),
      };
    } catch (error) {
      return { savedToDatabase: false, error: error?.message || 'Unable to save manual log.' };
    }
  };

  const saveProfileBaseline = async (nextProfile) => {
    setUsersMetadata?.((current) => ({ ...current, ...nextProfile }));
    try {
      await updateProfileBaseline?.(nextProfile);
      await refreshSyncStats?.();
      return { savedToDatabase: true };
    } catch (error) {
      console.log('Profile baseline kept locally for offline mode:', error?.message);
      return { savedToDatabase: false };
    }
  };

  const contentProps = {
    latest: {
      ...latest,
      temperature: safeNumber(vitals?.temperature, latest.temperature),
      spo2: safeNumber(vitals?.spo2, latest.spo2),
      pulse: safeNumber(vitals?.heartRate, latest.pulse),
    },
    logs,
    onSaveManualLog: saveManualLog,
    profile: profile || usersMetadata,
    onUpdateProfile: saveProfileBaseline,
    patientName,
    patientFirstName,
    patientRole,
    healthScores: healthScores || [],
    healthSummary,
    profileCompletion,
    isFetchingData,
    connectionStatus,
    queueCount,
    refreshError,
    lastRefreshAt,
    medicationReminders: medicationReminders || [],
    recommendations: recommendations || [],
    alerts: alerts || [],
    appointmentRequests: appointmentRequests || [],
    careMessages: careMessages || [],
    weeklyReport,
    patientOverview: patientOverview || [],
    onCreateMedicationReminder: createMedicationReminder,
    onMarkMedicationTaken: markMedicationTaken,
    onMarkMedicationMissed: markMedicationMissed,
    onExportWeeklyReport: exportWeeklyReport,
    onReviewHealthRecord: reviewHealthRecord,
    onMarkAlertRead: markAlertRead,
    onCreateAppointmentRequest: createAppointmentRequest,
    onCreateCareMessage: createCareMessage,
    onRefresh: refreshSyncStats,
    isDarkMode,
    onToggleTheme: toggleTheme,
    dndEnabled,
    onToggleDnd: setDndEnabled,
    notificationPreferences: notificationPreferences || {},
    onUpdateNotificationPreference: updateNotificationPreference,
    onSetConnectionStatus: setConnectionStatus,
    onSyncQueue: handleSyncQueue,
    onClearLocalCache: clearLocalCache,
    onLogout: handleLogout,
  };

  return (
    <View style={s.app}>
      {isDesktop ? (
        <Sidebar
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          onLogout={handleLogout}
          patientName={patientName}
          patientInitials={patientInitials}
          patientRole={patientRole}
          navItems={navItems}
        />
      ) : null}

      <View style={s.workspace}>
        <TopBar
          hasLoggedToday={hasLoggedToday}
          activeTab={activeTab}
          navItems={navItems}
          isClinicalUser={isClinicalUser}
          onLogout={handleLogout}
          patientName={patientName}
          patientFirstName={patientFirstName}
          alerts={alerts || []}
          appointmentRequests={appointmentRequests || []}
          careMessages={careMessages || []}
          onMarkAlertRead={markAlertRead}
          connectionStatus={connectionStatus}
          refreshError={refreshError}
          dndEnabled={dndEnabled}
          notificationPreferences={notificationPreferences}
        />
        <ScrollView style={s.scroller} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {!isClinicalUser && !hasLoggedToday && isBannerVisible ? (
            <AlertBanner
              patientFirstName={patientFirstName}
              onDismiss={() => setIsBannerVisible(false)}
              onLogNow={() => {
                setActiveTab('log');
                setIsBannerVisible(false);
              }}
            />
          ) : null}
          {refreshError ? (
            <DataStatePanel
              tone="warning"
              title={connectionStatus === 'offline' ? 'Backend connection interrupted' : 'Refresh needs attention'}
              message={refreshError}
              actionLabel="Retry"
              onAction={refreshSyncStats}
            />
          ) : null}
          {!isClinicalUser && !profileCompletion.complete ? (
            <ProfileCompletionCard
              completion={profileCompletion}
              onOpenProfile={() => setActiveTab('profile')}
            />
          ) : null}
          {queueCount > 0 ? (
            <DataStatePanel
              title={`${queueCount} entr${queueCount === 1 ? 'y' : 'ies'} pending sync`}
              message="Queued vitals are waiting for Django and will appear in history only after the backend saves them."
              actionLabel="Sync"
              onAction={handleSyncQueue}
            />
          ) : null}
          {activeTab === 'dashboard' ? (
            isClinicalUser ? <ClinicalDashboardTab {...contentProps} /> : <DashboardTab {...contentProps} />
          ) : null}
          {activeTab === 'log' ? (
            isClinicalUser ? <ClinicalPatientsTab {...contentProps} /> : <LogVitalsTab {...contentProps} />
          ) : null}
          {activeTab === 'insights' ? (
            isClinicalUser ? <ClinicalInsightsTab {...contentProps} /> : <InsightsTab {...contentProps} />
          ) : null}
          {activeTab === 'profile' ? (
            isClinicalUser ? <ClinicalPatientsTab {...contentProps} /> : <ProfileHistoryTab {...contentProps} />
          ) : null}
          {activeTab === 'settings' ? <SettingsTab {...contentProps} /> : null}
        </ScrollView>
        {!isDesktop ? <MobileNav activeTab={activeTab} onChangeTab={setActiveTab} navItems={navItems} /> : null}
      </View>
    </View>
  );
}

function Sidebar({ activeTab, onChangeTab, onLogout, patientName, patientInitials, patientRole, navItems }) {
  return (
    <View style={layoutStyles.sidebar}>
      <View>
        <View style={layoutStyles.brandRow}>
          <View style={layoutStyles.brandMark}>
            <Text style={layoutStyles.brandText}>RH</Text>
            <View style={layoutStyles.pulseDot} />
          </View>
          <View>
            <Text style={layoutStyles.brandTitle}>RHMT</Text>
            <Text style={layoutStyles.brandSubtitle}>Manual health journal</Text>
          </View>
        </View>
      </View>

      <View style={layoutStyles.navStack}>
        {(navItems || PATIENT_NAV_ITEMS).map((item) => {
          const active = activeTab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.82}
              onPress={() => onChangeTab(item.key)}
              style={[layoutStyles.navButton, active && layoutStyles.activeNavButton]}
            >
              <View style={[layoutStyles.navIconBox, active && layoutStyles.activeNavIconBox]}>
                <IconGlyph name={item.icon} active={active} />
              </View>
              <Text style={[layoutStyles.navText, active && layoutStyles.activeNavText]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={layoutStyles.sidebarFooter}>
        <View style={layoutStyles.profileBadge}>
          <View style={layoutStyles.avatar}>
            <Text style={layoutStyles.avatarText}>{patientInitials}</Text>
          </View>
          <View style={layoutStyles.profileTextBlock}>
            <Text style={layoutStyles.profileName} numberOfLines={1}>
              {patientName}
            </Text>
            <Text style={layoutStyles.profileRole}>{getRoleLabel(patientRole)}</Text>
          </View>
        </View>
        <TouchableOpacity style={layoutStyles.logoutButton} activeOpacity={0.82} onPress={onLogout}>
          <Text style={layoutStyles.logoutButtonText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MobileNav({ activeTab, onChangeTab, navItems }) {
  return (
    <View style={layoutStyles.mobileNav}>
      <View style={layoutStyles.mobileBrand}>
        <Text style={layoutStyles.brandText}>RH</Text>
        <View style={layoutStyles.pulseDot} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={layoutStyles.mobileNavList}>
        {(navItems || PATIENT_NAV_ITEMS).map((item) => {
          const active = activeTab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[layoutStyles.mobileNavButton, active && layoutStyles.activeMobileNavButton]}
              onPress={() => onChangeTab(item.key)}
              activeOpacity={0.8}
            >
              <IconGlyph name={item.icon} active={active} size={19} />
              <Text style={[layoutStyles.mobileNavText, active && layoutStyles.activeNavText]} numberOfLines={1}>
                {item.label.replace(' & History Ledger', '').replace('Medical & Lifestyle ', '')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function TopBar({
  hasLoggedToday,
  activeTab,
  navItems,
  isClinicalUser,
  onLogout,
  patientName,
  patientFirstName,
  alerts,
  appointmentRequests,
  careMessages,
  onMarkAlertRead,
  connectionStatus,
  refreshError,
  dndEnabled,
  notificationPreferences,
}) {
  const title = (navItems || PATIENT_NAV_ITEMS).find((item) => item.key === activeTab)?.label || 'Daily Health Status';
  const [clockNow, setClockNow] = useState(new Date());
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { width } = useWindowDimensions();
  const notificationPanelWidth = Math.min(Math.max(width - 32, 300), 430);
  const greeting = getGreeting(clockNow);
  const clockLabel = getClockLabel(clockNow);
  const notificationItems = useMemo(() => {
    const dailyReminder = !isClinicalUser && !hasLoggedToday
      ? [{
          id: 'daily-log-reminder',
          type: 'Reminder',
          title: 'Daily vitals not logged',
          body: `${patientFirstName}, log temperature, SpO2, pulse, and symptoms to keep your health trend accurate.`,
          status: 'unread',
          severity: 'warning',
          createdAt: new Date().toISOString(),
        }]
      : [];

    const alertItems = (alerts || []).map((alert) => ({
      id: `alert-${alert.id}`,
      rawId: alert.id,
      type: 'Alert',
      title: `${String(alert.severity || 'info').toUpperCase()} alert`,
      body: alert.alert_message,
      status: alert.status || 'unread',
      severity: alert.severity || 'info',
      createdAt: alert.timestamp,
    }));

    const appointmentItems = (appointmentRequests || []).map((appointment) => ({
      id: `appointment-${appointment.id}`,
      type: 'Appointment',
      title: `${appointment.confirmation_code || 'Appointment'} - ${String(appointment.urgency || 'routine').toUpperCase()}`,
      body: `${appointment.reason || 'Care request'}${appointment.assigned_facility_name ? ` | ${appointment.assigned_facility_name}` : ''}`,
      status: appointment.status || 'requested',
      severity: ['urgent', 'emergency'].includes(String(appointment.urgency || '').toLowerCase()) ? 'critical' : 'info',
      createdAt: appointment.created_at,
    }));

    const messageItems = (careMessages || []).map((message) => ({
      id: `message-${message.id}`,
      type: 'Care Message',
      title: `${message.sender_username || 'Care team'} to ${message.recipient_username || 'Patient'}`,
      body: message.body,
      status: message.status || 'unread',
      severity: 'info',
      createdAt: message.created_at,
    }));

    const filteredAlerts = notificationPreferences?.criticalAlerts === false ? [] : alertItems;
    const filteredAppointments = notificationPreferences?.appointmentUpdates === false ? [] : appointmentItems;
    const filteredMessages = notificationPreferences?.doctorReplies === false ? [] : messageItems;
    const filteredReminders = notificationPreferences?.medicationReminders === false ? [] : dailyReminder;

    return [...filteredReminders, ...filteredAlerts, ...filteredAppointments, ...filteredMessages]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 12);
  }, [alerts, appointmentRequests, careMessages, hasLoggedToday, isClinicalUser, notificationPreferences, patientFirstName]);
  const unreadCount = dndEnabled ? 0 : notificationItems.filter((item) => item.status !== 'read' && item.status !== 'completed').length;
  const welcomeMessages = [
    isClinicalUser
      ? `${greeting}, ${patientName}. It is ${clockLabel}, and your clinical workspace is ready for patient reviews.`
      : `${greeting}, ${patientName}. It is ${clockLabel}, and I am watching today's vitals, trends, and care reminders with you.`,
    isClinicalUser
      ? `Use ${title.toLowerCase()} to review alerts, appointments, and patient risk status.`
      : hasLoggedToday
      ? `${patientFirstName}, your latest manual log is active. Review insights before your next entry.`
      : `${patientFirstName}, start with today's vitals so the dashboard can personalize your guidance for this ${greeting.toLowerCase().replace('good ', '')}.`,
    isClinicalUser
      ? `Clinical actions are separated from patient self-journaling for safer role-based use.`
      : `Use the journal consistently and I will turn your entries into safer daily decisions.`,
  ];

  useEffect(() => {
    const syncClock = () => setClockNow(new Date());
    syncClock();
    const interval = setInterval(syncClock, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={layoutStyles.topBar}>
      <View style={layoutStyles.topContext}>
        <Text style={layoutStyles.contextText}>
          {greeting}, {patientFirstName}
        </Text>
        <Text style={layoutStyles.clockText}>{clockLabel}</Text>
        <TypewriterText
          messages={welcomeMessages}
          style={layoutStyles.contextSubtext}
        />
      </View>
      <View style={layoutStyles.topActions}>
        <View style={[layoutStyles.connectionPill, connectionStatus === 'offline' && layoutStyles.offlinePill]}>
          <View style={[layoutStyles.connectionDot, connectionStatus === 'offline' && layoutStyles.offlineDot]} />
          <Text style={layoutStyles.connectionText}>{refreshError ? 'Needs retry' : connectionStatus}</Text>
        </View>
        <TouchableOpacity
          style={[layoutStyles.bellButton, isNotificationsOpen && layoutStyles.activeBellButton]}
          activeOpacity={0.75}
          onPress={() => setIsNotificationsOpen((current) => !current)}
        >
          <IconGlyph name="bell" active={false} size={21} />
          {unreadCount > 0 ? (
            <View style={layoutStyles.bellBadge}>
              <Text style={layoutStyles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
        {isNotificationsOpen ? (
          <NotificationPanel
            items={notificationItems}
            panelWidth={notificationPanelWidth}
            onClose={() => setIsNotificationsOpen(false)}
            onMarkAlertRead={onMarkAlertRead}
          />
        ) : null}
        <TouchableOpacity style={layoutStyles.topLogoutButton} activeOpacity={0.82} onPress={onLogout}>
          <Text style={layoutStyles.topLogoutText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function NotificationPanel({ items, panelWidth, onClose, onMarkAlertRead }) {
  return (
    <View style={[layoutStyles.notificationPanel, { width: panelWidth }]}>
      <View style={layoutStyles.notificationHeader}>
        <View>
          <Text style={layoutStyles.notificationPanelTitle}>Notifications</Text>
          <Text style={layoutStyles.notificationPanelSubtitle}>Alerts, appointments, messages, and reminders</Text>
        </View>
        <TouchableOpacity style={layoutStyles.notificationCloseButton} onPress={onClose}>
          <Text style={layoutStyles.notificationCloseText}>Close</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={layoutStyles.notificationList} showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <View style={layoutStyles.notificationEmpty}>
            <Text style={layoutStyles.notificationEmptyTitle}>No notifications</Text>
            <Text style={layoutStyles.notificationEmptyText}>New health alerts, messages, and appointments will appear here.</Text>
          </View>
        ) : (
          items.map((item) => (
            <View key={item.id} style={layoutStyles.notificationCard}>
              <View style={[layoutStyles.notificationSeverityDot, item.severity === 'critical' && layoutStyles.criticalDot, item.severity === 'warning' && layoutStyles.warningDot]} />
              <View style={layoutStyles.notificationCardBody}>
                <Text style={layoutStyles.notificationType}>{item.type}</Text>
                <Text style={layoutStyles.notificationCardTitle}>{item.title}</Text>
                <Text style={layoutStyles.notificationCardText}>{item.body}</Text>
                <Text style={layoutStyles.notificationStatus}>{String(item.status || 'unread').replace('_', ' ')}</Text>
              </View>
              {item.type === 'Alert' && item.status !== 'read' ? (
                <TouchableOpacity style={layoutStyles.notificationReadButton} onPress={() => onMarkAlertRead?.(item.rawId)}>
                  <Text style={layoutStyles.notificationReadText}>Read</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function TypewriterText({ text, messages, style }) {
  const [visibleText, setVisibleText] = useState('');
  const [messageIndex, setMessageIndex] = useState(0);
  const [isCursorVisible, setIsCursorVisible] = useState(true);
  const sourceMessages = messages?.length ? messages : [text || ''];
  const activeMessage = sourceMessages[messageIndex % sourceMessages.length];

  useEffect(() => {
    setVisibleText('');
    let index = 0;
    let pauseTimer;
    const interval = setInterval(() => {
      index += 1;
      setVisibleText(activeMessage.slice(0, index));
      if (index >= activeMessage.length) {
        clearInterval(interval);
        pauseTimer = setTimeout(() => {
          setMessageIndex((current) => (current + 1) % sourceMessages.length);
        }, 2200);
      }
    }, 34);

    return () => {
      clearInterval(interval);
      clearTimeout(pauseTimer);
    };
  }, [activeMessage, sourceMessages.length]);

  useEffect(() => {
    const cursorTimer = setInterval(() => {
      setIsCursorVisible((current) => !current);
    }, 480);

    return () => clearInterval(cursorTimer);
  }, []);

  return (
    <Text style={style}>
      {visibleText}
      <Text style={[layoutStyles.typeCursor, !isCursorVisible && layoutStyles.typeCursorHidden]}> |</Text>
    </Text>
  );
}

function AlertBanner({ patientFirstName, onDismiss, onLogNow }) {
  return (
    <View style={layoutStyles.alertBanner}>
      <Text style={layoutStyles.alertText}>
        ⚠️ Hi {patientFirstName}, you haven't logged your health vitals for today yet. Take 45 seconds to keep your health trends
        accurate!
      </Text>
      <View style={layoutStyles.alertActions}>
        <TouchableOpacity style={layoutStyles.alertButton} onPress={onLogNow} activeOpacity={0.85}>
          <Text style={layoutStyles.alertButtonText}>Log Now</Text>
        </TouchableOpacity>
        <TouchableOpacity style={layoutStyles.dismissButton} onPress={onDismiss} activeOpacity={0.75}>
          <Text style={layoutStyles.dismissText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DataStatePanel({ tone = 'info', title, message, actionLabel, onAction, loading }) {
  return (
    <View style={[layoutStyles.statePanel, tone === 'warning' && layoutStyles.warningStatePanel]}>
      <View style={layoutStyles.stateBody}>
        <Text style={layoutStyles.stateTitle}>{title}</Text>
        <Text style={layoutStyles.stateText}>{message}</Text>
      </View>
      {actionLabel ? (
        <TouchableOpacity style={layoutStyles.stateButton} onPress={onAction} disabled={loading} activeOpacity={0.84}>
          {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={layoutStyles.stateButtonText}>{actionLabel}</Text>}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function ProfileCompletionCard({ completion, onOpenProfile }) {
  return (
    <View style={layoutStyles.completionCard}>
      <View style={layoutStyles.completionHeader}>
        <View>
          <Text style={layoutStyles.completionTitle}>Complete patient profile</Text>
          <Text style={layoutStyles.completionText}>
            {completion.missing.length} required item{completion.missing.length === 1 ? '' : 's'} left: {completion.missing.join(', ')}
          </Text>
        </View>
        <Text style={layoutStyles.completionPercent}>{completion.percent}%</Text>
      </View>
      <View style={layoutStyles.completionTrack}>
        <View style={[layoutStyles.completionFill, { width: `${completion.percent}%` }]} />
      </View>
      <TouchableOpacity style={layoutStyles.completionButton} onPress={onOpenProfile} activeOpacity={0.84}>
        <Text style={layoutStyles.completionButtonText}>Update Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

function DashboardTab({ latest, logs, healthSummary, healthScores, isFetchingData, onRefresh }) {
  const symptoms = latest.symptoms?.length ? latest.symptoms.join(', ') : 'No active symptoms';
  const statistics = calculateDashboardStats(logs);
  const temperature = safeNumber(latest.temperature, null);
  const spo2 = safeNumber(latest.spo2, null);
  const pulse = safeNumber(latest.pulse, null);
  const hasVitals = temperature !== null || spo2 !== null || pulse !== null;
  const cards = [
    {
      label: 'Health Score',
      value: healthSummary ? `${healthSummary.score}/100` : '--',
      helper: healthSummary ? `${String(healthSummary.risk_level || 'stable').toUpperCase()} risk level` : 'Log vitals to activate scoring',
      color: getRiskColor(healthSummary?.risk_level),
    },
    {
      label: 'Body Temp',
      value: formatVitalValue(temperature, 'C', 1),
      helper: temperature === null ? 'Awaiting manual entry' : temperature >= 37.5 ? 'Elevated range' : 'Normal thermal range',
      color: getTemperatureTone(temperature),
    },
    {
      label: 'Blood Oxygen',
      value: formatVitalValue(spo2, '%'),
      helper: spo2 === null ? 'Awaiting manual entry' : spo2 < 95 ? 'Needs attention' : 'Healthy oxygenation',
      color: spo2 === null ? '#94A3B8' : spo2 < 95 ? '#DC2626' : '#059669',
    },
    {
      label: 'Pulse Rate',
      value: formatVitalValue(pulse, 'bpm'),
      helper: pulse === null ? 'Awaiting manual entry' : pulse > 100 ? 'Above resting target' : 'Resting rhythm stable',
      color: pulse === null ? '#94A3B8' : pulse > 100 ? '#D97706' : '#2563EB',
    },
    {
      label: 'Symptoms',
      value: symptoms,
      helper: hasVitals ? (latest.status === 'Stable' ? 'Self-report is clear' : 'Track closely today') : 'Awaiting symptom check',
      color: !hasVitals ? '#94A3B8' : latest.status === 'Urgent' ? '#DC2626' : latest.status === 'Review' ? '#D97706' : '#059669',
    },
  ];

  return (
    <View>
      <SectionHeader title="Daily Health Status" subtitle="Latest self-entered vitals, trend context, and symptom state." />
      {isFetchingData ? (
        <DataStatePanel title="Loading health records" message="Pulling current vitals, scores, alerts, and care guidance from Django." loading />
      ) : null}
      {!isFetchingData && logs.length === 0 ? (
        <DataStatePanel
          title="No vitals recorded yet"
          message="Your dashboard will stay empty until you save a real manual vitals entry to the backend."
          actionLabel="Refresh"
          onAction={onRefresh}
        />
      ) : null}
      <View style={dashboardStyles.cardGrid}>
        {cards.map((card) => (
          <View key={card.label} style={dashboardStyles.summaryCard}>
            <View style={[dashboardStyles.statusDot, { backgroundColor: card.color }]} />
            <Text style={dashboardStyles.cardLabel}>{card.label}</Text>
            <Text style={dashboardStyles.cardValue} numberOfLines={card.label === 'Symptoms' ? 2 : 1}>
              {card.value}
            </Text>
            <Text style={dashboardStyles.cardHelper}>{card.helper}</Text>
          </View>
        ))}
      </View>
      <View style={dashboardStyles.statisticsGrid}>
        {statistics.map((stat) => (
          <View key={stat.label} style={dashboardStyles.statisticCard}>
            <Text style={dashboardStyles.statLabel}>{stat.label}</Text>
            <Text style={dashboardStyles.statValue}>{stat.value}</Text>
            <Text style={dashboardStyles.statDetail}>{stat.detail}</Text>
          </View>
        ))}
      </View>
      {healthSummary ? (
        <View style={dashboardStyles.riskPanel}>
          <View style={dashboardStyles.riskHeader}>
            <Text style={dashboardStyles.riskTitle}>Risk Engine</Text>
            <Text style={[dashboardStyles.riskBadge, { color: getRiskColor(healthSummary.risk_level) }]}>
              {String(healthSummary.risk_level || 'stable').toUpperCase()}
            </Text>
          </View>
          <View style={dashboardStyles.riskColumns}>
            <View style={dashboardStyles.riskColumn}>
              <Text style={dashboardStyles.riskColumnTitle}>Reasons</Text>
              {(healthSummary.reasons || []).slice(0, 3).map((reason) => (
                <Text key={reason} style={dashboardStyles.riskText}>- {reason}</Text>
              ))}
            </View>
            <View style={dashboardStyles.riskColumn}>
              <Text style={dashboardStyles.riskColumnTitle}>Next Actions</Text>
              {(healthSummary.next_actions || []).slice(0, 3).map((action) => (
                <Text key={action} style={dashboardStyles.riskText}>- {action}</Text>
              ))}
            </View>
          </View>
        </View>
      ) : null}
      <View style={dashboardStyles.chartBlock}>
        <View style={dashboardStyles.chartHeader}>
          <View>
            <Text style={dashboardStyles.chartTitle}>Vitals History Trend</Text>
            <Text style={dashboardStyles.chartSubtitle}>Last self-reported entries</Text>
          </View>
          <Text style={dashboardStyles.chartPill}>7 day view</Text>
        </View>
        <VitalsTrendChart logs={logs} />
        <View style={dashboardStyles.chartFooter}>
          {logs.slice(0, 4).map((log) => (
            <Text key={log.id} style={dashboardStyles.chartFootnote}>
              {log.date}: {log.status}
            </Text>
          ))}
        </View>
      </View>
      <View style={dashboardStyles.chartBlock}>
        <View style={dashboardStyles.chartHeader}>
          <View>
            <Text style={dashboardStyles.chartTitle}>Health Score Trend</Text>
            <Text style={dashboardStyles.chartSubtitle}>Backend-generated score snapshots</Text>
          </View>
          <Text style={dashboardStyles.chartPill}>7 scores</Text>
        </View>
        <HealthScoreTrendChart scores={healthScores || []} />
      </View>
    </View>
  );
}

function VitalsTrendChart({ logs }) {
  const chartLogs = logs.slice(0, 7).reverse();

  if (chartLogs.length === 0) {
    return (
      <View>
        <View style={dashboardStyles.chartCanvas}>
          <View style={dashboardStyles.chartEmptyState}>
            <Text style={dashboardStyles.chartEmptyTitle}>No trend data yet</Text>
            <Text style={dashboardStyles.chartEmptyText}>
              Save daily vitals and this chart will build a changing 7-day view from your own history.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View>
      <View style={dashboardStyles.chartLegend}>
        <View style={dashboardStyles.legendItem}>
          <View style={[dashboardStyles.legendDot, { backgroundColor: '#047857' }]} />
          <Text style={dashboardStyles.legendText}>Pulse trend</Text>
        </View>
        <View style={dashboardStyles.legendItem}>
          <View style={[dashboardStyles.legendDot, { backgroundColor: '#2563EB' }]} />
          <Text style={dashboardStyles.legendText}>SpO2</Text>
        </View>
        <View style={dashboardStyles.legendItem}>
          <View style={[dashboardStyles.legendDot, { backgroundColor: '#D97706' }]} />
          <Text style={dashboardStyles.legendText}>Temperature</Text>
        </View>
      </View>
      <View style={dashboardStyles.chartCanvas}>
        {chartLogs.map((log, index) => {
          const pulseTop = getChartTop(log.pulse, 45, 125);
          const oxygenHeight = Math.max(16, (safeNumber(log.spo2, 95) - 88) * 5);
          const tempHeight = Math.max(16, (safeNumber(log.temperature, 36.6) - 35) * 26);
          return (
            <View key={log.id || index} style={dashboardStyles.chartColumn}>
              <View style={dashboardStyles.chartPlot}>
                <View style={[dashboardStyles.chartPoint, { top: pulseTop }]} />
                {index < chartLogs.length - 1 ? (
                  <View
                    style={[
                      dashboardStyles.chartSegment,
                      { top: pulseTop + 5, transform: [{ rotate: chartLogs[index + 1].pulse > log.pulse ? '-12deg' : '12deg' }] },
                    ]}
                  />
                ) : null}
                <View style={dashboardStyles.barPair}>
                  <View style={[dashboardStyles.oxygenBar, { height: oxygenHeight }]} />
                  <View style={[dashboardStyles.tempBar, { height: tempHeight, backgroundColor: getTemperatureTone(log.temperature) }]} />
                </View>
              </View>
              <Text style={dashboardStyles.chartAxisLabel} numberOfLines={1}>
                {getChartLabel(log)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function HealthScoreTrendChart({ scores }) {
  const chartScores = (scores || []).slice(0, 7).reverse();

  if (chartScores.length === 0) {
    return (
      <View style={dashboardStyles.chartCanvas}>
        <View style={dashboardStyles.chartEmptyState}>
          <Text style={dashboardStyles.chartEmptyTitle}>No score snapshots yet</Text>
          <Text style={dashboardStyles.chartEmptyText}>Save vitals to let the backend generate health score history.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={dashboardStyles.scoreChartCanvas}>
      {chartScores.map((score) => {
        const value = safeNumber(score.score, 0);
        const height = Math.max(18, Math.min(118, value * 1.18));
        return (
          <View key={score.id || score.created_at} style={dashboardStyles.scoreColumn}>
            <Text style={dashboardStyles.scoreChartValue}>{value}</Text>
            <View style={[dashboardStyles.scoreBar, { height, backgroundColor: getRiskColor(score.risk_level) }]} />
            <Text style={dashboardStyles.chartAxisLabel} numberOfLines={1}>
              {formatDateTime(score.created_at).split(',')[0]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function AnimatedCount({ value }) {
  const target = safeNumber(value, 0);
  const [displayValue, setDisplayValue] = useState(target);

  useEffect(() => {
    const start = displayValue;
    const delta = target - start;
    if (delta === 0) return undefined;

    const steps = 12;
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(start + delta * eased));
      if (step >= steps) {
        clearInterval(timer);
        setDisplayValue(target);
      }
    }, 40);

    return () => clearInterval(timer);
  }, [target]);

  return <Text style={dashboardStyles.statValue}>{displayValue}</Text>;
}

function ClinicalStatCard({ stat }) {
  return (
    <View style={[dashboardStyles.statisticCard, dashboardStyles.clinicalStatisticCard]}>
      <View style={[dashboardStyles.clinicalStatRail, { backgroundColor: stat.color }]} />
      <Text style={dashboardStyles.statLabel}>{stat.label}</Text>
      <AnimatedCount value={stat.value} />
      <Text style={dashboardStyles.statDetail}>{stat.detail}</Text>
    </View>
  );
}

function LogVitalsTab({ latest, onSaveManualLog }) {
  const [temperature, setTemperature] = useState(latest.temperature || 36.8);
  const [spo2, setSpo2] = useState(String(latest.spo2 || 98));
  const [pulse, setPulse] = useState(String(latest.pulse || 74));
  const [selectedSymptoms, setSelectedSymptoms] = useState(latest.symptoms || []);
  const [savedMessage, setSavedMessage] = useState('');
  const [validationMessage, setValidationMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const oxygen = safeNumber(spo2, 0);
  const pulseRate = safeNumber(pulse, 0);
  const validationIssues = [
    oxygen < 50 || oxygen > 100 ? 'SpO2 must be between 50% and 100%.' : null,
    pulseRate < 30 || pulseRate > 220 ? 'Pulse must be between 30 and 220 bpm.' : null,
    temperature < 34 || temperature > 42 ? 'Temperature must be between 34 C and 42 C.' : null,
  ].filter(Boolean);

  const toggleSymptom = (symptom) => {
    setSelectedSymptoms((current) =>
      current.includes(symptom) ? current.filter((item) => item !== symptom) : [...current, symptom]
    );
  };

  const handleSubmit = async () => {
    if (validationIssues.length > 0) {
      setValidationMessage(validationIssues.join(' '));
      setSavedMessage('');
      return;
    }
    setValidationMessage('');
    setIsSaving(true);
    try {
      const result = await onSaveManualLog({
        temperature,
        spo2: oxygen,
        pulse: pulseRate,
        symptoms: selectedSymptoms,
      });
      if (result?.error) {
        setSavedMessage('');
        setValidationMessage(result.error);
      } else {
        setSavedMessage(
          result?.savedToDatabase
            ? 'Daily log saved to the database. Diagnostics rules executed against your manual entry.'
            : 'Daily log queued for sync. It will not appear in history until the backend saves it.'
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View>
      <SectionHeader title="Log Daily Vitals" subtitle="Fast manual entry designed to reduce data-entry fatigue." />
      <View style={formStyles.recordGuide}>
        {[
          'Body temperature',
          'Oxygen saturation',
          'Pulse rate',
          'Symptoms',
          'Medicine status',
          'Wellbeing score',
        ].map((item) => (
          <View key={item} style={formStyles.recordGuideItem}>
            <Text style={formStyles.recordGuideIcon}>+</Text>
            <Text style={formStyles.recordGuideText}>{item}</Text>
          </View>
        ))}
      </View>
      <View style={formStyles.formCard}>
        <View style={formStyles.formSection}>
          <View style={formStyles.formLabelRow}>
            <Text style={formStyles.formLabel}>Body Temperature</Text>
            <Text style={[formStyles.temperatureValue, { color: getTemperatureTone(temperature) }]}>
              {temperature.toFixed(1)} C
            </Text>
          </View>
          <TemperatureSlider value={temperature} onChange={setTemperature} />
        </View>

        <View style={formStyles.numericGrid}>
          <NumericVital
            label="SpO2"
            suffix="%"
            value={spo2}
            onChangeText={setSpo2}
            helper={oxygen > 100 ? 'SpO2 cannot be above 100%' : oxygen < 95 ? 'Below preferred safe range' : 'Target range: 95-100%'}
            alert={oxygen < 95 || oxygen > 100}
          />
          <NumericVital
            label="Pulse Rate"
            suffix="bpm"
            value={pulse}
            onChangeText={setPulse}
            helper={pulseRate > 220 ? 'Pulse value is above supported range' : pulseRate > 100 ? 'High resting pulse detected' : 'Target resting range: 60-100 bpm'}
            alert={pulseRate > 100 || pulseRate < 30 || pulseRate > 220}
          />
        </View>

        <View style={formStyles.formSection}>
          <Text style={formStyles.formLabel}>Symptoms</Text>
          <View style={formStyles.symptomGrid}>
            {SYMPTOMS.map((symptom) => {
              const active = selectedSymptoms.includes(symptom);
              return (
                <TouchableOpacity
                  key={symptom}
                  style={[formStyles.symptomPill, active && formStyles.activeSymptomPill]}
                  activeOpacity={0.82}
                  onPress={() => toggleSymptom(symptom)}
                >
                  <Text style={[formStyles.symptomText, active && formStyles.activeSymptomText]}>{symptom}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity style={[formStyles.submitButton, isSaving && formStyles.disabledSubmitButton]} activeOpacity={0.86} onPress={handleSubmit} disabled={isSaving}>
          <Text style={formStyles.submitButtonText}>{isSaving ? 'Saving...' : 'Securely Save Log & Execute Diagnostics'}</Text>
        </TouchableOpacity>
        {validationMessage ? <Text style={formStyles.validationText}>{validationMessage}</Text> : null}
        {savedMessage ? <Text style={formStyles.savedText}>{savedMessage}</Text> : null}
      </View>
    </View>
  );
}

function TemperatureSlider({ value, onChange }) {
  const trackWidthRef = useRef(1);
  const min = 35;
  const max = 40;
  const percent = ((value - min) / (max - min)) * 100;
  const updateValue = (x) => {
    const width = trackWidthRef.current || 1;
    const clamped = Math.min(Math.max(x, 0), width);
    const next = min + (clamped / width) * (max - min);
    onChange(Math.round(next * 10) / 10);
  };
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => updateValue(event.nativeEvent.locationX),
      onPanResponderMove: (event) => updateValue(event.nativeEvent.locationX),
    })
  ).current;

  return (
    <View style={formStyles.sliderWrap}>
      <View
        style={formStyles.sliderTrack}
        onLayout={(event) => {
          trackWidthRef.current = event.nativeEvent.layout.width || 1;
        }}
        {...responder.panHandlers}
      >
        <View style={[formStyles.sliderFill, { width: `${percent}%`, backgroundColor: getTemperatureTone(value) }]} />
        <View style={[formStyles.sliderThumb, { left: `${percent}%`, borderColor: getTemperatureTone(value) }]} />
      </View>
      <View style={formStyles.sliderLabels}>
        <Text style={formStyles.sliderLabel}>35 C</Text>
        <Text style={formStyles.sliderLabel}>37 C</Text>
        <Text style={formStyles.sliderLabel}>40 C</Text>
      </View>
    </View>
  );
}

function NumericVital({ label, suffix, value, onChangeText, helper, alert }) {
  return (
    <View style={[formStyles.numericBlock, alert && formStyles.numericBlockAlert]}>
      <Text style={formStyles.numericLabel}>{label}</Text>
      <View style={formStyles.numericInputRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
          style={formStyles.numericInput}
          placeholder="0"
          placeholderTextColor="#94A3B8"
        />
        <Text style={formStyles.numericSuffix}>{suffix}</Text>
      </View>
      <Text style={[formStyles.microText, alert && formStyles.microTextAlert]}>{helper}</Text>
    </View>
  );
}

function InsightsTab({
  latest,
  logs,
  profile,
  patientFirstName,
  medicationReminders,
  recommendations,
  alerts,
  appointmentRequests,
  careMessages,
  onCreateMedicationReminder,
  onMarkMedicationTaken,
  onMarkMedicationMissed,
  onMarkAlertRead,
  onCreateAppointmentRequest,
  onCreateCareMessage,
}) {
  const bloodGroup = profile?.blood_group || 'Not set';
  const nutritionPlan = useMemo(() => buildNutritionPlan(bloodGroup, latest, logs), [bloodGroup, latest, logs]);
  const fitnessTasks = useMemo(() => buildFitnessTasks(latest, logs), [latest, logs]);
  const careInsights = useMemo(() => buildCareInsights(latest, logs), [latest, logs]);
  const [checkedTasks, setCheckedTasks] = useState([]);
  const [medicineName, setMedicineName] = useState('');
  const [medicineTime, setMedicineTime] = useState('08:00');
  const [medicineDose, setMedicineDose] = useState('');
  const [medicineMessage, setMedicineMessage] = useState('');
  const [appointmentMessage, setAppointmentMessage] = useState('');
  const [patientLocation, setPatientLocation] = useState(profile?.patient_location || '');
  const [appointmentReason, setAppointmentReason] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [careUpdate, setCareUpdate] = useState('');
  const [careMessageState, setCareMessageState] = useState('');
  const temperature = safeNumber(latest.temperature, null);
  const spo2 = safeNumber(latest.spo2, null);
  const pulse = safeNumber(latest.pulse, null);
  const urgent =
    (temperature !== null && temperature >= 38) ||
    (spo2 !== null && spo2 < 92) ||
    (pulse !== null && (pulse > 120 || pulse < 45));
  const selectedAppointment = useMemo(() => {
    const requests = appointmentRequests || [];
    return requests.find((appointment) => appointment.id === selectedAppointmentId) || requests[0] || null;
  }, [appointmentRequests, selectedAppointmentId]);
  const appointmentMessages = useMemo(() => {
    if (!selectedAppointment) return [];
    return (careMessages || []).filter((message) => message.appointment === selectedAppointment.id);
  }, [careMessages, selectedAppointment]);

  useEffect(() => {
    setCheckedTasks((current) => current.filter((task) => fitnessTasks.includes(task)));
  }, [fitnessTasks]);

  const toggleTask = (task) => {
    setCheckedTasks((current) => (current.includes(task) ? current.filter((item) => item !== task) : [...current, task]));
  };

  const handleAddMedicine = async () => {
    if (!medicineName.trim()) {
      setMedicineMessage('Enter a medicine name first.');
      return;
    }
    try {
      await onCreateMedicationReminder?.({
        medicine_name: medicineName.trim(),
        dosage: medicineDose.trim(),
        scheduled_time: medicineTime,
        frequency: 'Daily',
        status: 'active',
      });
      setMedicineName('');
      setMedicineDose('');
      setMedicineMessage('Medication reminder saved.');
    } catch (error) {
      setMedicineMessage(error?.message || 'Unable to save medication reminder.');
    }
  };

  const handleBookUrgentAppointment = async () => {
    try {
      const appointment = await onCreateAppointmentRequest?.({
        reason: 'Urgent manual vitals alert: patient should be reviewed after red-range reading.',
        urgency: urgent ? 'urgent' : 'soon',
        patient_location: patientLocation.trim(),
        preferred_date: getIsoDate(),
        preferred_time: '09:00',
      });
      setAppointmentMessage(
        appointment?.confirmation_code
          ? `Appointment saved: ${appointment.confirmation_code}. Assigned to ${appointment.assigned_facility_name || 'nearest available facility'}.`
          : 'Appointment request saved.'
      );
    } catch (error) {
      setAppointmentMessage(error?.message || 'Unable to book appointment request.');
    }
  };

  const handleCreateRoutineAppointment = async () => {
    if (!appointmentReason.trim()) {
      setAppointmentMessage('Enter a reason for the appointment request.');
      return;
    }
    try {
      const appointment = await onCreateAppointmentRequest?.({
        reason: appointmentReason.trim(),
        urgency: urgent ? 'urgent' : 'routine',
        patient_location: patientLocation.trim(),
        preferred_date: getIsoDate(),
        preferred_time: '09:00',
      });
      setAppointmentReason('');
      setSelectedAppointmentId(appointment?.id || null);
      setAppointmentMessage(
        appointment?.confirmation_code
          ? `Appointment saved: ${appointment.confirmation_code}.`
          : 'Appointment request saved.'
      );
    } catch (error) {
      setAppointmentMessage(error?.message || 'Unable to create appointment request.');
    }
  };

  const handleSendCareUpdate = async () => {
    if (!careUpdate.trim()) {
      setCareMessageState('Write a short update first.');
      return;
    }
    const appointment = selectedAppointment;
    if (!appointment) {
      setCareMessageState('Create an appointment request before sending a care update.');
      return;
    }
    try {
      await onCreateCareMessage?.({
        appointment: appointment?.id,
        body: careUpdate.trim(),
      });
      setCareUpdate('');
      setCareMessageState('Update sent to the care team.');
    } catch (error) {
      setCareMessageState(error?.message || 'Unable to send update.');
    }
  };

  return (
    <View>
      <SectionHeader title="Medical & Lifestyle Insights" subtitle={`Actionable guidance generated from ${patientFirstName}'s manual records.`} />
      <View style={insightStyles.insightMetricGrid}>
        {careInsights.map((insight) => (
          <View key={insight.label} style={insightStyles.insightMetricCard}>
            <Text style={insightStyles.metricLabel}>{insight.label}</Text>
            <Text style={insightStyles.metricValue}>{insight.value}</Text>
            <Text style={insightStyles.metricDetail}>{insight.detail}</Text>
          </View>
        ))}
      </View>
      {urgent ? (
        <View style={insightStyles.warningBanner}>
          <Text style={insightStyles.warningTitle}>Red alert: seek medical help now</Text>
          <Text style={insightStyles.warningText}>
            One or more readings crossed a safe medical range. Recheck the manual entry, avoid physical strain, and seek
            immediate clinical help if symptoms persist or worsen.
          </Text>
          <View style={insightStyles.warningActions}>
            <TextInput
              style={insightStyles.locationInput}
              placeholder="Enter your area, town, or nearby landmark"
              placeholderTextColor="#7F1D1D"
              value={patientLocation}
              onChangeText={setPatientLocation}
            />
            <TouchableOpacity style={insightStyles.warningPrimaryButton} activeOpacity={0.85} onPress={handleBookUrgentAppointment}>
              <Text style={insightStyles.warningPrimaryText}>Book Urgent Appointment</Text>
            </TouchableOpacity>
            <Text style={insightStyles.warningHelpText}>If breathing, chest pain, fainting, or confusion occurs, use emergency care immediately.</Text>
          </View>
          {appointmentMessage ? <Text style={insightStyles.appointmentMessage}>{appointmentMessage}</Text> : null}
        </View>
      ) : null}
      <View style={insightStyles.insightGrid}>
        <View style={insightStyles.insightPanel}>
          <Text style={insightStyles.panelTitle}>Diet & Nutrition</Text>
          <Text style={insightStyles.panelSubtitle}>Blood group baseline: {bloodGroup}</Text>
          <View style={insightStyles.dietColumns}>
            <View style={insightStyles.dietColumn}>
              <Text style={insightStyles.dietHeading}>Recommended</Text>
              {nutritionPlan.recommended.map((item) => (
                <Text key={item} style={insightStyles.dietItem}>
                  + {item}
                </Text>
              ))}
            </View>
            <View style={insightStyles.dietColumn}>
              <Text style={insightStyles.restrictHeading}>Restrict</Text>
              {nutritionPlan.restrict.map((item) => (
                <Text key={item} style={insightStyles.restrictItem}>
                  - {item}
                </Text>
              ))}
            </View>
          </View>
        </View>

        <View style={insightStyles.insightPanel}>
          <Text style={insightStyles.panelTitle}>Active Fitness Checklist</Text>
          <Text style={insightStyles.panelSubtitle}>
            {logs.length === 0 ? 'Created after your first vitals entry.' : `Updated from ${latest.status.toLowerCase()} vitals and symptoms.`}
          </Text>
          {fitnessTasks.map((task) => {
            const checked = checkedTasks.includes(task);
            return (
              <TouchableOpacity key={task} style={insightStyles.taskRow} activeOpacity={0.8} onPress={() => toggleTask(task)}>
                <View style={[insightStyles.checkbox, checked && insightStyles.checkedBox]}>
                  {checked ? <Text style={insightStyles.checkText}>✓</Text> : null}
                </View>
                <Text style={[insightStyles.taskText, checked && insightStyles.checkedTaskText]}>{task}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={insightStyles.insightPanel}>
          <Text style={insightStyles.panelTitle}>Clinical Readiness</Text>
          <Text style={insightStyles.panelSubtitle}>Daily safeguards that make the app feel real-world.</Text>
          {[
            logs.length > 0 ? `Last reviewed: ${latest.date}` : 'No clinical review yet: log vitals first',
            bloodGroup === 'Not set' ? 'Complete blood group in Profile & History' : `Blood group saved as ${bloodGroup}`,
            checkedTasks.length > 0 ? `${checkedTasks.length} checklist item${checkedTasks.length === 1 ? '' : 's'} completed today` : 'No checklist items completed yet',
            urgent ? 'Escalation banner active until vitals return to safer ranges' : 'No urgent escalation currently active',
          ].map((item) => (
            <View key={item} style={insightStyles.readinessRow}>
              <View style={insightStyles.readinessDot} />
              <Text style={insightStyles.readinessText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={insightStyles.insightPanel}>
          <Text style={insightStyles.panelTitle}>Medication Reminders</Text>
          <Text style={insightStyles.panelSubtitle}>Manual medicine tracking with taken/missed status.</Text>
          <View style={insightStyles.medFormGrid}>
            <TextInput
              style={insightStyles.medInput}
              placeholder="Medicine name"
              placeholderTextColor="#94A3B8"
              value={medicineName}
              onChangeText={setMedicineName}
            />
            <TextInput
              style={insightStyles.medInput}
              placeholder="Dose"
              placeholderTextColor="#94A3B8"
              value={medicineDose}
              onChangeText={setMedicineDose}
            />
            <TextInput
              style={insightStyles.medInput}
              placeholder="08:00"
              placeholderTextColor="#94A3B8"
              value={medicineTime}
              onChangeText={setMedicineTime}
            />
          </View>
          <TouchableOpacity style={insightStyles.medButton} activeOpacity={0.85} onPress={handleAddMedicine}>
            <Text style={insightStyles.medButtonText}>Add Reminder</Text>
          </TouchableOpacity>
          {medicineMessage ? <Text style={insightStyles.medMessage}>{medicineMessage}</Text> : null}
          {(medicationReminders || []).slice(0, 4).map((reminder) => (
            <View key={reminder.id} style={insightStyles.medRow}>
              <View style={insightStyles.medInfo}>
                <Text style={insightStyles.medName}>{reminder.medicine_name}</Text>
                <Text style={insightStyles.medMeta}>{reminder.dosage || 'No dose'} | {reminder.scheduled_time} | {reminder.status}</Text>
              </View>
              <View style={insightStyles.medActions}>
                <TouchableOpacity style={insightStyles.medTinyButton} onPress={() => onMarkMedicationTaken?.(reminder.id)}>
                  <Text style={insightStyles.medTinyText}>Taken</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[insightStyles.medTinyButton, insightStyles.medMissedButton]} onPress={() => onMarkMedicationMissed?.(reminder.id)}>
                  <Text style={insightStyles.medMissedText}>Missed</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View style={insightStyles.insightPanel}>
          <Text style={insightStyles.panelTitle}>Recommendation History</Text>
          <Text style={insightStyles.panelSubtitle}>Saved guidance generated from previous records.</Text>
          {(recommendations || []).length === 0 ? (
            <Text style={insightStyles.emptyPanelText}>No saved recommendations yet. They appear after watch/urgent vitals or condition-specific rules.</Text>
          ) : (
            recommendations.slice(0, 4).map((rec) => (
              <View key={rec.id} style={insightStyles.recommendationRow}>
                <Text style={insightStyles.recommendationTitle}>{rec.fluid_target || 'Care plan'}</Text>
                <Text style={insightStyles.recommendationText}>{rec.lifestyle_guideline}</Text>
              </View>
            ))
          )}
          {(alerts || []).slice(0, 2).map((alert) => (
            <View key={alert.id} style={insightStyles.alertRow}>
              <Text style={insightStyles.alertRowText}>{String(alert.severity).toUpperCase()}: {alert.alert_message}</Text>
            </View>
          ))}
        </View>

        <View style={insightStyles.insightPanel}>
          <Text style={insightStyles.panelTitle}>Notification Center</Text>
          <Text style={insightStyles.panelSubtitle}>Unread alerts, missed reminders, and safety messages.</Text>
          {(alerts || []).length === 0 ? (
            <Text style={insightStyles.emptyPanelText}>No notifications yet. Alerts appear here when vitals or reminders need attention.</Text>
          ) : (
            alerts.slice(0, 5).map((alert) => (
              <View key={alert.id} style={insightStyles.notificationRow}>
                <View style={insightStyles.notificationBody}>
                  <Text style={insightStyles.notificationTitle}>
                    {String(alert.severity || 'info').toUpperCase()} - {String(alert.status || 'unread').toUpperCase()}
                  </Text>
                  <Text style={insightStyles.notificationText}>{alert.alert_message}</Text>
                </View>
                {alert.status !== 'read' ? (
                  <TouchableOpacity style={insightStyles.readButton} onPress={() => onMarkAlertRead?.(alert.id)}>
                    <Text style={insightStyles.readButtonText}>Read</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))
          )}
        </View>

        <View style={insightStyles.insightPanel}>
          <Text style={insightStyles.panelTitle}>Appointment Requests</Text>
          <Text style={insightStyles.panelSubtitle}>Care booking requests created from manual vitals and red alerts.</Text>
          <View style={insightStyles.medFormGrid}>
            <TextInput
              style={[insightStyles.medInput, insightStyles.messageInput]}
              placeholder="Reason for appointment"
              placeholderTextColor="#94A3B8"
              value={appointmentReason}
              onChangeText={setAppointmentReason}
              multiline
            />
            <TextInput
              style={insightStyles.medInput}
              placeholder="Patient location"
              placeholderTextColor="#94A3B8"
              value={patientLocation}
              onChangeText={setPatientLocation}
            />
          </View>
          <TouchableOpacity style={insightStyles.medButton} activeOpacity={0.85} onPress={handleCreateRoutineAppointment}>
            <Text style={insightStyles.medButtonText}>Create Appointment Request</Text>
          </TouchableOpacity>
          {(appointmentRequests || []).length === 0 ? (
            <Text style={insightStyles.emptyPanelText}>No appointment requests yet. Red-alert vitals can create urgent booking requests here.</Text>
          ) : (
            appointmentRequests.slice(0, 4).map((appointment) => (
              <TouchableOpacity key={appointment.id} style={[insightStyles.appointmentRow, selectedAppointment?.id === appointment.id && insightStyles.selectedAppointmentRow]} onPress={() => setSelectedAppointmentId(appointment.id)} activeOpacity={0.84}>
                <Text style={insightStyles.appointmentTitle}>
                  {appointment.confirmation_code || 'Appointment'} - {String(appointment.urgency || 'routine').toUpperCase()}
                </Text>
                <Text style={insightStyles.appointmentText}>
                  {appointment.reason} | {appointment.status}
                </Text>
                {appointment.assigned_facility_name ? (
                  <Text style={insightStyles.appointmentText}>
                    Assigned: {appointment.assigned_facility_name}, {appointment.assigned_facility_address} | {appointment.assigned_facility_contact}
                  </Text>
                ) : null}
                {appointment.triage_summary ? (
                  <Text style={insightStyles.appointmentText}>{appointment.triage_summary}</Text>
                ) : null}
              </TouchableOpacity>
            ))
          )}
          {appointmentMessage ? <Text style={insightStyles.medMessage}>{appointmentMessage}</Text> : null}
          <AppointmentDetail appointment={selectedAppointment} messages={appointmentMessages} />
        </View>

        <View style={insightStyles.insightPanel}>
          <Text style={insightStyles.panelTitle}>Doctor Interaction</Text>
          <Text style={insightStyles.panelSubtitle}>Send symptom updates and read doctor replies linked to your care requests.</Text>
          <View style={insightStyles.medFormGrid}>
            <TextInput
              style={[insightStyles.medInput, insightStyles.messageInput]}
              placeholder="Example: Fever reduced, but dizziness is still present."
              placeholderTextColor="#94A3B8"
              value={careUpdate}
              onChangeText={setCareUpdate}
              multiline
            />
          </View>
          <TouchableOpacity style={insightStyles.medButton} activeOpacity={0.85} onPress={handleSendCareUpdate}>
            <Text style={insightStyles.medButtonText}>Send Update to Doctor</Text>
          </TouchableOpacity>
          {careMessageState ? <Text style={insightStyles.medMessage}>{careMessageState}</Text> : null}
          {appointmentMessages.length === 0 ? (
            <Text style={insightStyles.emptyPanelText}>No messages are linked to the selected appointment yet.</Text>
          ) : null}
          {appointmentMessages.slice(0, 5).map((message) => (
            <View key={message.id} style={insightStyles.messageRow}>
              <Text style={insightStyles.messageTitle}>
                {message.sender_username} to {message.recipient_username} | {String(message.message_type).replace('_', ' ')}
              </Text>
              <Text style={insightStyles.messageText}>{message.body}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function AppointmentDetail({ appointment, messages }) {
  if (!appointment) {
    return (
      <View style={insightStyles.detailPanel}>
        <Text style={insightStyles.detailTitle}>Appointment Detail</Text>
        <Text style={insightStyles.emptyPanelText}>Select or create an appointment to view facility, triage, and message history.</Text>
      </View>
    );
  }

  return (
    <View style={insightStyles.detailPanel}>
      <Text style={insightStyles.detailTitle}>{appointment.confirmation_code || 'Appointment detail'}</Text>
      <Text style={insightStyles.appointmentText}>Status: {appointment.status || 'requested'} | Urgency: {appointment.urgency || 'routine'}</Text>
      <Text style={insightStyles.appointmentText}>Reason: {appointment.reason || 'No reason recorded'}</Text>
      <Text style={insightStyles.appointmentText}>Location: {appointment.patient_location || 'Not provided'}</Text>
      {appointment.assigned_facility_name ? (
        <Text style={insightStyles.appointmentText}>
          Facility: {appointment.assigned_facility_name}, {appointment.assigned_facility_address || 'address pending'} | {appointment.assigned_facility_contact || 'contact pending'}
        </Text>
      ) : null}
      {appointment.assigned_doctor_username ? (
        <Text style={insightStyles.appointmentText}>Doctor: {appointment.assigned_doctor_username}</Text>
      ) : null}
      {appointment.triage_summary ? <Text style={insightStyles.appointmentText}>Triage: {appointment.triage_summary}</Text> : null}
      <Text style={insightStyles.detailSubtitle}>Message Thread</Text>
      {(messages || []).length === 0 ? (
        <Text style={insightStyles.emptyPanelText}>No messages attached to this appointment yet.</Text>
      ) : (
        messages.slice(0, 6).map((message) => (
          <View key={message.id} style={insightStyles.threadBubble}>
            <Text style={insightStyles.messageTitle}>{message.sender_username} to {message.recipient_username}</Text>
            <Text style={insightStyles.messageText}>{message.body}</Text>
            <Text style={insightStyles.threadTime}>{formatDateTime(message.created_at)}</Text>
          </View>
        ))
      )}
    </View>
  );
}

function ClinicalDashboardTab({ patientOverview, appointmentRequests, alerts, onReviewHealthRecord, onRefresh, lastRefreshAt, isFetchingData }) {
  const rows = patientOverview || [];
  const urgentPatients = rows.filter((row) => row.latest_score?.risk_level === 'urgent').length;
  const pendingReviews = rows.filter((row) => row.latest_record?.review_status !== 'reviewed').length;
  const urgentAppointments = (appointmentRequests || []).filter((appointment) =>
    ['urgent', 'emergency'].includes(String(appointment.urgency || '').toLowerCase())
  ).length;
  const unreadAlerts = (alerts || []).filter((alert) => alert.status !== 'read').length;
  const stats = [
    { label: 'Patients', value: rows.length, detail: 'Visible clinical scope', color: '#2563EB' },
    { label: 'Urgent Risk', value: urgentPatients, detail: 'Red-level score rows', color: '#DC2626' },
    { label: 'Pending Reviews', value: pendingReviews, detail: 'Records needing clinician action', color: '#D97706' },
    { label: 'Urgent Bookings', value: urgentAppointments, detail: `${unreadAlerts} unread alerts`, color: '#047857' },
  ];

  return (
    <View>
      <SectionHeader title="Clinical Overview" subtitle="Doctor and admin workspace for patient risk, reviews, and urgent bookings." />
      <View style={dashboardStyles.clinicalToolbar}>
        <Text style={dashboardStyles.clinicalRefreshText}>
          {isFetchingData ? 'Refreshing clinical data...' : `Last updated: ${formatDateTime(lastRefreshAt)}`}
        </Text>
        <TouchableOpacity style={dashboardStyles.clinicalRefreshButton} activeOpacity={0.84} onPress={onRefresh}>
          <Text style={dashboardStyles.clinicalRefreshButtonText}>Refresh Now</Text>
        </TouchableOpacity>
      </View>
      <View style={dashboardStyles.statisticsGrid}>
        {stats.map((stat) => <ClinicalStatCard key={stat.label} stat={stat} />)}
      </View>
      <View style={dashboardStyles.clinicalActionGrid}>
        <View style={dashboardStyles.clinicalActionCard}>
          <Text style={dashboardStyles.clinicalActionTitle}>Review Queue</Text>
          <Text style={dashboardStyles.clinicalActionText}>{pendingReviews} patient record{pendingReviews === 1 ? '' : 's'} need review.</Text>
        </View>
        <View style={dashboardStyles.clinicalActionCard}>
          <Text style={dashboardStyles.clinicalActionTitle}>Appointments</Text>
          <Text style={dashboardStyles.clinicalActionText}>{urgentAppointments} urgent booking{urgentAppointments === 1 ? '' : 's'} in scope.</Text>
        </View>
        <View style={dashboardStyles.clinicalActionCard}>
          <Text style={dashboardStyles.clinicalActionTitle}>Alerts</Text>
          <Text style={dashboardStyles.clinicalActionText}>{unreadAlerts} unread clinical alert{unreadAlerts === 1 ? '' : 's'}.</Text>
        </View>
      </View>
      <ClinicalReviewQueue rows={rows} onReviewHealthRecord={onReviewHealthRecord} />
    </View>
  );
}

function ClinicalInsightsTab({ appointmentRequests, alerts, careMessages, onMarkAlertRead, onCreateCareMessage }) {
  const [replyText, setReplyText] = useState('');
  const [replyState, setReplyState] = useState('');

  const handleSendReply = async (appointment) => {
    if (!replyText.trim()) {
      setReplyState('Write a doctor reply first.');
      return;
    }
    try {
      await onCreateCareMessage?.({
        appointment: appointment?.id,
        recipient_id: appointment?.user,
        body: replyText.trim(),
      });
      setReplyText('');
      setReplyState('Reply sent to patient.');
    } catch (error) {
      setReplyState(error?.message || 'Unable to send reply.');
    }
  };

  return (
    <View>
      <SectionHeader title="Appointments & Alerts" subtitle="Clinical-only appointment requests and safety notifications." />
      <View style={insightStyles.insightGrid}>
        <View style={insightStyles.insightPanel}>
          <Text style={insightStyles.panelTitle}>Appointment Requests</Text>
          <Text style={insightStyles.panelSubtitle}>Urgent and routine booking requests submitted by patients.</Text>
          {(appointmentRequests || []).length === 0 ? (
            <Text style={insightStyles.emptyPanelText}>No appointment requests yet.</Text>
          ) : (
            appointmentRequests.slice(0, 8).map((appointment) => (
              <View key={appointment.id} style={insightStyles.appointmentRow}>
                <Text style={insightStyles.appointmentTitle}>
                  {appointment.confirmation_code || 'Appointment'} - {String(appointment.urgency || 'routine').toUpperCase()}
                </Text>
                <Text style={insightStyles.appointmentText}>
                  {appointment.username || 'Patient'} | {appointment.reason} | {appointment.status}
                </Text>
                <Text style={insightStyles.appointmentText}>
                  Location: {appointment.patient_location || 'Not provided'} | Facility: {appointment.assigned_facility_name || 'Not assigned'}
                </Text>
                <Text style={insightStyles.appointmentText}>{appointment.triage_summary || 'No triage summary yet.'}</Text>
                <View style={insightStyles.medFormGrid}>
                  <TextInput
                    style={[insightStyles.medInput, insightStyles.messageInput]}
                    placeholder="Write doctor reply for this patient"
                    placeholderTextColor="#94A3B8"
                    value={replyText}
                    onChangeText={setReplyText}
                    multiline
                  />
                </View>
                <TouchableOpacity style={insightStyles.medButton} activeOpacity={0.85} onPress={() => handleSendReply(appointment)}>
                  <Text style={insightStyles.medButtonText}>Send Doctor Reply</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
          {replyState ? <Text style={insightStyles.medMessage}>{replyState}</Text> : null}
        </View>

        <View style={insightStyles.insightPanel}>
          <Text style={insightStyles.panelTitle}>Clinical Notifications</Text>
          <Text style={insightStyles.panelSubtitle}>Unread risk messages and appointment-generated alerts.</Text>
          {(alerts || []).length === 0 ? (
            <Text style={insightStyles.emptyPanelText}>No alerts available.</Text>
          ) : (
            alerts.slice(0, 8).map((alert) => (
              <View key={alert.id} style={insightStyles.notificationRow}>
                <View style={insightStyles.notificationBody}>
                  <Text style={insightStyles.notificationTitle}>
                    {String(alert.severity || 'info').toUpperCase()} - {String(alert.status || 'unread').toUpperCase()}
                  </Text>
                  <Text style={insightStyles.notificationText}>{alert.alert_message}</Text>
                </View>
                {alert.status !== 'read' ? (
                  <TouchableOpacity style={insightStyles.readButton} onPress={() => onMarkAlertRead?.(alert.id)}>
                    <Text style={insightStyles.readButtonText}>Read</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))
          )}
        </View>
        <View style={insightStyles.insightPanel}>
          <Text style={insightStyles.panelTitle}>Patient-Doctor Messages</Text>
          <Text style={insightStyles.panelSubtitle}>Updates sent by patients and replies sent by doctors.</Text>
          {(careMessages || []).length === 0 ? (
            <Text style={insightStyles.emptyPanelText}>No care messages yet.</Text>
          ) : (
            careMessages.slice(0, 8).map((message) => (
              <View key={message.id} style={insightStyles.messageRow}>
                <Text style={insightStyles.messageTitle}>
                  {message.sender_username} to {message.recipient_username} | {String(message.message_type).replace('_', ' ')}
                </Text>
                <Text style={insightStyles.messageText}>{message.body}</Text>
              </View>
            ))
          )}
        </View>
      </View>
    </View>
  );
}

function ClinicalPatientsTab({ patientOverview, onReviewHealthRecord }) {
  return (
    <View>
      <SectionHeader title="Patients & Reports" subtitle="Clinical-only patient queue for review status and follow-up decisions." />
      <ClinicalReviewQueue rows={patientOverview || []} onReviewHealthRecord={onReviewHealthRecord} />
    </View>
  );
}

function ClinicalReviewQueue({ rows, onReviewHealthRecord }) {
  const [reviewState, setReviewState] = useState('');

  const handleReviewRecord = async (recordId, reviewStatus) => {
    if (!recordId) {
      setReviewState('No patient record is available for review yet.');
      return;
    }
    try {
      await onReviewHealthRecord?.(recordId, {
        review_status: reviewStatus,
        clinician_note:
          reviewStatus === 'follow_up'
            ? 'Follow-up requested after manual vitals review.'
            : 'Manual vitals reviewed and accepted for the clinical ledger.',
      });
      setReviewState('Clinical review updated.');
    } catch (error) {
      setReviewState(error?.message || 'Unable to update review status.');
    }
  };

  return (
    <View style={profileStyles.reportPanel}>
      <Text style={profileStyles.panelTitle}>Clinician Review Queue</Text>
      <Text style={profileStyles.reportSubtitle}>Patients are visible here only to doctor, caregiver, and admin roles.</Text>
      {reviewState ? <Text style={profileStyles.saveStateText}>{reviewState}</Text> : null}
      {(rows || []).length === 0 ? (
        <Text style={profileStyles.emptyReportText}>No patient overview rows available yet.</Text>
      ) : (
        rows.slice(0, 10).map((row) => (
          <View key={row.id} style={profileStyles.patientRow}>
            <View>
              <Text style={profileStyles.patientName}>{row.username}</Text>
              <Text style={profileStyles.patientMeta}>
                {row.latest_score ? `${row.latest_score.score}/100 ${String(row.latest_score.risk_level).toUpperCase()}` : 'No score yet'}
                {row.latest_record ? ` | ${String(row.latest_record.review_status || 'pending').replace('_', ' ')}` : ''}
              </Text>
            </View>
            <View style={profileStyles.patientActionStack}>
              <Text style={profileStyles.patientAlerts}>{row.unread_alerts} alerts</Text>
              <View style={profileStyles.reviewButtons}>
                <TouchableOpacity
                  style={profileStyles.reviewButton}
                  onPress={() => handleReviewRecord(row.latest_record?.id, 'reviewed')}
                >
                  <Text style={profileStyles.reviewButtonText}>Reviewed</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[profileStyles.reviewButton, profileStyles.followUpButton]}
                  onPress={() => handleReviewRecord(row.latest_record?.id, 'follow_up')}
                >
                  <Text style={profileStyles.followUpButtonText}>Follow-up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function ProfileHistoryTab({
  logs,
  profile,
  onUpdateProfile,
  weeklyReport,
  healthScores,
  onExportWeeklyReport,
}) {
  const [age, setAge] = useState(profile?.age ? String(profile.age) : '');
  const [weight, setWeight] = useState(profile?.weight ? String(profile.weight) : '');
  const [bloodGroup, setBloodGroup] = useState(profile?.blood_group || '');
  const [height, setHeight] = useState(profile?.height ? String(profile.height) : '');
  const [conditions, setConditions] = useState(Array.isArray(profile?.diagnosed_conditions) ? profile.diagnosed_conditions.join(', ') : '');
  const [primaryContact, setPrimaryContact] = useState(profile?.emergency_primary_contact || '');
  const [secondaryContact, setSecondaryContact] = useState(profile?.emergency_secondary_contact || '');
  const [waterGoal, setWaterGoal] = useState(profile?.daily_water_goal_ml ? String(profile.daily_water_goal_ml) : '');
  const [stepGoal, setStepGoal] = useState(profile?.daily_step_goal ? String(profile.daily_step_goal) : '');
  const [saveState, setSaveState] = useState('');
  const [reportState, setReportState] = useState('');
  const [reportPreview, setReportPreview] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    setAge(profile?.age ? String(profile.age) : '');
    setWeight(profile?.weight ? String(profile.weight) : '');
    setBloodGroup(profile?.blood_group || '');
    setHeight(profile?.height ? String(profile.height) : '');
    setConditions(Array.isArray(profile?.diagnosed_conditions) ? profile.diagnosed_conditions.join(', ') : '');
    setPrimaryContact(profile?.emergency_primary_contact || '');
    setSecondaryContact(profile?.emergency_secondary_contact || '');
    setWaterGoal(profile?.daily_water_goal_ml ? String(profile.daily_water_goal_ml) : '');
    setStepGoal(profile?.daily_step_goal ? String(profile.daily_step_goal) : '');
  }, [profile]);

  const saveProfile = async () => {
    const issues = [
      age && safeNumber(age, 0) <= 0 ? 'Age must be greater than zero.' : null,
      weight && safeNumber(weight, 0) <= 0 ? 'Weight must be greater than zero.' : null,
      height && safeNumber(height, 0) <= 0 ? 'Height must be greater than zero.' : null,
      waterGoal && safeNumber(waterGoal, 0) <= 0 ? 'Water goal must be greater than zero.' : null,
      stepGoal && safeNumber(stepGoal, 0) <= 0 ? 'Step goal must be greater than zero.' : null,
    ].filter(Boolean);

    if (issues.length > 0) {
      setSaveState(issues.join(' '));
      return;
    }

    setIsSavingProfile(true);
    try {
      const payload = {
        age: safeNumber(age, null),
        weight: safeNumber(weight, null),
        blood_group: bloodGroup.trim(),
        height: safeNumber(height, null),
        diagnosed_conditions: conditions.split(',').map((item) => item.trim()).filter(Boolean),
        emergency_primary_contact: primaryContact.trim(),
        emergency_secondary_contact: secondaryContact.trim(),
      };
      if (waterGoal.trim()) {
        payload.daily_water_goal_ml = safeNumber(waterGoal, 3000);
      }
      if (stepGoal.trim()) {
        payload.daily_step_goal = safeNumber(stepGoal, 10000);
      }
      const result = await onUpdateProfile?.(payload);
      setSaveState(result?.savedToDatabase ? 'Baseline updated in the database.' : 'Unable to confirm database save.');
    } catch (error) {
      setSaveState(error?.message || 'Unable to update baseline.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleExportReport = async () => {
    try {
      const report = await onExportWeeklyReport?.();
      const reportText = report?.report_text || 'No report content available.';
      setReportPreview(reportText);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.Blob) {
        const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = report?.filename || 'rhmt-weekly-report.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      setReportState('Weekly report export prepared.');
    } catch (error) {
      setReportState(error?.message || 'Unable to export weekly report.');
    }
  };

  return (
    <View>
      <SectionHeader title="Profile & History Ledger" subtitle="Baseline patient details and chronological manual entries." />
      <View style={profileStyles.profileGrid}>
        <View style={profileStyles.profilePanel}>
          <Text style={profileStyles.panelTitle}>Baseline Metrics</Text>
          <View style={profileStyles.fieldGrid}>
            <ProfileField label="Age" value={age} onChangeText={setAge} suffix="yrs" />
            <ProfileField label="Weight" value={weight} onChangeText={setWeight} suffix="kg" />
            <ProfileField label="Blood Group" value={bloodGroup} onChangeText={setBloodGroup} />
            <ProfileField label="Height" value={height} onChangeText={setHeight} suffix="cm" />
            <ProfileField label="Diagnosed Conditions" value={conditions} onChangeText={setConditions} />
            <ProfileField label="Primary Emergency Contact" value={primaryContact} onChangeText={setPrimaryContact} />
            <ProfileField label="Secondary Emergency Contact" value={secondaryContact} onChangeText={setSecondaryContact} />
            <ProfileField label="Water Goal" value={waterGoal} onChangeText={setWaterGoal} suffix="ml" />
            <ProfileField label="Step Goal" value={stepGoal} onChangeText={setStepGoal} suffix="steps" />
          </View>
          <TouchableOpacity style={[profileStyles.saveButton, isSavingProfile && formStyles.disabledSubmitButton]} activeOpacity={0.85} onPress={saveProfile} disabled={isSavingProfile}>
            <Text style={profileStyles.saveButtonText}>{isSavingProfile ? 'Updating...' : 'Update Baseline'}</Text>
          </TouchableOpacity>
          {saveState ? <Text style={profileStyles.saveStateText}>{saveState}</Text> : null}
        </View>

        <View style={profileStyles.historyPanel}>
          <Text style={profileStyles.panelTitle}>Historical Logs</Text>
          <View style={profileStyles.tableHeader}>
            <Text style={[profileStyles.th, profileStyles.dateCell]}>Date</Text>
            <Text style={profileStyles.th}>Temp</Text>
            <Text style={profileStyles.th}>SpO2</Text>
            <Text style={profileStyles.th}>Pulse</Text>
            <Text style={profileStyles.th}>Status</Text>
          </View>
          {logs.length === 0 ? (
            <Text style={profileStyles.emptyReportText}>No saved vitals logs yet.</Text>
          ) : null}
          {logs.map((log) => (
            <View key={log.id} style={profileStyles.tableRow}>
              <Text style={[profileStyles.td, profileStyles.dateCell]} numberOfLines={1}>
                {log.date}
              </Text>
              <Text style={profileStyles.td}>{log.temperature.toFixed(1)}</Text>
              <Text style={profileStyles.td}>{log.spo2}%</Text>
              <Text style={profileStyles.td}>{log.pulse}</Text>
              <Text style={[profileStyles.statusCell, log.status === 'Urgent' && profileStyles.urgentStatus]}>
                {log.status}
              </Text>
            </View>
          ))}
        </View>

        <View style={profileStyles.reportPanel}>
          <Text style={profileStyles.panelTitle}>Caregiver Weekly Report</Text>
          <Text style={profileStyles.reportSubtitle}>A report-ready summary for clinicians, caregivers, or real patient review.</Text>
          <View style={profileStyles.reportActionRow}>
            <TouchableOpacity style={profileStyles.exportButton} activeOpacity={0.85} onPress={handleExportReport}>
              <Text style={profileStyles.exportButtonText}>Download Report</Text>
            </TouchableOpacity>
          </View>
          {reportState ? <Text style={profileStyles.saveStateText}>{reportState}</Text> : null}
          <View style={profileStyles.reportGrid}>
            <View style={profileStyles.reportMetric}>
              <Text style={profileStyles.reportMetricLabel}>Vitals</Text>
              <Text style={profileStyles.reportMetricValue}>{weeklyReport?.records?.length || logs.length}</Text>
            </View>
            <View style={profileStyles.reportMetric}>
              <Text style={profileStyles.reportMetricLabel}>Scores</Text>
              <Text style={profileStyles.reportMetricValue}>{weeklyReport?.scores?.length || healthScores?.length || 0}</Text>
            </View>
            <View style={profileStyles.reportMetric}>
              <Text style={profileStyles.reportMetricLabel}>Alerts</Text>
              <Text style={profileStyles.reportMetricValue}>{weeklyReport?.alerts?.length || 0}</Text>
            </View>
            <View style={profileStyles.reportMetric}>
              <Text style={profileStyles.reportMetricLabel}>Care Plans</Text>
              <Text style={profileStyles.reportMetricValue}>{weeklyReport?.recommendations?.length || 0}</Text>
            </View>
          </View>
          {(weeklyReport?.scores || healthScores || []).slice(0, 3).map((score) => (
            <View key={score.id} style={profileStyles.scoreRow}>
              <Text style={profileStyles.scoreValue}>{score.score}/100</Text>
              <Text style={profileStyles.scoreText}>{String(score.risk_level).toUpperCase()} - {(score.reasons || []).slice(0, 1).join('')}</Text>
            </View>
          ))}
          {reportPreview ? (
            <View style={profileStyles.reportPreview}>
              <Text style={profileStyles.reportPreviewTitle}>Report Preview</Text>
              <Text style={profileStyles.reportPreviewText}>{reportPreview}</Text>
            </View>
          ) : null}
        </View>

      </View>
    </View>
  );
}

function ProfileField({ label, value, onChangeText, suffix }) {
  return (
    <View style={profileStyles.field}>
      <Text style={profileStyles.fieldLabel}>{label}</Text>
      <View style={profileStyles.fieldInputRow}>
        <TextInput value={value} onChangeText={onChangeText} style={profileStyles.fieldInput} placeholderTextColor="#94A3B8" />
        {suffix ? <Text style={profileStyles.fieldSuffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

function SettingsTab({
  connectionStatus,
  queueCount,
  refreshError,
  lastRefreshAt,
  isDarkMode,
  onToggleTheme,
  dndEnabled,
  onToggleDnd,
  notificationPreferences,
  onUpdateNotificationPreference,
  onSetConnectionStatus,
  onSyncQueue,
  onClearLocalCache,
  onRefresh,
  onLogout,
}) {
  const [settingsState, setSettingsState] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await onSyncQueue?.();
      setSettingsState(
        result?.success
          ? `Sync complete. ${result.syncedCount || 0} queued entr${result.syncedCount === 1 ? 'y' : 'ies'} saved.`
          : result?.error || 'Unable to sync pending entries.'
      );
    } catch (error) {
      setSettingsState(error?.message || 'Unable to sync pending entries.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearCache = async () => {
    await onClearLocalCache?.();
    setSettingsState('Local queue and local preferences cleared. Backend records were not deleted.');
  };

  return (
    <View>
      <SectionHeader title="Settings" subtitle="Session, backend status, sync, and notification controls." />
      <View style={settingsStyles.grid}>
        <View style={settingsStyles.panel}>
          <Text style={settingsStyles.panelTitle}>Server & Sync</Text>
          <Text style={settingsStyles.statusLine}>Backend: {connectionStatus || 'unknown'}</Text>
          <Text style={settingsStyles.statusLine}>Last refresh: {formatDateTime(lastRefreshAt)}</Text>
          <Text style={settingsStyles.statusLine}>Pending sync: {queueCount || 0}</Text>
          {refreshError ? <Text style={settingsStyles.errorLine}>{refreshError}</Text> : null}
          <View style={settingsStyles.actionRow}>
            <TouchableOpacity style={settingsStyles.primaryButton} onPress={onRefresh} activeOpacity={0.84}>
              <Text style={settingsStyles.primaryButtonText}>Refresh Backend</Text>
            </TouchableOpacity>
            <TouchableOpacity style={settingsStyles.secondaryButton} onPress={handleSync} disabled={isSyncing} activeOpacity={0.84}>
              <Text style={settingsStyles.secondaryButtonText}>{isSyncing ? 'Syncing...' : 'Sync Queue'}</Text>
            </TouchableOpacity>
          </View>
          <SettingsToggleRow
            title="Manual offline mode"
            hint="New vitals will queue until this is turned off."
            value={connectionStatus === 'offline'}
            onValueChange={(value) => onSetConnectionStatus?.(value ? 'offline' : 'online')}
          />
        </View>

        <View style={settingsStyles.panel}>
          <Text style={settingsStyles.panelTitle}>Display & Notifications</Text>
          <SettingsToggleRow
            title="Dark mode"
            hint="Applies immediately and stays on this device."
            value={!!isDarkMode}
            onValueChange={onToggleTheme}
          />
          <SettingsToggleRow
            title="Do not disturb"
            hint="Keeps alerts in-app without attention badges."
            value={!!dndEnabled}
            onValueChange={onToggleDnd}
          />
          {[
            ['criticalAlerts', 'Critical alerts'],
            ['medicationReminders', 'Medication reminders'],
            ['appointmentUpdates', 'Appointment updates'],
            ['doctorReplies', 'Doctor replies'],
          ].map(([key, label]) => (
            <SettingsToggleRow
              key={key}
              title={label}
              value={notificationPreferences?.[key] !== false}
              onValueChange={(value) => onUpdateNotificationPreference?.(key, value)}
            />
          ))}
        </View>

        <View style={settingsStyles.panel}>
          <Text style={settingsStyles.panelTitle}>Account</Text>
          <Text style={settingsStyles.statusLine}>Clearing local cache removes only pending queue data and device preferences.</Text>
          <View style={settingsStyles.actionRow}>
            <TouchableOpacity style={settingsStyles.secondaryButton} onPress={handleClearCache} activeOpacity={0.84}>
              <Text style={settingsStyles.secondaryButtonText}>Clear Local Cache</Text>
            </TouchableOpacity>
            <TouchableOpacity style={settingsStyles.dangerButton} onPress={onLogout} activeOpacity={0.84}>
              <Text style={settingsStyles.dangerButtonText}>Log Out</Text>
            </TouchableOpacity>
          </View>
          {settingsState ? <Text style={settingsStyles.stateText}>{settingsState}</Text> : null}
        </View>
      </View>
    </View>
  );
}

function SettingsToggle({ value, onValueChange }) {
  const active = !!value;
  return (
    <TouchableOpacity
      style={[settingsStyles.toggleSwitch, active && settingsStyles.toggleSwitchActive]}
      activeOpacity={0.82}
      onPress={(event) => {
        event?.stopPropagation?.();
        onValueChange?.(!active);
      }}
      accessibilityRole="switch"
      accessibilityState={{ checked: active }}
    >
      <View style={[settingsStyles.toggleThumb, active && settingsStyles.toggleThumbActive]} />
    </TouchableOpacity>
  );
}

function SettingsToggleRow({ title, hint, value, onValueChange }) {
  const active = !!value;
  return (
    <TouchableOpacity
      style={settingsStyles.toggleRow}
      activeOpacity={0.84}
      onPress={() => onValueChange?.(!active)}
    >
      <View style={settingsStyles.toggleCopy}>
        <Text style={settingsStyles.toggleTitle}>{title}</Text>
        {hint ? <Text style={settingsStyles.toggleHint}>{hint}</Text> : null}
      </View>
      <SettingsToggle value={active} onValueChange={onValueChange} />
    </TouchableOpacity>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <View style={layoutStyles.sectionHeader}>
      <Text style={layoutStyles.sectionTitle}>{title}</Text>
      <Text style={layoutStyles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

const iconStyles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardTile: {
    width: '39%',
    height: '39%',
    borderRadius: 5,
    borderWidth: 1,
  },
  medicalRing: {
    position: 'absolute',
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
  },
  medicalVLine: {
    borderRadius: 4,
    position: 'absolute',
  },
  medicalHLine: {
    borderRadius: 4,
    position: 'absolute',
  },
  heartBeatBase: {
    position: 'absolute',
    left: '6%',
    right: '6%',
    top: '50%',
    opacity: 0.9,
  },
  heartBeatLeft: {
    position: 'absolute',
    left: '8%',
    top: '58%',
    transform: [{ rotate: '-24deg' }],
    borderRadius: 3,
  },
  heartBeatPeak: {
    position: 'absolute',
    left: '46%',
    top: '21%',
    transform: [{ rotate: '22deg' }],
    borderRadius: 4,
  },
  heartBeatRight: {
    position: 'absolute',
    right: '7%',
    top: '38%',
    transform: [{ rotate: '-28deg' }],
    borderRadius: 3,
  },
  chartNode: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  idCard: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  userHead: {
    borderRadius: 20,
    marginBottom: 1,
  },
  userBody: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomWidth: 0,
  },
  bellDome: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomWidth: 0,
    marginTop: 1,
  },
  bellCap: {
    borderRadius: 3,
    marginBottom: -1,
  },
  bellBase: {
    borderRadius: 2,
    marginTop: -1,
  },
  bellClapper: {
    marginTop: 2,
  },
});

const layoutStyles = StyleSheet.create({
  sidebar: {
    width: 292,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    padding: 24,
    justifyContent: 'space-between',
    ...SHADOWS.subtle,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  mobileBrand: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexShrink: 0,
  },
  brandText: {
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: 16,
  },
  pulseDot: {
    position: 'absolute',
    right: -3,
    top: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  brandTitle: {
    fontSize: 21,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: '#0F172A',
  },
  brandSubtitle: {
    color: '#64748B',
    marginTop: 2,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  navStack: {
    gap: 12,
  },
  navButton: {
    minHeight: 64,
    borderRadius: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeNavButton: {
    backgroundColor: '#ECFDF5',
    borderColor: '#BBF7D0',
  },
  navIconBox: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#EDF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeNavIconBox: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
  },
  navText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    flex: 1,
  },
  activeNavText: {
    color: '#047857',
  },
  profileBadge: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#047857',
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  profileTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    color: '#0F172A',
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: 13,
  },
  profileRole: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  sidebarFooter: {
    gap: 10,
  },
  logoutButton: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  logoutButtonText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  mobileNav: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...SHADOWS.subtle,
  },
  mobileNavList: {
    gap: 8,
    alignItems: 'center',
  },
  mobileNavButton: {
    height: 48,
    minWidth: 104,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  activeMobileNavButton: {
    backgroundColor: '#ECFDF5',
    borderColor: '#BBF7D0',
  },
  mobileNavText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: TYPOGRAPHY.weights.semiBold,
    maxWidth: 86,
  },
  topBar: {
    minHeight: 76,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    flexWrap: 'wrap',
    position: 'relative',
    zIndex: 20,
  },
  topContext: {
    flex: 1,
    minWidth: 240,
  },
  contextText: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  clockText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: 2,
  },
  contextSubtext: {
    color: '#64748B',
    marginTop: 3,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.medium,
    lineHeight: 18,
    maxWidth: 760,
  },
  connectionPill: {
    minHeight: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  offlinePill: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#047857',
  },
  offlineDot: {
    backgroundColor: '#DC2626',
  },
  connectionText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weights.bold,
    textTransform: 'capitalize',
  },
  typeCursor: {
    color: '#047857',
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  typeCursorHidden: {
    opacity: 0,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    position: 'relative',
    zIndex: 25,
  },
  statePanel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  warningStatePanel: {
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
  },
  stateBody: {
    flex: 1,
    minWidth: 0,
  },
  stateTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  stateText: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  stateButton: {
    minHeight: 38,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  stateButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  completionCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
    padding: 14,
    marginBottom: 14,
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  completionTitle: {
    color: '#064E3B',
    fontSize: 14,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  completionText: {
    color: '#047857',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  completionPercent: {
    color: '#064E3B',
    fontSize: 20,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  completionTrack: {
    height: 8,
    borderRadius: 8,
    backgroundColor: '#BBF7D0',
    overflow: 'hidden',
    marginTop: 12,
  },
  completionFill: {
    height: 8,
    borderRadius: 8,
    backgroundColor: '#047857',
  },
  completionButton: {
    alignSelf: 'flex-start',
    minHeight: 36,
    borderRadius: 8,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginTop: 12,
  },
  completionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeBellButton: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  topLogoutButton: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topLogoutText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  bellBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    position: 'absolute',
    top: 5,
    right: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  notificationPanel: {
    position: 'absolute',
    top: 54,
    right: 0,
    maxHeight: 540,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDE6F0',
    backgroundColor: '#FFFFFF',
    zIndex: 60,
    overflow: 'hidden',
    ...SHADOWS.premium,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  notificationPanelTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  notificationPanelSubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 3,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  notificationCloseButton: {
    minHeight: 34,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 11,
  },
  notificationCloseText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  notificationList: {
    maxHeight: 430,
    padding: 14,
  },
  notificationEmpty: {
    minHeight: 130,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  notificationEmptyTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  notificationEmptyText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  notificationCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  notificationSeverityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
    marginTop: 5,
  },
  criticalDot: {
    backgroundColor: '#DC2626',
  },
  warningDot: {
    backgroundColor: '#D97706',
  },
  notificationCardBody: {
    flex: 1,
    minWidth: 0,
  },
  notificationType: {
    color: '#047857',
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  notificationCardTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: 3,
  },
  notificationCardText: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  notificationStatus: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 6,
    fontWeight: TYPOGRAPHY.weights.bold,
    textTransform: 'uppercase',
  },
  notificationReadButton: {
    minHeight: 32,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  notificationReadText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  alertBanner: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FBBF24',
    backgroundColor: '#FFFBEB',
    padding: 16,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    flexWrap: 'wrap',
    ...SHADOWS.subtle,
  },
  alertText: {
    color: '#92400E',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  alertActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  alertButton: {
    height: 38,
    borderRadius: 8,
    backgroundColor: '#047857',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertButtonText: {
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: 12,
  },
  dismissButton: {
    height: 38,
    borderRadius: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    color: '#92400E',
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: 12,
  },
  sectionHeader: {
    marginBottom: 18,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  sectionSubtitle: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
});

const styles = (metrics, isDesktop) =>
  StyleSheet.create({
    app: {
      flex: 1,
      flexDirection: isDesktop ? 'row' : 'column',
      backgroundColor: '#F4F7FB',
    },
    workspace: {
      flex: 1,
      minWidth: 0,
      backgroundColor: '#F4F7FB',
    },
    scroller: {
      flex: 1,
    },
    content: {
      padding: metrics.isPhone ? 14 : 24,
      paddingBottom: metrics.isPhone ? 104 : 42,
      maxWidth: 1240,
      width: '100%',
      alignSelf: 'center',
    },
  });

const dashboardStyles = StyleSheet.create({
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: Platform.OS === 'web' ? '23%' : 250,
    minWidth: 210,
    minHeight: 148,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    position: 'relative',
    ...SHADOWS.premium,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: 'absolute',
    top: 18,
    right: 18,
  },
  cardLabel: {
    color: '#64748B',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  cardValue: {
    color: '#0F172A',
    fontSize: 25,
    lineHeight: 32,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: 18,
  },
  cardHelper: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 10,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  statisticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
  },
  statisticCard: {
    flexGrow: 1,
    flexBasis: Platform.OS === 'web' ? '23%' : 180,
    minWidth: 158,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDE6F0',
    backgroundColor: '#F8FAFC',
    padding: 14,
  },
  clinicalStatisticCard: {
    backgroundColor: '#FFFFFF',
    position: 'relative',
    overflow: 'hidden',
    ...SHADOWS.subtle,
  },
  clinicalStatRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  statLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  statValue: {
    color: '#0F172A',
    fontSize: 22,
    lineHeight: 28,
    marginTop: 8,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  statDetail: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  clinicalToolbar: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDE6F0',
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    ...SHADOWS.subtle,
  },
  clinicalRefreshText: {
    flex: 1,
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  clinicalRefreshButton: {
    minHeight: 38,
    borderRadius: 8,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  clinicalRefreshButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  clinicalActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
    marginBottom: 14,
  },
  clinicalActionCard: {
    flexGrow: 1,
    flexBasis: Platform.OS === 'web' ? '31%' : 220,
    minWidth: 210,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    backgroundColor: '#ECFDF5',
    padding: 14,
  },
  clinicalActionTitle: {
    color: '#064E3B',
    fontSize: 13,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  clinicalActionText: {
    color: '#047857',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  riskPanel: {
    marginTop: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDE6F0',
    backgroundColor: '#FFFFFF',
    padding: 16,
    ...SHADOWS.subtle,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  riskTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  riskBadge: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  riskColumns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  riskColumn: {
    flex: 1,
    minWidth: 240,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  riskColumnTitle: {
    color: '#334155',
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 8,
  },
  riskText: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: TYPOGRAPHY.weights.medium,
    marginBottom: 5,
  },
  chartBlock: {
    marginTop: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 18,
    ...SHADOWS.premium,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  chartTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  chartSubtitle: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 3,
  },
  chartPill: {
    color: '#047857',
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: 12,
  },
  chartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  legendText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  chartCanvas: {
    minHeight: 240,
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-around',
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 10,
    overflow: 'hidden',
  },
  chartEmptyState: {
    flex: 1,
    minHeight: 178,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  chartEmptyTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  chartEmptyText: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 420,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  chartColumn: {
    flex: 1,
    minWidth: 42,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chartPlot: {
    height: 178,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  chartPoint: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#047857',
    borderWidth: 3,
    borderColor: '#BBF7D0',
    zIndex: 2,
  },
  chartSegment: {
    position: 'absolute',
    left: '50%',
    width: 58,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#86EFAC',
    zIndex: 1,
  },
  barPair: {
    width: 28,
    height: 138,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  oxygenBar: {
    width: 12,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#2563EB',
  },
  tempBar: {
    width: 12,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  chartAxisLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: 8,
    maxWidth: 58,
  },
  chartFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  chartFootnote: {
    color: '#64748B',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  scoreChartCanvas: {
    minHeight: 178,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingTop: 18,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    gap: 8,
  },
  scoreColumn: {
    flex: 1,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  scoreChartValue: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 6,
  },
  scoreBar: {
    width: 22,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
});

const formStyles = StyleSheet.create({
  recordGuide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  recordGuideItem: {
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordGuideIcon: {
    color: '#047857',
    fontSize: 16,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  recordGuideText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  formCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 22,
    gap: 22,
    ...SHADOWS.premium,
  },
  formSection: {
    gap: 12,
  },
  formLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  formLabel: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  temperatureValue: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  sliderWrap: {
    gap: 10,
  },
  sliderTrack: {
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    position: 'relative',
    justifyContent: 'center',
  },
  sliderFill: {
    height: 16,
    borderRadius: 8,
  },
  sliderThumb: {
    position: 'absolute',
    marginLeft: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    ...SHADOWS.subtle,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  numericGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  numericBlock: {
    flexGrow: 1,
    flexBasis: Platform.OS === 'web' ? '46%' : 260,
    minWidth: 240,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDE6F0',
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  numericBlockAlert: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  numericLabel: {
    color: '#64748B',
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  numericInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  numericInput: {
    color: '#0F172A',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: TYPOGRAPHY.weights.bold,
    minWidth: 86,
    padding: 0,
  },
  numericSuffix: {
    color: '#64748B',
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 6,
    marginLeft: 6,
  },
  microText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 10,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  microTextAlert: {
    color: '#DC2626',
  },
  symptomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  symptomPill: {
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDE6F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeSymptomPill: {
    backgroundColor: '#ECFDF5',
    borderColor: '#34D399',
  },
  symptomText: {
    color: '#475569',
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  activeSymptomText: {
    color: '#047857',
  },
  submitButton: {
    minHeight: 54,
    borderRadius: 8,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    ...SHADOWS.subtle,
  },
  disabledSubmitButton: {
    opacity: 0.62,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: 15,
    textAlign: 'center',
  },
  savedText: {
    color: '#047857',
    fontWeight: TYPOGRAPHY.weights.semiBold,
    fontSize: 13,
  },
  validationText: {
    color: '#B91C1C',
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    fontSize: 13,
  },
});

const insightStyles = StyleSheet.create({
  insightMetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  insightMetricCard: {
    flexGrow: 1,
    flexBasis: Platform.OS === 'web' ? '30%' : 220,
    minWidth: 210,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDE6F0',
    backgroundColor: '#FFFFFF',
    padding: 15,
    ...SHADOWS.subtle,
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  metricValue: {
    color: '#0F172A',
    fontSize: 22,
    lineHeight: 28,
    marginTop: 8,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  metricDetail: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  warningBanner: {
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 16,
    marginBottom: 16,
  },
  warningTitle: {
    color: '#B91C1C',
    fontSize: 16,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  warningText: {
    color: '#991B1B',
    marginTop: 6,
    lineHeight: 20,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  warningActions: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  warningPrimaryButton: {
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: '#B91C1C',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  warningPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  warningHelpText: {
    flex: 1,
    minWidth: 220,
    color: '#7F1D1D',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  appointmentMessage: {
    color: '#7F1D1D',
    marginTop: 10,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  locationInput: {
    flexGrow: 1,
    flexBasis: Platform.OS === 'web' ? '42%' : 220,
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    color: '#7F1D1D',
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  insightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  insightPanel: {
    flexGrow: 1,
    flexBasis: Platform.OS === 'web' ? '47%' : 300,
    minWidth: 280,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 18,
    ...SHADOWS.premium,
  },
  panelTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  panelSubtitle: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  dietColumns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  dietColumn: {
    flex: 1,
    minWidth: 180,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  dietHeading: {
    color: '#047857',
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 10,
  },
  restrictHeading: {
    color: '#B91C1C',
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 10,
  },
  dietItem: {
    color: '#166534',
    marginBottom: 8,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  restrictItem: {
    color: '#991B1B',
    marginBottom: 8,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  taskRow: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedBox: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  checkText: {
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  taskText: {
    color: '#334155',
    fontWeight: TYPOGRAPHY.weights.semiBold,
    flex: 1,
  },
  checkedTaskText: {
    color: '#047857',
  },
  readinessRow: {
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  readinessDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#047857',
  },
  readinessText: {
    flex: 1,
    color: '#334155',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  medFormGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  medInput: {
    flexGrow: 1,
    flexBasis: Platform.OS === 'web' ? '30%' : 160,
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDE6F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    color: '#0F172A',
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  messageInput: {
    minHeight: 72,
    textAlignVertical: 'top',
    paddingVertical: 10,
  },
  medButton: {
    height: 42,
    borderRadius: 8,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  medButtonText: {
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  medMessage: {
    color: '#047857',
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    marginTop: 8,
  },
  medRow: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 12,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  medInfo: {
    flex: 1,
    minWidth: 0,
  },
  medName: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  medMeta: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 3,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  medActions: {
    flexDirection: 'row',
    gap: 6,
  },
  medTinyButton: {
    minHeight: 34,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
  },
  medTinyText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  medMissedButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  medMissedText: {
    color: '#B91C1C',
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  emptyPanelText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  recommendationRow: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 12,
    marginBottom: 9,
  },
  recommendationTitle: {
    color: '#047857',
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 4,
  },
  recommendationText: {
    color: '#334155',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  alertRow: {
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 10,
    marginTop: 6,
  },
  alertRowText: {
    color: '#991B1B',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  notificationRow: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  notificationBody: {
    flex: 1,
    minWidth: 0,
  },
  notificationTitle: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 4,
  },
  notificationText: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  readButton: {
    minHeight: 34,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  readButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  appointmentRow: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 12,
    marginBottom: 10,
  },
  selectedAppointmentRow: {
    borderColor: '#047857',
    backgroundColor: '#ECFDF5',
  },
  appointmentTitle: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 5,
  },
  appointmentText: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  messageRow: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDE6F0',
    backgroundColor: '#F8FAFC',
    padding: 12,
    marginTop: 10,
  },
  messageTitle: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 5,
    textTransform: 'capitalize',
  },
  messageText: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  detailPanel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDE6F0',
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginTop: 12,
  },
  detailTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 8,
  },
  detailSubtitle: {
    color: '#047857',
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: 12,
    marginBottom: 6,
  },
  threadBubble: {
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginTop: 8,
  },
  threadTime: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    marginTop: 6,
  },
});

const profileStyles = StyleSheet.create({
  profileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  profilePanel: {
    flexGrow: 1,
    flexBasis: Platform.OS === 'web' ? '34%' : 300,
    minWidth: 280,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 18,
    ...SHADOWS.premium,
  },
  historyPanel: {
    flexGrow: 2,
    flexBasis: Platform.OS === 'web' ? '58%' : 340,
    minWidth: 320,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 18,
    ...SHADOWS.premium,
  },
  reportPanel: {
    flexGrow: 1,
    flexBasis: Platform.OS === 'web' ? '47%' : 320,
    minWidth: 300,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 18,
    ...SHADOWS.premium,
  },
  panelTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 16,
  },
  reportSubtitle: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  reportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  reportActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  exportButton: {
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  reportMetric: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 90,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  reportMetricLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  reportMetricValue: {
    color: '#0F172A',
    fontSize: 20,
    marginTop: 5,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  scoreRow: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 11,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scoreValue: {
    color: '#047857',
    fontSize: 15,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  scoreText: {
    flex: 1,
    color: '#334155',
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  emptyReportText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  patientRow: {
    minHeight: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  patientName: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  patientMeta: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 3,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  patientAlerts: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  patientActionStack: {
    alignItems: 'flex-end',
    gap: 7,
  },
  reviewButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  reviewButton: {
    minHeight: 32,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
  },
  reviewButtonText: {
    color: '#047857',
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  followUpButton: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  followUpButtonText: {
    color: '#92400E',
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  fieldGrid: {
    gap: 12,
  },
  field: {
    gap: 7,
  },
  fieldLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  fieldInputRow: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDE6F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 16,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  fieldSuffix: {
    color: '#64748B',
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  saveButton: {
    height: 48,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  saveStateText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    marginTop: 10,
  },
  tableHeader: {
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  tableRow: {
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  th: {
    flex: 1,
    color: '#475569',
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  td: {
    flex: 1,
    color: '#334155',
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  dateCell: {
    flex: 1.6,
  },
  statusCell: {
    flex: 1,
    color: '#047857',
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  urgentStatus: {
    color: '#DC2626',
  },
  reportPreview: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDE6F0',
    backgroundColor: '#F8FAFC',
    padding: 12,
    marginTop: 12,
    maxHeight: 260,
  },
  reportPreviewTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 8,
  },
  reportPreviewText: {
    color: '#334155',
    fontSize: 11,
    lineHeight: 17,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
});

const settingsStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  panel: {
    flexGrow: 1,
    flexBasis: Platform.OS === 'web' ? '31%' : 300,
    minWidth: 280,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 18,
    ...SHADOWS.premium,
  },
  panelTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 12,
  },
  statusLine: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    marginBottom: 7,
  },
  errorLine: {
    color: '#B91C1C',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    marginVertical: 8,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  primaryButton: {
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  secondaryButton: {
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  dangerButton: {
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: '#B91C1C',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  toggleRow: {
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleCopy: {
    flex: 1,
    minWidth: 0,
  },
  toggleSwitch: {
    width: 38,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#94A3B8',
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: '#99D8CF',
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    ...SHADOWS.subtle,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
    backgroundColor: '#009688',
  },
  toggleTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  toggleHint: {
    color: '#64748B',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  stateText: {
    color: '#047857',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    marginTop: 12,
  },
});

export default AppNavigator;
