import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import RazorpayCheckout from 'react-native-razorpay';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { COLORS, colors, fonts, radii, shadows, buttons, alpha } from '../theme';

import { RAZORPAY_KEY_ID } from '../config';
import PrimaryButton from './ui/PrimaryButton';

// Map-confirmed venue fields sent with the event (coordinates are the source of truth)
const placeFields = (place) => ({
  placeId:          place?.placeId || null,
  locationName:     place?.locationName || '',
  formattedAddress: place?.formattedAddress || '',
  city:         place?.city || '',
  state:        place?.state || '',
  pincode:      place?.pincode || '',
  latitude:     place?.latitude ?? null,
  longitude:    place?.longitude ?? null,
});

const PaymentReview = ({ eventData, onBack, onPay }) => {
  const { user } = useAuth();
  const [paymentType, setPaymentType] = useState('advance'); // 'total' | 'advance' | 'later'
  const [isSubmitting, setIsSubmitting] = useState(false);

  const costPerHead = parseFloat(eventData?.costPerHead) || 0;
  const suppliersCount = parseInt(eventData?.suppliers) || 0;
  const totalAmount = costPerHead * suppliersCount;

  const advanceAmount = totalAmount * 0.25;
  const isPayLater = paymentType === 'later';
  const currentPayAmount = paymentType === 'total' ? totalAmount : isPayLater ? 0 : advanceAmount;

  const buildEventPayload = (advancePaid) => ({
    name: eventData.eventName,
    type: eventData.eventType,
    location: eventData.location,
    ...placeFields(eventData.place),
    date: eventData.inDate,
    inDate: eventData.inDate,
    inTime: eventData.inTime,
    outDate: eventData.outDate,
    outTime: eventData.outTime,
    suppliers: suppliersCount,
    dressCode: eventData.dressCode,
    services: eventData.selectedSvcs || [],
    costPerHead: costPerHead,
    totalCost: totalAmount,
    advancePaid,
  });

  // Pay Later: create the event with nothing paid; the balance is settled from the Payments tab
  const handlePayLater = async () => {
    setIsSubmitting(true);
    try {
      const res = await api.createEvent(buildEventPayload(0));
      if (res?.success === false) throw new Error(res.message || 'Failed to create event');
      onPay(0, null);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not create the event');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── TEST MODE BYPASS ──────────────────────────────────────────────────────
  // Since Razorpay native module fails in Expo Go, we add a bypass for testing.
  const handleSimulatedSuccess = async () => {
    setIsSubmitting(true);
    try {
      console.log('[Test Mode] Simulating payment success...');

      // We manually construct a payload that tells the backend "payment is done"
      // Note: In production, the backend verifies the signature.
      // For this test, we'll assume the backend has a "test mode" or we mock it.
      const mockPayload = {
        razorpay_order_id: 'test_order_' + Date.now(),
        razorpay_payment_id: 'test_pay_' + Date.now(),
        razorpay_signature: 'test_sig_manual',
        isTest: true, // Tell backend this is a manual test bypass
        eventData: buildEventPayload(currentPayAmount)
      };

      const verifyRes = await api.verifyPayment(mockPayload);
      if (verifyRes.success) {
        Alert.alert('Test Success', 'SIMULATED payment confirmed!', [
          { text: 'Great!', onPress: () => onPay(mockPayload.eventData.advancePaid, verifyRes.payment) }
        ]);
      } else {
        throw new Error(verifyRes.message || 'Verification failed');
      }
    } catch (err) {
      Alert.alert('Test Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  // ──────────────────────────────────────────────────────────────────────────

  const handlePay = async () => {
    if (isPayLater) return handlePayLater();
    setIsSubmitting(true);
    try {
      // 1. Create Razorpay Order via Backend
      console.log(`[Payment] Creating order for: ₹${currentPayAmount}`);
      const orderRes = await api.createPaymentOrder(currentPayAmount);

      if (!orderRes.success) {
        throw new Error(orderRes.message || 'Failed to create payment order');
      }

      console.log('[Payment] Order Created:', orderRes.orderId);

      // 2. Open Razorpay Checkout
      const options = {
        description: `Payment for ${eventData.eventName}`,
        image: 'https://i.imgur.com/3gi6869.png', // Replace with your logo
        currency: orderRes.currency,
        key: RAZORPAY_KEY_ID,
        amount: orderRes.amount,
        name: 'Vizhaa Organizer',
        order_id: orderRes.orderId,
        prefill: {
          email: user?.email || 'test@example.com',
          contact: user?.mobile || '',
          name: user?.name || ''
        },
        theme: { color: colors.primary }
      };

      RazorpayCheckout.open(options).then(async (data) => {
        // 3. Payment Success - Verify on Backend
        console.log('[Payment] Success! Verifying signature...');

        const verificationPayload = {
          razorpay_order_id: data.razorpay_order_id,
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_signature: data.razorpay_signature,
          eventData: buildEventPayload(currentPayAmount)
        };

        const verifyRes = await api.verifyPayment(verificationPayload);

        if (verifyRes.success) {
          Alert.alert('Success', 'Payment verified and event created!', [
            { text: 'OK', onPress: () => onPay(currentPayAmount, verifyRes.payment) }
          ]);
        } else {
          Alert.alert('Verification Failed', verifyRes.message || 'Payment could not be verified.');
        }

      }).catch((error) => {
        // 4. Payment Failure/Cancellation
        console.log('[Payment] Error Object:', JSON.stringify(error));
        const errMsg = error.description || `Error Code: ${error.code || 'Unknown'}`;
        Alert.alert('Payment Issue', errMsg);
      });

    } catch (err) {
      console.error('Payment Flow Error:', err);
      Alert.alert('Error', err.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bannerContainer}>
        <View style={styles.banner}>
          <View style={styles.bannerContent}>
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>SEAMLESS & SECURE PAYMENTS</Text>
              <Text style={styles.bannerSubtitle}>Pay Your Way, Anytime, Anywhere.</Text>
            </View>
            <View style={styles.paymentIcons}>
              <FontAwesome5 name="cc-visa" size={22} color={colors.textInverseMuted} style={styles.icon} />
              <FontAwesome5 name="cc-mastercard" size={22} color={colors.textInverseMuted} style={styles.icon} />
              <FontAwesome5 name="google-pay" size={22} color={colors.textInverseMuted} style={styles.icon} />
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Event Review</Text>
            <TouchableOpacity style={styles.editBtn} onPress={onBack}>
              <Text style={styles.editText}>Edit</Text>
              <Ionicons name="pencil" size={13} color={colors.icon} />
            </TouchableOpacity>
          </View>
          <View style={styles.detailGrid}>
            <DetailItem label="Event Name" value={eventData?.eventName} />
            <DetailItem label="Event Type" value={eventData?.eventType} />
            <DetailItem label="Location" value={eventData?.location} />
            <DetailItem label="Suppliers" value={eventData?.suppliers} />
            <DetailItem label="In Date" value={eventData?.inDate} />
            <DetailItem label="Out Date" value={eventData?.outDate} />
            <DetailItem label="In Time" value={eventData?.inTime} />
            <DetailItem label="Out Time" value={eventData?.outTime} />
          </View>
        </View>

        <View style={styles.paymentCard}>
          <Text style={styles.costTitle}>Cost Breakdown</Text>
          <View style={styles.costRowItem}><Text style={styles.costDetail}>Rate per supplier</Text><Text style={styles.costValue}>₹{costPerHead.toLocaleString()}</Text></View>
          <View style={styles.costRowItem}><Text style={styles.costDetail}>Total Suppliers</Text><Text style={styles.costValue}>{suppliersCount}</Text></View>

          <View style={styles.divider} />

          <TouchableOpacity style={[styles.optionRow, paymentType === 'total' && styles.optionRowActive]} onPress={() => setPaymentType('total')}>
            <View style={styles.radioGroup}>
              <View style={[styles.radio, paymentType === 'total' && styles.radioActive]}>{paymentType === 'total' && <View style={styles.radioInner} />}</View>
              <View><Text style={styles.optionLabel}>Full Payment</Text><Text style={styles.optionSub}>Pay 100% now</Text></View>
            </View>
            <Text style={styles.optionValue}>₹{totalAmount.toLocaleString()}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.optionRow, paymentType === 'advance' && styles.optionRowActive]} onPress={() => setPaymentType('advance')}>
            <View style={styles.radioGroup}>
              <View style={[styles.radio, paymentType === 'advance' && styles.radioActive]}>{paymentType === 'advance' && <View style={styles.radioInner} />}</View>
              <View><Text style={styles.optionLabel}>Advance Payment</Text><Text style={styles.optionSub}>Pay 25% to confirm</Text></View>
            </View>
            <Text style={styles.optionValue}>₹{advanceAmount.toLocaleString()}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.optionRow, isPayLater && styles.optionRowActive]} onPress={() => setPaymentType('later')}>
            <View style={styles.radioGroup}>
              <View style={[styles.radio, isPayLater && styles.radioActive]}>{isPayLater && <View style={styles.radioInner} />}</View>
              <View><Text style={styles.optionLabel}>Pay Later</Text><Text style={styles.optionSub}>Create now, pay from Payments tab</Text></View>
            </View>
            <Text style={styles.optionValue}>₹0</Text>
          </TouchableOpacity>

          <View style={styles.divider} />
          <View style={styles.totalRow}><Text style={styles.totalLabel}>Payable Now :</Text><Text style={styles.totalPrice}>₹{currentPayAmount.toLocaleString()}</Text></View>
          {currentPayAmount < totalAmount && (
            <Text style={styles.balanceNote}>Balance due later : ₹{(totalAmount - currentPayAmount).toLocaleString()}</Text>
          )}

          <PrimaryButton style={[styles.payBtn, isSubmitting && { opacity: 0.7 }]} onPress={handlePay} disabled={isSubmitting}>
            {isSubmitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.payBtnText}>{isPayLater ? 'Create Event' : `Confirm and Pay ₹${currentPayAmount.toLocaleString()}`}</Text>}
          </PrimaryButton>

          {/* Test Mode Button - Only for Expo Go / Dev */}
          {!isPayLater && (
            <TouchableOpacity
              style={[styles.testBtn, isSubmitting && { opacity: 0.5 }]}
              onPress={handleSimulatedSuccess}
              disabled={isSubmitting}
            >
              <Text style={styles.testBtnText}>[DEV] Simulate Success</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const DetailItem = ({ label, value }) => (
  <View style={styles.detailItem}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue} numberOfLines={1}>{value || '—'}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  bannerContainer: { height: 140, marginHorizontal: 20, marginTop: 12, marginBottom: 20, borderRadius: radii.xl, overflow: 'hidden' },
  banner: { flex: 1, padding: 20, paddingTop: 56, justifyContent: 'center', backgroundColor: colors.darkSurface },
  bannerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bannerTextContainer: { flex: 1 },
  bannerTitle: { color: colors.white, fontSize: 16, fontFamily: fonts.bold, lineHeight: 21, letterSpacing: 0.3 },
  bannerSubtitle: { color: colors.textInverseMuted, fontSize: 12, fontFamily: fonts.regular, marginTop: 5 },
  paymentIcons: { flexDirection: 'row' },
  icon: { marginLeft: 10 },
  backBtn: { position: 'absolute', top: 14, left: 14, width: 36, height: 36, borderRadius: 18, backgroundColor: alpha(COLORS.white, 0.14), justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 40 },
  summaryCard: { backgroundColor: colors.surface, marginHorizontal: 20, borderRadius: radii.card, padding: 20, borderWidth: 1, borderColor: colors.border, marginBottom: 16, ...shadows.card },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: colors.divider, paddingBottom: 12 },
  summaryTitle: { fontSize: 16, fontFamily: fonts.bold, color: colors.text },
  editBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.sm },
  editText: { fontSize: 12, fontFamily: fonts.semibold, color: colors.text, marginRight: 5 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -10 },
  detailItem: { width: '50%', paddingHorizontal: 10, marginBottom: 15 },
  detailLabel: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, marginBottom: 2 },
  detailValue: { fontSize: 14, fontFamily: fonts.semibold, color: colors.text, textTransform: 'capitalize' },
  paymentCard: { backgroundColor: colors.surface, marginHorizontal: 20, borderRadius: radii.card, padding: 20, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  costTitle: { fontSize: 17, fontFamily: fonts.bold, color: colors.text, marginBottom: 15 },
  costRowItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  costDetail: { fontSize: 14, fontFamily: fonts.regular, color: colors.textSecondary },
  costValue: { fontSize: 14, fontFamily: fonts.semibold, color: colors.text },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 15 },
  optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, marginBottom: 10, backgroundColor: colors.surface },
  optionRowActive: { borderColor: colors.borderStrong, borderWidth: 1.5, backgroundColor: colors.surfaceSecondary },
  radioGroup: { flexDirection: 'row', alignItems: 'center' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.disabled, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  radioActive: { borderColor: colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  optionLabel: { fontSize: 14, fontFamily: fonts.semibold, color: colors.text },
  optionSub: { fontSize: 11, fontFamily: fonts.regular, color: colors.textSecondary },
  optionValue: { fontSize: 16, fontFamily: fonts.bold, color: colors.text },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5, marginBottom: 18 },
  totalLabel: { fontSize: 15, fontFamily: fonts.semibold, color: colors.textHeading },
  totalPrice: { fontSize: 24, fontFamily: fonts.bold, color: colors.text },
  balanceNote: { fontSize: 12, fontFamily: fonts.regular, color: colors.textSecondary, marginTop: -12, marginBottom: 18, textAlign: 'right' },
  payBtn: { ...buttons.primary },
  payBtnText: { ...buttons.primaryText },
  testBtn: {
    marginTop: 14,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.disabled,
    borderStyle: 'dashed',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
  },
  testBtnText: {
    color: colors.textMuted,
    fontSize: 13,
    fontFamily: fonts.semibold,
  },
});

export default PaymentReview;
