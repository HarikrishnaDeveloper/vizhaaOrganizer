import { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import Onboarding from './components/Onboarding';
import AuthFlow from './components/AuthFlow';
import Dashboard from './components/Dashboard';
import AddEvent from './components/AddEvent';
import PaymentReview from './components/PaymentReview';
import SuccessScreen from './components/SuccessScreen';
import ProfileScreen from './components/ProfileScreen';
import StatusScreen from './components/StatusScreen';
import HistoryScreen from './components/HistoryScreen';
import HistoryDetails from './components/HistoryDetails';
import EventTracking from './components/EventTracking';

import PaymentTab from './components/PaymentTab';
import ScreenTransition from './components/ScreenTransition';
import { AuthProvider, useAuth } from './context/AuthContext';
import { colors } from './theme';

SplashScreen.preventAutoHideAsync();

// Longest the splash may wait for the onboarding illustration before the
// onboarding screen's own loading state takes over
const ONBOARDING_SPLASH_TIMEOUT_MS = 4000;

const hideSplash = () => {
  SplashScreen.hideAsync().catch(() => {});
};

// Inner component so it can read AuthContext
const AppContent = () => {
  const { user, loading } = useAuth();

  const [showOnboarding, setShowOnboarding] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [direction, setDirection] = useState('forward');
  const [tempEventData, setTempEventData] = useState(null);
  const [tempAmountPaid, setTempAmountPaid] = useState(0);
  const [tempPayment, setTempPayment] = useState(null);

  // The splash stays up while the stored token is checked. Onboarding hides it
  // itself once its illustration is decoded (see onReady below); every other
  // screen hides it as soon as auth resolves.
  const waitingForOnboarding = !user && showOnboarding;
  useEffect(() => {
    if (loading) return;
    if (!waitingForOnboarding) {
      hideSplash();
      return;
    }
    const timeout = setTimeout(hideSplash, ONBOARDING_SPLASH_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [loading, waitingForOnboarding]);

  // direction: 'forward' slides in from the right, 'back' from the left, 'fade' only fades
  const navigate = (screen, dir = 'forward') => {
    setDirection(dir);
    setCurrentScreen(screen);
  };
  // Bottom-tab switches fade instead of sliding
  const navigateTab = (screen) => navigate(screen, 'fade');

  // While checking stored token, show blank screen (SplashScreen is still visible)
  if (loading) return <View style={{ flex: 1, backgroundColor: colors.background }} />;



  // Token was valid — go straight to Dashboard
  if (user) {
    let screen;
    if (currentScreen === 'add-event') {
      screen = (
        <AddEvent
          onBack={() => navigate('dashboard', 'back')}
          initialData={tempEventData}
          onProceed={(data) => {
            setTempEventData(data);
            navigate('payment');
          }}
        />
      );
    } else if (currentScreen === 'payment') {
      screen = (
        <PaymentReview
          eventData={tempEventData}
          onBack={() => navigate('add-event', 'back')}
          onPay={(amount, payment) => {
            setTempAmountPaid(amount);
            setTempPayment(payment || null);
            navigate('success');
          }}
        />
      );
    } else if (currentScreen === 'success') {
      screen = (
        <SuccessScreen
          amount={tempAmountPaid}
          payment={tempPayment}
          onDone={() => {
            setTempEventData(null);
            setTempAmountPaid(0);
            setTempPayment(null);
            navigate('dashboard', 'fade');
          }}
        />
      );
    } else if (currentScreen === 'profile') {
      screen = <ProfileScreen onNavigate={navigateTab} />;
    } else if (currentScreen === 'status') {
      screen = (
        <StatusScreen
          onNavigate={navigateTab}
          onEventPress={(event) => {
            setTempEventData(event);
            navigate('event-tracking');
          }}
        />
      );
    } else if (currentScreen === 'history') {
      screen = (
        <HistoryScreen
          onNavigate={navigateTab}
          onEventPress={(event) => {
            setTempEventData(event);
            navigate('history-details');
          }}
        />
      );
    } else if (currentScreen === 'payment-tab') {
      screen = <PaymentTab onNavigate={navigateTab} />;
    } else if (currentScreen === 'history-details') {
      screen = (
        <HistoryDetails
          event={tempEventData}
          onBack={() => navigate('history', 'back')}
        />
      );
    } else if (currentScreen === 'event-tracking') {
      screen = (
        <EventTracking
          event={tempEventData}
          onBack={() => navigate('status', 'back')}
        />
      );
    } else {
      screen = (
        <Dashboard
          onAddEvent={() => navigate('add-event')}
          onNavigate={navigateTab}
          onEventPress={(event) => {
            setTempEventData(event);
            navigate('event-tracking');
          }}
        />
      );
    }

    return (
      <ScreenTransition screenKey={currentScreen} direction={direction}>
        {screen}
      </ScreenTransition>
    );
  }

  // First launch — show onboarding, then auth flow
  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} onReady={hideSplash} />;
  }

  return <AuthFlow />;
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AuthProvider>
        <View style={styles.container}>
          <StatusBar style="dark" />
          <AppContent />
        </View>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
