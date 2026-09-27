import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Modal, Dimensions, FlatList, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import TextInput from './ui/ThemedTextInput';
import LocationPicker, { MONOCHROME_MAP_STYLE, cityStateLine } from './LocationPicker';
import { colors, fonts, radii, shadows, buttons, input } from '../theme';
import PrimaryButton from './ui/PrimaryButton';

const { width } = Dimensions.get('window');

const EVENT_TYPES = [
  { id: 'wedding',   label: 'Wedding',   icon: 'ring' },
  { id: 'corporate', label: 'Corporate', icon: 'briefcase' },
  { id: 'birthday',  label: 'Birthday',  icon: 'birthday-cake' },
  { id: 'other',     label: 'Other',     icon: 'ellipsis-h' },
];

const DRESS_CODES = [
  { id: 'white_shirt',  label: 'White Shirt',  icon: 'tshirt' },
  { id: 'black_shirt',  label: 'Black Shirt',  icon: 'tshirt' },
  { id: 'white_tshirt', label: 'White T-Shirt', icon: 'tshirt' },
  { id: 'black_tshirt', label: 'Black T-Shirt', icon: 'tshirt' },
  { id: 'other',        label: 'Other',         icon: 'ellipsis-h' },
];

const SERVICES = [
  { id: 'breakfast', label: 'Breakfast', icon: 'coffee' },
  { id: 'lunch',     label: 'Lunch',     icon: 'utensils' },
  { id: 'dinner',    label: 'Dinner',    icon: 'moon' },
  { id: 'snacks',    label: 'Snacks',    icon: 'cookie' },
];

const HOURS   = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];
const PERIODS = ['AM', 'PM'];

