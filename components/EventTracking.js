import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Animated,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, colors, fonts, radii, shadows, buttons, alpha } from '../theme';
import { api } from '../services/api';
import { EVENT_STATUS, eventStatusLabel } from '../constants/eventStatus';
import PrimaryButton from './ui/PrimaryButton';

// Live screen: re-fetch the event while it is open
const POLL_INTERVAL_MS = 30000;

// On-site leads, shown as cards (placeholder until assigned)
const LEAD_ROLES = [
  { key: 'manager', role: 'Manager' },
  { key: 'supervisor', role: 'Supervisor' },
];
// Placeholder cards shown for open supplier slots (one grid row); the rest are summarised as "+N more"
const MAX_PENDING_CARDS = 2;

// The process is fixed; the backend only reports how far each event has got
const TRACKING_STEPS = [
  { key: 'event_created',     label: 'Event Created' },
  { key: 'supplier_assigned', label: 'Supplier Assigned' },
  { key: 'supplier_arrived',  label: 'Supplier Arrived' },
  { key: 'event_started',     label: 'Event Started' },
  { key: 'event_completed',   label: 'Event Completed' },
];
const STEP_LABELS = { completed: 'Completed', in_progress: 'In Progress', pending: 'In Queue' };

// Event status alone implies these steps are done, even without timestamps
const DONE_THROUGH_STATUS = { [EVENT_STATUS.IN_PROGRESS]: 'event_started', [EVENT_STATUS.COMPLETED]: 'event_completed' };
// Only an approved event moves along the steps; pending/rejected ones wait
const TRACKABLE = [EVENT_STATUS.APPROVED, EVENT_STATUS.IN_PROGRESS];

// event.tracking is { [stepKey]: ISO time } or [{ key, at }]; a step with a time is done
const stepTimes = (event) => {
  const t = event?.tracking;
  const times = Array.isArray(t)
    ? Object.fromEntries(t.filter((s) => s?.key).map((s) => [s.key, s.at || s.time || true]))
    : { ...(t || {}) };
  if (!times.event_created) times.event_created = event?.createdAt || true;
  return times;
};

const buildSteps = (event) => {
  const times = stepTimes(event);
  const impliedIdx = TRACKING_STEPS.findIndex((s) => s.key === DONE_THROUGH_STATUS[event?.status]);
  // Progress is the furthest step reached; everything before it counts as done
  const lastDoneIdx = TRACKING_STEPS.reduce((acc, s, i) => (times[s.key] ? Math.max(acc, i) : acc), impliedIdx);
  return TRACKING_STEPS.map((s, i) => {
    const isNext = i === lastDoneIdx + 1 && TRACKABLE.includes(event?.status);
    const status = i <= lastDoneIdx ? 'completed' : isNext ? 'in_progress' : 'pending';
    const at = times[s.key];
    return {
      ...s,
      status,
      statusLabel: STEP_LABELS[status],
      time: formatStepTime(typeof at === 'string' ? at : null),
      done: status === 'completed',
      current: status === 'in_progress',
      active: status !== 'pending',
    };
  });
};

