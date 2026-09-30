import { useRef, useLayoutEffect } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { colors } from '../theme';

const DURATION = 260;
const OFFSET = 36;

// Animates its children in whenever `screenKey` changes.
// direction: 'forward' slides in from the right, 'back' from the left,
// 'fade' (tab switches) only fades.
const ScreenTransition = ({ screenKey, direction = 'forward', children }) => {
  const progress = useRef(new Animated.Value(1)).current;
  const isFirstRender = useRef(true);

  // Layout effect so the reset to 0 happens before the new screen paints (no flash)
  useLayoutEffect(() => {
    // No entrance animation for the very first screen
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [screenKey]);

  const startX = direction === 'back' ? -OFFSET : direction === 'fade' ? 0 : OFFSET;
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [startX, 0],
  });

  return (
    <Animated.View
      key={screenKey}
      style={[styles.container, { opacity: progress, transform: [{ translateX }] }]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});

export default ScreenTransition;