// ─── Custom Calendar ──────────────────────────────────────────────────────────
const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];
const DAY_NAMES   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function CalendarPicker({ visible, onClose, onSelect, selectedDate }) {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  );
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0);  setYear(y => y + 1); } else setMonth(m => m + 1); };

  const isSelected = (day) => {
    if (!day || !selectedDate) return false;
    const formatted = `${String(day).padStart(2,'0')}/${String(month+1).padStart(2,'0')}/${year}`;
    return formatted === selectedDate;
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <TouchableOpacity style={cal.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={cal.box}>
          <View style={cal.header}>
            <TouchableOpacity onPress={prevMonth} style={cal.navBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.icon} />
            </TouchableOpacity>
            <Text style={cal.monthText}>{MONTH_NAMES[month]} {year}</Text>
            <TouchableOpacity onPress={nextMonth} style={cal.navBtn}>
              <Ionicons name="chevron-forward" size={20} color={colors.icon} />
            </TouchableOpacity>
          </View>
          <View style={cal.dayRow}>
            {DAY_NAMES.map(d => <Text key={d} style={cal.dayName}>{d}</Text>)}
          </View>
          <View style={cal.grid}>
            {cells.map((day, idx) => {
              const selected = isSelected(day);
              return (
                <TouchableOpacity
                  key={idx}
                  style={[cal.cell, day && (selected ? cal.selectedCell : cal.activeCell)]}
                  onPress={() => day && onSelect(
                    `${String(day).padStart(2,'0')}/${String(month+1).padStart(2,'0')}/${year}`
                  )}
                  disabled={!day}
                >
                  {day ? <Text style={[cal.cellText, selected && cal.selectedCellText]}>{day}</Text> : null}
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={cal.closeBtn} onPress={onClose}>
            <Text style={cal.closeBtnText}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const cal = StyleSheet.create({
  overlay:   { flex:1, backgroundColor: colors.overlay, justifyContent:'center', alignItems:'center' },
  box:       { backgroundColor: colors.surface, borderRadius: radii.xl, padding:20, width: Math.min(width - 40, 420), ...shadows.raised },
  header:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:14 },
  navBtn:    { padding:6, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm },
  monthText: { fontSize:16, fontFamily: fonts.bold, color: colors.text },
  dayRow:    { flexDirection:'row', marginBottom:6 },
  dayName:   { flex:1, textAlign:'center', fontSize:12, fontFamily: fonts.semibold, color: colors.textMuted },
  grid:      { flexDirection:'row', flexWrap:'wrap' },
  cell:      { width:'14.28%', aspectRatio:1, justifyContent:'center', alignItems:'center', marginVertical:2, borderRadius:20 },
  activeCell:{ },
  selectedCell: { backgroundColor: colors.primary },
  cellText:  { fontSize:13, fontFamily: fonts.regular, color: colors.text },
  selectedCellText: { color: colors.white, fontFamily: fonts.bold },
  closeBtn:  { marginTop:14, alignItems:'center', paddingVertical:12, backgroundColor: colors.surfaceSecondary, borderRadius: radii.md },
  closeBtnText: { fontSize:14, fontFamily: fonts.semibold, color: colors.text },
  confirmBtn: { backgroundColor: colors.primary, marginTop: 16 },
  confirmBtnText: { color: colors.white },
});

// ─── Time Picker ──────────────────────────────────────────────────────────────
function TimePicker({ visible, onClose, onSelect, initialTime }) {
  const [hh, setHh] = useState('10');
  const [mm, setMm] = useState('00');
  const [pp, setPp] = useState('AM');

  useEffect(() => {
    if (visible && initialTime) {
      const parts = initialTime.match(/(\d+):(\d+)\s(AM|PM)/);
      if (parts) {
        setHh(parts[1]);
        setMm(parts[2]);
        setPp(parts[3]);
      }
    }
  }, [visible, initialTime]);

  const Col = ({ data, selected, onPick }) => (
    <FlatList
      data={data}
      keyExtractor={i => i}
      showsVerticalScrollIndicator={false}
      style={{ maxHeight: 160 }}
      getItemLayout={(data, index) => ({ length: 40, offset: 40 * index, index })}
      initialScrollIndex={data.indexOf(selected) !== -1 ? data.indexOf(selected) : 0}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => onPick(item)}
          style={[tp.colItem, item === selected && tp.colItemActive]}>
          <Text style={[tp.colText, item === selected && tp.colTextActive]}>{item}</Text>
        </TouchableOpacity>
      )}
    />
  );

  return (
    <Modal transparent visible={visible} animationType="fade">
      <TouchableOpacity style={cal.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[cal.box, { paddingBottom: 10 }]}>
          <Text style={[cal.monthText, { textAlign:'center', marginBottom:16 }]}>Select Time</Text>
          <View style={tp.row}>
            <View style={tp.colWrap}><Text style={tp.colLabel}>Hour</Text><Col data={HOURS}   selected={hh} onPick={setHh}/></View>
            <Text style={tp.sep}>:</Text>
            <View style={tp.colWrap}><Text style={tp.colLabel}>Min</Text><Col data={MINUTES} selected={mm} onPick={setMm}/></View>
            <View style={tp.colWrap}><Text style={tp.colLabel}>  </Text><Col data={PERIODS} selected={pp} onPick={setPp}/></View>
          </View>
          <TouchableOpacity style={[cal.closeBtn, cal.confirmBtn]}
            onPress={() => { onSelect(`${hh}:${mm} ${pp}`); onClose(); }}>
            <Text style={[cal.closeBtnText, cal.confirmBtnText]}>Confirm</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[cal.closeBtn, { marginTop:6 }]} onPress={onClose}>
            <Text style={cal.closeBtnText}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const tp = StyleSheet.create({
  row:          { flexDirection:'row', alignItems:'center', justifyContent:'center' },
  colWrap:      { alignItems:'center', marginHorizontal:8 },
  colLabel:     { fontSize:12, fontFamily: fonts.semibold, color: colors.textMuted, marginBottom:4 },
  colItem:      { paddingVertical:8, paddingHorizontal:14, borderRadius: radii.sm, marginVertical:2 },
  colItemActive:{ backgroundColor: colors.primary },
  colText:      { fontSize:15, fontFamily: fonts.regular, color: colors.text },
  colTextActive:{ color: colors.white, fontFamily: fonts.bold },
  sep:          { fontSize:22, fontFamily: fonts.bold, color: colors.text, marginBottom:4, alignSelf:'center' },
});

const FocusedInput = ({ placeholder, ...props }) => {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <TextInput
      {...props}
      placeholder={isFocused ? "" : placeholder}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    />
  );
};

// Address fields start empty and can be typed by hand; coordinates are only
// set once a spot is confirmed on the map
const EMPTY_PLACE = {
  placeId: null, locationName: '', formattedAddress: '', city: '', state: '', pincode: '',
  latitude: null, longitude: null,
};

const AddEvent = ({ onBack, onProceed, initialData }) => {
  const [eventName,      setEventName]      = useState(initialData?.eventName || '');
  // Venue picked on the map: { placeId, locationName, formattedAddress, city, state, pincode, latitude, longitude }
  const [place,          setPlace]          = useState({ ...EMPTY_PLACE, ...initialData?.place });
  const [pickerMode,     setPickerMode]     = useState(null); // 'current' | 'search' | null
  const [editingPlace,   setEditingPlace]   = useState(false);
  const [inDate,         setInDate]         = useState(initialData?.inDate || '');
  const [outDate,        setOutDate]        = useState(initialData?.outDate || '');
  const [inTime,         setInTime]         = useState(initialData?.inTime || '');
  const [outTime,        setOutTime]        = useState(initialData?.outTime || '');
  const [suppliers,      setSuppliers]      = useState(initialData?.suppliers || '1');
  const [eventType,      setEventType]      = useState(initialData?.eventType || 'wedding');
  const [otherEventType, setOtherEventType] = useState(initialData?.otherEventType || '');
  const [dressCode,      setDressCode]      = useState(initialData?.dressCode || 'white_shirt');
  const [otherDress,     setOtherDress]     = useState(initialData?.otherDress || '');
  const [selectedSvcs,   setSelectedSvcs]   = useState(initialData?.selectedSvcs || []);
  const [costPerHead,    setCostPerHead]    = useState(initialData?.costPerHead || '');

  const [showInCal,   setShowInCal]   = useState(false);
  const [showOutCal,  setShowOutCal]  = useState(false);
  const [showInTime,  setShowInTime]  = useState(false);
  const [showOutTime, setShowOutTime] = useState(false);

  const toggleSvc = (id) =>
    setSelectedSvcs(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id]);

  const totalCost = (parseFloat(costPerHead) || 0) * (parseInt(suppliers) || 0);

  const updatePlace = (key) => (val) => setPlace(p => ({ ...p, [key]: val }));

  // The event is created only after payment, so everything it needs must be
  // present before the user is sent to pay
  const handleProceed = () => {
    const missing = [
      !eventName.trim() && 'Event name',
      (place.latitude == null || place.longitude == null) && 'Event location',
      !inDate && 'In date',
      !inTime && 'In time',
      !outTime && 'Out time',
      !(parseInt(suppliers, 10) > 0) && 'Number of suppliers',
      !(parseFloat(costPerHead) > 0) && 'Cost per head',
    ].filter(Boolean);
    if (missing.length) {
      Alert.alert('Details required', `Please add: ${missing.join(', ')}`);
      return;
    }
    onProceed({
      eventName, location, inDate, inTime, outDate, outTime,
      suppliers, eventType, otherEventType, dressCode, otherDress,
      selectedSvcs, costPerHead, place,
    });
  };
  const hasPin = place.latitude != null && place.longitude != null;
  // Short human-readable label kept in `location` for lists and older screens
  const location = [place.locationName, place.city].filter(Boolean).join(', ');

  return (
    <SafeAreaView style={s.container}>
      {/* ── Header ── */}
      <View style={s.headerRow}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color={colors.icon} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Event Details</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.form}>

          {/* Event Name */}
          <Field label="Event Name">
            <FocusedInput style={s.input} placeholder="e.g. Vijay's Wedding Event"
              value={eventName} onChangeText={setEventName} />
          </Field>

          {/* Event Type */}
          <Field label="Event Type">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {EVENT_TYPES.map(t => (
                <TouchableOpacity key={t.id}
                  style={[s.typeCard, eventType === t.id && s.activeCard]}
                  onPress={() => setEventType(t.id)}>
                  <View style={[s.iconBox, eventType === t.id && s.iconBoxActive]}>
                    <FontAwesome5 name={t.icon} size={20} color={eventType === t.id ? colors.white : colors.iconSecondary} />
                  </View>
                  <Text style={[s.typeLabel, eventType === t.id && s.typeLabelActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {eventType === 'other' && (
              <FocusedInput style={[s.input, { marginTop: 10 }]}
                placeholder="Describe your event type…"
                value={otherEventType}
                onChangeText={setOtherEventType} />
            )}
          </Field>

          {/* Location */}
          <Field label="Event Location">
            {hasPin ? (
              /* Confirmed venue: map preview */
              <View style={s.locCard}>
                <MapView
                  key={`${place.latitude},${place.longitude}`}
                  style={s.locMap}
                  provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                  customMapStyle={MONOCHROME_MAP_STYLE}
                  liteMode
                  pointerEvents="none"
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                  toolbarEnabled={false}
                  initialRegion={{
                    latitude: place.latitude,
                    longitude: place.longitude,
                    latitudeDelta: 0.006,
                    longitudeDelta: 0.006,
                  }}
                >
                  <Marker coordinate={{ latitude: place.latitude, longitude: place.longitude }} pinColor="black" />
                </MapView>
                <View style={s.locCardBody}>
                  <View style={s.locPinIcon}>
                    <Ionicons name="location-outline" size={18} color={colors.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.locName} numberOfLines={1}>{place.locationName || 'Pinned location'}</Text>
                    <Text style={s.locSub} numberOfLines={1}>{cityStateLine(place) || place.formattedAddress}</Text>
                  </View>
                  <TouchableOpacity style={s.locChangeBtn} onPress={() => setPickerMode('search')}>
                    <Text style={s.locChangeText}>Change</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Nothing chosen yet: search first, GPS as the shortcut */
              <View style={s.locSelectCard}>
                <View style={s.locSelectHeader}>
                  <Ionicons name="location-outline" size={18} color={colors.icon} />
                  <Text style={s.locSelectTitle}>Select event location</Text>
                </View>
                <TouchableOpacity style={s.locSearchRow} onPress={() => setPickerMode('search')} activeOpacity={0.8}>
                  <Ionicons name="search" size={18} color={colors.iconSecondary} />
                  <Text style={s.locSearchText}>Search for a place</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.locCurrentRow} onPress={() => setPickerMode('current')} activeOpacity={0.8}>
                  <Ionicons name="navigate" size={16} color={colors.icon} />
                  <Text style={s.locCurrentText}>Use my current location</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Details come from the map; editing is only for small corrections */}
            <View style={s.locDetails}>
              <View style={s.locDetailsHeader}>
                <Text style={s.locDetailsTitle}>Location details</Text>
                {hasPin && (
                  <TouchableOpacity onPress={() => setEditingPlace(v => !v)}>
                    <Text style={s.locEditText}>{editingPlace ? 'Done' : 'Edit'}</Text>
                  </TouchableOpacity>
                )}
              </View>
              {editingPlace ? (
                <>
                  <Text style={s.subLabel}>Venue name</Text>
                  <FocusedInput style={s.input} placeholder="e.g. Codissia Trade Fair Complex"
                    value={place.locationName} onChangeText={updatePlace('locationName')} />
                  <Text style={s.subLabel}>Address</Text>
                  <FocusedInput style={[s.input, s.inputMulti]} placeholder="Street, area"
                    multiline textAlignVertical="top"
                    value={place.formattedAddress} onChangeText={updatePlace('formattedAddress')} />
                  <View style={s.row}>
                    <View style={{ flex: 1, marginRight: 6 }}>
                      <Text style={s.subLabel}>City</Text>
                      <FocusedInput style={s.input} placeholder="City"
                        value={place.city} onChangeText={updatePlace('city')} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 6 }}>
                      <Text style={s.subLabel}>State</Text>
                      <FocusedInput style={s.input} placeholder="State"
                        value={place.state} onChangeText={updatePlace('state')} />
                    </View>
                  </View>
                  <Text style={s.subLabel}>Pincode</Text>
                  <FocusedInput style={s.input} placeholder="6-digit pincode" keyboardType="number-pad" maxLength={6}
                    value={place.pincode} onChangeText={v => updatePlace('pincode')(v.replace(/\D/g, ''))} />
                </>
              ) : (
                <>
                  <DetailRow label="Venue" value={place.locationName} />
                  <DetailRow label="Address" value={place.formattedAddress} />
                  <DetailRow label="City" value={place.city} />
                  <DetailRow label="State" value={place.state} />
                  <DetailRow label="Pincode" value={place.pincode} last />
                </>
              )}
            </View>
          </Field>

          {/* In Date & Time Section */}
          <View style={s.dateTimeBlock}>
            <View style={s.blockHeader}>
              <Text style={s.blockTitle}>IN DATE & TIME</Text>
            </View>
            <View style={s.blockBody}>
              <View style={s.row}>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <TouchableOpacity style={s.pickerBtn} onPress={() => setShowInCal(true)}>
                    <Ionicons name="calendar-outline" size={16} color={colors.icon} />
                    <Text style={[s.pickerText, !inDate && s.placeholder]} numberOfLines={1}>
                      {inDate || 'In Date'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <TouchableOpacity style={s.pickerBtn} onPress={() => setShowInTime(true)}>
                    <Ionicons name="time-outline" size={16} color={colors.icon} />
                    <Text style={[s.pickerText, !inTime && s.placeholder]} numberOfLines={1}>
                      {inTime || 'In Time'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Out Date & Time Section */}
          <View style={s.dateTimeBlock}>
            <View style={s.blockHeader}>
              <Text style={s.blockTitle}>OUT DATE & TIME</Text>
            </View>
            <View style={s.blockBody}>
              <View style={s.row}>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <TouchableOpacity style={s.pickerBtn} onPress={() => setShowOutCal(true)}>
                    <Ionicons name="calendar-outline" size={16} color={colors.icon} />
                    <Text style={[s.pickerText, !outDate && s.placeholder]} numberOfLines={1}>
                      {outDate || 'Out Date'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <TouchableOpacity style={s.pickerBtn} onPress={() => setShowOutTime(true)}>
                    <Ionicons name="time-outline" size={16} color={colors.icon} />
                    <Text style={[s.pickerText, !outTime && s.placeholder]} numberOfLines={1}>
                      {outTime || 'Out Time'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Suppliers */}
          <Field label="Number of Suppliers">
            <FocusedInput style={s.input} placeholder="e.g. 50" keyboardType="numeric"
              value={suppliers} onChangeText={setSuppliers} />
          </Field>

          {/* Dress Code */}
          <Field label="Dress Code">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {DRESS_CODES.map(dc => (
                <TouchableOpacity key={dc.id}
                  style={[s.typeCard, dressCode === dc.id && s.activeCard]}
                  onPress={() => setDressCode(dc.id)}>
                  <View style={[s.iconBox, dressCode === dc.id && s.iconBoxActive]}>
                    <FontAwesome5 name={dc.icon} size={20} color={dressCode === dc.id ? colors.white : colors.iconSecondary} />
                  </View>
                  <Text style={[s.typeLabel, dressCode === dc.id && s.typeLabelActive]}>{dc.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {dressCode === 'other' && (
              <FocusedInput style={[s.input, { marginTop: 10 }]}
                placeholder="Describe your dress code…"
                value={otherDress}
                onChangeText={setOtherDress} />
            )}
          </Field>

          {/* Services */}
          <Field label="Select Services">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {SERVICES.map(sv => (
                <TouchableOpacity key={sv.id}
                  style={[s.typeCard, selectedSvcs.includes(sv.id) && s.activeCard]}
                  onPress={() => toggleSvc(sv.id)}>
                  <View style={[s.iconBox, selectedSvcs.includes(sv.id) && s.iconBoxActive]}>
                    <FontAwesome5 name={sv.icon} size={20}
                      color={selectedSvcs.includes(sv.id) ? colors.white : colors.iconSecondary} />
                  </View>
                  <Text style={[s.typeLabel, selectedSvcs.includes(sv.id) && s.typeLabelActive]}>{sv.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Field>

          {/* Cost per head */}
          <Field label="Estimated Cost per Head (₹)">
            <View style={s.inputIcon}>
              <Text style={[s.inputIconImg, { fontSize: 16, color: colors.icon, fontFamily: fonts.bold }]}>₹</Text>
              <FocusedInput style={[s.input, s.inputWithIcon]}
                placeholder="Amount per supplier"
                keyboardType="numeric"
                value={costPerHead}
                onChangeText={setCostPerHead} />
            </View>
          </Field>

          {/* Cost Summary Card */}
          <View style={s.costCard}>
            <View style={s.costHeader}>
              <Text style={s.costHeaderText}>Cost Summary</Text>
            </View>
            <View style={s.costBody}>
              <CostRow label="Services selected"  value={`${selectedSvcs.length}`} unit="" />
              <CostRow label="Suppliers"           value={suppliers || '0'} unit="" />
              <CostRow label="Cost per head"       value={costPerHead ? `₹${costPerHead}` : '—'} unit="" />
              <View style={s.divider} />
              <CostRow label="Total Estimate"      value={totalCost > 0 ? `₹${totalCost.toLocaleString()}` : '—'} bold />
              {totalCost > 0 && (
                <>
                  <View style={s.advanceBar}>
                    <Text style={s.advLbl}>Advance (25%)</Text>
                    <Text style={s.advVal}>₹{(totalCost * 0.25).toLocaleString()}</Text>
                  </View>
                  <Text style={s.balText}>Balance after event : ₹{(totalCost * 0.75).toLocaleString()}</Text>
                </>
              )}

              <Field label="Coupon Code" noMargin>
                <FocusedInput style={s.couponInput}
                  placeholder="Enter Vizhaa voucher code"
                  />
              </Field>

              <PrimaryButton style={s.payBtn} onPress={handleProceed}>
                <Text style={s.payBtnText}>Proceed to Payment</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.white} style={{ marginLeft: 8 }} />
              </PrimaryButton>
            </View>
          </View>

        </View>
      </ScrollView>

      {/* Modals */}
      <CalendarPicker
        visible={showInCal}
        onClose={() => setShowInCal(false)}
        selectedDate={inDate}
        onSelect={d => { setInDate(d); setShowInCal(false); }}
      />
      <CalendarPicker
        visible={showOutCal}
        onClose={() => setShowOutCal(false)}
        selectedDate={outDate}
        onSelect={d => { setOutDate(d); setShowOutCal(false); }}
      />

      <TimePicker
        visible={showInTime}
        onClose={() => setShowInTime(false)}
        initialTime={inTime}
        onSelect={t => setInTime(t)}
      />

      <TimePicker
        visible={showOutTime}
        onClose={() => setShowOutTime(false)}
        initialTime={outTime}
        onSelect={t => setOutTime(t)}
      />

      <LocationPicker
        visible={pickerMode !== null}
        startWith={pickerMode || 'search'}
        initial={hasPin ? place : null}
        onClose={() => setPickerMode(null)}
        onConfirm={(picked) => { setPlace({ ...EMPTY_PLACE, ...picked }); setEditingPlace(false); setPickerMode(null); }}
      />
    </SafeAreaView>
  );
};

const Field = ({ label, children, noMargin }) => (
  <View style={[s.inputGroup, noMargin && { marginBottom: 0 }]}>
    {label ? <Text style={s.label}>{label}</Text> : null}
    {children}
  </View>
);

const DetailRow = ({ label, value, last }) => (
  <View style={[s.detailRow, last && { borderBottomWidth: 0 }]}>
    <Text style={s.detailLabel}>{label}</Text>
    <Text style={[s.detailValue, !value && s.detailEmpty]} numberOfLines={2}>{value || '—'}</Text>
  </View>
);

const CostRow = ({ label, value, unit, bold }) => (
  <View style={s.costRow}>
    <Text style={[s.costLbl, bold && { fontFamily: fonts.bold, fontSize: 15, color: colors.text }]}>{label}</Text>
    <Text style={[s.costVal, bold && { fontFamily: fonts.bold, fontSize: 18, color: colors.text }]}>
      {value}{unit}
    </Text>
  </View>
);

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  /* Header */
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radii.md,
    backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: {
    fontSize: 18, fontFamily: fonts.bold, color: colors.text,
  },

  /* Scroll */
  scroll: { paddingBottom: 40, paddingTop: 20 },
  form:   { paddingHorizontal: 20 },

  /* Date Time Block */
  dateTimeBlock: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  blockHeader: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    backgroundColor: colors.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  blockTitle: {
    fontSize: 11,
    fontFamily: fonts.semibold,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  blockBody: {
    padding: 12,
  },

  /* Inputs */
  inputGroup: { marginBottom: 22 },
  label:      { fontSize: 14, fontFamily: fonts.semibold, color: colors.textHeading, marginBottom: 8 },
  input: {
    ...input,
    height: 52, paddingHorizontal: 14, fontSize: 14,
  },

  inputIcon:     { flexDirection: 'row', alignItems: 'center' },
  inputIconImg:  { position: 'absolute', left: 14, zIndex: 1 },
  inputWithIcon: { flex: 1, paddingLeft: 40 },

  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.inputBackground, height: 48, borderRadius: radii.md - 2, paddingHorizontal: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  pickerText: { fontSize: 13, fontFamily: fonts.regular, color: colors.text, flexShrink: 1 },
  placeholder: { color: colors.textMuted },

  row: { flexDirection: 'row' },

  /* Location */
  locSelectCard: {
    backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, padding: 14,
  },
  locSelectHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  locSelectTitle: { fontSize: 14, fontFamily: fonts.semibold, color: colors.text },
  locSearchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, paddingHorizontal: 14,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
  },
  locSearchText: { fontSize: 14, fontFamily: fonts.regular, color: colors.textMuted },
  locCurrentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginTop: 12, paddingVertical: 4 },
  locCurrentText: { fontSize: 13, fontFamily: fonts.semibold, color: colors.text, textDecorationLine: 'underline' },

  locCard: { borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', backgroundColor: colors.surface },
  locMap: { height: 140, width: '100%' },
  locCardBody: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  locPinIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  locName: { fontSize: 14, fontFamily: fonts.semibold, color: colors.text },
  locSub: { fontSize: 12, fontFamily: fonts.regular, color: colors.textSecondary, marginTop: 2 },
  locChangeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.borderStrong },
  locChangeText: { fontSize: 12, fontFamily: fonts.semibold, color: colors.text },

  locDetails: {
    marginTop: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.surface,
  },
  locDetailsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  locDetailsTitle: { fontSize: 12, fontFamily: fonts.semibold, color: colors.textSecondary, letterSpacing: 0.4 },
  locEditText: { fontSize: 13, fontFamily: fonts.semibold, color: colors.text, textDecorationLine: 'underline' },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  detailLabel: { fontSize: 13, fontFamily: fonts.regular, color: colors.textSecondary },
  detailValue: { flex: 1, fontSize: 13, fontFamily: fonts.semibold, color: colors.text, textAlign: 'right' },
  detailEmpty: { color: colors.textDisabled, fontFamily: fonts.regular },
  subLabel: { fontSize: 12, fontFamily: fonts.semibold, color: colors.textSecondary, marginTop: 12, marginBottom: 6 },
  inputMulti: { height: 76, paddingTop: 14 },

  /* Type / Dress / Service Cards */
  typeCard: {
    width: 86, backgroundColor: colors.surface, borderRadius: radii.md + 2, padding: 10,
    marginRight: 10, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  activeCard:    { borderColor: colors.borderStrong, borderWidth: 1.5 },
  iconBox:       { width: 52, height: 52, borderRadius: radii.md, backgroundColor: colors.surfaceSecondary, justifyContent:'center', alignItems:'center', marginBottom: 8 },
  iconBoxActive: { backgroundColor: colors.primary },
  typeLabel:     { fontSize: 11, fontFamily: fonts.regular, color: colors.textSecondary, textAlign:'center' },
  typeLabelActive: { fontFamily: fonts.semibold, color: colors.text },

  /* Cost Card */
  costCard:   { backgroundColor: colors.surface, borderRadius: radii.xl, marginTop: 4, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, ...shadows.card },
  costHeader: { paddingVertical: 16, paddingHorizontal: 20, backgroundColor: colors.darkSurface },
  costHeaderText: { fontSize: 16, fontFamily: fonts.bold, color: colors.white },
  costBody:   { padding: 20 },
  costRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  costLbl:    { fontSize: 13, fontFamily: fonts.regular, color: colors.textSecondary },
  costVal:    { fontSize: 13, fontFamily: fonts.semibold, color: colors.text },
  divider:    { height: 1, backgroundColor: colors.divider, marginVertical: 12 },

  advanceBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border,
    padding: 14, borderRadius: radii.md - 2, marginBottom: 6,
  },
  advLbl: { fontSize: 13, fontFamily: fonts.semibold, color: colors.text },
  advVal: { fontSize: 14, fontFamily: fonts.bold, color: colors.text },
  balText:{ fontSize: 11, fontFamily: fonts.regular, color: colors.textSecondary, textAlign: 'right', marginBottom: 18 },

  couponInput: {
    ...input,
    height: 48, borderRadius: radii.md - 2, paddingHorizontal: 14, fontSize: 13,
  },

  payBtn: {
    ...buttons.primary,
    flexDirection: 'row',
    marginTop: 18,
  },
  payBtnText: { ...buttons.primaryText },
});

export default AddEvent;
