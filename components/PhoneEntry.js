import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import BlobBackground from './BlobBackground';
import TextInput from './ui/ThemedTextInput';
import { colors, fonts, shadows } from '../theme';
import PrimaryButton from './ui/PrimaryButton';

const PhoneEntry = ({ onNext }) => {
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(true);

  const handleNext = () => {
    if (!phone || phone.length < 10) {
      alert("Please enter a valid 10-digit phone number.");
      return;
    }
    if (!agreed) {
      alert("Please agree to the terms of use to proceed.");
      return;
    }
    onNext(phone);
  };

  return (
    <View style={styles.container}>
      <BlobBackground />
      <View style={styles.card}>
        <Text style={styles.title}>Enter a Phone Number</Text>
        <Text style={styles.subtitle}>Link your account with VIZHAA</Text>

        <View style={styles.inputRow}>
          <Text style={styles.prefix}>+91</Text>
          <TextInput
            style={styles.input}
            keyboardType="phone-pad"
            maxLength={10}
            value={phone}
            onChangeText={setPhone}
            placeholder=""
          />
        </View>

        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setAgreed(v => !v)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
            {agreed ? <Text style={styles.tick}>✓</Text> : null}
          </View>
          <Text style={styles.checkText}>
            By proceeding you agree to our{' '}
            <Text style={styles.link}>terms of use</Text>
            {' '}&amp;{' '}
            <Text style={styles.link}>privacy policy</Text>
          </Text>
        </TouchableOpacity>

        <View style={{ height: 28 }} />

        <PrimaryButton style={styles.btn} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.btnText}>Proceed to verify</Text>
        </PrimaryButton>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  card: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 4,
    padding: 28,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },

  title: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: 24,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    height: 52,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  prefix: {
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: colors.text,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
  },

  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  checkboxOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tick: {
    color: colors.white,
    fontSize: 11,
    fontFamily: fonts.bold,
  },
  checkText: {
    flex: 1,
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textBody,
    lineHeight: 17,
  },
  link: {
    fontFamily: fonts.semibold,
    color: colors.text,
  },

  // Matches the onboarding "Plan Your Dream Day" CTA
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    ...shadows.button,
  },
  btnText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontFamily: fonts.semibold,
    letterSpacing: 0.2,
  },
});

export default PhoneEntry;
