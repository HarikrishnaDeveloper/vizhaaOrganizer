import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { colors } from '../theme';

const { height } = Dimensions.get('window');

// Soft sky-blue circles behind the sign-in / sign-up cards
const BlobBackground = () => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    <View style={[s.blob, { top: -55, left: -55, width: 175, height: 175, opacity: 0.28 }]} />
    <View style={[s.blob, { top: 72, right: 32, width: 52, height: 52, opacity: 0.2 }]} />
    <View style={[s.blob, { top: height * 0.42, left: 8, width: 62, height: 62, opacity: 0.16 }]} />
    <View style={[s.blob, { bottom: 105, left: 25, width: 68, height: 68, opacity: 0.18 }]} />
    <View style={[s.blob, { bottom: -55, right: -45, width: 200, height: 200, opacity: 0.3 }]} />
  </View>
);

const s = StyleSheet.create({
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: colors.decoration },
});

export default BlobBackground;
