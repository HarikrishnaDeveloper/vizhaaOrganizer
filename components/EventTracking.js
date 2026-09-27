import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  Modal,
  Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { COLORS, colors, fonts, radii, shadows, buttons, alpha } from '../theme';
import PrimaryButton from './ui/PrimaryButton';

const TRACKING_STEPS = [
  { id: 1, label: 'Event Created', status: 'Completed', time: '09:00 AM', active: true, done: true },
  { id: 2, label: 'Supplier Assigned', status: 'In Progress', time: '09:15 AM', active: true, done: false },
  { id: 3, label: 'Supplier Arrived', status: 'In Queue', time: '--:--', active: false, done: false },
  { id: 4, label: 'Event Started', status: 'In Queue', time: '--:--', active: false, done: false },
  { id: 5, label: 'Event Completed', status: 'In Queue', time: '--:--', active: false, done: false },
];

const TEAM = {
  manager: { name: 'Jeeva', role: 'Manager', events: 77, rating: 5, phone: '9876543210' },
  supervisor: { name: 'Kathir', role: 'Supervisor', events: 42, rating: 4.5, phone: '9876543211' },
  suppliers: [
    { id: 1, name: 'Velu', role: 'Supplier', events: 12, rating: 4 },
    { id: 2, name: 'John', role: 'Supplier', events: 25, rating: 5 },
    { id: 3, name: 'Vetri', role: 'Supplier', events: 8, rating: 4 },
  ]
};

const EventTracking = ({ event, onBack }) => {
  const [selectedMember, setSelectedMember] = React.useState(null);
  const [modalVisible, setModalVisible] = React.useState(false);
  const insets = useSafeAreaInsets();

  const openProfile = (member) => {
    setSelectedMember(member);
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Premium Transparent Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color={colors.icon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Tracking</Text>
        <TouchableOpacity style={styles.helpBtn}>
          <Ionicons name="help-circle-outline" size={22} color={colors.icon} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + insets.bottom }]}>

        {/* Main Event Card - Glassmorphism Style */}
        <View style={styles.heroSection}>
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroStatus}>IN PROGRESS</Text>
                <Text style={styles.heroTitle}>{event?.name || "Wedding Celebration"}</Text>
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
              <View style={styles.heroInfoItem}>
                <Ionicons name="location-outline" size={14} color={colors.textInverseMuted} />
                <Text style={styles.heroInfoText}>{event?.location || "Coimbatore"}</Text>
              </View>
              <View style={styles.heroInfoItem}>
                <Ionicons name="calendar-outline" size={14} color={colors.textInverseMuted} />
                <Text style={styles.heroInfoText}>{event?.date || "Today"}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Dynamic Status Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Execution Timeline</Text>
          <View style={styles.timelineCard}>
            {TRACKING_STEPS.map((step, index) => (
              <View key={step.id} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <Text style={[styles.timelineTime, !step.active && { color: colors.textDisabled }]}>{step.time}</Text>
                </View>

                <View style={styles.timelineCenter}>
                  <View style={[
                    styles.timelineDot,
                    step.done && styles.dotDone,
                    step.status === 'In Progress' && styles.dotActive
                  ]}>
                    {step.done && <Ionicons name="checkmark" size={11} color={colors.white} />}
                  </View>
                  {index < TRACKING_STEPS.length - 1 && (
                    <View style={[styles.timelineLine, step.done && styles.lineDone]} />
                  )}
                </View>

                <View style={styles.timelineRight}>
                  <Text style={[styles.timelineLabel, !step.active && { color: colors.textMuted }]}>{step.label}</Text>
                  <Text style={[styles.timelineStatus, { color: step.done ? colors.success : (step.status === 'In Progress' ? colors.primaryDark : colors.textMuted) }, step.status === 'In Progress' && { fontFamily: fonts.semibold }]}>
                    {step.status}
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
            <TouchableOpacity><Text style={styles.seeAll}>Emergency Call</Text></TouchableOpacity>
          </View>

          <View style={styles.teamGrid}>
            <TeamMemberCard member={TEAM.manager} onPress={() => openProfile(TEAM.manager)} />
            <TeamMemberCard member={TEAM.supervisor} onPress={() => openProfile(TEAM.supervisor)} />
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 25 }]}>Assigned Suppliers ({TEAM.suppliers.length})</Text>
          {TEAM.suppliers.map(sup => (
            <TouchableOpacity key={sup.id} style={styles.supplierRow} onPress={() => openProfile(sup)}>
              <View style={styles.supplierAvatar}>
                <Ionicons name="person-outline" size={20} color={colors.icon} />
              </View>
              <View style={styles.supplierInfo}>
                <Text style={styles.supplierName}>{sup.name}</Text>
                <Text style={styles.supplierRole}>{sup.role}</Text>
              </View>
              <View style={styles.supplierActions}>
                <TouchableOpacity style={styles.miniCallBtn}>
                  <Ionicons name="call-outline" size={16} color={colors.white} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
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
                <Text style={styles.statVal}>{selectedMember?.events}</Text>
                <Text style={styles.statLbl}>Events</Text>
              </View>
              <View style={[styles.statBox, styles.statDivider]}>
                <Text style={styles.statVal}>{selectedMember?.rating}★</Text>
                <Text style={styles.statLbl}>Rating</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>Active</Text>
                <Text style={styles.statLbl}>Status</Text>
              </View>
            </View>

            <PrimaryButton style={styles.modalCallBtn}>
              <Ionicons name="call-outline" size={20} color={colors.white} />
              <Text style={styles.modalCallText}>Call {selectedMember?.role}</Text>
            </PrimaryButton>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const TeamMemberCard = ({ member, onPress }) => (
  <TouchableOpacity style={styles.teamCard} onPress={onPress}>
    <View style={styles.teamCardAvatar}>
      <Ionicons name="person-outline" size={22} color={colors.white} />
    </View>
    <Text style={styles.teamCardName}>{member.name}</Text>
    <Text style={styles.teamCardRole}>{member.role}</Text>
    <View style={styles.teamCardRating}>
      <Ionicons name="star" size={11} color={colors.icon} />
      <Text style={styles.teamCardRatingText}>{member.rating}</Text>
    </View>
  </TouchableOpacity>
);

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

  heroSection: { paddingHorizontal: 20, paddingTop: 8 },
  heroCard: { borderRadius: radii.xl + 4, padding: 22, backgroundColor: colors.darkSurface, ...shadows.raised },
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

  timelineCard: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: 20, borderWidth: 1, borderColor: colors.border, ...shadows.card },
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

  teamGrid: { flexDirection: 'row', gap: 12 },
  teamCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radii.xl, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border, ...shadows.card },
  teamCardAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  teamCardName: { fontSize: 14, fontFamily: fonts.bold, color: colors.text },
  teamCardRole: { fontSize: 11, fontFamily: fonts.regular, color: colors.textSecondary, marginTop: 2 },
  teamCardRating: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, backgroundColor: colors.surfaceTertiary, paddingHorizontal: 9, paddingVertical: 3, borderRadius: radii.pill },
  teamCardRatingText: { fontSize: 11, fontFamily: fonts.semibold, color: colors.text },

  supplierRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 12, borderRadius: radii.lg, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  supplierAvatar: { width: 42, height: 42, borderRadius: radii.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  supplierInfo: { flex: 1 },
  supplierName: { fontSize: 14, fontFamily: fonts.semibold, color: colors.text },
  supplierRole: { fontSize: 12, fontFamily: fonts.regular, color: colors.textSecondary },
  supplierActions: { flexDirection: 'row', gap: 10 },
  miniCallBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },

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
