import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, spacing } from '../../theme';

/** A CSS gradient as a style: native (New Architecture) uses experimental_backgroundImage, web uses CSS. */
function gradient(value: string): ViewStyle {
  return (Platform.OS === 'web' ? { backgroundImage: value } : { experimental_backgroundImage: value }) as ViewStyle;
}

/** A soft mint light that drifts slowly inside the card, so the frosted surface has depth to show. */
function Glow({ color, size, from, to, duration }: {
  color: string; size: number; from: [number, number]; to: [number, number]; duration: number;
}) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(t, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(t, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [t, duration]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.glow,
        gradient(`radial-gradient(circle, ${color} 0%, rgba(255,255,255,0) 68%)`),
        {
          width: size, height: size, borderRadius: size / 2, left: from[0], top: from[1],
          transform: [
            { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, to[0] - from[0]] }) },
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, to[1] - from[1]] }) },
          ],
        },
      ]}
    />
  );
}

/**
 * Glass design for the mint highlighted cards only (D-043): a translucent frosted mint surface with
 * a light rim, a top sheen and slow inner glows, plus a soft mint shadow. On web it also blurs what
 * is behind it (backdrop-filter). The rest of the app keeps its plain cards.
 */
export function GlassHero({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.card, style]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Glow color="rgba(127,205,174,0.45)" size={260} from={[-60, -70]} to={[40, 10]} duration={9000} />
        <Glow color="rgba(255,255,255,0.55)" size={220} from={[180, 60]} to={[90, 140]} duration={11000} />
        <Glow color="rgba(127,205,174,0.35)" size={200} from={[120, 220]} to={[220, 150]} duration={13000} />
        {/* Sheen: light catching the top edge of the glass. */}
        <View style={[StyleSheet.absoluteFill, gradient('linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 38%)')]} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(181,232,211,0.78)',
    borderRadius: radius.xl,
    padding: spacing.xl,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.75)',
    // Soft mint shadow (drawn outside the card only, so it works on translucent views).
    boxShadow: '0px 10px 28px rgba(47,107,85,0.22)',
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(18px) saturate(140%)' } as unknown as ViewStyle) : null),
  },
  glow: { position: 'absolute' },
});
