import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

const OnboardingSlide = ({ title }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(18);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 480,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        delay: 200,
        tension: 70,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, [title]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.title} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.8}>
          {title}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  textContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
    fontFamily: 'Outfit_600SemiBold',
    color: '#1C1C1E',
    lineHeight: 28,
    letterSpacing: 0.3,
  },
});

export default OnboardingSlide;