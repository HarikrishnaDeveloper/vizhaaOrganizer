import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
} from 'react-native';
import BlobBackground from './BlobBackground';

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

        <TouchableOpacity style={styles.btn} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.btnText}>Proceed to verify</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  card: {
    backgroundColor: '#EBEBEB',
    borderRadius: 4,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },

  title: {
    fontSize: 22,
    fontFamily: 'Outfit_700Bold',
    color: '#111',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: '#888',
    marginBottom: 24,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 52,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  prefix: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    color: '#222',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    color: '#222',
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
    borderColor: '#AAA',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  checkboxOn: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  tick: {
    color: '#FFF',
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
  },
  checkText: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    color: '#555',
    lineHeight: 17,
  },
  link: {
    fontFamily: 'Outfit_600SemiBold',
    color: '#333',
  },

  // Matches the onboarding "Plan Your Dream Day" CTA
  btn: {
    backgroundColor: '#1C1C1E',
    borderRadius: 4,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 4,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 0.2,
  },
});

export default PhoneEntry;