const formatStepTime = (at) => {
  if (!at) return '--:--';
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const callNumber = (phone) => {
  if (!phone) return;
  Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Unable to call', `Please dial ${phone} manually.`));
};

/*
 * Expected from GET /api/events/:id →
 * { success, event: {
 *     id, name, type, status, location, locationName, city, inDate, createdAt,
 *     // Progress through TRACKING_STEPS: time each step was reached (missing = not yet)
 *     tracking: { supplier_assigned: ISO, supplier_arrived: ISO, event_started: ISO, event_completed: ISO },
 *     team: {
 *       manager:    { id, name, role, phone, eventsCount, rating, status },
 *       supervisor: { ...same },
 *       suppliers:  [{ ...same }],
 *     },
 *     emergencyPhone,
 * } }
 */
const EventTracking = ({ event: initialEvent, onBack }) => {
  const [selectedMember, setSelectedMember] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  const insets = useSafeAreaInsets();
  const eventId = initialEvent?.id;

  const fetchEvent = useCallback(async () => {
    if (!eventId) {
      setError('Event not found.');
      setLoading(false);
      return;
    }
    try {
      const res = await api.getEventDetail(eventId);
      if (!mounted.current) return;
      if (res.success && res.event) {
        setEvent(res.event);
        setError('');
      } else {
        setError(res.message || 'Could not load tracking details.');
      }
    } catch (err) {
      if (mounted.current) setError(err.message || 'Could not load tracking details.');
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [eventId]);

  useEffect(() => {
    mounted.current = true;
    fetchEvent();
    const timer = setInterval(fetchEvent, POLL_INTERVAL_MS);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, [fetchEvent]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvent();
  };

  const openProfile = (member) => {
    setSelectedMember(member);
    setModalVisible(true);
  };

  const steps = buildSteps(event);
  const team = event?.team || {};
  const suppliers = team.suppliers || [];
  // Supplier count the organizer booked; without it, one placeholder until someone is assigned
  const requiredSuppliers = parseInt(event?.suppliers, 10) || 0;
  const openSlots = requiredSuppliers
    ? Math.max(0, requiredSuppliers - suppliers.length)
    : (suppliers.length ? 0 : 1);
  const pendingCards = Math.min(openSlots, MAX_PENDING_CARDS);
  const location = event?.locationName || event?.location || event?.city;

  if (loading || (!event && error)) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBack={onBack} />
        <View style={styles.centerState}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <>
              <Ionicons name="cloud-offline-outline" size={40} color={colors.iconMuted} />
              <Text style={styles.stateText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); fetchEvent(); }}>
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header onBack={onBack} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >

        {/* Main Event Card - Glassmorphism Style */}
        <View style={styles.heroSection}>
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View>
                {event.status ? <Text style={styles.heroStatus}>{eventStatusLabel(event.status).toUpperCase()}</Text> : null}
                <Text style={styles.heroTitle}>{event.name || '—'}</Text>
              </View>
              <View style={styles.heroIconBox}>
                <MaterialCommunityIcons
                  name={event?.type === 'wedding' ? 'ring' : 'party-popper'}
                  size={32} color={colors.white}
                />
              </View>
            </View>

            <View style={styles.heroDivider} />

            <View style={styles.heroFooter}>
              {location ? (
                <View style={styles.heroInfoItem}>
                  <Ionicons name="location-outline" size={14} color={colors.textInverseMuted} />
                  <Text style={styles.heroInfoText}>{location}</Text>
                </View>
              ) : null}
              {event.inDate || event.date ? (
                <View style={styles.heroInfoItem}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textInverseMuted} />
                  <Text style={styles.heroInfoText}>{event.inDate || event.date}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {error ? <Text style={styles.staleText}>Couldn’t refresh: {error}</Text> : null}

        {event.status === EVENT_STATUS.PENDING && (
          <View style={styles.noticeBox}>
            <Ionicons name="time-outline" size={16} color={colors.icon} />
            <Text style={styles.noticeText}>Vizhaa is reviewing your event. Tracking starts once it’s approved.</Text>
          </View>
        )}
        {event.status === EVENT_STATUS.REJECTED && (
          <View style={[styles.noticeBox, styles.noticeBoxError]}>
            <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
            <Text style={[styles.noticeText, { color: colors.danger }]}>
              This event was not approved{event.adminNotes ? `: ${event.adminNotes}` : '.'}
            </Text>
          </View>
        )}

        {/* Dynamic Status Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Execution Timeline</Text>
          <View style={styles.timelineCard}>
            {steps.map((step, index) => (
              <View key={step.key} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <Text style={[styles.timelineTime, !step.active && { color: colors.textDisabled }]}>{step.time}</Text>
                </View>

                <View style={styles.timelineCenter}>
                  <View style={[
                    styles.timelineDot,
                    step.done && styles.dotDone,
                    step.current && styles.dotActive
                  ]}>
                    {step.done && <Ionicons name="checkmark" size={11} color={colors.white} />}
                  </View>
                  {index < steps.length - 1 && (
                    <View style={[styles.timelineLine, step.done && styles.lineDone]} />
                  )}
                </View>

                <View style={styles.timelineRight}>
                  <Text style={[styles.timelineLabel, !step.active && { color: colors.textMuted }]}>{step.label}</Text>
                  <Text style={[styles.timelineStatus, { color: step.done ? colors.success : (step.current ? colors.primaryDark : colors.textMuted) }, step.current && { fontFamily: fonts.semibold }]}>
                    {step.statusLabel}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Premium Team Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>On-Site Support</Text>
            {event.emergencyPhone ? (
              <TouchableOpacity onPress={() => callNumber(event.emergencyPhone)}><Text style={styles.seeAll}>Emergency Call</Text></TouchableOpacity>
            ) : null}
          </View>

          {/* Manager & Supervisor: placeholder card until the backend assigns them */}
          <View style={styles.personGrid}>
            {LEAD_ROLES.map(({ key, role }) => {
              const member = team[key] ? { role, ...team[key] } : null;
              return <PersonCard key={key} member={member} role={role} onPress={() => openProfile(member)} />;
            })}
          </View>
        </View>

        {/* Assigned Suppliers: headline, then a card per person */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Assigned Suppliers</Text>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>
                {requiredSuppliers ? `${suppliers.length} / ${requiredSuppliers}` : suppliers.length}
              </Text>
            </View>
          </View>

          <View style={styles.personGrid}>
            {suppliers.map((sup, i) => {
              const member = { role: 'Supplier', ...sup };
              return <PersonCard key={sup.id || i} member={member} role="Supplier" onPress={() => openProfile(member)} />;
            })}
            {Array.from({ length: pendingCards }, (_, i) => (
              <PersonCard key={`pending-${i}`} role="Supplier" />
            ))}
          </View>

          {openSlots > 0 && (
            <Text style={styles.pendingNote}>
              {openSlots > pendingCards ? `+${openSlots - pendingCards} more · ` : ''}
              Suppliers will appear here once assigned
            </Text>
          )}
        </View>

      </ScrollView>

      {/* Premium Profile Modal */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: 25 + insets.bottom }]}>
            <View style={styles.modalHandle} />
            <TouchableOpacity style={styles.modalClose} onPress={() => setModalVisible(false)}>
              <Ionicons name="close-circle" size={32} color={colors.disabled} />
            </TouchableOpacity>

            <View style={styles.modalHeader}>
              <View style={styles.modalAvatarBox}>
                <Ionicons name="person-outline" size={52} color={colors.icon} />
              </View>
              <Text style={styles.modalName}>{selectedMember?.name}</Text>
              <Text style={styles.modalRole}>{selectedMember?.role}</Text>
            </View>

            <View style={styles.modalStatsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{selectedMember?.eventsCount ?? '—'}</Text>
                <Text style={styles.statLbl}>Events</Text>
              </View>
              <View style={[styles.statBox, styles.statDivider]}>
                <Text style={styles.statVal}>{selectedMember?.rating != null ? `${selectedMember.rating}★` : '—'}</Text>
                <Text style={styles.statLbl}>Rating</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{selectedMember?.status || '—'}</Text>
                <Text style={styles.statLbl}>Status</Text>
              </View>
            </View>

            {selectedMember?.phone ? (
              <PrimaryButton style={styles.modalCallBtn} onPress={() => callNumber(selectedMember.phone)}>
                <Ionicons name="call-outline" size={20} color={colors.white} />
                <Text style={styles.modalCallText}>Call {selectedMember?.role}</Text>
              </PrimaryButton>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const Header = ({ onBack }) => (
  <View style={styles.header}>
    <TouchableOpacity style={styles.backBtn} onPress={onBack}>
      <Ionicons name="chevron-back" size={22} color={colors.icon} />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>Live Tracking</Text>
    <View style={{ width: 40 }} />
  </View>
);

// Gently pulsing wrapper for "awaiting" placeholders
const Pulse = ({ children, style }) => {
  const opacity = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.55, duration: 900, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
};

// One card for every person on site; `member` null = slot not assigned yet
const PersonCard = ({ member, role, onPress }) => {
  if (!member) {
    return (
      <Pulse style={[styles.personCard, styles.personCardPending]}>
        <View style={[styles.personAvatar, styles.personAvatarPending]}>
          <Ionicons name="person" size={22} color={colors.iconMuted} />
        </View>
        <Text style={styles.personRole}>{role}</Text>
        <Text style={styles.personPendingText}>Awaiting assignment</Text>
      </Pulse>
    );
  }
  return (
    <TouchableOpacity style={styles.personCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.personAvatar}>
        <Ionicons name="person" size={22} color={colors.white} />
      </View>
      <Text style={styles.personName} numberOfLines={1}>{member.name}</Text>
      <Text style={styles.personRole}>{member.role || role}</Text>
      <View style={styles.personFooter}>
        {member.rating != null ? (
          <View style={styles.personRating}>
            <Ionicons name="star" size={11} color={colors.icon} />
            <Text style={styles.personRatingText}>{member.rating}</Text>
          </View>
        ) : <View />}
        {member.phone ? (
          <TouchableOpacity style={styles.personCallBtn} onPress={() => callNumber(member.phone)} hitSlop={8}>
            <Ionicons name="call" size={14} color={colors.white} />
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
  },
  headerTitle: { fontSize: 18, fontFamily: fonts.bold, color: colors.text },
  backBtn: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  helpBtn: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  scrollContent: {},

  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 12 },
  stateText: { fontSize: 14, fontFamily: fonts.regular, color: colors.textSecondary, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
  retryText: { fontSize: 13, fontFamily: fonts.semibold, color: colors.text },
  staleText: { fontSize: 12, fontFamily: fonts.regular, color: colors.danger, paddingHorizontal: 20, marginTop: 12 },
  noticeBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginTop: 16, padding: 12,
    borderRadius: radii.card, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary,
  },
  noticeBoxError: { borderColor: colors.dangerBorder, backgroundColor: colors.dangerBackground },
  noticeText: { flex: 1, fontSize: 13, fontFamily: fonts.regular, color: colors.text },
  emptyText: { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted, marginBottom: 6 },

  heroSection: { paddingHorizontal: 20, paddingTop: 8 },
  heroCard: { borderRadius: radii.card, padding: 22, backgroundColor: colors.darkSurface, ...shadows.raised },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroStatus: { color: colors.textInverseMuted, fontSize: 10, fontFamily: fonts.semibold, letterSpacing: 1.2 },
  heroTitle: { color: colors.white, fontSize: 22, fontFamily: fonts.bold, marginTop: 4, maxWidth: 230 },
  heroIconBox: { width: 56, height: 56, borderRadius: radii.lg, borderWidth: 1, borderColor: alpha(COLORS.white, 0.2), justifyContent: 'center', alignItems: 'center' },
  heroDivider: { height: 1, backgroundColor: alpha(COLORS.white, 0.12), marginVertical: 18 },
  heroFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  heroInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroInfoText: { color: colors.textInverseMuted, fontSize: 12, fontFamily: fonts.regular },

  section: { paddingHorizontal: 20, marginTop: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontFamily: fonts.bold, color: colors.text, marginBottom: 14 },
  seeAll: { fontSize: 12, fontFamily: fonts.semibold, color: colors.text, textDecorationLine: 'underline' },

  timelineCard: { backgroundColor: colors.surface, borderRadius: radii.card, padding: 20, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  timelineRow: { flexDirection: 'row', height: 70 },
  timelineLeft: { width: 64, paddingTop: 2 },
  timelineTime: { fontSize: 12, fontFamily: fonts.semibold, color: colors.textSecondary },
  timelineCenter: { width: 30, alignItems: 'center' },
  timelineDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.divider, borderWidth: 2, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  dotDone: { backgroundColor: colors.success, borderColor: colors.success },
  dotActive: { backgroundColor: colors.white, borderWidth: 5, borderColor: colors.primary },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.divider, marginVertical: -2 },
  lineDone: { backgroundColor: colors.success },
  timelineRight: { flex: 1, paddingLeft: 14 },
  timelineLabel: { fontSize: 14, fontFamily: fonts.semibold, color: colors.text },
  timelineStatus: { fontSize: 11, fontFamily: fonts.regular, marginTop: 2 },

  // Person cards: two per row
  personGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  personCard: { width: '48.5%', backgroundColor: colors.surface, borderRadius: radii.card, paddingVertical: 18, paddingHorizontal: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border, ...shadows.card },
  personCardPending: { backgroundColor: colors.surfaceSecondary, shadowOpacity: 0, elevation: 0 },
  personAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  personAvatarPending: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  personName: { fontSize: 14, fontFamily: fonts.bold, color: colors.text, maxWidth: '100%' },
  personRole: { fontSize: 12, fontFamily: fonts.regular, color: colors.textSecondary, marginTop: 2 },
  personPendingText: { fontSize: 11, fontFamily: fonts.semibold, color: colors.textMuted, marginTop: 10 },
  personFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: 12, minHeight: 30 },
  personRating: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceTertiary, paddingHorizontal: 9, paddingVertical: 3, borderRadius: radii.pill },
  personRatingText: { fontSize: 11, fontFamily: fonts.semibold, color: colors.text },
  personCallBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  countPill: { backgroundColor: colors.surfaceTertiary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: radii.pill },
  countPillText: { fontSize: 12, fontFamily: fonts.semibold, color: colors.text },
  pendingNote: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center', marginTop: 14 },

  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 25, alignItems: 'center' },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.disabled, borderRadius: 2, marginBottom: 20 },
  modalClose: { position: 'absolute', top: 20, right: 20 },
  modalHeader: { alignItems: 'center', marginBottom: 24 },
  modalAvatarBox: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  modalName: { fontSize: 22, fontFamily: fonts.bold, color: colors.text },
  modalRole: { fontSize: 14, fontFamily: fonts.regular, color: colors.textSecondary, marginTop: 4 },
  modalStatsRow: { flexDirection: 'row', backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, padding: 18, width: '100%', marginBottom: 28 },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
  statVal: { fontSize: 18, fontFamily: fonts.bold, color: colors.text },
  statLbl: { fontSize: 12, fontFamily: fonts.regular, color: colors.textSecondary, marginTop: 4 },
  modalCallBtn: { ...buttons.primary, width: '100%', flexDirection: 'row', gap: 10 },
  modalCallText: { ...buttons.primaryText },
});

export default EventTracking;
