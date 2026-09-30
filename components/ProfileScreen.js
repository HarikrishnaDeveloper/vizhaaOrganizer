import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Modal, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import BottomTabBar, { TAB_BAR_HEIGHT } from './BottomTabBar';
import TextInput from './ui/ThemedTextInput';
import { colors, fonts, radii, shadows, buttons, input } from '../theme';
import PrimaryButton from './ui/PrimaryButton';
import EmailVerifySheet from './EmailVerifySheet';

// Account type → display label. Set by the system, never edited here.
const ROLE_LABELS = { ORGANIZER: 'Organizer', SUPPLIER: 'Supplier', ADMIN: 'Admin' };
const roleLabel = (role) => ROLE_LABELS[role] || 'Organizer';

const ProfileScreen = ({ onNavigate }) => {
  const { user, updateUser, logout } = useAuth();

  const [form, setForm] = useState({
    name: '',
    dob: null,
    gender: 'male',
    city: '',
    email: '',
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        dob: user.dob ? new Date(user.dob) : null,
        gender: (user.gender || 'male').toLowerCase(),
        city: user.city || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const response = await api.completeProfile({
        name: form.name,
        dob: form.dob,
        gender: form.gender,
        city: form.city,
        email: form.email,
      });

      if (response.success) {
        updateUser(response.user);
        Alert.alert('Success', 'Profile updated successfully');
        return true;
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const [photoBusy, setPhotoBusy] = useState(false);

  // Load the full profile (the login response only carries id/mobile), so the
  // photo and details survive app restarts
  useEffect(() => {
    api.getProfile()
      .then((res) => { if (res.success) updateUser(res.user); })
      .catch(() => {});
  }, []);

  const uploadPhoto = async (asset) => {
    setPhotoBusy(true);
    try {
      const res = await api.uploadProfilePhoto(asset);
      if (res.success) updateUser(res.user);
    } catch (err) {
      Alert.alert('Upload failed', err.message || 'Could not upload your photo. Please try again.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const pickPhoto = async (source) => {
    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', source === 'camera'
        ? 'Allow camera access to take a profile photo.'
        : 'Allow photo access to choose a profile photo.');
      return;
    }
    const options = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 };
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled && result.assets?.[0]) uploadPhoto(result.assets[0]);
  };

  const removePhoto = async () => {
    setPhotoBusy(true);
    try {
      const res = await api.deleteProfilePhoto();
      if (res.success) updateUser(res.user);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not remove your photo.');
    } finally {
      setPhotoBusy(false);
    }
  };

  // A bottom sheet rather than Alert: Android alerts ignore the back button
  // and show at most 3 buttons, which dropped "Cancel" once a photo existed
  const [photoSheet, setPhotoSheet] = useState(false);
  const onAvatarPress = () => setPhotoSheet(true);

  const [emailSheet, setEmailSheet] = useState(false);
  const onEmailVerified = (updated) => {
    updateUser(updated);
    setEmailSheet(false);
    Alert.alert('Email verified', 'Your email address has been verified.');
  };

  // Close the sheet first; opening the picker/camera over a closing modal
  // can fail on Android
  const choosePhotoAction = (action) => {
    setPhotoSheet(false);
    setTimeout(action, 300);
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.trim().charAt(0).toUpperCase();
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setForm(prev => ({ ...prev, dob: selectedDate }));
    }
  };

  const [editing, setEditing] = useState(false);

  // Leaving edit mode without saving restores what's stored
  const cancelEdit = () => {
    if (user) {
      setForm({
        name: user.name || '',
        dob: user.dob ? new Date(user.dob) : null,
        gender: (user.gender || 'male').toLowerCase(),
        city: user.city || '',
        email: user.email || '',
      });
    }
    setShowDatePicker(false);
    setEditing(false);
  };

  const saveChanges = async () => {
    const saved = await handleUpdate();
    if (saved) setEditing(false);
  };

  const confirmLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  };

  const formatDob = (d) => {
    if (!d || isNaN(d)) return '';
    try {
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return d.toLocaleDateString();
    }
  };
  const genderLabel = form.gender ? form.gender.charAt(0).toUpperCase() + form.gender.slice(1) : '';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 28 }]}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Header: who the user is ── */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={onAvatarPress}
              disabled={photoBusy}
              activeOpacity={0.85}
              accessibilityLabel="Change profile photo"
            >
              <View style={styles.avatarCircle}>
                {user?.profilePhotoUrl ? (
                  <Image source={{ uri: user.profilePhotoUrl }} style={styles.avatarImage} contentFit="cover" transition={200} />
                ) : (
                  <Text style={styles.avatarInitial}>{getInitials(form.name)}</Text>
                )}
                {photoBusy && (
                  <View style={styles.avatarBusy}>
                    <ActivityIndicator color={colors.white} />
                  </View>
                )}
              </View>
              <View style={styles.cameraBtn}>
                <Ionicons name="camera" size={15} color={colors.primary} />
              </View>
            </TouchableOpacity>

            <Text style={styles.name} numberOfLines={1}>{user?.name || form.name || 'Your name'}</Text>
            <Text style={styles.role} numberOfLines={1}>{roleLabel(user?.role)}</Text>

            {!editing && (
              <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)} activeOpacity={0.75}>
                <Ionicons name="create-outline" size={16} color={colors.primaryDark} />
                <Text style={styles.editBtnText}>Edit Profile</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Personal details ── */}
          <SectionTitle title="Personal Details" />
          <View style={styles.card}>
            {editing ? (
              <>
                <Field label="Full Name">
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. John Smith"
                    value={form.name}
                    onChangeText={(val) => setForm(prev => ({ ...prev, name: val }))}
                  />
                </Field>

                <Field label="Date of Birth">
                  <TouchableOpacity style={[styles.input, styles.inputRow]} onPress={() => setShowDatePicker(true)}>
                    <Text style={[styles.inputText, !form.dob && { color: colors.textMuted }]}>
                      {form.dob ? form.dob.toLocaleDateString() : 'DD/MM/YYYY'}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color={colors.icon} />
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={form.dob || new Date()}
                      mode="date"
                      display="default"
                      onChange={onDateChange}
                      maximumDate={new Date()}
                    />
                  )}
                </Field>

                <Field label="Gender">
                  <View style={styles.radioRow}>
                    {['Male', 'Female', 'Other'].map(item => {
                      const on = form.gender === item.toLowerCase();
                      return (
                        <TouchableOpacity
                          key={item}
                          style={[styles.radioItem, on && styles.radioActiveItem]}
                          onPress={() => setForm(prev => ({ ...prev, gender: item.toLowerCase() }))}
                        >
                          <View style={[styles.radioOuter, on && styles.radioOuterActive]}>
                            {on && <View style={styles.radioInnerDot} />}
                          </View>
                          <Text style={[styles.radioLabel, on && styles.radioLabelActive]}>{item}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </Field>

                <Field label="Location" optional last>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your personal location"
                    value={form.city}
                    onChangeText={(val) => setForm(prev => ({ ...prev, city: val }))}
                  />
                </Field>
              </>
            ) : (
              <>
                <InfoRow icon="person-outline" label="Full Name" value={form.name} />
                <InfoRow icon="calendar-outline" label="Date of Birth" value={formatDob(form.dob)} />
                <InfoRow icon="male-female-outline" label="Gender" value={genderLabel} />
                <InfoRow icon="location-outline" label="Location" value={form.city} last />
              </>
            )}
          </View>

          {/* ── Contact details ── */}
          <SectionTitle title="Contact Details" />
          <View style={styles.card}>
            {/* Account type and phone are fixed identity data, never editable */}
            <InfoRow icon="briefcase-outline" label="Account Type" value={roleLabel(user?.role)} />
            <InfoRow
              icon="call-outline"
              label="Phone Number"
              value={user?.mobile ? `+91 ${user.mobile}` : ''}
              badge="Verified"
            />
            {editing ? (
              <Field label="Email" optional last>
                <TextInput
                  style={styles.input}
                  placeholder="name@email.com"
                  value={form.email}
                  onChangeText={(val) => setForm(prev => ({ ...prev, email: val }))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </Field>
            ) : (
              <InfoRow
                icon="mail-outline"
                label="Email"
                value={form.email}
                last
                badge={user?.email && user?.emailVerified ? 'Verified' : undefined}
                action={user?.email && !user?.emailVerified ? (
                  <TouchableOpacity style={styles.verifyBtn} onPress={() => setEmailSheet(true)} activeOpacity={0.7}>
                    <Text style={styles.verifyBtnText}>Verify</Text>
                  </TouchableOpacity>
                ) : null}
              />
            )}
            {!editing && user?.email && !user?.emailVerified ? (
              <Text style={styles.verifyHint}>Verify your email to receive event updates and receipts.</Text>
            ) : null}
          </View>

          {/* ── Edit actions ── */}
          {editing && (
            <View style={styles.editActions}>
              <PrimaryButton
                style={[styles.saveBtn, loading && { opacity: 0.8 }]}
                onPress={saveChanges}
                disabled={loading}
              >
                {loading ? (
                  <View style={styles.busyRow}>
                    <ActivityIndicator color={colors.white} />
                    <Text style={styles.saveBtnText}>Saving...</Text>
                  </View>
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </PrimaryButton>
              <TouchableOpacity style={styles.cancelBtn} onPress={cancelEdit} disabled={loading} activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Account ── */}
          {!editing && (
            <>
              <SectionTitle title="Account" />
              <View style={[styles.card, styles.cardFlush]}>
                <TouchableOpacity style={styles.actionRow} onPress={confirmLogout} activeOpacity={0.7}>
                  <View style={[styles.actionIcon, styles.actionIconDanger]}>
                    <Ionicons name="log-out-outline" size={18} color={colors.danger} />
                  </View>
                  <Text style={[styles.actionText, { color: colors.danger }]}>Log out</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomTabBar activeTab="profile" onNavigate={onNavigate} />

      <EmailVerifySheet
        visible={emailSheet}
        email={user?.email}
        onClose={() => setEmailSheet(false)}
        onVerified={onEmailVerified}
      />

      <Modal
        visible={photoSheet}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setPhotoSheet(false)}
      >
        <Pressable style={styles.sheetOverlay} onPress={() => setPhotoSheet(false)}>
          {/* Inner Pressable keeps taps on the sheet from closing it */}
          <Pressable style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Profile photo</Text>

            <SheetOption icon="images-outline" label="Choose from gallery" onPress={() => choosePhotoAction(() => pickPhoto('library'))} />
            <SheetOption icon="camera-outline" label="Take photo" onPress={() => choosePhotoAction(() => pickPhoto('camera'))} />
            {user?.profilePhotoUrl ? (
              <SheetOption icon="trash-outline" label="Remove photo" danger onPress={() => choosePhotoAction(removePhoto)} />
            ) : null}

            <TouchableOpacity style={styles.sheetCancel} onPress={() => setPhotoSheet(false)} activeOpacity={0.7}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const SheetOption = ({ icon, label, danger, onPress }) => (
  <TouchableOpacity style={styles.sheetOption} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.sheetOptionIcon, danger && styles.actionIconDanger]}>
      <Ionicons name={icon} size={19} color={danger ? colors.danger : colors.primaryDark} />
    </View>
    <Text style={[styles.sheetOptionText, danger && { color: colors.danger }]}>{label}</Text>
  </TouchableOpacity>
);

const SectionTitle = ({ title }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionAccent} />
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

// View mode: compact label / value row
const InfoRow = ({ icon, label, value, badge, action, last }) => (
  <View style={[styles.infoRow, !last && styles.infoRowDivider]}>
    <View style={styles.infoIcon}>
      <Ionicons name={icon} size={17} color={colors.primaryDark} />
    </View>
    <View style={styles.infoBody}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, !value && styles.infoEmpty]} numberOfLines={2}>
        {value || 'Not added'}
      </Text>
    </View>
    {badge ? (
      <View style={styles.badge}>
        <Ionicons name="checkmark-circle" size={12} color={colors.success} />
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
    ) : null}
    {action}
  </View>
);

// Edit mode: label above an input
const Field = ({ label, optional, last, children }) => (
  <View style={[styles.field, last && { marginBottom: 0 }]}>
    <View style={styles.fieldLabelRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {optional && <View style={styles.optionalTag}><Text style={styles.optionalText}>Optional</Text></View>}
    </View>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 8,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    backgroundColor: colors.primaryLight,
    borderWidth: 4,
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.raised,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarBusy: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 38,
    fontFamily: fonts.bold,
    color: colors.primaryDark,
  },
  cameraBtn: {
    position: 'absolute',
    right: -2,
    bottom: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.card,
  },
  name: {
    fontSize: 26,
    fontFamily: fonts.bold,
    color: colors.text,
    marginTop: 14,
    maxWidth: '90%',
  },
  role: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  editBtnText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.primaryDark,
  },

  // Sections
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 26,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionAccent: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingVertical: 6,
    ...shadows.card,
  },
  cardFlush: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: 'hidden',
  },

  // View mode rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  infoRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBody: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 16,
    fontFamily: fonts.semibold,
    color: colors.text,
    marginTop: 2,
  },
  infoEmpty: {
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.limeLight,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: fonts.semibold,
    color: colors.textSecondary,
  },

  // Edit mode fields
  field: {
    marginVertical: 12,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: colors.textSecondary,
  },
  optionalTag: {
    backgroundColor: colors.badgeBackground,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    marginLeft: 8,
  },
  optionalText: {
    fontSize: 10,
    color: colors.badgeText,
    fontFamily: fonts.semibold,
  },
  input: {
    ...input,
    height: 50,
    paddingHorizontal: 15,
    fontSize: 15,
    justifyContent: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputText: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  radioRow: {
    flexDirection: 'row',
    gap: 8,
  },
  radioItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  radioActiveItem: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: colors.white,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  radioOuterActive: {
    borderColor: colors.primary,
  },
  radioInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  radioLabel: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  radioLabelActive: {
    fontFamily: fonts.semibold,
    color: colors.text,
  },

  // Edit actions
  editActions: {
    marginTop: 24,
    gap: 6,
  },
  saveBtn: {
    ...buttons.primary,
    borderRadius: 14,
  },
  saveBtnText: {
    ...buttons.primaryText,
  },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelBtnText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.textSecondary,
  },

  verifyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  verifyBtnText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: colors.white,
  },
  verifyHint: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    paddingBottom: 12,
    marginTop: -4,
  },

  // Photo options sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 17,
    fontFamily: fonts.semibold,
    color: colors.text,
    marginBottom: 8,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  sheetOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetOptionText: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  sheetCancel: {
    marginTop: 10,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetCancelText: {
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: colors.textSecondary,
  },

  // Account rows
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconDanger: {
    backgroundColor: colors.dangerBackground,
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
});

export default ProfileScreen;
