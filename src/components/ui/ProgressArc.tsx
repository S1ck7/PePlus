import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../../theme';
import { useTween } from './useTween';

interface ProgressArcProps {
  /** 0..1, share of the circle to fill, clockwise from the top. */
  progress: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}

/**
 * Circular line chart (a donut arc) drawn from plain Views, no SVG.
 * A ring with only its top and right borders coloured is a half circle; two of them, each clipped
 * to one half of the box and rotated, draw any arc from 0 to 360 degrees.
 */
export function ProgressArc({
  progress, size = 132, stroke = 10, color = colors.heroLit, track = colors.heroTrack, children,
}: ProgressArcProps) {
  const eased = useTween(Math.max(0, Math.min(1, progress)), 1200, 0);
  const deg = eased * 360;
  const half = size / 2;
  const ring = { width: size, height: size, borderRadius: half, borderWidth: stroke } as const;

  // Rotated by 45° it covers the right half (0°..180°); `rot` turns it to rot..rot+180.
  const halfRing = (rot: number) => (
    <View
      style={[styles.abs, ring, {
        borderColor: 'transparent', borderTopColor: color, borderRightColor: color,
        transform: [{ rotate: `${45 + rot}deg` }],
      }]}
    />
  );

  return (
    <View style={{ width: size, height: size }} accessible={false}>
      <View style={[styles.abs, ring, { borderColor: track }]} />
      {deg > 0.5 ? (
        <View style={[styles.clip, { left: half, width: half, height: size }]}>
          <View style={[styles.abs, { left: -half, width: size, height: size }]}>
            {halfRing(Math.min(deg, 180) - 180)}
          </View>
        </View>
      ) : null}
      {deg > 180 ? (
        <View style={[styles.clip, { left: 0, width: half, height: size }]}>
          <View style={[styles.abs, { width: size, height: size }]}>{halfRing(deg - 180)}</View>
        </View>
      ) : null}
      <View style={[StyleSheet.absoluteFill, styles.center, { padding: stroke + 6 }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute', top: 0, left: 0 },
  clip: { position: 'absolute', top: 0, overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
