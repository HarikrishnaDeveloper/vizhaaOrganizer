import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import BottomTabBar, { TAB_BAR_HEIGHT } from './BottomTabBar';
import { colors, fonts, radii, shadows } from '../theme';
import { api } from '../services/api';
import { EVENT_STATUS } from '../constants/eventStatus';

const HistoryScreen = ({ onNavigate, onEventPress }) => {
  const [historyEvents, setHistoryEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const bottomSpace = TAB_BAR_HEIGHT + insets.bottom + 24;

  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.getEvents();
      if (res.success && res.events) {
        // Events the admin has marked completed, most recently finished first
        const completedEvents = res.events.filter(e => e.status === EVENT_STATUS.COMPLETED);
        completedEvents.sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));
        setHistoryEvents(completedEvents);
      }
    } catch (err) {
      console.error('Fetch History Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>History</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[historyEvents.length === 0 ? styles.emptyScrollContent : styles.scrollContent, { paddingBottom: bottomSpace }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
        >
          {historyEvents.length > 0 ? (
            historyEvents.map(event => (
              <TouchableOpacity
                key={event.id}
                style={styles.cardWrapper}
                onPress={() => onEventPress(event)}
              >
                <View style={styles.cardContainer}>
                  <View style={styles.card}>
                    <View style={styles.cardContent}>
                      <Text style={styles.eventTitle} numberOfLines={1}>{event.name}</Text>
                      <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={14} color={colors.iconSecondary} />
                        <Text style={styles.locationText} numberOfLines={2}>{event.location}</Text>
                      </View>
                      <Text style={styles.dateTimeText}>{event.inDate || event.date} | {event.inTime || event.time}</Text>
                    </View>

                    <View style={styles.imageContainer}>
                      <MaterialCommunityIcons
                        name={event.type === 'wedding' ? 'home-heart' : event.type === 'corporate' ? 'office-building' : 'party-popper'}
                        size={40}
                        color={colors.icon}
                      />
                    </View>
                  </View>
                </View>
                {/* Dropdown Arrow Tab */}
                <View style={styles.dropdownTab}>
                  <Ionicons name="chevron-down" size={18} color={colors.icon} />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="history" size={60} color={colors.iconMuted} />
              <Text style={styles.emptyText}>No completed events found.</Text>
            </View>
          )}
        </ScrollView>
      )}

      <BottomTabBar activeTab="history" onNavigate={onNavigate} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingTop: 8,
    paddingHorizontal: 20,
  },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardWrapper: {
    marginBottom: 24,
    alignItems: 'flex-end',
  },
  cardContainer: {
    width: '100%',
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.card,
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
    marginBottom: 16,
  },
  locationText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginLeft: 5,
    lineHeight: 16,
    flex: 1,
  },
  dateTimeText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: colors.textHeading,
  },
  imageContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownTab: {
    width: 40,
    height: 24,
    backgroundColor: colors.surfaceTertiary,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -1,
    marginRight: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 15,
  },
});

export default HistoryScreen;
