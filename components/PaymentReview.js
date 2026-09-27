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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import RazorpayCheckout from 'react-native-razorpay';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

import { RAZORPAY_KEY_ID } from '../config';

const PaymentReview = ({ eventData, onBack, onPay }) => {
  const { user } = useAuth();
  const [paymentType, setPaymentType] = useState('advance'); // 'total' or 'advance'
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const costPerHead = parseFloat(eventData?.costPerHead) || 0;
  const suppliersCount = parseInt(eventData?.suppliers) || 0;
  const totalAmount = costPerHead * suppliersCount;
  
  const advanceAmount = totalAmount * 0.25;
  const currentPayAmount = paymentType === 'total' ? totalAmount : advanceAmount;

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
        eventData: {
          name: eventData.eventName,
          type: eventData.eventType,
          location: eventData.location,
          inDate: eventData.inDate,
          inTime: eventData.inTime,
          outDate: eventData.outDate,
          outTime: eventData.outTime,
          suppliers: parseInt(eventData.suppliers) || 0,
          dressCode: eventData.dressCode,
          services: eventData.selectedSvcs || [],
          costPerHead: parseFloat(eventData.costPerHead) || 0,
          totalCost: (parseFloat(eventData.costPerHead) || 0) * (parseInt(eventData.suppliers) || 0),
          advancePaid: paymentType === 'total' ? 
            (parseFloat(eventData.costPerHead) || 0) * (parseInt(eventData.suppliers) || 0) : 
            ((parseFloat(eventData.costPerHead) || 0) * (parseInt(eventData.suppliers) || 0) * 0.25)
        }
      };

      const verifyRes = await api.verifyPayment(mockPayload);
      if (verifyRes.success) {
        Alert.alert('Test Success', 'SIMULATED payment confirmed!', [
          { text: 'Great!', onPress: () => onPay(mockPayload.eventData.advancePaid) }
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
        theme: { color: '#7B3F00' }
      };

      RazorpayCheckout.open(options).then(async (data) => {
        // 3. Payment Success - Verify on Backend
        console.log('[Payment] Success! Verifying signature...');
        
        const verificationPayload = {
          razorpay_order_id: data.razorpay_order_id,
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_signature: data.razorpay_signature,
          eventData: {
            name: eventData.eventName,
            type: eventData.eventType,
            location: eventData.location,
            inDate: eventData.inDate,
            inTime: eventData.inTime,
            outDate: eventData.outDate,
            outTime: eventData.outTime,
            suppliers: suppliersCount,
            dressCode: eventData.dressCode,
            services: eventData.selectedSvcs || [],
            costPerHead: costPerHead,
            totalCost: totalAmount,
            advancePaid: currentPayAmount
          }
        };

        const verifyRes = await api.verifyPayment(verificationPayload);
        
        if (verifyRes.success) {
          Alert.alert('Success', 'Payment verified and event created!', [
            { text: 'OK', onPress: () => onPay(currentPayAmount) }
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
        <LinearGradient colors={['#004AAD', '#002D6B']} style={styles.banner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.bannerContent}>
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>SEAMLESS & SECURE PAYMENTS</Text>
              <Text style={styles.bannerSubtitle}>Pay Your Way, Anytime, Anywhere.</Text>
            </View>
            <View style={styles.paymentIcons}>
              <FontAwesome5 name="cc-visa" size={24} color="#FFF" style={styles.icon} />
              <FontAwesome5 name="cc-mastercard" size={24} color="#FFF" style={styles.icon} />
              <FontAwesome5 name="google-pay" size={24} color="#FFF" style={styles.icon} />
            </View>
          </View>
        </LinearGradient>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Event Review</Text>
            <TouchableOpacity style={styles.editBtn} onPress={onBack}>
              <Text style={styles.editText}>Edit</Text>
              <Ionicons name="pencil" size={14} color="#AAA" />
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

          <View style={styles.divider} />
          <View style={styles.totalRow}><Text style={styles.totalLabel}>Payable Now :</Text><Text style={styles.totalPrice}>₹{currentPayAmount.toLocaleString()}</Text></View>

          <TouchableOpacity style={[styles.payBtn, isSubmitting && { opacity: 0.7 }]} onPress={handlePay} disabled={isSubmitting}>
            <LinearGradient colors={['#7B3F00', '#5C2E00']} style={styles.payGradient}>
              {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.payBtnText}>Confirm and Pay ₹{currentPayAmount.toLocaleString()}</Text>}
            </LinearGradient>
          </TouchableOpacity>

          {/* Test Mode Button - Only for Expo Go / Dev */}
          <TouchableOpacity 
            style={[styles.testBtn, isSubmitting && { opacity: 0.5 }]} 
            onPress={handleSimulatedSuccess}
            disabled={isSubmitting}
          >
            <Text style={styles.testBtnText}>[DEV] Simulate Success</Text>
          </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  bannerContainer: { height: 140, margin: 15, borderRadius: 20, overflow: 'hidden' },
  banner: { flex: 1, padding: 20, justifyContent: 'center' },
  bannerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bannerTextContainer: { flex: 1 },
  bannerTitle: { color: '#FFF', fontSize: 18, fontFamily: 'Outfit_700Bold', lineHeight: 22 },
  bannerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: 'Outfit_400Regular', marginTop: 5 },
  paymentIcons: { flexDirection: 'row', gap: 10 },
  icon: { marginLeft: 10 },
  backBtn: { position: 'absolute', top: 15, left: 15, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 40 },
  summaryCard: { backgroundColor: '#FFF', marginHorizontal: 20, borderRadius: 20, padding: 20, elevation: 3, marginBottom: 20 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 10 },
  summaryTitle: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: '#2C1206' },
  editBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  editText: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#888', marginRight: 5 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -10 },
  detailItem: { width: '50%', paddingHorizontal: 10, marginBottom: 15 },
  detailLabel: { fontSize: 12, fontFamily: 'Outfit_400Regular', color: '#AAA', marginBottom: 2 },
  detailValue: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: '#333' },
  paymentCard: { backgroundColor: '#FFF', marginHorizontal: 20, borderRadius: 20, padding: 20, elevation: 5 },
  costTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: '#2C1206', marginBottom: 15 },
  costRowItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  costDetail: { fontSize: 14, fontFamily: 'Outfit_400Regular', color: '#666' },
  costValue: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: '#333' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 15 },
  optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#EEE', marginBottom: 10 },
  optionRowActive: { borderColor: '#7B3F00', backgroundColor: '#FFF9E6' },
  radioGroup: { flexDirection: 'row', alignItems: 'center' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#CCC', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  radioActive: { borderColor: '#7B3F00' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#7B3F00' },
  optionLabel: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: '#2C1206' },
  optionSub: { fontSize: 11, fontFamily: 'Outfit_400Regular', color: '#888' },
  optionValue: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: '#2C1206' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5, marginBottom: 15 },
  totalLabel: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: '#2C1206' },
  totalPrice: { fontSize: 22, fontFamily: 'Outfit_700Bold', color: '#7B3F00' },
  payBtn: { height: 55, borderRadius: 12, overflow: 'hidden', elevation: 5 },
  payGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  payBtnText: { color: '#FFF', fontSize: 16, fontFamily: 'Outfit_700Bold' },
  testBtn: {
    marginTop: 15,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CCC',
    borderStyle: 'dashed',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
  testBtnText: {
    color: '#999',
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
});

export default PaymentReview;
