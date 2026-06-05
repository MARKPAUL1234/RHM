import React, { useContext, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HealthContext } from '../context/HealthContext';
import { TYPOGRAPHY, SPACING, SHADOWS, getResponsiveMetrics } from '../styles/theme';
import djangoApi, { setAuthToken } from '../services/django_api';

export default function HomeScreen() {
  const { user, setUser, colors } = useContext(HealthContext);
  const { width } = useWindowDimensions();
  const metrics = getResponsiveMetrics(width);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isRecoveringAccount, setIsRecoveringAccount] = useState(false);

  const handleAuth = async () => {
    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim();

    if (!password || !normalizedUsername) {
      setAuthError('Username and password are required.');
      return;
    }

    setAuthError('');
    setLoading(true);

    try {
      if (isRegistering) {
        await djangoApi.register(
          normalizedUsername,
          normalizedEmail || `${normalizedUsername}@rhmt.app`,
          password
        );
      }

      await djangoApi.login(normalizedUsername, password);
      const currentUser = await djangoApi.getCurrentUser();
      const userObj = {
        id: currentUser.id,
        username: currentUser.username,
        email: currentUser.email || `${currentUser.username}@rhmt.app`,
        name: currentUser.username,
      };

      setUser(userObj);
      await AsyncStorage.setItem('@rhmt_user_session', JSON.stringify(userObj));
    } catch (e) {
      setAuthError(e.message || 'Authentication failed. Check your credentials and backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryNotice = () => {
    const identifier = username.trim() || email.trim();
    setAuthError(
      identifier
        ? `Password reset is not enabled on this backend yet. Ask an administrator to reset ${identifier} in Django Admin.`
        : 'Enter your username or email, then ask an administrator to reset the account in Django Admin.'
    );
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      setUser(null);
      setAuthToken(null);
      await djangoApi.logout();
      await AsyncStorage.removeItem('@rhmt_user_session');
      await AsyncStorage.removeItem('@rhmt_auth_token');
      await AsyncStorage.removeItem('@rhmt_refresh_token');
    } finally {
      setLoading(false);
    }
  };

  const s = styles(colors, metrics);

  if (user) {
    return (
      <View style={s.container}>
        <View style={[s.sessionCard, SHADOWS.subtle]}>
          <View style={s.brandMark}>
            <Text style={s.brandMarkText}>RH</Text>
          </View>
          <Text style={s.pageTitle}>Session active</Text>
          <Text style={s.pageSubtitle}>{user.username} is connected to the Django backend.</Text>
          <TouchableOpacity style={s.outlineButton} onPress={handleSignOut}>
            <Text style={s.outlineButtonText}>{loading ? 'Signing out...' : 'Sign out'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={s.container}
    >
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.pageInner}>
          <View style={s.authLayout}>
            <View style={s.introPanel}>
              <View style={s.brandRow}>
                <View style={s.brandMark}>
                  <Text style={s.brandMarkText}>RH</Text>
                </View>
                <View>
                  <Text style={s.brandTitle}>RHMT</Text>
                  <Text style={s.brandSubtitle}>Remote Health Monitoring Tool</Text>
                </View>
              </View>

              <Text style={s.pageTitle}>Clinical monitoring workspace</Text>
              <Text style={s.pageSubtitle}>
                Secure patient journals, alerts, nutrition logs, emergency events, and backend health records in one responsive app.
              </Text>

              <View style={s.capabilityGrid}>
                {[
                  ['Records', 'Django health journals'],
                  ['Alerts', 'Rule-generated warnings'],
                  ['Care', 'Nutrition and fitness plans'],
                  ['Offline', 'Queued sync support'],
                ].map(([title, detail]) => (
                  <View key={title} style={s.capabilityItem}>
                    <Text style={s.capabilityTitle}>{title}</Text>
                    <Text style={s.capabilityDetail}>{detail}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[s.authCard, SHADOWS.premium]}>
              <Text style={s.authTitle}>{isRecoveringAccount ? 'Recover account' : isRegistering ? 'Create account' : 'Access dashboard'}</Text>
              <Text style={s.authDescription}>
                {isRecoveringAccount
                  ? 'This frontend will not fake password reset. Use the real Django admin reset process until a reset endpoint exists.'
                  : isRegistering
                  ? 'Register a patient account and initialize a Django profile.'
                  : 'Sign in with a Django user to load real backend data.'}
              </Text>

              {authError ? (
                <View style={s.errorBox}>
                  <Text style={s.errorText}>{authError}</Text>
                </View>
              ) : null}

              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Username</Text>
                <TextInput
                  style={s.input}
                  placeholder="Enter username"
                  placeholderTextColor={colors.textMuted}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {isRegistering || isRecoveringAccount ? (
                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Email</Text>
                  <TextInput
                    style={s.input}
                    placeholder="email@example.com"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                  />
                </View>
              ) : null}

              {!isRecoveringAccount ? (
                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Password</Text>
                  <TextInput
                    style={s.input}
                    placeholder="Password"
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCorrect={false}
                  />
                </View>
              ) : null}

              <TouchableOpacity style={[s.authButton, loading && s.disabledButton]} onPress={isRecoveringAccount ? handleRecoveryNotice : handleAuth} disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={s.authButtonText}>{isRecoveringAccount ? 'Show Recovery Step' : isRegistering ? 'Create account' : 'Sign in'}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={s.switchAuth}
                onPress={() => {
                  setIsRegistering((value) => !value);
                  setIsRecoveringAccount(false);
                  setAuthError('');
                }}
              >
                <Text style={s.switchAuthText}>
                  {isRegistering ? 'Already registered? Sign in' : 'New patient? Create an account'}
                </Text>
              </TouchableOpacity>
              {!isRegistering ? (
                <TouchableOpacity
                  style={s.switchAuth}
                  onPress={() => {
                    setIsRecoveringAccount((value) => !value);
                    setAuthError('');
                  }}
                >
                  <Text style={s.switchAuthText}>
                    {isRecoveringAccount ? 'Back to sign in' : 'Forgot password?'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (colors, metrics) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: metrics.pagePadding,
    justifyContent: 'center',
  },
  pageInner: {
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
  },
  authLayout: {
    flexDirection: metrics.isPhone ? 'column' : 'row',
    alignItems: 'stretch',
    gap: SPACING.md,
  },
  introPanel: {
    flex: 1.2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: metrics.isPhone ? SPACING.lg : SPACING.xl,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  brandTitle: {
    color: colors.textPrimary,
    fontSize: TYPOGRAPHY.sizes.h3,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  brandSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  pageTitle: {
    color: colors.textPrimary,
    fontSize: metrics.isPhone ? 26 : 34,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: SPACING.sm,
  },
  pageSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 620,
  },
  capabilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
  },
  capabilityItem: {
    flexGrow: 1,
    flexBasis: metrics.isPhone ? '47%' : '45%',
    minWidth: 140,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: SPACING.md,
  },
  capabilityTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 4,
  },
  capabilityDetail: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  authCard: {
    flex: 0.8,
    minWidth: metrics.isPhone ? '100%' : 340,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: metrics.isPhone ? SPACING.lg : SPACING.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  authTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 6,
  },
  authDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: SPACING.lg,
  },
  errorBox: {
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 8,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 6,
  },
  input: {
    minHeight: 44,
    backgroundColor: colors.elevated,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
  },
  authButton: {
    minHeight: 44,
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xs,
  },
  disabledButton: {
    opacity: 0.65,
  },
  authButtonText: {
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: 14,
  },
  switchAuth: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  switchAuthText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  sessionCard: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    marginTop: SPACING.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: SPACING.xl,
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  outlineButton: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },
  outlineButtonText: {
    color: colors.primary,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
});
