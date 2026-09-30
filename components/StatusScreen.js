import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../services/api';
import BottomTabBar, { TAB_BAR_HEIGHT } from './BottomTabBar';
import { colors, fonts, radii, shadows } from '../theme';
import { EVENT_STATUS, eventStatusLabel, assignedSupplierCount } from '../constants/eventStatus';

const StatusScreen = ({ onNavigate, onEventPress }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const fetchEvents = useCallback(async () => {
    try {
      const res = await api.getEvents();
      if (res.success) {
        setEvents(res.events || []);
      }
    } catch (err) {
      console.error('Fetch Status Events Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Events</Text>
        <TouchableOpacity style={styles.filterBtn}>
          <Ionicons name="options-outline" size={20} color={colors.icon} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {events.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="calendar-blank-outline" size={60} color={colors.iconMuted} />
                <Text style={styles.emptyText}>No events found yet.</Text>
              </View>
            ) : (
              events.map(event => (
                <TouchableOpacity
                  key={event.id}
                  style={styles.cardContainer}
                  onPress={() => onEventPress(event)}
                  activeOpacity={0.9}
                >
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.typeBadge}>
                        <MaterialCommunityIcons
                          name={event.type === 'wedding' ? 'ring' : event.type === 'corporate' ? 'briefcase' : 'party-popper'}
                          size={14}
                          color={colors.icon}
                        />
                        <Text style={styles.typeText}>
                          {event.type}
                        </Text>
                      </View>
                      <View style={[styles.statusTag, event.status === EVENT_STATUS.IN_PROGRESS && styles.statusTagActive]}>
                        <Text style={[styles.statusText, event.status === EVENT_STATUS.IN_PROGRESS && styles.statusTextActive]}>
                          {eventStatusLabel(event.status)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.eventTitle}>{event.name}</Text>

                    <View style={styles.detailRow}>
                      <Ionicons name="location-outline" size={14} color={colors.iconSecondary} />
                      <Text style={styles.detailText} numberOfLines={1}>{event.location}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={14} color={colors.iconSecondary} />
                      <Text style={styles.detailText}>{event.date}  •  {event.inTime}</Text>
                    </View>

                    {event.status === EVENT_STATUS.IN_PROGRESS && (
                      <View style={styles.progressSection}>
                        <View style={styles.progressInfo}>
                          <Text style={styles.progressLabel}>Execution Progress</Text>
                          {/* Backend sends progress as 0–100 */}
                          <Text style={styles.progressVal}>{Math.round(event.progress || 0)}%</Text>
                        </View>
                        <View style={styles.progressBg}>
                          <View style={[styles.progressFill, { width: `${Math.min(100, event.progress || 0)}%` }]} />
                        </View>
                      </View>
                    )}

                    <View style={styles.cardFooter}>
                      <View style={styles.supplierInfo}>
                        <Ionicons name="people-outline" size={16} color={colors.iconSecondary} />
                        <Text style={styles.supplierText}>{assignedSupplierCount(event)} / {event.suppliers} Suppliers assigned</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.iconMuted} />
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>

      <BottomTabBar activeTab="status" onNavigate={onNavigate} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingTop: 8,
    paddingHorizontal: 20,
  },
  cardContainer: {
    marginBottom: 14,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  card: {
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceTertiary,
    gap: 5,
  },
  typeText: {
    fontSize: 11,
    fontFamily: fonts.semibold,
    color: colors.text,
    textTransform: 'capitalize',
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statusTagActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusText: {
    fontSize: 10,
    fontFamily: fonts.semibold,
    color: colors.textSecondary,
  },
  statusTextActive: {
    color: colors.white,
  },
  eventTitle: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  detailText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    flex: 1,
  },
  progressSection: {
    marginTop: 14,
    marginBottom: 4,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: colors.textBody,
  },
  progressVal: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  progressBg: {
    height: 6,
    backgroundColor: colors.divider,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  supplierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  supplierText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 15,
  },
});

export default StatusScreen;
