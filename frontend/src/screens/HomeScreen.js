import React, { useState, useContext, useRef, useEffect } from 'react';
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
  Animated,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HealthContext } from '../context/HealthContext';
import { TYPOGRAPHY, SPACING, SHADOWS } from '../styles/theme';
import djangoApi, { setAuthToken } from '../services/django_api';

function FeatureCard({ icon, title, description, colors }) {
  return (
    <View style={[styles(colors).featureCard, SHADOWS.premium]}>
      <Text style={styles(colors).featureIcon}>{icon}</Text>
      <Text style={styles(colors).featureTitle}>{title}</Text>
      <Text style={styles(colors).featureDescription}>{description}</Text>
    </View>
  );
}

function AnimatedLogo({ colors }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: false,
      }),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [fadeAnim, scaleAnim, pulseAnim]);

  return (
    <Animated.View 
      style={[
        styles(colors).logoContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }
      ]}
    >
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Text style={styles(colors).logoIcon}>🩺</Text>
      </Animated.View>
      <View style={styles(colors).logoTextContainer}>
        <Text style={styles(colors).logoTitle}>RHMT</Text>
        <Text style={styles(colors).logoSubtitle}>REMOTE HEALTH MONITORING TOOL</Text>
      </View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const { user, setUser, colors } = useContext(HealthContext);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleAuth = async () => {
    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim();

    if (!password || !normalizedUsername) {
      setAuthError('Please fill in all required fields.');
      return;
    }

    setAuthError('');
    setLoading(true);

    try {
      if (isRegistering) {
        const newUser = await djangoApi.register(
          normalizedUsername,
          normalizedEmail || `${normalizedUsername}@rhmt.app`,
          password
        );
        await djangoApi.login(normalizedUsername, password);
        
        const userObj = {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email || `${normalizedUsername}@rhmt.app`,
          name: newUser.username,
        };
        
        setUser(userObj);
        await AsyncStorage.setItem('@rhmt_user_session', JSON.stringify(userObj));
      } else {
        await djangoApi.login(normalizedUsername, password);
        const userObj = {
          id: normalizedUsername,
          username: normalizedUsername,
          email: `${normalizedUsername}@rhmt.app`,
          name: normalizedUsername,
        };
        
        setUser(userObj);
        await AsyncStorage.setItem('@rhmt_user_session', JSON.stringify(userObj));
      }
    } catch (e) {
      setAuthError(e.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      setUser(null);
      setAuthToken(null);
      await AsyncStorage.removeItem('@rhmt_user_session');
      await AsyncStorage.removeItem('@rhmt_auth_token');
    } catch (e) {
      console.log("Failed to clear session:", e);
    } finally {
      setLoading(false);
    }
  };

  const s = styles(colors);

  if (user) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.container}
      >
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          <AnimatedLogo colors={colors} />

          <View style={[s.card, SHADOWS.premium]}>
            <View style={s.userHeader}>
              <View style={s.userAvatar}>
                <Text style={s.userAvatarText}>{user.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={s.userInfo}>
                <Text style={s.userName}>{user.name}</Text>
                <Text style={s.userEmail}>{user.email}</Text>
              </View>
            </View>
            
            <View style={s.statusBanner}>
              <View style={s.statusDot} />
              <Text style={s.statusText}>SESSION ACTIVE • DATABASE SYNCED</Text>
            </View>

            <TouchableOpacity 
              style={s.signOutButton} 
              onPress={handleSignOut} 
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={s.signOutButtonText}>DISCONNECT SESSION</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={s.featureSectionTitleContainer}>
            <Text style={s.featureSectionTitle}>DASHBOARD FEATURES</Text>
          </View>

          <View style={s.featuresGrid}>
            <FeatureCard 
              icon="📊" 
              title="Vitals Dashboard" 
              description="Real-time biometric monitoring and analytics"
              colors={colors}
            />
            <FeatureCard 
              icon="🏥" 
              title="Patient Monitoring" 
              description="Continuous health status tracking"
              colors={colors}
            />
            <FeatureCard 
              icon="💡" 
              title="Smart Alerts" 
              description="AI-powered health recommendations"
              colors={colors}
            />
            <FeatureCard 
              icon="🚨" 
              title="Emergency Panel" 
              description="Rapid response protocols"
              colors={colors}
            />
          </View>

          <View style={[s.card, SHADOWS.premium]}>
            <Text style={s.cardTitle}>SYSTEM INFORMATION</Text>
            <Text style={s.cardDescription}>
              RHMT provides secure, real-time remote health monitoring with offline-first architecture
              and clinical-grade data synchronization.
            </Text>
            <View style={s.infoGrid}>
              <View style={s.infoItem}>
                <Text style={s.infoLabel}>API Status</Text>
                <Text style={[s.infoValue, { color: colors.primary }]}>ONLINE</Text>
              </View>
              <View style={s.infoItem}>
                <Text style={s.infoLabel}>Mode</Text>
                <Text style={s.infoValue}>DEVELOPMENT</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={s.container}
    >
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <AnimatedLogo colors={colors} />

        <View style={[s.authCard, SHADOWS.premium]}>
          <View style={s.authHeader}>
            <Text style={s.authTitle}>
              {isRegistering ? 'CREATE ACCOUNT' : 'ACCESS DASHBOARD'}
            </Text>
            <Text style={s.authDescription}>
              {isRegistering 
                ? 'Register your device node to start monitoring'
                : 'Authenticate to access your health monitoring dashboard'}
            </Text>
          </View>

          {authError ? (
            <View style={s.errorBox}>
              <Text style={s.errorIcon}>⚠️</Text>
              <Text style={s.errorText}>{authError}</Text>
            </View>
          ) : null}

          <View style={s.formContainer}>
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>USERNAME</Text>
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

            {isRegistering && (
              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>EMAIL (OPTIONAL)</Text>
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
            )}

            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>PASSWORD</Text>
              <TextInput
                style={s.input}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity 
              style={s.authButton} 
              onPress={handleAuth} 
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Text style={s.authButtonText}>
                  {isRegistering ? 'REGISTER NODE' : 'INITIALIZE SESSION'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={s.switchAuth}
              onPress={() => {
                setIsRegistering(!isRegistering);
                setAuthError('');
              }}
            >
              <Text style={s.switchAuthText}>
                {isRegistering 
                  ? 'Already registered? Sign in' 
                  : 'New node? Create an account'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.featureSectionTitleContainer}>
          <Text style={s.featureSectionTitle}>CLINICAL FEATURES</Text>
        </View>

        <View style={s.featuresGrid}>
          <FeatureCard 
            icon="📈" 
            title="Telemetry" 
            description="Continuous biometric data visualization"
            colors={colors}
          />
          <FeatureCard 
            icon="🥗" 
            title="Nutrition" 
            description="Dietary planning and tracking"
            colors={colors}
          />
          <FeatureCard 
            icon="🏃" 
            title="Fitness" 
            description="Activity and wellness monitoring"
            colors={colors}
          />
          <FeatureCard 
            icon="👤" 
            title="Profile" 
            description="Personal health baseline configuration"
            colors={colors}
          />
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
  logoContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  logoIcon: {
    fontSize: 64,
    marginBottom: SPACING.sm,
  },
  logoTextContainer: {
    alignItems: 'center',
  },
  logoTitle: {
    color: colors.primary,
    fontSize: TYPOGRAPHY.sizes.h1,
    fontWeight: TYPOGRAPHY.weights.bold,
    letterSpacing: 4,
    marginBottom: 4,
  },
  logoSubtitle: {
    color: colors.textMuted,
    fontSize: TYPOGRAPHY.sizes.caption,
    letterSpacing: 3,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: SPACING.borderRadius,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: SPACING.md,
  },
  authCard: {
    backgroundColor: colors.surface,
    borderRadius: SPACING.borderRadius,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: SPACING.md,
  },
  authHeader: {
    marginBottom: SPACING.lg,
  },
  authTitle: {
    color: colors.textPrimary,
    fontSize: TYPOGRAPHY.sizes.h3,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 4,
  },
  authDescription: {
    color: colors.textSecondary,
    fontSize: TYPOGRAPHY.sizes.caption,
    lineHeight: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(225, 173, 1, 0.08)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: SPACING.borderRadiusSm,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  errorIcon: {
    fontSize: 16,
  },
  errorText: {
    color: colors.primary,
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  formContainer: {
    gap: SPACING.sm,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.bold,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: colors.surfaceLight,
    borderRadius: SPACING.borderRadiusSm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
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
    marginTop: SPACING.sm,
  },
  authButtonText: {
    color: '#000000',
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: 13,
    letterSpacing: 1,
  },
  switchAuth: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  switchAuthText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  featureSectionTitleContainer: {
    marginBottom: SPACING.sm,
    paddingLeft: 4,
  },
  featureSectionTitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.bold,
    letterSpacing: 2,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  featureCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: SPACING.borderRadiusSm,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },
  featureTitle: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
    textAlign: 'center',
    marginBottom: 4,
  },
  featureDescription: {
    color: colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(225, 173, 1, 0.15)',
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 24,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: colors.primary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: colors.textPrimary,
    fontSize: TYPOGRAPHY.sizes.h3,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 2,
  },
  userEmail: {
    color: colors.textMuted,
    fontSize: TYPOGRAPHY.sizes.caption,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: SPACING.borderRadiusSm,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  statusText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.bold,
    letterSpacing: 1,
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: SPACING.borderRadiusSm,
    paddingVertical: SPACING.sm + 4,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: colors.primary,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: 11,
    letterSpacing: 1,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: TYPOGRAPHY.weights.bold,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  cardDescription: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: SPACING.md,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 10,
    marginBottom: 2,
  },
  infoValue: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  architectureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceLight,
    borderRadius: SPACING.borderRadiusSm,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  architectureItem: {
    alignItems: 'center',
    gap: 4,
  },
  architectureIcon: {
    fontSize: 20,
  },
  architectureText: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  architectureArrow: {
    color: colors.textMuted,
    fontSize: 16,
  },
});
