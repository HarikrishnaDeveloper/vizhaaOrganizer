import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Pressable, StyleSheet, KeyboardAvoidingView,
  ScrollView, Keyboard, AppState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BlobBackground from './BlobBackground';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 59;
// Delay before re-showing the keyboard after returning to the app, so the
// window has regained input focus (Android ignores the request otherwise)
const REFOCUS_DELAY_MS = 300;

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

  // Opens the keyboard. If the input is still focused but Android closed the
  // keyboard (after leaving the app to copy the code, or the back button),
  // focus() alone does nothing, so blur and focus again to re-show it.
  const focusInput = () => {
    const input = inputRef.current;
    if (!input) return;
    if (input.isFocused()) {
      if (Keyboard.isVisible()) return;
      input.blur();
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      input.focus();
    }
  };

  // Coming back from the SMS app / notification with a copied code: reopen
  // the keyboard so its clipboard suggestion can paste the code in one tap
  useEffect(() => {
    let timer;
    const subscription = AppState.addEventListener('change', (state) => {
      clearTimeout(timer);
      if (state === 'active') timer = setTimeout(focusInput, REFOCUS_DELAY_MS);
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'input' || resend <= 0) return;
    const t = setTimeout(() => setResend(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resend, phase]);

  // Typing, backspace, paste and SMS autofill all arrive here as the full text
  const handleOtpChange = (text) => {
    setOtp((previous) => sanitizeOtp(text, previous));
    setError('');
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
      setError(err.message || 'Failed to resend OTP');
    } finally {
      if (mountedRef.current) setResending(false);
    }
  };

  const title = phase === 'validating'
    ? 'SECURING ACCOUNT WITH OTP'
    : 'ENTER OTP TO SECURE YOUR ACCOUNT';

  const btnLabel =
    phase === 'fetching' ? 'Sending OTP...'
    : phase === 'validating' ? 'Validating OTP...'
    : 'Validate OTP';

  const resendLabel =
    phase === 'fetching' ? `Sending OTP to +91 ${phone}`
    : resending ? 'Resending OTP...'
    : resend > 0 ? `Resend OTP in 00:${String(resend).padStart(2, '0')}`
    : 'Resend OTP';

  const resendDisabled = phase !== 'input' || resend > 0 || resending;
  const busy = phase === 'fetching' || phase === 'validating';

  return (
    <View style={styles.screen}>
      <BlobBackground />

      {/* Edge-to-edge Android doesn't resize the window for the keyboard, so
          padding is applied here; the ScrollView keeps the card reachable on
          short screens when the keyboard is up. */}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>

            {phase === 'fetching' ? (
              <Text style={styles.phoneLine}>Sending OTP to +91 {phone}</Text>
            ) : (
              <TouchableOpacity
                onPress={onChangePhone}
                activeOpacity={0.7}
                disabled={phase === 'validating'}
              >
                <Text style={styles.phoneLine}>
                  OTP sent to +91 {phone} <Text style={styles.changeLink}>Change</Text>
                </Text>
              </TouchableOpacity>
            )}

            {/* Taps are handled here rather than by the hidden input, so a tap
                always reopens the keyboard even if the input is already focused */}
            <Pressable
              style={styles.otpRow}
              onPress={focusInput}
              accessible={false}
            >
              {Array.from({ length: OTP_LENGTH }, (_, i) => {
                const digit = otp[i];
                const isActive = phase === 'input' && otp.length === i;
                const hasError = !!error && !digit && i === otp.length;
                return (
                  <View
                    key={i}
                    pointerEvents="none"
                    style={[
                      styles.otpBox,
                      isActive && styles.otpBoxActive,
                      hasError && styles.otpBoxError,
                    ]}
                  >
                    {digit ? (
                      <Text style={styles.otpDigit}>{digit}</Text>
                    ) : phase === 'fetching' ? (
                      <Text style={styles.placeholder}>✱</Text>
                    ) : isActive ? (
                      <Text style={styles.cursor}>—</Text>
                    ) : null}
                  </View>
                );
              })}

              {/* The one real input, stretched invisibly over the boxes so Android
                  autofill and the keyboard's code / clipboard suggestions see a
                  normal visible field. It ignores touches (the Pressable above
                  handles them), and its selection is pinned to the end, so the
                  hidden cursor can never move and insert digits out of order.
                  No native maxLength, so a full code autofilled on top of a
                  partial entry isn't truncated; sanitizeOtp limits the length. */}
              <TextInput
                ref={inputRef}
                pointerEvents="none"
                style={styles.hiddenInput}
                value={otp}
                onChangeText={handleOtpChange}
                selection={{ start: otp.length, end: otp.length }}
                autoFocus
                keyboardType="number-pad"
                inputMode="numeric"
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
                importantForAutofill="yes"
                editable={phase !== 'validating'}
                caretHidden
                selectionColor="transparent"
                underlineColorAndroid="transparent"
                autoCorrect={false}
                spellCheck={false}
                returnKeyType="done"
                onSubmitEditing={handleVerify}
                accessibilityLabel="One-time password"
                accessibilityHint="Enter the 6 digit code sent by SMS"
              />
            </Pressable>

            {phase === 'fetching' && (
              <Text style={styles.fetchingText}>Sending OTP...</Text>
            )}

            {(error || sendError) ? (
              <Text style={styles.errorText}>{error || sendError}</Text>
            ) : null}

            <TouchableOpacity disabled={resendDisabled} onPress={handleResend} activeOpacity={0.7}>
              <Text style={[styles.resendText, resendDisabled && styles.resendDim]}>
                {resendLabel}
              </Text>
            </TouchableOpacity>

            <View style={{ height: 20 }} />

            <TouchableOpacity
              style={[styles.btn, busy && styles.btnDim]}
              onPress={handleVerify}
              activeOpacity={0.85}
              disabled={busy}
            >
              <Text style={styles.btnText}>{btnLabel}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  card: {
    backgroundColor: '#EBEBEB',
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },

  title: {
    fontSize: 12,
    fontFamily: 'Outfit_700Bold',
    color: '#333',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginBottom: 6,
  },
  phoneLine: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: '#999',
    marginBottom: 6,
    textAlign: 'center',
  },
  changeLink: {
    fontFamily: 'Outfit_600SemiBold',
    color: '#333',
    textDecorationLine: 'underline',
  },

  // Boxes share the card width so the row never overflows on 320–360dp phones
  otpRow: {
    width: '100%',
    maxWidth: 320,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 18,
  },

  otpBox: {
    flex: 1,
    maxWidth: 46,
    aspectRatio: 42 / 52,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  otpBoxActive: {
    backgroundColor: '#FFF',
    shadowOpacity: 0.14,
  },
  otpBoxError: {
    backgroundColor: '#FFE4E4',
    borderWidth: 1.5,
    borderColor: '#FF6B6B',
  },
  otpDigit: {
    fontSize: 24,
    fontFamily: 'Outfit_700Bold',
    color: '#111',
  },
  // Full-size and transparent (not display:none / zero-size / opacity 0) so it
  // stays focusable and Android's autofill service still treats it as visible
  hiddenInput: {
    ...StyleSheet.absoluteFillObject,
    color: 'transparent',
    backgroundColor: 'transparent',
    fontSize: 1,
    padding: 0,
  },
  placeholder: {
    fontSize: 22,
    color: '#CCC',
    fontFamily: 'Outfit_400Regular',
  },
  cursor: {
    fontSize: 20,
    color: '#AAA',
    fontFamily: 'Outfit_400Regular',
  },

  fetchingText: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: '#AAA',
    marginBottom: 6,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 6,
  },

  resendText: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    color: '#333',
    textAlign: 'center',
  },
  resendDim: {
    color: '#AAA',
    fontFamily: 'Outfit_400Regular',
  },

  btn: {
    width: '100%',
    backgroundColor: '#111',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDim: {
    backgroundColor: '#555',
  },
  btnText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
});

export default OTPScreen;
