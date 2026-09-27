import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';
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

  // FormData (file uploads) must let fetch set its own multipart boundary
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(_accessToken ? { Authorization: `Bearer ${_accessToken}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json();
  if (__DEV__) console.log(`[API RESPONSE] <= ${res.status} ${url}`);

  if (!res.ok) {
    const errorMsg = data.error ? `${data.message}: ${data.error}` : data.message || 'Request failed';
    const error = new Error(errorMsg);
    error.status = res.status;
    error.code = data.code;
    throw error;
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
  getProfile:      ()             => request('/api/organizer/profile',    { method: 'GET' }),
  // photo: { uri, mimeType, fileName } from expo-image-picker
  uploadProfilePhoto: (photo) => {
    // Expo's fetch rejects React Native's { uri, type, name } parts ("Unsupported
    // FormDataPart implementation"); it needs a part that can give its bytes.
    const hint = `${photo.mimeType || ''} ${photo.fileName || photo.uri}`.toLowerCase();
    const [type, ext] = hint.includes('png') ? ['image/png', 'png']
      : hint.includes('webp') ? ['image/webp', 'webp']
      : ['image/jpeg', 'jpg'];
    const file = new File(photo.uri);
    const body = new FormData();
    body.append('photo', { name: `profile.${ext}`, type, bytes: () => file.bytes() });
    return request('/api/organizer/profile/photo', { method: 'POST', body });
  },
  deleteProfilePhoto: ()          => request('/api/organizer/profile/photo', { method: 'DELETE' }),
  sendEmailCode:   ()             => request('/api/organizer/profile/email/send-code', { method: 'POST' }),
  verifyEmailCode: (code)         => request('/api/organizer/profile/email/verify', { method: 'POST', body: JSON.stringify({ code }) }),
  createEvent:     (data)         => request('/api/events',               { method: 'POST', body: JSON.stringify(data) }),
  getEvents:       ()             => request('/api/events',               { method: 'GET' }),
  getEventDetail:  (id)           => request(`/api/events/${id}`,         { method: 'GET' }),

  // Payments
  createPaymentOrder: (amount) => request('/api/payments/order', { method: 'POST', body: JSON.stringify({ amount }) }),
  verifyPayment: (data) => request('/api/payments/verify', { method: 'POST', body: JSON.stringify(data) }),

  // Place search / geocoding via the backend (the provider key stays on the server)
  placesAutocomplete: (input, bias) =>
    request('/api/places/autocomplete', { method: 'POST', body: JSON.stringify({ input, ...bias }) }),
  placeDetails: (placeId) =>
    request(`/api/places/details/${encodeURIComponent(placeId)}`, { method: 'GET' }),
  reverseGeocode: (latitude, longitude) =>
    request(`/api/places/reverse-geocode?latitude=${latitude}&longitude=${longitude}`, { method: 'GET' }),
};
