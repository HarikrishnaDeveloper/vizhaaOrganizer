import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { api } from '../services/api';
import BottomTabBar, { TAB_BAR_HEIGHT } from './BottomTabBar';
import { COLORS, colors, fonts, radii, shadows, alpha } from '../theme';
import PrimaryButton from './ui/PrimaryButton';

const FILTERS = ['All', 'Paid', 'Partial', 'Pending'];

const PaymentTab = ({ onNavigate }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [payModal, setPayModal] = useState(null); // event object
  const [payingId, setPayingId] = useState(null);
  const insets = useSafeAreaInsets();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchEvents = useCallback(async () => {
    try {
      const res = await api.getEvents();
      if (res.success) {
        setEvents(res.events || []);
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      }
    } catch (err) {
      console.error('PaymentTab fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const onRefresh = () => { setRefreshing(true); fetchEvents(); };

  // ── Derived stats ──────────────────────────────────────────────
  const totalBookings = events.length;

  const advanceCollected = events.reduce((sum, e) => {
    const adv = parseFloat(e.advancePaid) || 0;
    return sum + adv;
  }, 0);

  const fullyPaid = events.filter(e => {
    const total = parseFloat(e.totalCost) || 0;
    const adv   = parseFloat(e.advancePaid) || 0;
    return total > 0 && adv >= total;
  }).length;

  const pendingTotal = events.reduce((sum, e) => {
    const total   = parseFloat(e.totalCost) || 0;
    const adv     = parseFloat(e.advancePaid) || 0;
    const balance = total - adv;
    return balance > 0 ? sum + balance : sum;
  }, 0);

  // ── Payment status helper ──────────────────────────────────────
  const getPayStatus = (event) => {
    const total   = parseFloat(event.totalCost) || 0;
    const advance = parseFloat(event.advancePaid) || 0;
    if (advance <= 0) return 'Pending';
    if (advance >= total) return 'Paid';
    return 'Partial';
  };

  // Semantic status: only the badge carries the status color
  const STATUS_COLORS = {
    Paid:    { bg: colors.successBackground, text: colors.text, dot: colors.success, border: colors.successBackground },
    Partial: { bg: colors.warningBackground, text: colors.text, dot: colors.warning, border: colors.warningBackground },
    Pending: { bg: colors.dangerBackground,  text: colors.text, dot: colors.danger,  border: colors.dangerBackground },
  };

  // ── Filtered list ──────────────────────────────────────────────
  const filteredEvents = events.filter(e => {
    if (activeFilter === 'All') return true;
    return getPayStatus(e) === activeFilter;
  });

  // ── Pay balance (simulate / prod) ──────────────────────────────
  const handlePayBalance = async (event) => {
    const total   = parseFloat(event.totalCost) || 0;
    const advance = parseFloat(event.advancePaid) || 0;
    const balance = total - advance;
    if (balance <= 0) { Alert.alert('Already Paid', 'This event is fully paid.'); return; }

    setPayingId(event.id);
    setPayModal(null);
    try {
      // In prod: open Razorpay with balance amount
      // Here we simulate success (same pattern as PaymentReview)
      const mockPayload = {
        razorpay_order_id:  'test_order_' + Date.now(),
        razorpay_payment_id:'test_pay_'   + Date.now(),
        razorpay_signature: 'test_sig_manual',
        isTest:   true,
        // Recorded against the existing event; the server adds it to advancePaid
        eventId:  event.id,
        amount:   balance,
      };
      const verifyRes = await api.verifyPayment(mockPayload);
      if (verifyRes.success) {
        Alert.alert('✅ Payment Successful', `Balance ₹${balance.toLocaleString()} paid for ${event.name}`);
        fetchEvents();
      } else {
        throw new Error(verifyRes.message || 'Verification failed');
      }
    } catch (err) {
      Alert.alert('Payment Error', err.message);
    } finally {
      setPayingId(null);
    }
  };

  // ── Summary card ───────────────────────────────────────────────
  const SummaryCard = ({ icon, iconLib, label, value, tone = colors.primary }) => (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIconWrap, { backgroundColor: alpha(tone, 0.14) }]}>
        {iconLib === 'mc'
          ? <MaterialCommunityIcons name={icon} size={20} color={tone} />
          : <Ionicons name={icon} size={20} color={tone} />
        }
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );

  // ── Booking card ───────────────────────────────────────────────
  const BookingCard = ({ event }) => {
    const total   = parseFloat(event.totalCost) || 0;
    const advance = parseFloat(event.advancePaid) || 0;
    const balance = Math.max(0, total - advance);
    const status  = getPayStatus(event);
    const clr     = STATUS_COLORS[status];
    const pct     = total > 0 ? Math.min((advance / total) * 100, 100) : 0;
    const isPaying = payingId === event.id;

    const eventDate = event.inDate || event.date || '—';
    const icon = event.type === 'wedding' ? 'ring' :
                 event.type === 'corporate' ? 'briefcase-outline' : 'party-popper';

    return (
      <View style={styles.bookingCard}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={styles.typeIcon}>
              <MaterialCommunityIcons name={icon} size={18} color={colors.icon} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.cardEventName} numberOfLines={1}>{event.name || 'Unnamed Event'}</Text>
              <View style={styles.cardDateRow}>
                <Ionicons name="calendar-outline" size={12} color={colors.iconSecondary} />
                <Text style={styles.cardDateText}>  Event Date: {eventDate}</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: clr.bg, borderColor: clr.border }]}>
              <View style={[styles.statusDot, { backgroundColor: clr.dot }]} />
              <Text style={[styles.statusText, { color: clr.text }]}>{status === 'Paid' ? 'Fully Paid' : status === 'Partial' ? 'Partial Payment' : 'Pending'}</Text>
            </View>
          </View>
        </View>

        {/* Amount Breakdown */}
        <View style={styles.amountGrid}>
          <AmountRow label="Total Amount"   value={`₹${total.toLocaleString()}`}   bold />
          <AmountRow label="Advance Paid"   value={`₹${advance.toLocaleString()}`} />
          <AmountRow label="Balance Amount" value={`₹${balance.toLocaleString()}`} bold={balance > 0} color={balance > 0 ? colors.text : colors.textSecondary} />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressWrap}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.progressPct}>{Math.round(pct)}% paid</Text>
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          {balance > 0 && (
            <PrimaryButton
              style={styles.actionPayBtn}
              onPress={() => setPayModal(event)}
              disabled={isPaying}
            >
              {isPaying
                ? <ActivityIndicator color={colors.white} size="small" />
                : <>
                    <Ionicons name="wallet-outline" size={14} color={colors.white} />
                    <Text style={styles.actionPayText}>Pay Balance</Text>
                  </>
              }
            </PrimaryButton>
          )}
          <TouchableOpacity
            style={styles.actionOutlineBtn}
            onPress={() => Alert.alert('Details', `${event.name}\nTotal: ₹${total.toLocaleString()}\nAdvance: ₹${advance.toLocaleString()}\nBalance: ₹${balance.toLocaleString()}`)}
          >
            <Ionicons name="eye-outline" size={14} color={colors.icon} />
            <Text style={styles.actionOutlineText}>View Details</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionOutlineBtn}
            onPress={() => Alert.alert('Receipt', 'Receipt download coming soon!')}
          >
            <Ionicons name="download-outline" size={14} color={colors.icon} />
            <Text style={styles.actionOutlineText}>Receipt</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const AmountRow = ({ label, value, bold, color }) => (
    <View style={styles.amountRow}>
      <Text style={styles.amountLabel}>{label}</Text>
      <Text style={[styles.amountValue, bold && { fontFamily: fonts.bold }, color && { color }]}>{value}</Text>
    </View>
  );

  // ── Pay Balance Confirmation Modal ─────────────────────────────
  const PayBalanceModal = () => {
    if (!payModal) return null;
    const total   = parseFloat(payModal.totalCost) || 0;
    const advance = parseFloat(payModal.advancePaid) || 0;
    const balance = Math.max(0, total - advance);
    return (
      <Modal transparent visible animationType="slide" onRequestClose={() => setPayModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalIcon}>
                <Ionicons name="wallet-outline" size={26} color={colors.icon} />
              </View>
              <Text style={styles.modalTitle}>Pay Balance</Text>
              <Text style={styles.modalSub}>Settle remaining amount for this event</Text>
            </View>

            <View style={[styles.modalBody, { paddingBottom: 24 + insets.bottom }]}>
              <Text style={styles.modalEventName}>{payModal.name}</Text>

              <View style={styles.modalAmountCard}>
                <View style={styles.modalRow}>
                  <Text style={styles.modalRowLabel}>Total Amount</Text>
                  <Text style={styles.modalRowValue}>₹{total.toLocaleString()}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalRowLabel}>Already Paid</Text>
                  <Text style={styles.modalRowValue}>₹{advance.toLocaleString()}</Text>
                </View>
                <View style={[styles.modalRow, styles.modalRowHighlight]}>
                  <Text style={[styles.modalRowLabel, { fontFamily: fonts.bold, color: colors.text }]}>Balance Due</Text>
                  <Text style={[styles.modalRowValue, { color: colors.text, fontSize: 22 }]}>₹{balance.toLocaleString()}</Text>
                </View>
              </View>

              <PrimaryButton style={styles.modalPayBtn} onPress={() => handlePayBalance(payModal)}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.white} />
                <Text style={styles.modalPayText}>Pay ₹{balance.toLocaleString()} Now</Text>
              </PrimaryButton>

              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setPayModal(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerSub}>Overview</Text>
            <Text style={styles.headerTitle}>Payments</Text>
          </View>
          <View style={styles.headerIcon}>
            <FontAwesome5 name="rupee-sign" size={18} color={colors.icon} />
          </View>
        </View>

        {/* Summary Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryScroll}>
          <SummaryCard
            icon="wallet-outline" label="Advance Collected"
            value={`₹${advanceCollected.toLocaleString()}`}
          />
          <SummaryCard
            icon="time-outline" label="Pending Payments"
            value={`₹${pendingTotal.toLocaleString()}`}
            tone={COLORS.warning}
          />
          <SummaryCard
            icon="checkmark-circle-outline" label="Fully Paid"
            value={String(fullyPaid)}
            tone={COLORS.success}
          />
          <SummaryCard
            icon="calendar-outline" label="Total Bookings"
            value={String(totalBookings)}
            tone={COLORS.purple}
          />
        </ScrollView>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => {
          const isActive = activeFilter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, isActive && styles.filterBtnActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loaderText}>Loading payments...</Text>
        </View>
      ) : (
        <Animated.ScrollView
          style={{ opacity: fadeAnim }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
        >
          {filteredEvents.length === 0 ? (
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="cash-remove" size={64} color={colors.iconMuted} />
              <Text style={styles.emptyTitle}>No {activeFilter === 'All' ? '' : activeFilter} payments</Text>
              <Text style={styles.emptySub}>
                {activeFilter === 'All'
                  ? 'Create your first event to track payments here.'
                  : `No bookings with "${activeFilter}" status yet.`}
              </Text>
            </View>
          ) : (
            filteredEvents.map(event => <BookingCard key={event.id} event={event} />)
          )}
        </Animated.ScrollView>
      )}

      <BottomTabBar activeTab="payment-tab" onNavigate={onNavigate} />
      <PayBalanceModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  header: { paddingTop: 16, paddingBottom: 4, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerSub: { fontSize: 13, color: colors.textSecondary, fontFamily: fonts.regular },
  headerTitle: { fontSize: 28, color: colors.text, fontFamily: fonts.bold },
  headerIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },

  // Summary Cards
  summaryScroll: { paddingRight: 10, gap: 12 },
  summaryCard: { width: 152, borderRadius: radii.card, padding: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  summaryIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  summaryValue: { fontSize: 20, fontFamily: fonts.bold, color: colors.text, marginBottom: 4 },
  summaryLabel: { fontSize: 12, fontFamily: fonts.regular, color: colors.textSecondary, lineHeight: 15 },

  // Filters
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 18, gap: 8 },
  filterBtn: { flex: 1, paddingVertical: 9, borderRadius: radii.pill, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 12, fontFamily: fonts.semibold, color: colors.textBody },
  filterTextActive: { color: colors.white },

  // Loading
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText: { fontSize: 14, fontFamily: fonts.regular, color: colors.textMuted },

  scrollContent: { paddingHorizontal: 16, gap: 14, paddingTop: 2 },

  // Empty state
  emptyWrap: { alignItems: 'center', paddingTop: 56, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontFamily: fonts.bold, color: colors.text, marginTop: 16, marginBottom: 8 },
  emptySub: { fontSize: 13, fontFamily: fonts.regular, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  // Booking Card
  bookingCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardHeader: { marginBottom: 14 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center' },
  typeIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  cardEventName: { fontSize: 16, fontFamily: fonts.bold, color: colors.text, flex: 1 },
  cardDateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  cardDateText: { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.pill, borderWidth: 1, gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontFamily: fonts.bold },

  // Amount Grid
  amountGrid: { backgroundColor: colors.surfaceSecondary, borderRadius: radii.md, padding: 14, marginBottom: 14, gap: 8 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountLabel: { fontSize: 13, fontFamily: fonts.regular, color: colors.textSecondary },
  amountValue: { fontSize: 14, fontFamily: fonts.semibold, color: colors.text },

  // Progress
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  progressBg: { flex: 1, height: 6, backgroundColor: colors.divider, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },
  progressPct: { fontSize: 11, fontFamily: fonts.semibold, color: colors.textSecondary, minWidth: 55, textAlign: 'right' },

  // Card Actions
  cardActions: { flexDirection: 'row', gap: 8 },
  actionPayBtn: { flex: 1.2, height: 40, borderRadius: radii.sm + 2, backgroundColor: colors.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  actionPayText: { fontSize: 12, fontFamily: fonts.semibold, color: colors.white },
  actionOutlineBtn: { flex: 1, height: 40, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, borderRadius: radii.sm + 2, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  actionOutlineText: { fontSize: 12, fontFamily: fonts.semibold, color: colors.text },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.disabled, alignSelf: 'center', marginTop: 12 },
  modalHeader: { paddingTop: 20, paddingHorizontal: 24, alignItems: 'center', gap: 4 },
  modalIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 22, fontFamily: fonts.bold, color: colors.text, marginTop: 10 },
  modalSub: { fontSize: 13, fontFamily: fonts.regular, color: colors.textSecondary },
  modalBody: { padding: 24 },
  modalEventName: { fontSize: 16, fontFamily: fonts.semibold, color: colors.text, marginBottom: 16, textAlign: 'center' },
  modalAmountCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radii.card, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10, marginBottom: 24 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalRowHighlight: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 12, borderRadius: radii.md, marginTop: 4 },
  modalRowLabel: { fontSize: 14, fontFamily: fonts.regular, color: colors.textSecondary },
  modalRowValue: { fontSize: 16, fontFamily: fonts.bold, color: colors.text },
  modalPayBtn: { height: 56, borderRadius: radii.md, marginBottom: 8, backgroundColor: colors.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, ...shadows.button },
  modalPayText: { fontSize: 16, fontFamily: fonts.semibold, color: colors.white },
  modalCancelBtn: { alignItems: 'center', paddingVertical: 12 },
  modalCancelText: { fontSize: 14, fontFamily: fonts.semibold, color: colors.textSecondary },
});

export default PaymentTab;
