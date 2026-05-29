import React, { useState, useContext } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Animated, useWindowDimensions } from 'react-native';
import { HealthContext } from '../context/HealthContext';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS } from '../styles/theme';

// Import Screens
import HomeScreen from '../screens/HomeScreen';
import DashboardScreen from '../screens/DashboardScreen';
import PatientMonitoringScreen from '../screens/PatientMonitoringScreen';
import NutritionHubScreen from '../screens/NutritionHubScreen';
import FitnessCenterScreen from '../screens/FitnessCenterScreen';
import EmergencyPanelScreen from '../screens/EmergencyPanelScreen';
import AccountAdminScreen from '../screens/AccountAdminScreen';

export default function AppNavigator() {
  const { user, connectionStatus, alerts, dndEnabled } = useContext(HealthContext);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const { width } = useWindowDimensions();
  
  // Responsive layout configuration
  const isWeb = width >= 768;

  // Enforce Route Protection: If no user session is verified, force render the Login/Registration panel
  if (!user) {
    return <HomeScreen />;
  }

  // Tab definitions matching the responsive sitemap layout
  const tabs = [
    { name: 'Dashboard', label: 'Dashboard', icon: '📊', component: DashboardScreen },
    { name: 'Monitoring', label: 'Patient Monitoring', icon: '🩺', component: PatientMonitoringScreen },
    { name: 'Nutrition', label: 'Nutrition Hub', icon: '🥗', component: NutritionHubScreen },
    { name: 'Fitness', label: 'Fitness Center', icon: '🏃', component: FitnessCenterScreen },
    { name: 'Emergency', label: 'Emergency Panel', icon: '🚨', component: EmergencyPanelScreen },
    { name: 'Portal', label: 'Portal', icon: '👤', component: AccountAdminScreen },
  ];

  const renderActiveScreen = () => {
    const currentTab = tabs.find(t => t.name === activeTab);
    if (!currentTab) return <DashboardScreen />;
    const ScreenComponent = currentTab.component;
    return <ScreenComponent />;
  };

  const getUnreadAlertCount = () => {
    if (dndEnabled) return 0;
    return alerts.length;
  };

  return (
    <View style={styles.container}>
      {/* Responsive Clinical Header / Top Navbar */}
      <View style={styles.header}>
        <View style={styles.brandContainer}>
          <Text style={styles.logoIcon}>🩺</Text>
          <View>
            <Text style={styles.brandTitle}>RHMT</Text>
            <Text style={styles.brandSubtitle}>Remote Health Monitoring Tool</Text>
          </View>
        </View>

        {/* Horizontal Navigation Menu (Only shown on Web / Large Screens) */}
        {isWeb && (
          <View style={styles.webNavContainer}>
            {tabs.map(tab => {
              const isActive = activeTab === tab.name;
              const isAlertsTab = tab.name === 'Dashboard'; // Alerts count displayed on Dashboard
              const alertCount = getUnreadAlertCount();

              return (
                <TouchableOpacity
                  key={tab.name}
                  style={[styles.webNavButton, isActive && styles.activeWebNavButton]}
                  activeOpacity={0.7}
                  onPress={() => setActiveTab(tab.name)}
                >
                  <Text style={styles.webNavIcon}>{tab.icon}</Text>
                  <Text style={[styles.webNavLabel, isActive ? styles.activeWebNavLabel : styles.inactiveWebNavLabel]}>
                    {tab.label}
                  </Text>
                  
                  {isAlertsTab && alertCount > 0 && (
                    <View style={styles.webAlertBadge}>
                      <Text style={styles.webAlertBadgeText}>{alertCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Global Connection Badge */}
        <View
          style={[
            styles.connectionBadge,
            {
              backgroundColor:
                connectionStatus === 'online'
                  ? 'rgba(225, 173, 1, 0.08)'
                  : 'rgba(102, 102, 102, 0.08)',
              borderColor:
                connectionStatus === 'online' ? COLORS.online : COLORS.offline,
            },
          ]}
        >
          <View
            style={[
              styles.connectionDot,
              {
                backgroundColor:
                  connectionStatus === 'online' ? COLORS.online : COLORS.offline,
              },
            ]}
          />
          <Text
            style={[
              styles.connectionText,
              { color: connectionStatus === 'online' ? COLORS.online : COLORS.offline },
            ]}
          >
            {connectionStatus === 'online' ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      {/* Screen Content Container */}
      <View style={styles.content}>{renderActiveScreen()}</View>

      {/* Bottom Tab Bar (Only shown on Mobile Phone / Small Screens) */}
      {!isWeb && (
        <View style={styles.tabBar}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.name;
            const isAlertsTab = tab.name === 'Dashboard';
            const alertCount = getUnreadAlertCount();

            return (
              <TouchableOpacity
                key={tab.name}
                style={styles.tabButton}
                activeOpacity={0.7}
                onPress={() => setActiveTab(tab.name)}
              >
                <View
                  style={[
                    styles.tabIconWrapper,
                    isActive && styles.activeTabIconWrapper,
                  ]}
                >
                  <Text style={[styles.tabIcon, isActive && styles.activeTabIcon]}>
                    {tab.icon}
                  </Text>
                  
                  {isAlertsTab && alertCount > 0 && (
                    <View style={styles.alertBadge}>
                      <Text style={styles.alertBadgeText}>{alertCount}</Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.tabLabel,
                    isActive ? styles.activeTabLabel : styles.inactiveTabLabel,
                  ]}
                  numberOfLines={1}
                >
                  {tab.label.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
    ...SHADOWS.premium,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    fontSize: 24,
    marginRight: SPACING.sm,
  },
  brandTitle: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sizes.h3 - 1,
    fontWeight: TYPOGRAPHY.weights.bold,
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    color: COLORS.textMuted,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  webNavContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  webNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeWebNavButton: {
    backgroundColor: 'rgba(225, 173, 1, 0.08)',
    borderColor: 'rgba(225, 173, 1, 0.15)',
  },
  webNavIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  webNavLabel: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  activeWebNavLabel: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  inactiveWebNavLabel: {
    color: COLORS.textSecondary,
  },
  webAlertBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    marginLeft: 6,
  },
  webAlertBadgeText: {
    color: '#000000',
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm + 2,
    borderRadius: 20,
    borderWidth: 1,
  },
  connectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  connectionText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.bold,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 68,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: 6,
    justifyContent: 'space-around',
    alignItems: 'center',
    position: 'relative',
    ...SHADOWS.premium,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapper: {
    width: 40,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 2,
  },
  activeTabIconWrapper: {
    backgroundColor: 'rgba(225, 173, 1, 0.08)',
  },
  tabIcon: {
    fontSize: 18,
  },
  activeTabIcon: {
    transform: [{ scale: 1.1 }],
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  activeTabLabel: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  inactiveTabLabel: {
    color: COLORS.textSecondary,
  },
  alertBadge: {
    position: 'absolute',
    top: -4,
    right: -2,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: COLORS.surface,
  },
  alertBadgeText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
