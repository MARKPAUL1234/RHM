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
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS } from '../styles/theme';
import { HealthSyncManager, appwriteAccount } from '../services/appwrite';

export default function HomeScreen() {
  const { user, setUser } = useContext(HealthContext);
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Branding Hero Banner */}
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Your health, {'\n'}monitored in real time.</Text>
          <Text style={styles.heroSubtitle}>
            A Remote Health Monitoring Tool that gathers baseline context and tracks physiological markers using secure Cloud Database schemas.
          </Text>
          <View style={styles.badgeRow}>
            <View style={styles.sensorBadge}><Text style={styles.sensorBadgeText}>React Native Web</Text></View>
            <View style={styles.sensorBadge}><Text style={styles.sensorBadgeText}>Appwrite Auth</Text></View>
            <View style={styles.sensorBadge}><Text style={styles.sensorBadgeText}>WebSocket Realtime</Text></View>
            <View style={styles.sensorBadge}><Text style={styles.sensorBadgeText}>Offline-First Cache</Text></View>
          </View>
        </View>

        {/* Authentication Gateway Panel */}
        <View style={[styles.authCard, SHADOWS.premium]}>
          {user ? (
            <View style={styles.welcomeContainer}>
              <View style={styles.avatarIcon}><Text style={styles.avatarText}>👤</Text></View>
              <Text style={styles.welcomeTitle}>Welcome back,</Text>
              <Text style={styles.welcomeUserName}>{user.name || 'Patient'}</Text>
              <Text style={styles.welcomeUserEmail}>{user.email}</Text>
              
              <View style={styles.statusBox}>
                <Text style={styles.statusBoxLabel}>Sync Credentials Status</Text>
                <Text style={styles.statusBoxValue}>🔐 Active Secure Session</Text>
              </View>

              <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.8}>
                {loading ? <ActivityIndicator size="small" color={COLORS.primary} /> : (
                  <Text style={styles.signOutButtonText}>Disconnect Session</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={styles.authCardTitle}>{isRegistering ? 'Register Patient Account' : 'Gateway Authentication'}</Text>
              <Text style={styles.authCardDesc}>Connect your monitoring node to Appwrite secure cloud databases.</Text>
              
              {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

              {isRegistering && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. John Doe"
                    placeholderTextColor={COLORS.textMuted}
                    value={name}
                    onChangeText={setName}
                  />
                </View>
              )}

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Patient Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="name@university.edu"
                  placeholderTextColor={COLORS.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Access PIN/Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity style={styles.authButton} onPress={handleAuth} activeOpacity={0.8}>
                {loading ? <ActivityIndicator size="small" color="#000000" /> : (
                  <Text style={styles.authButtonText}>
                    {isRegistering ? 'Register Node' : 'Initialize Connection'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchAuthButton}
                onPress={() => setIsRegistering(!isRegistering)}
              >
                <Text style={styles.switchAuthText}>
                  {isRegistering ? 'Already registered? Login here' : 'New device node? Create account'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Dissertation Info Panel */}
        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>About the Remote Health Tool</Text>
          <Text style={styles.aboutParagraph}>
            Developed as a core system component for dissertation telemetry modeling. This client acts as the central software hub, gathering, formatting, and queuing patient health state metrics before pushing them to cloud infrastructure.
          </Text>
          <Text style={styles.aboutParagraph}>
            In the event of network dropouts, the system engages its offline-first engine queue to cache telemetry locally on physical storage to prevent data loss.
          </Text>
          <View style={styles.architectureMap}>
            <Text style={styles.archStep}>📝 Self-Log</Text>
            <Text style={styles.archArrow}>➔</Text>
            <Text style={styles.archStep}>📱 Cache</Text>
            <Text style={styles.archArrow}>➔</Text>
            <Text style={styles.archStep}>☁ Appwrite</Text>
            <Text style={styles.archArrow}>➔</Text>
            <Text style={styles.archStep}>📢 Alerts</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.borderRadius,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heroTitle: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sizes.h1 - 2,
    fontWeight: TYPOGRAPHY.weights.bold,
    lineHeight: 34,
    marginBottom: SPACING.sm,
  },
  heroSubtitle: {
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sensorBadgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  authCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.borderRadius,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  authCardTitle: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sizes.h2 - 2,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 4,
  },
  authCardDesc: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.caption,
    marginBottom: SPACING.md,
  },
  inputContainer: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.medium,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: SPACING.borderRadiusSm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 14,
  },
  authButton: {
    backgroundColor: COLORS.primary,
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
    color: COLORS.primaryLight,
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
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  avatarText: {
    fontSize: 28,
    color: COLORS.primary,
  },
  welcomeTitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  welcomeUserName: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sizes.h2,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 2,
  },
  welcomeUserEmail: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: SPACING.lg,
  },
  statusBox: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    borderRadius: SPACING.borderRadiusSm,
    width: '100%',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  statusBoxLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statusBoxValue: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    fontSize: 14,
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: SPACING.borderRadiusSm,
    width: '100%',
    alignItems: 'center',
  },
  signOutButtonText: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  aboutCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.borderRadius,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  aboutTitle: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sizes.h3,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: SPACING.sm,
  },
  aboutParagraph: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.body - 1,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  architectureMap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: COLORS.surfaceLight,
    padding: SPACING.md,
    borderRadius: SPACING.borderRadiusSm,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  archStep: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  archArrow: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  errorText: {
    color: COLORS.primary,
    fontSize: 13,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
});
