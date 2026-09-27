import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radii } from '../theme';

// Height the bar occupies above the system navigation inset. Screens add
// insets.bottom to this when reserving space for the bar.
export const TAB_BAR_HEIGHT = 64;

const TABS = [
  { key: 'profile', label: 'Profile', base: 'person', lib: 'ion' },
  { key: 'status', label: 'Status', base: 'pencil', lib: 'mc' },
  { key: 'dashboard', label: 'My Event', base: 'calendar', lib: 'ion' },
  { key: 'payment-tab', label: 'Payment', base: 'card', lib: 'ion' },
  { key: 'history', label: 'History', base: 'time', lib: 'ion' },
];

const TabIcon = ({ base, lib, active }) => {
  const name = active ? base : `${base}-outline`;
  const color = active ? colors.primaryDark : colors.iconMuted;
  return lib === 'mc'
    ? <MaterialCommunityIcons name={name} size={22} color={color} />
    : <Ionicons name={name} size={22} color={color} />;
};

// Flat bar pinned to the bottom edge; extends under the system navigation
// area so there's no gap, with the tabs kept above it.
const BottomTabBar = ({ activeTab, onNavigate }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.bar, { height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]}>
      {TABS.map((tab) => {
        const on = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={s.tab}
            onPress={() => onNavigate(tab.key)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={tab.label}
          >
            <View style={[s.iconWrap, on && s.iconWrapOn]}>
              <TabIcon base={tab.base} lib={tab.lib} active={on} />
            </View>
            <Text style={[s.label, on && s.labelOn]} numberOfLines={1}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const s = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  // Soft pill behind the active icon
  iconWrap: {
    width: 52,
    height: 30,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapOn: {
    backgroundColor: colors.surfaceTertiary,
  },
  label: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  labelOn: {
    fontFamily: fonts.semibold,
    color: colors.primaryDark,
  },
});

export default BottomTabBar;
