// Vizhaa Organizer design system: white + light sky blue + sky blue, with
// dark navy text and subtle grey. COLORS is the single source of truth — no
// other file defines a color value. `colors` gives each UI role a name and
// maps it onto COLORS.

export const COLORS = {
  // App
  background: '#EAF7FD',
  white: '#FFFFFF',

  // Brand
  primary: '#38BDF8',
  primaryLight: '#7DD3FC',
  primaryDark: '#0284C7',

  // Text
  text: '#111827',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',

  // Surfaces
  surface: '#FFFFFF',
  surfaceSecondary: '#F8FAFC',

  // Borders
  border: '#E2E8F0',

  // Accent
  lime: '#A3E635',
  limeLight: '#ECFCCB',

  purple: '#A78BFA',
  purpleLight: '#F3E8FF',

  // Status
  success: '#22C55E',
  warning: '#FBBF24',
  error: '#F87171',
};

// A COLORS value at reduced opacity, for tints (badges, halos, overlays)
export const alpha = (hex, opacity) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${opacity})`;
};

// UI roles → COLORS
export const colors = {
  // Surfaces
  background: COLORS.background,
  surface: COLORS.surface,
  surfaceSecondary: COLORS.surfaceSecondary,
  // Chips, tags and soft tiles
  surfaceTertiary: COLORS.background,
  inputBackground: COLORS.surfaceSecondary,
  // Card on the sign-in / sign-up screens
  surfaceMuted: COLORS.surface,
  // Strong brand panels (hero cards, banners) — the darker blue keeps white text legible
  darkSurface: COLORS.primaryDark,
  // Soft decorative circles behind cards
  decoration: COLORS.primaryLight,

  // Brand / actions
  primary: COLORS.primary,
  primaryPressed: COLORS.primaryDark,
  primaryLight: COLORS.primaryLight,
  primaryDark: COLORS.primaryDark,
  onPrimary: COLORS.white,

  // Text
  text: COLORS.text,
  textHeading: COLORS.text,
  textBody: COLORS.textSecondary,
  textSecondary: COLORS.textSecondary,
  textTertiary: COLORS.textSecondary,
  textMuted: COLORS.textMuted,
  textDisabled: COLORS.textMuted,
  textInverse: COLORS.white,
  textInverseMuted: alpha(COLORS.white, 0.85),

  // Lines
  border: COLORS.border,
  // Selected / focused outlines
  borderStrong: COLORS.primary,
  divider: COLORS.border,

  // Icons
  icon: COLORS.primaryDark,
  iconSecondary: COLORS.textSecondary,
  iconMuted: COLORS.textMuted,

  // States
  disabled: COLORS.border,
  disabledBackground: COLORS.border,
  disabledText: COLORS.textMuted,
  badgeBackground: COLORS.limeLight,
  badgeText: COLORS.textSecondary,

  // Semantic status — only where the status matters
  success: COLORS.success,
  successBackground: alpha(COLORS.success, 0.12),
  warning: COLORS.warning,
  warningBackground: alpha(COLORS.warning, 0.16),
  danger: COLORS.error,
  dangerBackground: alpha(COLORS.error, 0.12),
  dangerBorder: COLORS.error,

  // Secondary accents — small elements only
  lime: COLORS.lime,
  limeLight: COLORS.limeLight,
  purple: COLORS.purple,
  purpleLight: COLORS.purpleLight,

  // Overlays
  overlay: alpha(COLORS.text, 0.5),
  overlayLight: alpha(COLORS.text, 0.3),

  white: COLORS.white,
  black: COLORS.text,
  transparent: 'transparent',
};

export const fonts = {
  regular: 'Outfit_400Regular',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
};

export const radii = {
  sm: 1.5,
  md: 3.5,
  lg: 7.5,
  xl: 15.5,
  card: 4,      // every card surface
  pill: 999,
};

// Very subtle elevation; avoid heavy shadows
export const shadows = {
  card: {
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  raised: {
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  button: {
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 4,
  },
};

// One button system for the whole app. Use <PrimaryButton> (pressed state
// included) or spread into StyleSheet entries:
//   btn: { ...buttons.primary }, btnText: { ...buttons.primaryText }
export const buttons = {
  primary: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    ...shadows.button,
  },
  primaryPressed: {
    backgroundColor: colors.primaryPressed,
  },
  primaryText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontFamily: fonts.semibold,
    letterSpacing: 0.2,
  },
  secondary: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: {
    color: colors.text,
    fontSize: 16,
    fontFamily: fonts.semibold,
    letterSpacing: 0.2,
  },
  disabled: {
    backgroundColor: colors.disabledBackground,
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledText: {
    color: colors.disabledText,
  },
};

// Standard card surface
export const card = {
  backgroundColor: colors.surface,
  borderRadius: radii.lg,
  borderWidth: 1,
  borderColor: colors.border,
};

// Standard text input
export const input = {
  backgroundColor: colors.inputBackground,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radii.md,
  color: colors.text,
  fontFamily: fonts.regular,
};

export const inputFocused = {
  borderColor: colors.primary,
};
