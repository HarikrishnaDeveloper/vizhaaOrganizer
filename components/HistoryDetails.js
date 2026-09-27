import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radii, shadows, buttons } from '../theme';
import PrimaryButton from './ui/PrimaryButton';

const ATTENDEES = [
  { name: 'Jeeva', role: 'Manager' },
  { name: 'Kathir', role: 'Supervisor' },
  { name: 'Velu', role: 'Supplier' },
  { name: 'John', role: 'Supplier' },
  { name: 'Vetri', role: 'Supplier' },
  { name: 'jagdeesh', role: 'Supplier' },
  { name: 'joseph', role: 'Supplier' },
];

// Leads get the solid black tag, everyone else the light grey one
const isLead = (role) => role === 'Manager' || role === 'Supervisor';

const HistoryDetails = ({ event, onBack }) => {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color={colors.icon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>History Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Event Card Summary */}
        <View style={styles.cardContainer}>
          <View style={styles.card}>
            <View style={styles.cardContent}>
              <Text style={styles.eventTitle}>{event?.title || "Vijay's Wedding Event"}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={colors.iconSecondary} />
                <Text style={styles.locationText} numberOfLines={2}>{event?.location || "ABC Marriage hall, Coimbatore"}</Text>
              </View>
              <Text style={styles.dateTimeText}>07 JUL, 2026 | 09:00AM-12:00PM IST</Text>
            </View>
            <View style={styles.imageContainer}>
              <MaterialCommunityIcons name="home-heart" size={38} color={colors.icon} />
            </View>
          </View>
        </View>

        {/* Main Details Card */}
        <View style={styles.detailsCard}>
          <View style={styles.trackerHeader}>
            <Text style={styles.trackerHeaderText}>Event History</Text>
          </View>

          {/* Event Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Event Status</Text>
            <View style={styles.statusRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.statusText}>Event Completed</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Event Attendees */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Event Attendees</Text>
            {ATTENDEES.map((person, i) => (
              <View key={i} style={styles.attendeeItem}>
                <View style={styles.attendeeInfo}>
                  <View style={styles.avatarPlaceholder}><Ionicons name="person-outline" size={18} color={colors.iconSecondary} /></View>
                  <Text style={styles.attendeeName}>{person.name}</Text>
                  <View style={[styles.roleTag, isLead(person.role) && styles.roleTagLead]}>
                    <Text style={[styles.roleTagText, isLead(person.role) && styles.roleTagTextLead]}>{person.role}</Text>
                  </View>
                </View>
                <TouchableOpacity><Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.iconSecondary} /></TouchableOpacity>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          {/* Event Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Event Details</Text>

            <Text style={styles.detailLabel}>Event Type</Text>
            <Text style={styles.detailValue}>Wedding Event</Text>

            <Text style={styles.detailLabel}>Number of Suppliers</Text>
            <Text style={styles.detailValue}>1</Text>

            <Text style={styles.detailLabel}>Dress Code</Text>
            <Text style={styles.detailValue}>White Shirt</Text>

            <Text style={styles.detailLabel}>Number of Services</Text>
            <Text style={styles.detailValue}>Breakfast, Lunch</Text>
          </View>

          <View style={styles.divider} />

          {/* Payment Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Details</Text>

            <View style={styles.paymentRow}>
              <View style={styles.paymentLabelRow}>
                <Text style={styles.paymentLabel}>Total Payment</Text>
                <View style={styles.statusSmallTag}><Text style={styles.statusSmallTagText}>Pending</Text></View>
              </View>
              <Text style={styles.paymentAmount}>₹1000</Text>
            </View>

            <View style={styles.paymentRow}>
              <View style={styles.paymentLabelRow}>
                <Text style={styles.paymentLabel}>Advance Payment</Text>
                <View style={[styles.statusSmallTag, styles.statusSmallTagPaid]}><Text style={[styles.statusSmallTagText, styles.statusSmallTagTextPaid]}>Paid</Text></View>
              </View>
              <Text style={styles.paymentAmount}>₹250</Text>
            </View>

            <PrimaryButton style={styles.payBtn}>
              <Text style={styles.payBtnText}>Pay Balance ₹750</Text>
            </PrimaryButton>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  cardContainer: {
    marginTop: 8,
    marginBottom: 36,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.xl,
    padding: 18,
    minHeight: 130,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  locationText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginLeft: 5,
    flex: 1,
  },
  dateTimeText: {
    fontSize: 11,
    fontFamily: fonts.semibold,
    color: colors.textHeading,
  },
  imageContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: 20,
    paddingTop: 32,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  trackerHeader: {
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 9,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    position: 'absolute',
    top: -18,
  },
  trackerHeaderText: {
    color: colors.white,
    fontSize: 14,
    fontFamily: fonts.semibold,
    letterSpacing: 0.3,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.text,
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginBottom: 20,
  },
  attendeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  attendeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  attendeeName: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.text,
    marginRight: 10,
    textTransform: 'capitalize',
  },
  roleTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.badgeBackground,
  },
  roleTagLead: {
    backgroundColor: colors.primary,
  },
  roleTagText: {
    fontSize: 10,
    fontFamily: fonts.semibold,
    color: colors.badgeText,
  },
  roleTagTextLead: {
    color: colors.white,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: colors.textHeading,
    marginTop: 12,
  },
  detailValue: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 3,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  paymentLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.text,
    marginRight: 10,
  },
  statusSmallTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statusSmallTagPaid: {
    backgroundColor: colors.successBackground,
    borderColor: colors.successBackground,
  },
  statusSmallTagText: {
    fontSize: 10,
    fontFamily: fonts.semibold,
    color: colors.textSecondary,
  },
  statusSmallTagTextPaid: {
    color: colors.text,
  },
  paymentAmount: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  payBtn: {
    ...buttons.primary,
    marginTop: 10,
  },
  payBtnText: {
    ...buttons.primaryText,
  },
});

export default HistoryDetails;
