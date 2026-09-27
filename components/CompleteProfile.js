import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import BlobBackground from './BlobBackground';
import { api } from '../services/api';
import TextInput from './ui/ThemedTextInput';
import { COLORS, colors, fonts, radii, buttons, input, alpha } from '../theme';
import PrimaryButton from './ui/PrimaryButton';

const Field = ({ label, value, onChangeText, placeholder, keyboardType, multiline, autoCapitalize, onPress, editable = true }) => (
  <TouchableOpacity activeOpacity={onPress ? 0.7 : 1} onPress={onPress} style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={{ position: 'relative' }}>
      <TextInput
        style={[styles.fieldInput, multiline && styles.fieldInputMulti, !editable && { color: colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType || 'default'}
        autoCapitalize={autoCapitalize || 'words'}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        editable={editable && !onPress}
        pointerEvents={onPress ? 'none' : 'auto'}
      />
      {onPress && (
        <Ionicons name="calendar-outline" size={20} color={colors.icon} style={styles.inputIcon} />
      )}
    </View>
  </TouchableOpacity>
);

const CompleteProfile = ({ onDone }) => {
  const [form, setForm] = useState({
    name: '', dob: null, email: '', city: '', gst: '', companyName: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setForm(f => ({ ...f, dob: selectedDate }));
    }
  };

  const handleSave = async () => {
    if (!form.name.trim())         { Alert.alert('Required', 'Please enter your full name'); return; }
    if (!form.dob)                 { Alert.alert('Required', 'Please select your date of birth'); return; }
    if (!form.email.includes('@')) { Alert.alert('Required', 'Please enter a valid email'); return; }
    if (!form.city.trim())         { Alert.alert('Required', 'Please enter your city'); return; }

    setLoading(true);
    try {
      // We don't call the API yet, we collect business type first
      onDone(form);
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <BlobBackground />
        <View style={styles.cardContainer}>
          <BlurView intensity={80} tint="light" style={styles.card}>
            <Text style={styles.title}>Complete Profile</Text>
            <Text style={styles.subtitle}>Tell us about yourself to continue</Text>

            <Text style={styles.sectionLabel}>REQUIRED</Text>
            <Field label="Full Name" value={form.name} onChangeText={set('name')} placeholder="John Doe" />
            <Field
              label="Date of Birth"
              value={form.dob ? form.dob.toLocaleDateString() : ''}
              placeholder="DD/MM/YYYY"
              onPress={() => setShowDatePicker(true)}
              editable={false}
            />
            {showDatePicker && (
              <DateTimePicker
                value={form.dob || new Date()}
                mode="date"
                display="default"
                onChange={onDateChange}
                maximumDate={new Date()}
              />
            )}
            <Field
              label="Email"
              value={form.email}
              onChangeText={set('email')}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Field label="City" value={form.city} onChangeText={set('city')} placeholder="Chennai" />

            <Text style={[styles.sectionLabel, { marginTop: 18 }]}>OPTIONAL</Text>
            <Field label="Company Name" value={form.companyName} onChangeText={set('companyName')} placeholder="Vizhaa Events" />
            <Field
              label="GST Number"
              value={form.gst}
              onChangeText={set('gst')}
              placeholder="22AAAAA0000A1Z5"
              autoCapitalize="characters"
            />

            <PrimaryButton
              style={[styles.btn, loading && styles.btnDim]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>{loading ? 'Saving...' : 'Next: Business Type'}</Text>
            </PrimaryButton>
          </BlurView>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
    justifyContent: 'center',
  },
  cardContainer: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  card: {
    padding: 28,
    backgroundColor: alpha(COLORS.white, 0.85),
  },
  title: {
    fontSize: 26,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: 26,
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  fieldWrap: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: colors.textHeading,
    marginBottom: 6,
  },
  fieldInput: {
    ...input,
    height: 50,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  fieldInputMulti: {
    height: 90,
    paddingTop: 14,
  },
  inputIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  btn: {
    ...buttons.primary,
    marginTop: 24,
  },
  btnDim: {
    opacity: 0.7,
  },
  btnText: {
    ...buttons.primaryText,
  },
});

export default CompleteProfile;
