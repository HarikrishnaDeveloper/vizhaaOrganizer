import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../config';

const REFRESH_KEY = '@vizhaa/refresh_token';

let _accessToken = null;

export const tokenStore = {
  setAccess: (t) => { _accessToken = t; },
  getAccess: () => _accessToken,
  clearAccess: () => { _accessToken = null; },
  saveRefresh: (t) => AsyncStorage.setItem(REFRESH_KEY, t),
  getRefresh: () => AsyncStorage.getItem(REFRESH_KEY),
  clearRefresh: () => AsyncStorage.removeItem(REFRESH_KEY),
  clearAll: async () => {
    _accessToken = null;
    await AsyncStorage.removeItem(REFRESH_KEY);
  },
};

const request = async (path, options = {}) => {
  const url = `${BACKEND_URL}${path}`;
  
  // Bodies and responses are never logged: they carry OTPs and auth tokens
  if (__DEV__) console.log(`\n[API REQUEST] => ${options.method || 'GET'} ${url}`);

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(_accessToken ? { Authorization: `Bearer ${_accessToken}` } : {}),
      ...options.headers,
    },
  });
  
  const data = await res.json();
  if (__DEV__) console.log(`[API RESPONSE] <= ${res.status} ${url}`);

  if (!res.ok) {
    const errorMsg = data.error ? `${data.message}: ${data.error}` : data.message || 'Request failed';
    throw new Error(errorMsg);
  }
  return data;
};

export const api = {
  sendOtp:         (phone)        => request('/api/auth/send-otp',        { method: 'POST', body: JSON.stringify({ mobile: phone }) }),
  verifyOtp:       (phone, otp)   => request('/api/auth/verify-otp',      { method: 'POST', body: JSON.stringify({ mobile: phone, otp }) }),
  resendOtp:       (phone)        => request('/api/auth/resend-otp',      { method: 'POST', body: JSON.stringify({ mobile: phone }) }),
  refresh:         (refreshToken) => request('/api/auth/refresh',          { method: 'POST', body: JSON.stringify({ refreshToken }) }),
  logout:          (refreshToken) => request('/api/auth/logout',           { method: 'POST', body: JSON.stringify({ refreshToken }) }),
  completeProfile: (data)         => request('/api/organizer/profile',    { method: 'POST', body: JSON.stringify(data) }),
  createEvent:     (data)         => request('/api/events',               { method: 'POST', body: JSON.stringify(data) }),
  getEvents:       ()             => request('/api/events',               { method: 'GET' }),
  getEventDetail:  (id)           => request(`/api/events/${id}`,         { method: 'GET' }),

  // Payments
  createPaymentOrder: (amount) => request('/api/payments/order', { method: 'POST', body: JSON.stringify({ amount }) }),
  verifyPayment: (data) => request('/api/payments/verify', { method: 'POST', body: JSON.stringify(data) }),
};
