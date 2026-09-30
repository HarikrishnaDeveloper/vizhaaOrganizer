import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import BlobBackground from './BlobBackground';
import { colors, fonts } from '../theme';

const Verifying = ({ onDone }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 2800,
      // Native driver keeps the bar smooth even while the JS thread is busy logging in
      useNativeDriver: true,
    }).start(() => {
      onDone && onDone();
    });
  }, []);

  const barScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.001, 1],
  });

  return (
    <View style={styles.container}>
      <BlobBackground />
      <View style={styles.card}>
        <Text style={styles.title}>Verifying...</Text>
        <Text style={styles.subtitle}>
          Do not press back or switch apps while we verify details.
        </Text>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { transform: [{ scaleX: barScale }] }]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  card: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 4,
    padding: 32,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },

  title: {
    fontSize: 26,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 32,
  },

  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.disabled,
    overflow: 'hidden',
  },
  fill: {
    width: '68%',
    height: '100%',
    transformOrigin: 'left',
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
});

export default Verifying;
