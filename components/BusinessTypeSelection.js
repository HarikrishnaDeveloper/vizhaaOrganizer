import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import BlobBackground from './BlobBackground';
import { COLORS, colors, fonts, radii, buttons, alpha } from '../theme';
import PrimaryButton from './ui/PrimaryButton';

const BUSINESS_TYPES = [
  { id: 'catering', label: 'Catering Service', icon: 'restaurant-outline' },
  { id: 'wedding', label: 'Wedding Organizer', icon: 'heart-outline' },
  { id: 'event_mgmt', label: 'Event Management Company', icon: 'calendar-outline' },
  { id: 'hotel', label: 'Hotel / Banquet', icon: 'business-outline' },
  { id: 'freelancer', label: 'Freelancer Organizer', icon: 'person-outline' },
];

const BusinessTypeSelection = ({ onDone }) => {
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const scales = useRef(BUSINESS_TYPES.reduce((acc, curr) => {
    acc[curr.id] = new Animated.Value(1);
    return acc;
  }, {})).current;

  const handlePress = (id) => {
    setSelected(id);
    Animated.sequence([
      Animated.timing(scales[id], { toValue: 0.96, duration: 100, useNativeDriver: true }),
      Animated.timing(scales[id], { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const handleFinish = async () => {
    if (!selected) {
      Alert.alert('Selection Required', 'Please select your business type to continue.');
      return;
    }
    setLoading(true);
    try {
      onDone(selected);
    } catch (error) {
      Alert.alert('Error', 'Failed to save your selection. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BlobBackground />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>What's your business type?</Text>
          <Text style={styles.subtitle}>Select the category that best describes your services</Text>
        </View>

        <View style={styles.grid}>
          {BUSINESS_TYPES.map((type) => {
            const isSelected = selected === type.id;
            return (
              <Animated.View key={type.id} style={{ transform: [{ scale: scales[type.id] }] }}>
                <TouchableOpacity
                  style={[styles.cardContainer, isSelected && styles.cardSelected]}
                  onPress={() => handlePress(type.id)}
                  activeOpacity={0.9}
                >
                  <BlurView intensity={isSelected ? 40 : 20} tint="light" style={styles.card}>
                    <View style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}>
                      <Ionicons
                        name={type.icon}
                        size={28}
                        color={isSelected ? colors.white : colors.icon}
                      />
                    </View>
                    <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
                      {type.label}
                    </Text>
                    {isSelected && (
                      <View style={styles.checkWrap}>
                        <Ionicons name="checkmark-circle" size={24} color={colors.icon} />
                      </View>
                    )}
                  </BlurView>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        <PrimaryButton
          style={[styles.btn, !selected && styles.btnDisabled]}
          onPress={handleFinish}
          disabled={loading || !selected}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={[styles.btnText, !selected && styles.btnTextDisabled]}>Complete Setup</Text>
          )}
        </PrimaryButton>
      </ScrollView>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 40,
    flexGrow: 1,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 30,
    fontFamily: fonts.bold,
    color: colors.text,
    lineHeight: 38,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.textBody,
    lineHeight: 24,
  },
  grid: {
    gap: 14,
    marginBottom: 40,
  },
  cardContainer: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: alpha(COLORS.white, 0.7),
    borderWidth: 1,
    borderColor: colors.border,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  cardSelected: {
    borderColor: colors.borderStrong,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconWrapSelected: {
    backgroundColor: colors.primary,
  },
  cardLabel: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.textBody,
    flex: 1,
    paddingRight: 28,
  },
  cardLabelSelected: {
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  checkWrap: {
    position: 'absolute',
    right: 18,
    top: 18,
  },
  btn: {
    ...buttons.primary,
    marginTop: 'auto',
    marginBottom: 10,
  },
  btnDisabled: {
    ...buttons.disabled,
  },
  btnText: {
    ...buttons.primaryText,
  },
  btnTextDisabled: {
    ...buttons.disabledText,
  },
});

export default BusinessTypeSelection;
