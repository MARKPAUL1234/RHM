import React, { useContext, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { HealthContext } from '../context/HealthContext';
import { TYPOGRAPHY, SPACING, SHADOWS, getResponsiveMetrics } from '../styles/theme';

import HomeScreen from '../screens/HomeScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ServicesScreen from '../screens/ServicesScreen';
import EmergencyPanelScreen from '../screens/EmergencyPanelScreen';
import AccountAdminScreen from '../screens/AccountAdminScreen';
import VisualizationScreen from '../screens/VisualizationScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ContactUsScreen from '../screens/ContactUsScreen';

function AccountSettingsScreen() {
  return <AccountAdminScreen initialSubView="account" lockedSubView />;
}

function AdminConsoleScreen() {
  return <AccountAdminScreen initialSubView="admin" lockedSubView />;
}

const tabs = [
  { name: 'Dashboard', label: 'Dashboard', icon: 'DB', component: DashboardScreen },
  { name: 'Services', label: 'Services', icon: 'SV', component: ServicesScreen },
  { name: 'Visualization', label: 'Visualization', icon: 'VZ', component: VisualizationScreen },
  { name: 'Notifications', label: 'Notifications', icon: 'NT', component: NotificationsScreen },
  { name: 'Contact', label: 'Contact Us', icon: 'CU', component: ContactUsScreen },
  { name: 'Account', label: 'Account', icon: 'AC', component: AccountSettingsScreen },
  { name: 'Emergency', label: 'Emergency', icon: 'ER', component: EmergencyPanelScreen },
  { name: 'Admin', label: 'Admin', icon: 'AD', component: AdminConsoleScreen },
];

export default function AppNavigator() {
  const {
    user,
    connectionStatus,
    alerts,
    dndEnabled,
    isDarkMode,
    colors,
    toggleTheme,
  } = useContext(HealthContext);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const { width } = useWindowDimensions();
  const metrics = getResponsiveMetrics(width);
  const isWide = width >= 860;

  const unreadAlertCount = useMemo(() => {
    if (dndEnabled) return 0;
    return alerts.filter((alert) => alert.status !== 'read').length;
  }, [alerts, dndEnabled]);

  if (!user) {
    return <HomeScreen />;
  }

  const currentTab = tabs.find((tab) => tab.name === activeTab) || tabs[0];
  const ScreenComponent = currentTab.component;
  const s = styles(colors, metrics, isWide);

  const renderNavButton = (tab, compact = false) => {
    const isActive = activeTab === tab.name;
    const isAlertTab = tab.name === 'Notifications';

    return (
      <TouchableOpacity
        key={tab.name}
        style={[compact ? s.mobileTab : s.navButton, isActive && (compact ? s.activeMobileTab : s.activeNavButton)]}
        activeOpacity={0.75}
        onPress={() => setActiveTab(tab.name)}
      >
        <View style={[compact ? s.mobileIcon : s.navIcon, isActive && s.activeIcon]}>
          <Text style={[s.iconText, isActive && s.activeIconText]}>{tab.icon}</Text>
          {isAlertTab && unreadAlertCount > 0 ? (
            <View style={s.badge}>
              <Text style={s.badgeText}>{unreadAlertCount > 9 ? '9+' : unreadAlertCount}</Text>
            </View>
          ) : null}
        </View>
        <Text
          style={[compact ? s.mobileLabel : s.navLabel, isActive && s.activeNavLabel]}
          numberOfLines={1}
        >
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.brandContainer}>
          <View style={s.brandMark}>
            <Text style={s.brandMarkText}>RH</Text>
          </View>
          <View style={s.brandTextBlock}>
            <Text style={s.brandTitle}>RHMT</Text>
            {width >= 420 ? (
              <Text style={s.brandSubtitle}>Remote Health Monitoring</Text>
            ) : null}
          </View>
        </View>

        {isWide ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.webNavContainer}
            style={s.webNavScroller}
          >
            {tabs.map((tab) => renderNavButton(tab))}
          </ScrollView>
        ) : null}

        <View style={s.headerActions}>
          <TouchableOpacity style={s.themeToggle} onPress={toggleTheme} activeOpacity={0.75}>
            <Text style={s.themeToggleText}>{isDarkMode ? 'LT' : 'DK'}</Text>
          </TouchableOpacity>
          <View style={[s.connectionBadge, connectionStatus === 'online' ? s.onlineBadge : s.offlineBadge]}>
            <View style={[s.connectionDot, { backgroundColor: connectionStatus === 'online' ? colors.online : colors.offline }]} />
            <Text style={[s.connectionText, { color: connectionStatus === 'online' ? colors.online : colors.offline }]}>
              {connectionStatus === 'online' ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
      </View>

      <View style={s.content}>
        <ScreenComponent />
      </View>

      {!isWide ? (
        <View style={s.tabBarContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.tabBarScrollContent}
          >
            {tabs.map((tab) => renderNavButton(tab, true))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = (colors, metrics, isWide) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: metrics.pagePadding,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    ...SHADOWS.subtle,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: isWide ? 210 : 0,
    flexShrink: 0,
  },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  brandMarkText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  brandTextBlock: {
    minWidth: 0,
  },
  brandTitle: {
    color: colors.textPrimary,
    fontSize: TYPOGRAPHY.sizes.h3,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  brandSubtitle: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 1,
  },
  webNavScroller: {
    flex: 1,
  },
  webNavContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  navButton: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeNavButton: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
  },
  navIcon: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.elevated,
    marginRight: 7,
    position: 'relative',
  },
  activeIcon: {
    backgroundColor: colors.primary,
  },
  iconText: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  activeIconText: {
    color: '#FFFFFF',
  },
  navLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  activeNavLabel: {
    color: colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginLeft: 'auto',
  },
  themeToggle: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeToggleText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  connectionBadge: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  onlineBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: 'rgba(34, 197, 94, 0.24)',
  },
  offlineBadge: {
    backgroundColor: 'rgba(148, 163, 184, 0.10)',
    borderColor: 'rgba(148, 163, 184, 0.24)',
  },
  connectionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  connectionText: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  content: {
    flex: 1,
  },
  tabBarContainer: {
    height: 74,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...SHADOWS.subtle,
  },
  tabBarScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
    paddingBottom: SPACING.xs,
  },
  mobileTab: {
    width: 76,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  activeMobileTab: {
    backgroundColor: colors.surfaceLight,
  },
  mobileIcon: {
    width: 30,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.elevated,
    marginBottom: 4,
    position: 'relative',
  },
  mobileLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    maxWidth: 70,
  },
  badge: {
    position: 'absolute',
    top: -7,
    right: -7,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.critical,
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
});
