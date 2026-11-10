import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../../theme';
import { useTween } from './useTween';

interface FreedomRingProps {
  /** 0..1, how far along the way to debt-free. */
  progress: number;
  size?: number;
  ticks?: number;
  color?: string;
  track?: string;
  /** Follow `progress` directly (e.g. while a replay drives it every frame) instead of easing. */
  instant?: boolean;
  children?: ReactNode;
}

/**
 * The app's signature: a dial of ticks that fills up as debt is paid off.
 * Built from plain Views (no SVG): each tick sits in a full-size layer rotated around the centre.
 */
export function FreedomRing({
  progress, size = 200, ticks = 60, color = colors.heroLit, track = colors.heroTrack, instant, children,
}: FreedomRingProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const eased = useTween(clamped, 1200, 0);
  const animated = instant ? clamped : eased;
  const lit = Math.round(animated * ticks);
  const tickLength = size * 0.085;
  const tickWidth = Math.max(3, size * 0.018);

  return (
    <View style={{ width: size, height: size }} accessible={false}>
      {Array.from({ length: ticks }, (_, i) => (
        <View
          key={i}
          style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${(360 / ticks) * i}deg` }] }]}
          pointerEvents="none"
        >
          <View
            style={{
              alignSelf: 'center',
              width: tickWidth,
              height: i < lit ? tickLength * 1.15 : tickLength,
              borderRadius: tickWidth,
              backgroundColor: i < lit ? color : track,
            }}
          />
        </View>
      ))}
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: '16%' },
});
