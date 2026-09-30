import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator,
  FlatList, Keyboard, Platform,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import TextInput from './ui/ThemedTextInput';
import { api } from '../services/api';
import { COLORS, colors, fonts, radii, shadows, buttons, input, alpha } from '../theme';
import PrimaryButton from './ui/PrimaryButton';

// Service area: Coimbatore, Tamil Nadu. The map opens here and search is biased to it
const COIMBATORE = { latitude: 11.0168, longitude: 76.9558 };
const SERVICE_AREA_SUFFIX = 'Coimbatore, Tamil Nadu';
const DEFAULT_REGION = { ...COIMBATORE, latitudeDelta: 0.18, longitudeDelta: 0.18 };
// Street-level zoom used once a place is chosen
const PLACE_DELTA = { latitudeDelta: 0.006, longitudeDelta: 0.006 };
const MAX_DEVICE_RESULTS = 5;
const AUTOCOMPLETE_DELAY_MS = 300;
// Wait for the map to settle before reverse geocoding (it's billed / rate limited)
const REVERSE_GEOCODE_DELAY_MS = 600;
// Nudging the pin within this distance keeps the searched venue's name
const KEEP_NAME_WITHIN_METERS = 150;

// Soft map style built from COLORS. Applies to the Android
// map renderer (react-native-maps → Google Maps SDK); Apple Maps ignores it.
export const MONOCHROME_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: COLORS.surfaceSecondary }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: COLORS.textSecondary }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: COLORS.surfaceSecondary }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: COLORS.border }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: COLORS.limeLight }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: COLORS.white }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: COLORS.border }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: COLORS.primaryLight }] },
];

const distanceMeters = (a, b) => {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

// Device (expo-location) address → the fields the event stores
const fromDeviceAddress = (geo, coords) => {
  const street = [geo?.streetNumber, geo?.street].filter(Boolean).join(' ');
  const city = geo?.city || geo?.subregion || geo?.district || '';
  const parts = [street, geo?.district, city, geo?.region, geo?.postalCode].filter(Boolean);
  // `name` is often just the house number; prefer something meaningful
  const name = geo?.name && !/^\d+[\w/-]*$/.test(geo.name) ? geo.name : '';
  return {
    placeId: null,
    locationName: name || street || geo?.district || city || '',
    formattedAddress: geo?.formattedAddress || [...new Set(parts)].join(', '),
    city,
    state: geo?.region || '',
    pincode: geo?.postalCode || '',
    latitude: coords.latitude,
    longitude: coords.longitude,
  };
};

const ensurePermission = async () => {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Location.requestForegroundPermissionsAsync()).granted;
};

// Only a missing server key switches to the device geocoder; busy/timeouts don't
const isNotConfigured = (err) => err?.code === 'PLACES_NOT_CONFIGURED';

// Suggestions from the backend already carry the full place
const PLACE_KEYS = ['placeId', 'locationName', 'formattedAddress', 'city', 'state', 'pincode', 'latitude', 'longitude'];
const toPlace = (s) => Object.fromEntries(PLACE_KEYS.map((k) => [k, s[k] ?? (k === 'placeId' ? null : '')]));

export const cityStateLine = (p) => [p?.city, p?.state].filter(Boolean).join(', ');

