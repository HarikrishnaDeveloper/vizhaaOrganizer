import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import OnboardingSlide from './OnboardingSlide';
import { preloadOnboardingImages } from './onboardingAssets';

const COLORS = {
  background: '#FFFFFF',
  charcoal: '#1C1C1E',
  textMuted: '#8A8A8E',
  textStrong: '#3A3A3C',
  underline: '#C7C7CC',
};

// Height reserved for the slide title, shared by the layout and every pager page.
// Fits three lines of the 20/28 title style.
const TITLE_HEIGHT = 88;
// Upper bound for the illustration so it doesn't balloon on tablets
const MAX_STAGE_SIZE = 440;
// Usable heights (window minus system bars) below this get tighter spacing
const COMPACT_HEIGHT = 640;
// Gap kept between the CTA and the system navigation bar / screen edge
const BOTTOM_GAP = 12;

// All positions are relative to the square illustration stage, so the whole
// composition scales together on any screen size.
const UNIFIED_FOOD_POSITIONS = [
  { top: '14%', left: '0%' },     // Top-Left
  { top: '10%', right: '0%' },    // Top-Right
  { bottom: '-6%', left: '28%' }, // Bottom-Center
];

// Indices into the preloaded food images, one set of three per slide
const FOOD_DATA = [
  [0, 1, 2], // Slide 0
  [3, 4, 5], // Slide 1
  [6, 7, 8], // Slide 2
];

const slides = [
  {
    title: 'Delicious moments beautifully served',
    subtitle: 'Expert catering for your special occasions',
  },
  {
    title: 'Made to impress served with love',
    subtitle: 'Crafting unforgettable experiences for every guest',
  },
  {
    title: 'Vizhaa make your event a culinary masterpiece',
    subtitle: 'From intimate gatherings to grand celebrations',
  },
];

// Raises the waiter within the stage (fraction of stage size; 25pt at the
// typical 360pt stage) so the shift scales with the illustration
const CHARACTER_LIFT = 0.07;

const POPPER_POSITIONS = [
  { top: '6%', right: '-2%' },
  { bottom: '10%', left: '-3%' },
];

const AnimatedFoodItem = ({ source, style, delay = 0, counterRotate }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
          delay,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim, delay]);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  return (
    <Animated.View style={[style, { transform: [{ translateY }, { rotate: counterRotate }] }]}>
      <Image source={source} style={{ width: '100%', height: '100%' }} contentFit="contain" />
    </Animated.View>
  );
};

// Soft spotlight behind the character. Fills its parent, so it always
// shares the illustration's size and position.
const CircularHalo = () => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="haloGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#F4F2EF" stopOpacity="1" />
          <Stop offset="70%" stopColor="#F7F6F4" stopOpacity="0.6" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="50" fill="url(#haloGlow)" />
      <Circle cx="50" cy="50" r="40" fill="#F1EFEC" fillOpacity="0.45" />
      <Circle cx="50" cy="50" r="30" fill="#EEEBE7" fillOpacity="0.45" />
    </Svg>
  </View>
);

