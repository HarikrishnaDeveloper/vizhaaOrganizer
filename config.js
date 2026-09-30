import Constants from 'expo-constants';

// Backend URL, in order of precedence:
// 1. EXPO_PUBLIC_BACKEND_URL in .env.local (restart `npx expo start -c` after changing it)
//      Android emulator → http://10.0.2.2:5000
//      iOS simulator    → http://localhost:5000
// 2. In development: the PC running Metro, port 5000. Follows your Wi-Fi IP
//    automatically, so nothing needs editing when the router hands out a new one.
// 3. Production → https://vizhaa-backend.vercel.app
const DEV_BACKEND_PORT = 5000;

// hostUri is "<pc-ip>:<metro-port>" when the app was loaded from Metro
const devMachineUrl = () => {
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return __DEV__ && host ? `http://${host}:${DEV_BACKEND_PORT}` : null;
};

export const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL || devMachineUrl() || 'https://vizhaa-backend.vercel.app';
export const RAZORPAY_KEY_ID =
  process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_TUq4gN4HhQ4VF8';
