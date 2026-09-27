import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  ScrollView, Keyboard, AppState, ActivityIndicator, InteractionManager, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BlobBackground from './BlobBackground';
import { COLORS, colors, fonts, buttons, alpha } from '../theme';
import PrimaryButton from './ui/PrimaryButton';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 59;
// When returning to the app (e.g. after tapping "Copy" in the SMS
// notification), Android ignores keyboard requests until the notification
// shade has fully closed and the window has focus again. Try at these delays,
// stopping as soon as the keyboard is up.
const REFOCUS_ATTEMPTS_MS = [250, 700, 1300, 2200];
const BOX_GAP = 10;
const MAX_BOX_SIZE = 52;

// "7339509611" → "••••••9611"
const maskPhone = (phone) =>
  phone.length > 4 ? '•'.repeat(phone.length - 4) + phone.slice(-4) : phone;

// Turns whatever the input received (a typed digit, a pasted SMS, an autofilled
// code) into at most OTP_LENGTH digits. `previous` is the value before this
// change, used to tell an extra typed digit from a newly inserted code.
const sanitizeOtp = (text, previous) => {
  // Pasted message such as "Your Vizhaa verification code is 026663"
  if (/\D/.test(text)) {
    const code = text.match(/(?:^|\D)(\d{6})(?:\D|$)/);
    if (code) return code[1];
  }
  const digits = text.replace(/\D/g, '');
  if (digits.length <= OTP_LENGTH) return digits;
  // One more digit typed into a full code: ignore it
  if (digits.length === previous.length + 1) return previous;
  // A full code pasted/autofilled after a partial entry arrives as e.g.
  // "026" + "026663"; the newly inserted code is the last OTP_LENGTH digits.
  return digits.slice(-OTP_LENGTH);
};

