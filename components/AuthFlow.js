import { useState } from 'react';
import PhoneEntry from './PhoneEntry';
import OTPScreen from './OTPScreen';
import Verifying from './Verifying';
import CompleteProfile from './CompleteProfile';
import BusinessTypeSelection from './BusinessTypeSelection';
import { useAuth } from '../context/AuthContext';
import { api, tokenStore } from '../services/api';

const AuthFlow = () => {
  const [screen, setScreen] = useState('phone');
  const [phone, setPhone] = useState('');
  const [pendingLogin, setPendingLogin] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const { login } = useAuth();

  // Called when OTP is verified — routes based on whether user exists
  const handleOtpSuccess = async (data) => {
    if (data.isNewUser) {
      // Store tokens so the completeProfile API call has auth headers
      tokenStore.setAccess(data.accessToken);
      await tokenStore.saveRefresh(data.refreshToken);
      setPendingLogin(data);
      setScreen('profile');
    } else {
      // Existing organizer — show verifying animation then log in
      setPendingLogin(data);
      setScreen('verifying');
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
    setScreen('business_type');
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

  if (screen === 'phone') {
    return (
      <PhoneEntry
        onNext={(num) => {
          console.log(`[AuthFlow] Switching to OTP screen for: ${num}`);
          setPhone(num);
          setScreen('otp');
        }}
      />
    );
  }

  if (screen === 'otp') {
    return (
      <OTPScreen
        phone={phone}
        onSendOtp={() => api.sendOtp(phone)}
        onVerify={(otp) => api.verifyOtp(phone, otp)}
        onResend={() => api.resendOtp(phone)}
        onSuccess={handleOtpSuccess}
        onChangePhone={() => setScreen('phone')}
      />
    );
  }

  if (screen === 'verifying') {
    return <Verifying onDone={handleVerifyingDone} />;
  }

  if (screen === 'profile') {
    return <CompleteProfile onDone={handleProfileStepDone} />;
  }

  if (screen === 'business_type') {
    return <BusinessTypeSelection onDone={handleBusinessTypeDone} />;
  }

  return null;
};

export default AuthFlow;
