import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, TouchableOpacity, TextInput,
  ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import PrimaryButton from './ui/PrimaryButton';
import { colors, fonts, radii, buttons } from '../theme';

const CODE_LENGTH = 6;

// Bottom sheet that emails a 6-digit code to the user's saved address and
// verifies it. Calls onVerified(user) with the updated profile on success.
const EmailVerifySheet = ({ visible, email, onClose, onVerified }) => {
  const insets = useSafeAreaInsets();
  const inputRef = useRef(null);
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const finishIfVerified = async () => {
    const res = await api.getProfile().catch(() => null);
    if (res?.user?.emailVerified) onVerified(res.user);
  };

  const sendCode = async () => {
    setSending(true);
    setError('');
    try {
      const res = await api.sendEmailCode();
      setSentTo(email);
      setCooldown(res.resendAfter || 60);
      setCode('');
      inputRef.current?.focus();
    } catch (err) {
      if (err.code === 'RESEND_COOLDOWN') {
        // A recent code is still valid; just wait before resending
        setSentTo(email);
        setCooldown(parseInt(err.message.match(/\d+/)?.[0], 10) || 60);
      } else if (err.code === 'ALREADY_VERIFIED') {
        await finishIfVerified();
      } else {
        setError(err.message || 'Could not send the code. Please try again.');
      }
    } finally {
      setSending(false);
    }
  };

  // Send a code each time the sheet opens
  useEffect(() => {
    if (!visible) return;
    setCode('');
    setError('');
    setSentTo('');
    sendCode();
  }, [visible]);

  // Resend countdown
  useEffect(() => {
    if (!visible || cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown, visible]);

  const verify = async (value = code) => {
    if (value.length !== CODE_LENGTH || verifying) return;
    setVerifying(true);
    setError('');
    try {
      const res = await api.verifyEmailCode(value);
      onVerified(res.user);
    } catch (err) {
      setError(err.message || 'Could not verify the code.');
      setCode('');
    } finally {
      setVerifying(false);
    }
  };

  const onChangeCode = (text) => {
    const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    setError('');
    // Submit as soon as the full code is in
    if (digits.length === CODE_LENGTH) verify(digits);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]}>
            <View style={styles.handle} />

            <View style={styles.iconBadge}>
              <Ionicons name="mail-open-outline" size={24} color={colors.primaryDark} />
            </View>
            <Text style={styles.title}>Verify your email</Text>
            <Text style={styles.subtitle}>
              {sending && !sentTo ? 'Sending a code to ' : 'Enter the 6-digit code we sent to '}
              <Text style={styles.email}>{email}</Text>
            </Text>

            <TextInput
              ref={inputRef}
              style={[styles.codeInput, !!error && styles.codeInputError]}
              value={code}
              onChangeText={onChangeCode}
              keyboardType="number-pad"
              inputMode="numeric"
              textContentType="oneTimeCode"
              maxLength={CODE_LENGTH}
              placeholder="••••••"
              placeholderTextColor={colors.textMuted}
              editable={!verifying}
              autoFocus
              selectionColor={colors.primary}
              accessibilityLabel="Email verification code"
            />

            {error ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={14} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.resendRow}>
              {sending ? (
                <Text style={styles.resendWait}>Sending code...</Text>
              ) : cooldown > 0 ? (
                <Text style={styles.resendWait}>
                  Resend code in <Text style={styles.resendTimer}>00:{String(cooldown).padStart(2, '0')}</Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={sendCode} hitSlop={8} activeOpacity={0.7}>
                  <Text style={styles.resendLink}>{sentTo ? 'Resend code' : 'Send code'}</Text>
                </TouchableOpacity>
              )}
            </View>

            <PrimaryButton
              style={[styles.btn, (code.length !== CODE_LENGTH && !verifying) && styles.btnDisabled]}
              onPress={() => verify()}
              disabled={code.length !== CODE_LENGTH || verifying}
            >
              {verifying ? (
                <View style={styles.busyRow}>
                  <ActivityIndicator color={colors.white} />
                  <Text style={styles.btnText}>Verifying...</Text>
                </View>
              ) : (
                <Text style={[styles.btnText, code.length !== CODE_LENGTH && styles.btnTextDisabled]}>Verify email</Text>
              )}
            </PrimaryButton>

            <TouchableOpacity style={styles.cancel} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelText}>Not now</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 10,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 18,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
  },
  email: {
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  codeInput: {
    width: '100%',
    height: 58,
    marginTop: 22,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    textAlign: 'center',
    fontSize: 26,
    letterSpacing: 10,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  codeInputError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerBackground,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  errorText: {
    flexShrink: 1,
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.danger,
  },
  resendRow: {
    marginTop: 16,
    marginBottom: 20,
  },
  resendWait: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  resendTimer: {
    fontFamily: fonts.semibold,
    color: colors.textSecondary,
  },
  resendLink: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.primaryDark,
  },
  btn: {
    ...buttons.primary,
    width: '100%',
    height: 54,
    borderRadius: 14,
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
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cancel: {
    paddingVertical: 12,
    marginTop: 4,
  },
  cancelText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.textSecondary,
  },
});

export default EmailVerifySheet;