// Select → adjust → confirm. Search (Geoapify autocomplete through the
// backend) or GPS positions the map; the user drags the map under a fixed
// centre pin; the centre is what gets saved.
const LocationPicker = ({ visible, startWith = 'search', initial, onClose, onConfirm }) => {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const searchRef = useRef(null);
  const typingTimer = useRef(null);
  const geocodeTimer = useRef(null);
  const searchId = useRef(0);
  const geocodeId = useRef(0);
  // True while the map still shows the default Coimbatore view the user hasn't touched
  const pristineRef = useRef(false);
  // Venue chosen from search; its name survives small pin adjustments
  const anchorRef = useRef(null);
  // null = unknown, true = backend place search, false = device geocoder fallback
  const backendRef = useRef(null);

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [place, setPlace] = useState(null);
  const [message, setMessage] = useState('');

  const moveTo = (coords) => {
    pristineRef.current = false;
    mapRef.current?.animateToRegion({ ...coords, ...PLACE_DELTA }, 450);
  };

  const useCurrentLocation = async () => {
    Keyboard.dismiss();
    setSuggestions([]);
    setMessage('');
    setLocating(true);
    try {
      if (!(await ensurePermission())) {
        setMessage('Location permission is off. Search for the venue instead.');
        return;
      }
      const position =
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).catch(() => null)) ||
        (await Location.getLastKnownPositionAsync());
      if (!position) throw new Error('no position');
      anchorRef.current = null;
      moveTo(position.coords);
    } catch {
      setMessage('Couldn’t get your current location. Check that GPS is on, or search instead.');
    } finally {
      setLocating(false);
    }
  };

  // Reset each time the picker opens
  useEffect(() => {
    if (!visible) return;
    anchorRef.current = initial?.locationName ? initial : null;
    setQuery('');
    setSuggestions([]);
    setMessage('');
    setPlace(initial || null);
    pristineRef.current = initial?.latitude == null;
    if (!initial) {
      if (startWith === 'current') useCurrentLocation();
      else setTimeout(() => searchRef.current?.focus(), 350);
    }
    return () => {
      clearTimeout(typingTimer.current);
      clearTimeout(geocodeTimer.current);
    };
  }, [visible]);

  // Device-geocoder search (used when the backend has no place-search key)
  const deviceSearch = async (text) => {
    if (!(await ensurePermission())) {
      setMessage('Allow location access to search places, or drag the map to the venue.');
      return;
    }
    // The device geocoder has no location bias, so scope bare names to the service area
    const scoped = text.includes(',') ? text : `${text}, ${SERVICE_AREA_SUFFIX}`;
    const found = (await Location.geocodeAsync(scoped)).slice(0, MAX_DEVICE_RESULTS);
    const detailed = await Promise.all(found.map(async (coords) => {
      const [geo] = await Location.reverseGeocodeAsync(coords).catch(() => []);
      const p = fromDeviceAddress(geo, coords);
      return { key: `${coords.latitude},${coords.longitude}`, mainText: p.locationName || text, secondaryText: p.formattedAddress, place: p };
    }));
    setSuggestions(detailed);
    if (!detailed.length) setMessage('No places found. Try adding the city, e.g. “Codissia, Coimbatore”.');
  };

  const runSearch = async (text, { submitted = false } = {}) => {
    const q = text.trim();
    if (q.length < 2) { setSuggestions([]); return; }
    // Device search is slow and rate limited: only on submit
    if (backendRef.current === false && !submitted) return;
    const id = ++searchId.current;
    setSearching(true);
    setMessage('');
    try {
      if (backendRef.current !== false) {
        try {
          const res = await api.placesAutocomplete(q, COIMBATORE);
          backendRef.current = true;
          if (id !== searchId.current) return;
          setSuggestions(res.suggestions.map((s) => ({ key: s.placeId, ...s })));
          if (!res.suggestions.length && submitted) setMessage('No places found. Try a different name or add the city.');
          return;
        } catch (err) {
          if (!isNotConfigured(err)) throw err;
          backendRef.current = false;
          if (!submitted) { setMessage('Press Search to find the place.'); return; }
        }
      }
      await deviceSearch(q);
    } catch {
      if (id === searchId.current) setMessage('Search failed. Check your connection and try again.');
    } finally {
      if (id === searchId.current) setSearching(false);
    }
  };

  const onChangeQuery = (text) => {
    setQuery(text);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => runSearch(text), AUTOCOMPLETE_DELAY_MS);
  };

  const pickSuggestion = async (s) => {
    Keyboard.dismiss();
    setSuggestions([]);
    setQuery(s.mainText);
    setMessage('');
    try {
      let picked = s.place || (s.latitude != null ? toPlace(s) : null);
      if (!picked) {
        setResolving(true);
        picked = (await api.placeDetails(s.placeId)).place;
      }
      anchorRef.current = picked;
      setPlace(picked);
      moveTo(picked);
    } catch {
      setMessage('Couldn’t load that place. Please try again.');
    } finally {
      setResolving(false);
    }
  };

  const reverseGeocode = async (coords) => {
    if (backendRef.current !== false) {
      try {
        const res = await api.reverseGeocode(coords.latitude, coords.longitude);
        backendRef.current = true;
        return res.place;
      } catch (err) {
        if (!isNotConfigured(err)) return null;
        backendRef.current = false;
      }
    }
    const { granted } = await Location.getForegroundPermissionsAsync();
    if (!granted) return null;
    const [geo] = await Location.reverseGeocodeAsync(coords).catch(() => []);
    return geo ? fromDeviceAddress(geo, coords) : null;
  };

  // The pin is fixed at the map centre, so the centre is the chosen point
  const onRegionChangeComplete = (region) => {
    if (pristineRef.current) return; // default city view, nothing picked yet
    const coords = { latitude: region.latitude, longitude: region.longitude };
    setPlace((p) => ({ ...(p || {}), ...coords }));
    clearTimeout(geocodeTimer.current);
    const id = ++geocodeId.current;
    geocodeTimer.current = setTimeout(async () => {
      setResolving(true);
      const found = await reverseGeocode(coords);
      if (id !== geocodeId.current) return; // map moved again meanwhile
      const anchor = anchorRef.current;
      const nearAnchor = anchor?.latitude != null && distanceMeters(anchor, coords) <= KEEP_NAME_WITHIN_METERS;
      setPlace((p) => {
        const next = { ...(found || p), ...coords };
        // Small nudge: keep the searched venue's identity, only the pin moves
        return nearAnchor
          ? { ...next, locationName: anchor.locationName, placeId: anchor.placeId, formattedAddress: anchor.formattedAddress || next.formattedAddress }
          : next;
      });
      setResolving(false);
    }, REVERSE_GEOCODE_DELAY_MS);
  };

  const hasPin = place?.latitude != null;
  const canConfirm = hasPin && !resolving;

  const initialRegion = initial?.latitude != null
    ? { latitude: initial.latitude, longitude: initial.longitude, ...PLACE_DELTA }
    : DEFAULT_REGION;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
            <Ionicons name="close" size={22} color={colors.icon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select event location</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color={colors.iconSecondary} style={styles.searchIcon} />
            <TextInput
              ref={searchRef}
              style={styles.searchInput}
              placeholder="Search venues in Coimbatore"
              value={query}
              onChangeText={onChangeQuery}
              onSubmitEditing={() => runSearch(query, { submitted: true })}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searching ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.searchTrailing} />
            ) : query.length > 0 ? (
              <TouchableOpacity style={styles.searchTrailing} onPress={() => { setQuery(''); setSuggestions([]); }}>
                <Ionicons name="close-circle" size={18} color={colors.iconMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>

        {/* Map with fixed centre pin */}
        <View style={styles.mapWrap}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            customMapStyle={MONOCHROME_MAP_STYLE}
            initialRegion={initialRegion}
            onRegionChangeComplete={onRegionChangeComplete}
            onTouchStart={() => { pristineRef.current = false; }}
            showsUserLocation
            showsMyLocationButton={false}
            toolbarEnabled={false}
          />
          <View style={styles.pinWrap} pointerEvents="none">
            <Ionicons name="location" size={44} color={colors.primary} />
            <View style={styles.pinShadow} />
          </View>
          <View style={styles.hint} pointerEvents="none">
            <Text style={styles.hintText}>{hasPin ? 'Move map to adjust' : 'Search or use your current location'}</Text>
          </View>

          <TouchableOpacity style={styles.currentBtn} onPress={useCurrentLocation} disabled={locating} activeOpacity={0.85}>
            {locating
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Ionicons name="navigate" size={16} color={colors.icon} />}
            <Text style={styles.currentBtnText}>Use my current location</Text>
          </TouchableOpacity>

          {/* Suggestions over the map */}
          {suggestions.length > 0 && (
            <View style={styles.results}>
              <FlatList
                data={suggestions}
                keyExtractor={(s) => s.key}
                keyboardShouldPersistTaps="handled"
                ItemSeparatorComponent={() => <View style={styles.resultDivider} />}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.resultRow} onPress={() => pickSuggestion(item)}>
                    <Ionicons name="location-outline" size={18} color={colors.icon} style={{ marginTop: 1 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultName} numberOfLines={1}>{item.mainText}</Text>
                      {item.secondaryText ? (
                        <Text style={styles.resultAddress} numberOfLines={2}>{item.secondaryText}</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>

        {/* Selected location + confirm */}
        <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
          <Text style={styles.sheetLabel}>SELECTED LOCATION</Text>
          <View style={styles.sheetRow}>
            <View style={styles.sheetIcon}>
              <Ionicons name="location-outline" size={20} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              {resolving ? (
                <Text style={styles.sheetSub}>Finding address...</Text>
              ) : hasPin ? (
                <>
                  <Text style={styles.sheetName} numberOfLines={1}>{place.locationName || 'Pinned location'}</Text>
                  <Text style={styles.sheetSub} numberOfLines={2}>
                    {cityStateLine(place) || place.formattedAddress || `${place.latitude.toFixed(5)}, ${place.longitude.toFixed(5)}`}
                  </Text>
                </>
              ) : (
                <Text style={styles.sheetSub}>No location selected yet</Text>
              )}
            </View>
          </View>
          <PrimaryButton
            style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
            disabled={!canConfirm}
            onPress={() => onConfirm(place)}
          >
            <Text style={[styles.confirmText, !canConfirm && styles.confirmTextDisabled]}>Confirm location</Text>
          </PrimaryButton>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: radii.md,
    backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontFamily: fonts.bold, color: colors.text },

  searchWrap: { paddingHorizontal: 16, paddingBottom: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchIcon: { position: 'absolute', left: 14, zIndex: 1 },
  searchInput: { ...input, flex: 1, height: 50, paddingLeft: 40, paddingRight: 44, fontSize: 14 },
  searchTrailing: { position: 'absolute', right: 14 },
  message: { marginTop: 10, fontSize: 12, fontFamily: fonts.regular, color: colors.textSecondary, lineHeight: 17 },

  mapWrap: { flex: 1, overflow: 'hidden', backgroundColor: colors.surfaceTertiary },
  // Pin tip sits exactly on the map centre
  pinWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingBottom: 44 },
  pinShadow: { width: 10, height: 4, borderRadius: 5, backgroundColor: alpha(COLORS.text, 0.25), marginTop: -4 },
  hint: { position: 'absolute', top: 12, alignSelf: 'center', backgroundColor: colors.darkSurface, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill },
  hintText: { color: colors.white, fontSize: 12, fontFamily: fonts.regular },
  currentBtn: {
    position: 'absolute', bottom: 16, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surface, paddingVertical: 11, paddingHorizontal: 16,
    borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border,
    ...shadows.raised,
  },
  currentBtnText: { fontSize: 13, fontFamily: fonts.semibold, color: colors.text },

  results: {
    position: 'absolute', top: 8, left: 12, right: 12, maxHeight: 300,
    backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    ...shadows.raised,
  },
  resultRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  resultName: { fontSize: 14, fontFamily: fonts.semibold, color: colors.text },
  resultAddress: { fontSize: 12, fontFamily: fonts.regular, color: colors.textSecondary, marginTop: 2, lineHeight: 16 },
  resultDivider: { height: 1, backgroundColor: colors.divider, marginHorizontal: 14 },

  sheet: {
    backgroundColor: colors.surface, paddingHorizontal: 20, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  sheetLabel: { fontSize: 10, fontFamily: fonts.semibold, color: colors.textMuted, letterSpacing: 1.2, marginBottom: 10 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  sheetIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  sheetName: { fontSize: 16, fontFamily: fonts.bold, color: colors.text },
  sheetSub: { fontSize: 13, fontFamily: fonts.regular, color: colors.textSecondary, marginTop: 2, lineHeight: 17 },
  confirmBtn: { ...buttons.primary },
  confirmBtnDisabled: { ...buttons.disabled },
  confirmText: { ...buttons.primaryText },
  confirmTextDisabled: { ...buttons.disabledText },
});

export default LocationPicker;