const OTPScreen = ({ phone = '', onSendOtp, onVerify, onResend, onSuccess, onChangePhone }) => {
  // Single source of truth for the code; the six boxes only display it
  const [otp, setOtp] = useState('');
  // 'fetching' → OTP being sent, 'input' → user types, 'validating' → API call in progress
  const [phase, setPhase] = useState('fetching');
  const [resend, setResend] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [sendError, setSendError] = useState('');

  const inputRef = useRef(null);
  const mountedRef = useRef(true);
  // Synchronous guard: state updates are async, so a fast double tap could
  // otherwise submit twice before the button re-renders as disabled
  const verifyingRef = useRef(false);
  const insets = useSafeAreaInsets();

  const keyboardUp = useRef(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => { keyboardUp.current = true; });
    const hide = Keyboard.addListener('keyboardDidHide', () => { keyboardUp.current = false; });
    return () => { show.remove(); hide.remove(); };
  }, []);

  // Opens the keyboard. An input that is still focused ignores focus(), so
  // when the keyboard is gone, blur and focus again to bring it back.
  const focusInput = () => {
    const input = inputRef.current;
    if (!input) return;
    if (!input.isFocused()) {
      input.focus();
      return;
    }
    if (keyboardUp.current) return;
    input.blur();
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Send the OTP when the screen opens
  useEffect(() => {
    if (!phone) return;
    const triggerSend = async () => {
      try {
        await onSendOtp();
        if (!mountedRef.current) return;
        setResend(RESEND_SECONDS);
      } catch (err) {
        if (!mountedRef.current) return;
        setResend(0); // allow an immediate manual resend
        setSendError(err.message || 'Failed to send OTP');
      } finally {
        if (mountedRef.current) setPhase('input');
      }
    };
    triggerSend();
  }, [phone]);

  // Focus input when moving to input phase
  useEffect(() => {
    if (phase === 'input') {
      focusInput();
    }
  }, [phase]);

  // Focus on screen entry. autoFocus alone isn't reliable on Android: while
  // the screen is still animating in, the window can't take input focus and
  // the keyboard request is dropped. Focus once transitions finish, then
  // retry once if the keyboard still hasn't appeared.
  useEffect(() => {
    const timers = [];
    const task = InteractionManager.runAfterInteractions(() => {
      timers.push(setTimeout(() => inputRef.current?.focus(), 150));
      // Never blur/refocus while the keyboard is already open
      timers.push(setTimeout(() => {
        if (!keyboardUp.current && !Keyboard.isVisible()) focusInput();
      }, 800));
    });
    return () => {
      task.cancel();
      timers.forEach(clearTimeout);
    };
  }, []);

  // Tapping "Copy" in the SMS notification, or switching to the SMS app,
  // takes window focus away and Android hides the keyboard (the OS does this;
  // an app can't prevent it). Bring it back on return.
  useEffect(() => {
    let timers = [];
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
    const reopen = () => {
      clearTimers();
      timers = REFOCUS_ATTEMPTS_MS.map((ms) => setTimeout(() => {
        if (!keyboardUp.current && !verifyingRef.current) focusInput();
      }, ms));
    };
    const subscriptions = [
      AppState.addEventListener('change', (state) => {
        if (state === 'active') reopen();
        else keyboardUp.current = false;
      }),
      // Android: the window loses / regains focus (e.g. notification shade)
      AppState.addEventListener('blur', () => { keyboardUp.current = false; }),
      AppState.addEventListener('focus', reopen),
    ];
    return () => {
      clearTimers();
      subscriptions.forEach((s) => s.remove());
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'input' || resend <= 0) return;
    const t = setTimeout(() => setResend(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resend, phase]);

  // Typing, backspace, paste and SMS autofill all arrive here as the full text
  // Typing, backspace, paste and autofill all arrive here as the input's full
  // text; the six boxes render from `otp` alone.
  const handleOtpChange = (text) => {
    // TEMP (dev only): trace keyboard → input → state
    if (__DEV__) console.log('[OTP INPUT] received:', JSON.stringify(text));
    setOtp((previous) => {
      const next = sanitizeOtp(text, previous);
      if (__DEV__) console.log('[OTP INPUT] normalized:', next, 'length:', next.length);
      return next;
    });
    setError('');
    setSendError('');
  };

  const handleVerify = async () => {
    if (verifyingRef.current || phase !== 'input') return;
    if (otp.length !== OTP_LENGTH) { setError('Please enter all 6 digits'); return; }
    verifyingRef.current = true;
    setPhase('validating');
    try {
      const data = await onVerify(otp);
      onSuccess(data);
    } catch (err) {
      if (!mountedRef.current) return;
      setPhase('input');
      setError(err.message || 'Invalid OTP. Please try again.');
      focusInput();
    } finally {
      verifyingRef.current = false;
    }
  };

  const handleResend = async () => {
    if (resend > 0 || resending || phase === 'validating') return;
    setResending(true);
    setError('');
    setSendError('');
    try {
      await onResend();
      if (!mountedRef.current) return;
      setOtp('');
      setResend(RESEND_SECONDS);
      focusInput();
    } catch (err) {
      if (!mountedRef.current) return;
      setSendError(err.message || 'Failed to resend OTP');
    } finally {
      if (mountedRef.current) setResending(false);
    }
  };

  // Six boxes sized from the row's real width, so they always fit one line
  const [rowWidth, setRowWidth] = useState(0);
  const boxSize = rowWidth
    ? Math.min(MAX_BOX_SIZE, Math.floor((rowWidth - BOX_GAP * (OTP_LENGTH - 1)) / OTP_LENGTH))
    : MAX_BOX_SIZE;

  const verifying = phase === 'validating';
  const canVerify = phase === 'input' && otp.length === OTP_LENGTH;
  const masked = maskPhone(phone);
  // Verification errors mark the boxes; send/resend problems are just a notice
  const message = error || sendError;

  return (
    <View style={styles.screen}>
      <BlobBackground />

      {/* Edge-to-edge Android doesn't resize the window for the keyboard, so
          padding is applied here; the ScrollView keeps everything reachable on
          short screens while the keyboard is up. */}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.card}>
            <View style={styles.iconBadge}>
              <Ionicons name="shield-checkmark-outline" size={24} color={colors.primaryDark} />
            </View>

            <Text style={styles.title}>Enter verification code</Text>
            <Text style={styles.subtitle}>
              {phase === 'fetching' ? 'Sending a 6-digit code to ' : 'We sent a 6-digit code to '}
              <Text style={styles.phone}>+91 {masked}</Text>
            </Text>
            <TouchableOpacity onPress={onChangePhone} disabled={verifying} hitSlop={8} activeOpacity={0.7}>
              <Text style={styles.changeLink}>Change number</Text>
            </TouchableOpacity>

            {/* Six display-only boxes with the ONE real input laid over them */}
            <Pressable
              style={styles.otpRow}
              onPress={focusInput}
              onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
            >
              {Array.from({ length: OTP_LENGTH }, (_, i) => {
                const digit = otp[i];
                const isActive = phase === 'input' && !error && otp.length === i;
                return (
                  <View
                    key={i}
                    pointerEvents="none"
                    style={[
                      styles.otpBox,
                      { width: boxSize, height: Math.round(boxSize * 1.15) },
                      digit && styles.otpBoxFilled,
                      isActive && styles.otpBoxActive,
                      !!error && styles.otpBoxError,
                    ]}
                  >
                    {digit ? (
                      <Text style={styles.otpDigit}>{digit}</Text>
                    ) : isActive ? (
                      <View style={styles.caret} />
                    ) : null}
                  </View>
                );
              })}

              {/* The real input covers the boxes and takes taps itself, so
                  Android focuses it and opens the keyboard natively (even if
                  it's already focused). Nearly invisible (opacity 0.01) but
                  never hidden, disabled or non-editable, so typing, paste and
                  autofill all reach it. No controlled `selection`: it swallows
                  keystrokes on Android's new architecture. */}
              <TextInput
                ref={inputRef}
                style={styles.hiddenInput}
                value={otp}
                onChangeText={handleOtpChange}
                maxLength={OTP_LENGTH}
                editable={phase === 'input'}
                autoFocus
                keyboardType="number-pad"
                inputMode="numeric"
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
                importantForAutofill="yes"
                caretHidden
                selectionColor="transparent"
                underlineColorAndroid="transparent"
                autoCorrect={false}
                spellCheck={false}
                returnKeyType="done"
                onSubmitEditing={() => canVerify && handleVerify()}
                onFocus={() => { if (__DEV__) console.log('[OTP INPUT] focused'); }}
                onBlur={() => { if (__DEV__) console.log('[OTP INPUT] blurred'); }}
                onKeyPress={(e) => { if (__DEV__) console.log('[OTP INPUT] key:', e.nativeEvent.key); }}
                pointerEvents="none"
                accessibilityLabel="Verification code"
                accessibilityHint="Enter the 6 digit code sent by SMS"
              />
            </Pressable>

            {message ? (
              <View style={styles.messageRow}>
                <Ionicons name="alert-circle-outline" size={14} color={colors.danger} />
                <Text style={styles.messageText}>{message}</Text>
              </View>
            ) : null}

            <View style={styles.resendBlock}>
              <Text style={styles.resendPrompt}>Didn’t receive the code?</Text>
              {phase === 'fetching' ? (
                <Text style={styles.resendWait}>Sending code...</Text>
              ) : resending ? (
                <Text style={styles.resendWait}>Resending code...</Text>
              ) : resend > 0 ? (
                <Text style={styles.resendWait}>
                  Resend code in <Text style={styles.resendTimer}>00:{String(resend).padStart(2, '0')}</Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResend} disabled={verifying} hitSlop={8} activeOpacity={0.7}>
                  <Text style={styles.resendLink}>Resend code</Text>
                </TouchableOpacity>
              )}
            </View>

            <PrimaryButton
              style={[styles.btn, !canVerify && !verifying && styles.btnDisabled]}
              onPress={handleVerify}
              disabled={!canVerify || verifying}
            >
              {verifying ? (
                <View style={styles.btnBusy}>
                  <ActivityIndicator size="small" color={colors.white} />
                  <Text style={styles.btnText}>Verifying...</Text>
                </View>
              ) : (
                <Text style={[styles.btnText, !canVerify && styles.btnTextDisabled]}>Verify & Continue</Text>
              )}
            </PrimaryButton>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  card: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  title: {
    fontSize: 21,
    fontFamily: fonts.bold,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
  phone: {
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  changeLink: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: colors.primaryDark,
    marginTop: 6,
  },

  otpRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: BOX_GAP,
    marginTop: 26,
    position: 'relative',
  },
  otpBox: {
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxFilled: {
    backgroundColor: colors.white,
  },
  otpBoxActive: {
    borderColor: colors.primary,
    backgroundColor: alpha(COLORS.primaryLight, 0.12),
  },
  otpBoxError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerBackground,
  },
  otpDigit: {
    fontSize: 23,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  caret: {
    width: 2,
    height: 22,
    borderRadius: 1,
    backgroundColor: colors.primary,
  },
  // Covers the boxes and receives taps; see the note on the TextInput
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 1,
    height: 1,
    opacity: 0.01,
  },

  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  messageText: {
    flexShrink: 1,
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.danger,
    lineHeight: 16,
  },

  resendBlock: {
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 24,
    gap: 4,
  },
  resendPrompt: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
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
    borderRadius: 15,
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
  btnBusy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});

export default OTPScreen;
