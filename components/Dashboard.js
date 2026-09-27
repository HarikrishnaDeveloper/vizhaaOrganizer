import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import BottomTabBar, { TAB_BAR_HEIGHT } from './BottomTabBar';
import { colors, fonts, radii, shadows, alpha, COLORS } from '../theme';
import PrimaryButton from './ui/PrimaryButton';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const FAB_HEIGHT = 56;

// Event dates are stored as "DD/MM/YYYY" by the app; also accept ISO/other
// parseable strings. Returns a local-midnight Date or null.
const parseEventDate = (event) => {
  const raw = event?.date || event?.inDate;
  if (!raw) return null;
  const dmy = String(raw).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const formatDate = (d) => (d ? `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}` : '');

// Status pill: semantic colours only where the status carries meaning
const STATUS_STYLES = {
  'In Progress': { label: 'In progress', color: COLORS.primaryDark, bg: alpha(COLORS.primary, 0.14) },
  Upcoming: { label: 'Upcoming', color: COLORS.primaryDark, bg: alpha(COLORS.primary, 0.14) },
  APPROVED: { label: 'Confirmed', color: COLORS.primaryDark, bg: alpha(COLORS.primary, 0.14) },
  Completed: { label: 'Completed', color: COLORS.text, bg: alpha(COLORS.success, 0.16) },
  PENDING: { label: 'Pending approval', color: COLORS.text, bg: alpha(COLORS.warning, 0.2) },
  REJECTED: { label: 'Rejected', color: COLORS.text, bg: alpha(COLORS.error, 0.16) },
};
const statusStyle = (status) =>
  STATUS_STYLES[status] || { label: status || 'Scheduled', color: COLORS.textSecondary, bg: COLORS.surfaceSecondary };

const Dashboard = ({ onAddEvent, onNavigate, onEventPress }) => {
  const { user } = useAuth();
  const userName = user?.name || 'User';

  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState('list'); // 'list' | 'calendar'
  const insets = useSafeAreaInsets();

  const today = useMemo(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }, []);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(today);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await api.getEvents();
      if (res.success) {
        setEvents(res.events || []);
        setFilteredEvents(res.events || []);
      }
    } catch (err) {
      console.error('Fetch Dashboard Events Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Search Logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEvents(events);
    } else {
      const filtered = events.filter(e =>
        e.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.type?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredEvents(filtered);
    }
  }, [searchQuery, events]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const activeEvents = filteredEvents.filter(e => e.status === 'In Progress');
  const upcomingEvents = filteredEvents.filter(e => e.status === 'Upcoming');

  // List view: soonest first, undated events last
  const sortedEvents = useMemo(() => [...filteredEvents].sort((a, b) => {
    const da = parseEventDate(a);
    const db = parseEventDate(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da - db;
  }), [filteredEvents]);

  // Calendar view: events grouped by day
  const eventsByDay = useMemo(() => {
    const map = {};
    filteredEvents.forEach((e) => {
      const d = parseEventDate(e);
      if (d) (map[dayKey(d)] = map[dayKey(d)] || []).push(e);
    });
    return map;
  }, [filteredEvents]);
  const selectedEvents = eventsByDay[dayKey(selectedDay)] || [];

  const hasEvents = events.length > 0;
  const bottomSpace = TAB_BAR_HEIGHT + insets.bottom;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        // Room for the tab bar and the floating button, so nothing ends up under them
        contentContainerStyle={{ paddingBottom: bottomSpace + FAB_HEIGHT + 32 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View style={styles.avatarCircle}>
              {user?.profilePhotoUrl
                ? <Image source={{ uri: user.profilePhotoUrl }} style={styles.avatarImage} contentFit="cover" />
                : <Text style={styles.avatarInitial}>{userName[0]}</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationBtn} accessibilityLabel="Notifications">
            <Ionicons name="notifications-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Statistics */}
        <View style={styles.statsRow}>
          <StatItem label="Active" value={String(activeEvents.length).padStart(2, '0')} icon="flash-outline" />
          <StatItem label="Upcoming" value={String(upcomingEvents.length).padStart(2, '0')} icon="time-outline" />
          <StatItem label="Completed" value={String(events.filter(e => e.status === 'Completed').length).padStart(2, '0')} icon="checkmark-circle-outline" />
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            placeholder="Search your events..."
            style={styles.searchInput}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : !hasEvents ? (
          /* Empty state — the floating button is the only "add" action */
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={40} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No events found yet.</Text>
            <Text style={styles.emptyText}>Add an event to get started.</Text>
          </View>
        ) : (
          <>
            {/* Section header + view switch */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Events</Text>
              <View style={styles.segment}>
                {['list', 'calendar'].map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.segmentBtn, view === v && styles.segmentBtnOn]}
                    onPress={() => setView(v)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={v === 'list' ? 'list-outline' : 'calendar-outline'}
                      size={15}
                      color={view === v ? colors.white : colors.textSecondary}
                    />
                    <Text style={[styles.segmentText, view === v && styles.segmentTextOn]}>
                      {v === 'list' ? 'List' : 'Calendar'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {view === 'list' ? (
              sortedEvents.length ? (
                sortedEvents.map((event) => (
                  <EventCard key={event.id} event={event} onPress={() => onEventPress(event)} />
                ))
              ) : (
                <Text style={styles.noResults}>No events match “{searchQuery}”.</Text>
              )
            ) : (
              <>
                <MonthCalendar
                  month={month}
                  today={today}
                  selectedDay={selectedDay}
                  eventsByDay={eventsByDay}
                  onSelect={setSelectedDay}
                  onChangeMonth={(delta) => setMonth(m => new Date(m.getFullYear(), m.getMonth() + delta, 1))}
                />
                <Text style={styles.dayTitle}>
                  Events on {selectedDay.getDate()} {MONTHS[selectedDay.getMonth()]}
                </Text>
                {selectedEvents.length ? (
                  selectedEvents.map((event) => (
                    <EventCard key={event.id} event={event} compact onPress={() => onEventPress(event)} />
                  ))
                ) : (
                  <Text style={styles.noResults}>No events scheduled for this day.</Text>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      <BottomTabBar activeTab="dashboard" onNavigate={onNavigate} />

      {/* The single "add event" action, kept just above the tab bar */}
      <PrimaryButton
        style={[styles.fab, { bottom: bottomSpace + 16 }]}
        onPress={onAddEvent}
        accessibilityLabel="Add Event"
      >
        <Ionicons name="add" size={22} color={colors.white} />
        <Text style={styles.fabText}>Add Event</Text>
      </PrimaryButton>
    </SafeAreaView>
  );
};

const StatItem = ({ label, value, icon }) => (
  <View style={styles.statBox}>
    <View style={styles.statIconWrap}>
      <Ionicons name={icon} size={17} color={colors.primaryDark} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const EventCard = ({ event, compact, onPress }) => {
  const date = parseEventDate(event);
  const status = statusStyle(event.status);
  const place = event.city || event.location;
  return (
    <TouchableOpacity style={styles.eventCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.eventTop}>
        <Text style={styles.eventName} numberOfLines={1}>{event.name}</Text>
        <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
      {compact ? (
        <Text style={styles.eventMeta} numberOfLines={1}>
          {[event.inTime, place].filter(Boolean).join('  •  ')}
        </Text>
      ) : (
        <View style={styles.eventRows}>
          {date ? <MetaRow icon="calendar-outline" text={formatDate(date)} /> : null}
          {event.inTime ? <MetaRow icon="time-outline" text={event.inTime} /> : null}
          {place ? <MetaRow icon="location-outline" text={place} /> : null}
        </View>
      )}
    </TouchableOpacity>
  );
};

const MetaRow = ({ icon, text }) => (
  <View style={styles.metaRow}>
    <Ionicons name={icon} size={14} color={colors.textSecondary} />
    <Text style={styles.metaText} numberOfLines={1}>{text}</Text>
  </View>
);

const MonthCalendar = ({ month, today, selectedDay, eventsByDay, onSelect, onChangeMonth }) => {
  const year = month.getFullYear();
  const m = month.getMonth();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const lead = (new Date(year, m, 1).getDay() + 6) % 7; // Monday-first
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  return (
    <View style={styles.calendar}>
      <View style={styles.calHeader}>
        <TouchableOpacity style={styles.calNav} onPress={() => onChangeMonth(-1)} hitSlop={8} accessibilityLabel="Previous month">
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.calTitle}>{MONTHS[m]} {year}</Text>
        <TouchableOpacity style={styles.calNav} onPress={() => onChangeMonth(1)} hitSlop={8} accessibilityLabel="Next month">
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.calRow}>
        {WEEKDAYS.map((d) => <Text key={d} style={styles.calWeekday}>{d}</Text>)}
      </View>
      <View style={styles.calGrid}>
        {cells.map((day, i) => {
          if (!day) return <View key={i} style={styles.calCell} />;
          const date = new Date(year, m, day);
          const key = dayKey(date);
          const selected = key === dayKey(selectedDay);
          const isToday = key === dayKey(today);
          const hasEvent = !!eventsByDay[key];
          return (
            <TouchableOpacity key={i} style={styles.calCell} onPress={() => onSelect(date)} activeOpacity={0.7}>
              <View style={[styles.calDay, isToday && !selected && styles.calToday, selected && styles.calSelected]}>
                <Text style={[styles.calDayText, selected && styles.calSelectedText]}>{day}</Text>
              </View>
              <View style={[styles.calDot, hasEvent && { backgroundColor: selected ? colors.primaryDark : colors.primary }]} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    fontSize: 19,
    fontFamily: fonts.bold,
    color: colors.primaryDark,
  },
  welcomeText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  userName: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 4,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.card,
  },

  // Statistics
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 12,
    ...shadows.card,
  },
  statIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: alpha(COLORS.primaryLight, 0.35),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 16,
    height: 50,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },

  loading: {
    paddingVertical: 48,
    alignItems: 'center',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 4,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: fonts.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },

  // Section header + List/Calendar switch
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
  },
  segmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  segmentBtnOn: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: colors.textSecondary,
  },
  segmentTextOn: {
    color: colors.white,
  },

  // Event card
  eventCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    ...shadows.card,
  },
  eventTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  eventName: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  statusText: {
    fontSize: 11,
    fontFamily: fonts.semibold,
  },
  eventRows: {
    marginTop: 10,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  eventMeta: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  noResults: {
    marginHorizontal: 20,
    marginTop: 4,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Calendar
  calendar: {
    marginHorizontal: 20,
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    ...shadows.card,
  },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  calNav: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calTitle: {
    fontSize: 16,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  calRow: {
    flexDirection: 'row',
  },
  calWeekday: {
    width: '14.2857%',
    textAlign: 'center',
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: colors.textMuted,
    paddingVertical: 6,
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calCell: {
    width: '14.2857%',
    alignItems: 'center',
    paddingVertical: 3,
  },
  calDay: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  calToday: {
    borderColor: colors.primary,
  },
  calSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  calDayText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  calSelectedText: {
    fontFamily: fonts.semibold,
    color: colors.white,
  },
  calDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 2,
    backgroundColor: 'transparent',
  },
  dayTitle: {
    marginHorizontal: 20,
    marginTop: 18,
    marginBottom: 12,
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: colors.text,
  },

  // Floating Add Event (the only add action)
  fab: {
    position: 'absolute',
    right: 20,
    height: FAB_HEIGHT,
    borderRadius: 4,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 6,
    ...shadows.button,
    elevation: 6,
  },
  fabText: {
    color: colors.white,
    fontSize: 15,
    fontFamily: fonts.semibold,
  },
});

export default Dashboard;
