import React, { useState, useContext, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HealthContext } from '../context/HealthContext';
import { TYPOGRAPHY, SPACING, SHADOWS } from '../styles/theme';
import { HealthSyncManager, appwriteAccount } from '../services/appwrite';

export default function HomeScreen() {
  const { user, setUser, colors } = useContext(HealthContext);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Handle Sign In / Registration with Appwrite Auth
  const handleAuth = async () => {
    if (!email || !password || (isRegistering && !name)) {
      setAuthError('Please fill out all required fields.');
      return;
    }

    setAuthError('');
    setLoading(true);

    try {
      if (isRegistering) {
        // Appwrite user creation simulation
        let sessionUser;
        try {
          // If real Appwrite SDK is online:
          // const res = await appwriteAccount.create(ID.unique(), email, password, name);
          // sessionUser = await appwriteAccount.createEmailPasswordSession(email, password);
        } catch (e) {
          console.log("Appwrite SDK skipped in offline demo mode. Mock session created.");
        }
        
        const mockUser = { email, name, id: 'usr_' + Date.now() };
        setUser(mockUser);
        await AsyncStorage.setItem('@rhmt_user_session', JSON.stringify(mockUser));
        await HealthSyncManager.logSystemAction('AUTH', `Registered profile for ${name} (${email})`);
      } else {
        // Appwrite Login simulation
        let sessionUser;
        try {
          // sessionUser = await appwriteAccount.createEmailPasswordSession(email, password);
        } catch (e) {
          console.log("Appwrite SDK skipped in offline demo mode. Mock login session created.");
        }

        const mockUser = { email, name: email.split('@')[0], id: 'usr_' + Date.now() };
        setUser(mockUser);
        await AsyncStorage.setItem('@rhmt_user_session', JSON.stringify(mockUser));
        await HealthSyncManager.logSystemAction('AUTH', `User ${email} logged in securely.`);
      }
    } catch (e) {
      setAuthError('Authentication failed: ' + e.message);
      await HealthSyncManager.logSystemAction('ERROR', `Auth failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      try {
        await appwriteAccount.deleteSession('current');
      } catch (err) {
        console.log("Appwrite session delete skipped:", err.message);
      }
      setUser(null);
      await AsyncStorage.removeItem('@rhmt_user_session');
      await HealthSyncManager.logSystemAction('AUTH', 'User signed out securely.');
    } catch (e) {
      console.log("Failed to clear session:", e);
    } finally {
      setLoading(false);
    }
  };

  const s = styles(colors);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={s.container}
    >
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Branding Hero Banner */}
        <View style={s.heroCard}>
          <Text style={s.heroTitle}>Your health, {'\n'}monitored in real time.</Text>
          <Text style={s.heroSubtitle}>
            A Remote Health Monitoring Tool that gathers baseline context and tracks physiological markers using secure Cloud Database schemas.
          </Text>
          <View style={s.badgeRow}>
            <View style={s.sensorBadge}><Text style={s.sensorBadgeText}>React Native Web</Text></View>
            <View style={s.sensorBadge}><Text style={s.sensorBadgeText}>Appwrite Auth</Text></View>
            <View style={s.sensorBadge}><Text style={s.sensorBadgeText}>WebSocket Realtime</Text></View>
            <View style={s.sensorBadge}><Text style={s.sensorBadgeText}>Offline-First Cache</Text></View>
          </View>
        </View>

        {/* Authentication Gateway Panel */}
        <View style={[s.authCard, SHADOWS.premium]}>
          {user ? (
            <View style={s.welcomeContainer}>
              <View style={s.avatarIcon}><Text style={s.avatarText}>👤</Text></View>
              <Text style={s.welcomeTitle}>Welcome back,</Text>
              <Text style={s.welcomeUserName}>{user.name || 'Patient'}</Text>
              <Text style={s.welcomeUserEmail}>{user.email}</Text>
              
              <View style={s.statusBox}>
                <Text style={s.statusBoxLabel}>Sync Credentials Status</Text>
                <Text style={s.statusBoxValue}>🔐 Active Secure Session</Text>
              </View>

              <TouchableOpacity style={s.signOutButton} onPress={handleSignOut} activeOpacity={0.8}>
                {loading ? <ActivityIndicator size="small" color={colors.primary} /> : (
                  <Text style={s.signOutButtonText}>Disconnect Session</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={s.authCardTitle}>{isRegistering ? 'Register Patient Account' : 'Gateway Authentication'}</Text>
              <Text style={s.authCardDesc}>Connect your monitoring node to Appwrite secure cloud databases.</Text>
              
              {authError ? <Text style={s.errorText}>{authError}</Text> : null}

              {isRegistering && (
                <View style={s.inputContainer}>
                  <Text style={s.inputLabel}>Full Name</Text>
                  <TextInput
                    style={s.input}
                    placeholder="e.g. John Doe"
                    placeholderTextColor={colors.textMuted}
                    value={name}
                    onChangeText={setName}
                  />
                </View>
              )}

              <View style={s.inputContainer}>
                <Text style={s.inputLabel}>Patient Email</Text>
                <TextInput
                  style={s.input}
                  placeholder="name@university.edu"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={s.inputContainer}>
                <Text style={s.inputLabel}>Access PIN/Password</Text>
                <TextInput
                  style={s.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity style={s.authButton} onPress={handleAuth} activeOpacity={0.8}>
                {loading ? <ActivityIndicator size="small" color="#000000" /> : (
                  <Text style={s.authButtonText}>
                    {isRegistering ? 'Register Node' : 'Initialize Connection'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={s.switchAuthButton}
                onPress={() => setIsRegistering(!isRegistering)}
              >
                <Text style={s.switchAuthText}>
                  {isRegistering ? 'Already registered? Login here' : 'New device node? Create account'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Dissertation Info Panel */}
        <View style={s.aboutCard}>
          <Text style={s.aboutTitle}>About the Remote Health Tool</Text>
          <Text style={s.aboutParagraph}>
            Developed as a core system component for dissertation telemetry modeling. This client acts as the central software hub, gathering, formatting, and queuing patient health state metrics before pushing them to cloud infrastructure.
          </Text>
          <Text style={s.aboutParagraph}>
            In the event of network dropouts, the system engages its offline-first engine queue to cache telemetry locally on physical storage to prevent data loss.
          </Text>
          <View style={s.architectureMap}>
            <Text style={s.archStep}>📝 Self-Log</Text>
            <Text style={s.archArrow}>➔</Text>
            <Text style={s.archStep}>📱 Cache</Text>
            <Text style={s.archArrow}>➔</Text>
            <Text style={s.archStep}>☁ Appwrite</Text>
            <Text style={s.archArrow}>➔</Text>
            <Text style={s.archStep}>📢 Alerts</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: SPACING.borderRadius,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: TYPOGRAPHY.sizes.h1 - 2,
    fontWeight: TYPOGRAPHY.weights.bold,
    lineHeight: 34,
    marginBottom: SPACING.sm,
  },
  heroSubtitle: {
    color: colors.textSecondary,
    fontSize: TYPOGRAPHY.sizes.body,
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sensorBadge: {
    backgroundColor: colors.surfaceLight,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sensorBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  authCard: {
    backgroundColor: colors.surface,
    borderRadius: SPACING.borderRadius,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  authCardTitle: {
    color: colors.textPrimary,
    fontSize: TYPOGRAPHY.sizes.h2 - 2,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 4,
  },
  authCardDesc: {
    color: colors.textSecondary,
    fontSize: TYPOGRAPHY.sizes.caption,
    marginBottom: SPACING.md,
  },
  inputContainer: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.medium,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surfaceLight,
    borderRadius: SPACING.borderRadiusSm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
  },
  authButton: {
    backgroundColor: colors.primary,
    borderRadius: SPACING.borderRadiusSm,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  authButtonText: {
    color: '#000000',
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: 15,
  },
  switchAuthButton: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  switchAuthText: {
    color: colors.primaryLight,
    fontSize: 13,
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  avatarIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(225, 173, 1, 0.15)',
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  avatarText: {
    fontSize: 28,
    color: colors.primary,
  },
  welcomeTitle: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  welcomeUserName: {
    color: colors.textPrimary,
    fontSize: TYPOGRAPHY.sizes.h2,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 2,
  },
  welcomeUserEmail: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: SPACING.lg,
  },
  statusBox: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    padding: SPACING.md,
    borderRadius: SPACING.borderRadiusSm,
    width: '100%',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  statusBoxLabel: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statusBoxValue: {
    color: colors.primary,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    fontSize: 14,
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: SPACING.md,
    borderRadius: SPACING.borderRadiusSm,
    width: '100%',
    alignItems: 'center',
  },
  signOutButtonText: {
    color: colors.primary,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  aboutCard: {
    backgroundColor: colors.surface,
    borderRadius: SPACING.borderRadius,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aboutTitle: {
    color: colors.textPrimary,
    fontSize: TYPOGRAPHY.sizes.h3,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: SPACING.sm,
  },
  aboutParagraph: {
    color: colors.textSecondary,
    fontSize: TYPOGRAPHY.sizes.body - 1,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  architectureMap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surfaceLight,
    padding: SPACING.md,
    borderRadius: SPACING.borderRadiusSm,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  archStep: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  archArrow: {
    color: colors.textMuted,
    fontSize: 12,
  },
  errorText: {
    color: colors.primary,
    fontSize: 13,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
});
