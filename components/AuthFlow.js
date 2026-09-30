import { useState } from 'react';
import PhoneEntry from './PhoneEntry';
import OTPScreen from './OTPScreen';
import Verifying from './Verifying';
import CompleteProfile from './CompleteProfile';
import BusinessTypeSelection from './BusinessTypeSelection';
import ScreenTransition from './ScreenTransition';
import { useAuth } from '../context/AuthContext';
import { api, tokenStore } from '../services/api';

const AuthFlow = () => {
  const [screen, setScreen] = useState('phone');
  const [direction, setDirection] = useState('forward');
  const [phone, setPhone] = useState('');
  const [pendingLogin, setPendingLogin] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const { login } = useAuth();

  // direction: 'forward' slides in from the right, 'back' from the left
  const goTo = (next, dir = 'forward') => {
    setDirection(dir);
    setScreen(next);
  };

  // Called when OTP is verified — routes based on whether user exists
  const handleOtpSuccess = async (data) => {
    if (data.isNewUser) {
      // Store tokens so the completeProfile API call has auth headers
      tokenStore.setAccess(data.accessToken);
      await tokenStore.saveRefresh(data.refreshToken);
      setPendingLogin(data);
      goTo('profile');
    } else {
      // Existing organizer — show verifying animation then log in
      setPendingLogin(data);
      goTo('verifying');
    }
  };

  // Called when Verifying animation completes (existing user path)
  const handleVerifyingDone = async () => {
    if (pendingLogin) {
      await login(pendingLogin.accessToken, pendingLogin.refreshToken, pendingLogin.user);
      // AuthContext user is now set → AppContent re-renders Dashboard
    }
  };

  // Called when profile fields are filled (step 1 of new user setup)
  const handleProfileStepDone = (data) => {
    setProfileData(data);
    goTo('business_type');
  };

  // Called when business type is selected (final step of new user setup)
  const handleBusinessTypeDone = async (businessType) => {
    if (pendingLogin && profileData) {
      try {
        const fullProfile = { ...profileData, businessType };
        const result = await api.completeProfile(fullProfile);
        await login(pendingLogin.accessToken, pendingLogin.refreshToken, result.user);
      } catch (err) {
        alert(err.message || 'Failed to complete setup');
      }
    }
  };

  let content = null;
  if (screen === 'phone') {
    content = (
      <PhoneEntry
        onNext={(num) => {
          console.log(`[AuthFlow] Switching to OTP screen for: ${num}`);
          setPhone(num);
          goTo('otp');
        }}
      />
    );
  } else if (screen === 'otp') {
    content = (
      <OTPScreen
        phone={phone}
        onSendOtp={() => api.sendOtp(phone)}
        onVerify={(otp) => api.verifyOtp(phone, otp)}
        onResend={() => api.resendOtp(phone)}
        onSuccess={handleOtpSuccess}
        onChangePhone={() => goTo('phone', 'back')}
      />
    );
  } else if (screen === 'verifying') {
    content = <Verifying onDone={handleVerifyingDone} />;
  } else if (screen === 'profile') {
    content = <CompleteProfile onDone={handleProfileStepDone} />;
  } else if (screen === 'business_type') {
    content = <BusinessTypeSelection onDone={handleBusinessTypeDone} />;
  }

  return (
    <ScreenTransition screenKey={screen} direction={direction}>
      {content}
    </ScreenTransition>
  );
};

export default AuthFlow;
