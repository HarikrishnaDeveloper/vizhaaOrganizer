import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { colors, fonts, radii, buttons } from '../theme';
import PrimaryButton from './ui/PrimaryButton';

const CONFETTI_SHADES = [colors.primary, colors.primaryLight, colors.lime, colors.purple];

const SuccessScreen = ({ amount, onDone }) => {
  const transactionId = Math.random().toString().slice(2, 18);
  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).toUpperCase();
  const timeStr = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }) + ' IST';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Success Icon & Text */}
        <View style={styles.iconContainer}>
          <View style={styles.outerCircle}>
            <View style={styles.innerCircle}>
              <Ionicons name="checkmark-sharp" size={38} color={colors.white} />
            </View>
          </View>
          {/* Mock Confetti */}
          {[...Array(8)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.confetti,
                {
                  top: Math.random() * 100,
                  left: Math.random() * 200 - 50,
                  backgroundColor: CONFETTI_SHADES[i % CONFETTI_SHADES.length],
                  transform: [{ rotate: `${Math.random() * 360}deg` }]
                }
              ]}
            />
          ))}
        </View>

        <Text style={styles.thankYouText}>Thank You</Text>
        <Text style={styles.subtitle}>Your payment has processed successful</Text>

        {/* Receipt Card */}
        <View style={styles.receiptCard}>
          <View style={styles.cardHeader}>
            <View style={styles.dot} />
            <View style={styles.dashedLine} />
            <View style={styles.dot} />
          </View>

          <View style={styles.details}>
            <Text style={styles.label}>Transaction ID</Text>
            <Text style={styles.value}>{transactionId}</Text>

            <Text style={styles.label}>Amount</Text>
            <Text style={styles.value}>₹{amount || '125'}</Text>

            <Text style={styles.label}>Date & Time</Text>
            <Text style={styles.value}>{dateStr} | {timeStr}</Text>
          </View>

          {/* Scalloped Edge Mockup */}
          <View style={styles.scallopedBottom}>
            {[...Array(10)].map((_, i) => (
              <View key={i} style={styles.scallop} />
            ))}
          </View>
        </View>

        <PrimaryButton style={styles.doneBtn} onPress={onDone}>
          <Text style={styles.doneBtnText}>Done</Text>
        </PrimaryButton>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.successBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  confetti: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  thankYouText: {
    fontSize: 26,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: 36,
    textAlign: 'center',
  },
  receiptCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingTop: 28,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.background,
    marginHorizontal: -10,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: colors.disabled,
    borderStyle: 'dashed',
  },
  details: {
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  label: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  value: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 20,
  },
  scallopedBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: -10,
  },
  scallop: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  doneBtn: {
    ...buttons.primary,
    marginTop: 36,
    width: '100%',
  },
  doneBtnText: {
    ...buttons.primaryText,
  },
});

export default SuccessScreen;