const Onboarding = ({ onComplete, onReady }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [stageSize, setStageSize] = useState(0);
  const [images, setImages] = useState(null);
  const pagerRef = useRef(null);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const orbitAnim = useRef(new Animated.Value(0)).current;

  // Decode every illustration image before showing any of them
  useEffect(() => {
    let mounted = true;
    preloadOnboardingImages().then((loaded) => {
      if (mounted) setImages(loaded);
    });
    return () => { mounted = false; };
  }, []);

  // Tell the parent once the complete illustration has been laid out
  const illustrationReady = images !== null && stageSize > 0;
  useEffect(() => {
    if (!illustrationReady) return;
    const frame = requestAnimationFrame(() => onReady?.());
    return () => cancelAnimationFrame(frame);
  }, [illustrationReady]);

  // Auto-slide every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const nextPage = (currentPage + 1) % slides.length;
      pagerRef.current?.setPage(nextPage);
    }, 5000);
    return () => clearInterval(interval);
  }, [currentPage]);

  // Orbit the food around the character on page change
  useEffect(() => {
    orbitAnim.setValue(0);
    Animated.timing(orbitAnim, {
      toValue: 1,
      duration: 2200,
      useNativeDriver: true,
    }).start();
  }, [currentPage]);

  const ringRotate = orbitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const counterRotate = orbitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg']
  });

  const currentFoodIndices = FOOD_DATA[currentPage] || FOOD_DATA[0];

  // Largest square that fits the available area, with side breathing room
  const onStageLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    setStageSize(Math.min(width - 32, height, MAX_STAGE_SIZE));
  };

  const foodSize = stageSize * 0.26;

  // Edge-to-edge: the window runs under the status and navigation bars, so
  // the real space available is what's left after the insets.
  const usableHeight = windowHeight - insets.top - insets.bottom;
  const compact = usableHeight < COMPACT_HEIGHT;

  // Minimal loading state; normally hidden behind the native splash screen
  if (!images) {
    return (
      <View style={styles.loading}>
        <StatusBar style="dark" />
        <ActivityIndicator size="small" color={COLORS.textMuted} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.safeArea,
        {
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <StatusBar style="dark" />

      <Text style={[styles.welcome, compact && styles.welcomeCompact]}>Welcome Organizers</Text>

      <View style={styles.body}>
        {/* ILLUSTRATION — halo behind, character + decorations in front */}
        <View style={styles.stageArea} onLayout={onStageLayout} pointerEvents="none">
          {stageSize > 0 && (
            <View style={{ width: stageSize, height: stageSize }}>
              <CircularHalo />

              <View style={StyleSheet.absoluteFill}>
                <Image source={images.decor} style={styles.decor} contentFit="contain" />
                <Image
                  source={images.man}
                  style={[styles.character, { transform: [{ translateY: -stageSize * CHARACTER_LIFT }] }]}
                  contentFit="contain"
                />

                {POPPER_POSITIONS.map((pos, index) => (
                  <Image
                    key={index}
                    source={images.popper}
                    style={[styles.popper, { width: foodSize, height: foodSize }, pos]}
                    contentFit="contain"
                  />
                ))}

                <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: ringRotate }] }]}>
                  {currentFoodIndices.map((foodIndex, index) => (
                    <AnimatedFoodItem
                      key={index}
                      source={images.food[foodIndex]}
                      style={[styles.foodItem, { width: foodSize, height: foodSize }, UNIFIED_FOOD_POSITIONS[index]]}
                      delay={index * 800}
                      counterRotate={counterRotate}
                    />
                  ))}
                </Animated.View>
              </View>
            </View>
          )}
        </View>

        {/* Reserves room for the title rendered by the pager below */}
        <View style={styles.titleSlot} />

        {/* PAGER — full-area swipe layer; each page draws its title in the title slot */}
        <PagerView
          ref={pagerRef}
          style={StyleSheet.absoluteFill}
          initialPage={0}
          onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
        >
          {slides.map((slide, index) => (
            <View key={index} style={styles.page}>
              <View style={styles.titleSlot}>
                <OnboardingSlide title={slide.title} subtitle={slide.subtitle} />
              </View>
            </View>
          ))}
        </PagerView>
      </View>

      {/* FOOTER */}
      {/* Sits above the navigation bar: 3-button nav gives a tall inset, gesture nav a short one */}
      <View
        style={[
          styles.footer,
          compact && styles.footerCompact,
          { paddingBottom: insets.bottom + BOTTOM_GAP },
        ]}
      >
        {/* Legal */}
        <Text style={styles.footerText}>
          By continuing, you accept{' '}
          <Text style={styles.link}>Privacy Policy</Text>
          {' '}and{' '}
          <Text style={styles.link}>T&C</Text>
        </Text>

        {/* CTA Button */}
        <TouchableOpacity style={styles.button} activeOpacity={0.85} onPress={onComplete}>
          <Text style={styles.buttonText}>Plan Your Dream Day</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loading: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcome: {
    marginTop: 40,
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 20,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.charcoal,
    letterSpacing: 0.3,
  },
  welcomeCompact: {
    marginTop: 16,
    marginBottom: 0,
  },
  body: {
    flex: 1,
  },

  // ─── Illustration ─────────────────────────────────────────
  stageArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decor: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    left: '4.5%',
    top: '4%',
  },
  character: {
    position: 'absolute',
    width: '61%',
    height: '61%',
    left: '24%',
    top: '23.5%',
  },
  popper: {
    position: 'absolute',
    opacity: 0.8,
  },
  foodItem: {
    position: 'absolute',
  },

  // ─── Pager ────────────────────────────────────────────────
  titleSlot: {
    height: TITLE_HEIGHT,
  },
  page: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  // ─── Footer ───────────────────────────────────────────────
  footer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  footerCompact: {
    paddingTop: 8,
  },

  footerText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 16,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.textStrong,
    textDecorationLine: 'underline',
    textDecorationColor: COLORS.underline,
  },

  // CTA button
  button: {
    width: '100%',
    height: 56,
    borderRadius: 4,
    backgroundColor: COLORS.charcoal,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 0.2,
  },
});

export default Onboarding;
