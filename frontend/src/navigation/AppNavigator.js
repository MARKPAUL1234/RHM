import React, { useState, useContext } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Animated, useWindowDimensions } from 'react-native';
import { HealthContext } from '../context/HealthContext';
import { TYPOGRAPHY, SPACING, SHADOWS } from '../styles/theme';

// Import Screens
import HomeScreen from '../screens/HomeScreen';
import DashboardScreen from '../screens/DashboardScreen';
import PatientMonitoringScreen from '../screens/PatientMonitoringScreen';
import NutritionHubScreen from '../screens/NutritionHubScreen';
import FitnessCenterScreen from '../screens/FitnessCenterScreen';
import EmergencyPanelScreen from '../screens/EmergencyPanelScreen';
import AccountAdminScreen from '../screens/AccountAdminScreen';
import VisualizationScreen from '../screens/VisualizationScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

export default function AppNavigator() {
  const { user, connectionStatus, alerts, dndEnabled, isDarkMode, colors, toggleTheme } = useContext(HealthContext);
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
    { name: 'Monitoring', label: 'Monitoring', icon: '🩺', component: PatientMonitoringScreen },
    { name: 'Telemetry', label: 'Telemetry', icon: '📈', component: VisualizationScreen },
    { name: 'Alerts', label: 'Alerts', icon: '🔔', component: NotificationsScreen },
    { name: 'Nutrition', label: 'Nutrition', icon: '🥗', component: NutritionHubScreen },
    { name: 'Fitness', label: 'Fitness', icon: '🏃', component: FitnessCenterScreen },
    { name: 'Emergency', label: 'Emergency', icon: '🚨', component: EmergencyPanelScreen },
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

  const s = styles(colors);

  return (
    <View style={s.container}>
      {/* Responsive Clinical Header / Top Navbar */}
      <View style={s.header}>
        <View style={s.brandContainer}>
          <Text style={s.logoIcon}>🩺</Text>
          <View>
            <Text style={s.brandTitle}>RHMT</Text>
            <Text style={s.brandSubtitle}>Remote Health Monitoring Tool</Text>
          </View>
        </View>

        {/* Horizontal Navigation Menu (Only shown on Web / Large Screens) */}
        {isWeb && (
          <View style={s.webNavContainer}>
            {tabs.map(tab => {
              const isActive = activeTab === tab.name;
              const isAlertsTab = tab.name === 'Dashboard'; // Alerts count displayed on Dashboard
              const alertCount = getUnreadAlertCount();

              return (
                <TouchableOpacity
                  key={tab.name}
                  style={[s.webNavButton, isActive && s.activeWebNavButton]}
                  activeOpacity={0.7}
                  onPress={() => setActiveTab(tab.name)}
                >
                  <Text style={s.webNavIcon}>{tab.icon}</Text>
                  <Text style={[s.webNavLabel, isActive ? s.activeWebNavLabel : s.inactiveWebNavLabel]}>
                    {tab.label}
                  </Text>
                  
                  {isAlertsTab && alertCount > 0 && (
                    <View style={s.webAlertBadge}>
                      <Text style={s.webAlertBadgeText}>{alertCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Top Header Actions (Theme Selector & Connection Badge) */}
        <View style={s.headerRight}>
          {/* Theme Toggle Button */}
          <TouchableOpacity
            style={s.themeToggle}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            <Text style={s.themeToggleText}>{isDarkMode ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>

          {/* Global Connection Badge */}
          <View
            style={[
              s.connectionBadge,
              {
                backgroundColor:
                  connectionStatus === 'online'
                    ? 'rgba(225, 173, 1, 0.05)'
                    : 'rgba(102, 102, 102, 0.05)',
                borderColor:
                  connectionStatus === 'online' ? colors.online : colors.offline,
              },
            ]}
          >
            <View
              style={[
                s.connectionDot,
                {
                  backgroundColor:
                    connectionStatus === 'online' ? colors.online : colors.offline,
                },
              ]}
            />
            <Text
              style={[
                s.connectionText,
                { color: connectionStatus === 'online' ? colors.online : colors.offline },
              ]}
            >
              {connectionStatus === 'online' ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
      </View>

      {/* Screen Content Container */}
      <View style={s.content}>{renderActiveScreen()}</View>

      {/* Horizontally Scrollable Mobile Bottom Navigation Bar (Shown on Mobile dimension views) */}
      {!isWeb && (
        <View style={s.tabBarContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.tabBarScrollContent}
          >
            {tabs.map(tab => {
              const isActive = activeTab === tab.name;
              const isAlertsTab = tab.name === 'Dashboard';
              const alertCount = getUnreadAlertCount();

              return (
                <TouchableOpacity
                  key={tab.name}
                  style={[s.tabButton, isActive && s.activeTabButton]}
                  activeOpacity={0.7}
                  onPress={() => setActiveTab(tab.name)}
                >
                  <View
                    style={[
                      s.tabIconWrapper,
                      isActive && s.activeTabIconWrapper,
                    ]}
                  >
                    <Text style={[s.tabIcon, isActive && s.activeTabIcon]}>
                      {tab.icon}
                    </Text>
                    
                    {isAlertsTab && alertCount > 0 && (
                      <View style={s.alertBadge}>
                        <Text style={s.alertBadgeText}>{alertCount}</Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={[
                      s.tabLabel,
                      isActive ? s.activeTabLabel : s.inactiveTabLabel,
                    ]}
                    numberOfLines={1}
                  >
                    {tab.label.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
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
    color: colors.textPrimary,
    fontSize: TYPOGRAPHY.sizes.h3 - 1,
    fontWeight: TYPOGRAPHY.weights.bold,
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    color: colors.textMuted,
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
    color: colors.primary,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  inactiveWebNavLabel: {
    color: colors.textSecondary,
  },
  webAlertBadge: {
    backgroundColor: colors.primary,
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  themeToggle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeToggleText: {
    fontSize: 15,
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
  tabBarContainer: {
    height: 70,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...SHADOWS.premium,
  },
  tabBarScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
    paddingBottom: 6,
  },
  tabButton: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  activeTabButton: {
    backgroundColor: 'rgba(225, 173, 1, 0.03)',
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
    color: colors.primary,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  inactiveTabLabel: {
    color: colors.textSecondary,
  },
  alertBadge: {
    position: 'absolute',
    top: -4,
    right: -2,
    backgroundColor: colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  alertBadgeText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

