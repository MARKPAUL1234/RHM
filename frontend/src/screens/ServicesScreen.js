import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { TYPOGRAPHY, SPACING, getResponsiveMetrics, DARK_COLORS } from '../styles/theme';
import { HealthContext } from '../context/HealthContext';
import PatientMonitoringScreen from './PatientMonitoringScreen';
import NutritionHubScreen from './NutritionHubScreen';
import FitnessCenterScreen from './FitnessCenterScreen';

const modules = [
  { key: 'monitoring', label: 'Patient monitoring', component: PatientMonitoringScreen },
  { key: 'nutrition', label: 'Nutrition', component: NutritionHubScreen },
  { key: 'fitness', label: 'Fitness tracker', component: FitnessCenterScreen },
];

export default function ServicesScreen() {
  const [activeModule, setActiveModule] = useState('monitoring');
  const { width } = useWindowDimensions();
  const metrics = getResponsiveMetrics(width);

  return (
    <HealthContext.Consumer>
      {({ colors = DARK_COLORS }) => {
        const ActiveComponent = modules.find((module) => module.key === activeModule)?.component || PatientMonitoringScreen;
        const s = styles(colors, metrics);

        return (
          <View style={s.container}>
            <View style={s.headerBand}>
              <View style={s.pageInner}>
                <Text style={s.eyebrow}>Services</Text>
                <Text style={s.pageTitle}>Manual care services</Text>
                <Text style={s.pageSubtitle}>
                  Enter patient measurements manually, manage nutrition records, and review activity guidance without physical testing equipment.
                </Text>
                <View style={s.moduleTabs}>
                  {modules.map((module) => {
                    const active = activeModule === module.key;
                    return (
                      <TouchableOpacity
                        key={module.key}
                        style={[s.moduleTab, active && s.activeModuleTab]}
                        onPress={() => setActiveModule(module.key)}
                      >
                        <Text style={[s.moduleTabText, active && s.activeModuleTabText]}>{module.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
            <View style={s.moduleBody}>
              <ActiveComponent />
            </View>
          </View>
        );
      }}
    </HealthContext.Consumer>
  );
}

const styles = (colors, metrics) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBand: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: metrics.pagePadding,
    paddingBottom: SPACING.md,
  },
  pageInner: {
    width: '100%',
    maxWidth: metrics.contentMaxWidth,
    alignSelf: 'center',
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: 4,
  },
  pageTitle: {
    color: colors.textPrimary,
    fontSize: metrics.isPhone ? 23 : 28,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  pageSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
    maxWidth: 760,
  },
  moduleTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  moduleTab: {
    flexGrow: 1,
    flexBasis: metrics.isPhone ? '100%' : 180,
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },
  activeModuleTab: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLight,
  },
  moduleTabText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weights.bold,
    textAlign: 'center',
  },
  activeModuleTabText: {
    color: colors.primary,
  },
  moduleBody: {
    flex: 1,
  },
});
