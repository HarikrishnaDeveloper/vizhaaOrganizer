import { useState, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
import { AuthProvider, useAuth } from './context/AuthContext';

SplashScreen.preventAutoHideAsync();

// Inner component so it can read AuthContext
const AppContent = () => {
  const { user, loading } = useAuth();

  const [showOnboarding, setShowOnboarding] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [tempEventData, setTempEventData] = useState(null);
  const [tempAmountPaid, setTempAmountPaid] = useState(0);

  // While checking stored token, show blank screen (SplashScreen is still visible)
  if (loading) return <View style={{ flex: 1, backgroundColor: '#FFF' }} />;



  // Token was valid — go straight to Dashboard
  if (user) {
    if (currentScreen === 'add-event') {
      return (
        <AddEvent 
          onBack={() => setCurrentScreen('dashboard')} 
          initialData={tempEventData}
          onProceed={(data) => {
            setTempEventData(data);
            setCurrentScreen('payment');
          }}
        />
      );
    }
    if (currentScreen === 'payment') {
      return (
        <PaymentReview 
          eventData={tempEventData}
          onBack={() => setCurrentScreen('add-event')} 
          onPay={(amount) => {
            setTempAmountPaid(amount);
            setCurrentScreen('success');
          }}
        />
      );
    }
    if (currentScreen === 'success') {
      return (
        <SuccessScreen 
          amount={tempAmountPaid}
          onDone={() => {
            setTempEventData(null);
            setTempAmountPaid(0);
            setCurrentScreen('dashboard');
          }}
        />
      );
    }
    if (currentScreen === 'profile') {
      return <ProfileScreen onNavigate={(screen) => setCurrentScreen(screen)} />;
    }
    if (currentScreen === 'status') {
      return (
        <StatusScreen 
          onNavigate={(screen) => setCurrentScreen(screen)} 
          onEventPress={(event) => {
            setTempEventData(event);
            setCurrentScreen('event-tracking');
          }}
        />
      );
    }
    if (currentScreen === 'history') {
      return (
        <HistoryScreen 
          onNavigate={(screen) => setCurrentScreen(screen)} 
          onEventPress={(event) => {
            setTempEventData(event);
            setCurrentScreen('history-details');
          }}
        />
      );
    }
    if (currentScreen === 'payment-tab') {
      return <PaymentTab onNavigate={(screen) => setCurrentScreen(screen)} />;
    }
    if (currentScreen === 'history-details') {
      return (
        <HistoryDetails 
          event={tempEventData}
          onBack={() => setCurrentScreen('history')}
        />
      );
    }
    if (currentScreen === 'event-tracking') {
      return (
        <EventTracking 
          event={tempEventData}
          onBack={() => setCurrentScreen('status')}
        />
      );
    }
    return (
      <Dashboard 
        onAddEvent={() => setCurrentScreen('add-event')} 
        onNavigate={(screen) => setCurrentScreen(screen)}
        onEventPress={(event) => {
          setTempEventData(event);
          setCurrentScreen('event-tracking');
        }}
      />
    );
  }

  // First launch — show onboarding, then auth flow
  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  }

  return <AuthFlow />;
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <View style={styles.container} onLayout={onLayoutRootView}>
          <StatusBar style="dark" />
          <AppContent />
        </View>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
});
