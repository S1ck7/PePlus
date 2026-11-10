import { useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { colors } from '../../theme';

interface SliderProps {
  value: number;
  min?: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  accessibilityLabel: string;
  /** Read out by screen readers, e.g. "1.200 lei". */
  accessibilityValueText: string;
}

const THUMB = 30;
const TRACK = 8;

/** Drag (or tap) slider built from plain Views and a PanResponder; no extra library. */
export function Slider({
  value, min = 0, max, step = 50, onChange, accessibilityLabel, accessibilityValueText,
}: SliderProps) {
  const [width, setWidth] = useState(0);
  // The responder is created once, so it reads the latest props through a ref.
  const latest = useRef({ value, min, max, step, onChange, width, startX: 0 });
  latest.current = { ...latest.current, value, min, max, step, onChange, width };

  const emitAt = (x: number) => {
    const s = latest.current;
    const usable = Math.max(1, s.width - THUMB);
    const ratio = Math.max(0, Math.min(1, (x - THUMB / 2) / usable));
    const next = Math.round((s.min + ratio * (s.max - s.min)) / s.step) * s.step;
    if (next !== s.value) s.onChange(next);
  };

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: e => {
      latest.current.startX = e.nativeEvent.locationX;
      emitAt(latest.current.startX);
    },
    onPanResponderMove: (_, g) => emitAt(latest.current.startX + g.dx),
  })).current;

  const ratio = max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) : 0;
  const thumbLeft = ratio * Math.max(0, width - THUMB);

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value, text: accessibilityValueText }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={e => {
        const delta = e.nativeEvent.actionName === 'increment' ? step * 2 : -step * 2;
        onChange(Math.max(min, Math.min(max, value + delta)));
      }}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={styles.hit}
      {...pan.panHandlers}
    >
      <View pointerEvents="none" style={styles.track}>
        {/* The track starts at the thumb's centre, so the fill ends exactly under it. */}
        <View style={[styles.fill, { width: thumbLeft }]} />
      </View>
      {width > 0 ? <View pointerEvents="none" style={[styles.thumb, { left: thumbLeft }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { height: 48, justifyContent: 'center' },
  track: {
    height: TRACK, borderRadius: TRACK / 2, marginHorizontal: THUMB / 2,
    backgroundColor: colors.surfaceMuted, overflow: 'hidden',
  },
  fill: { height: TRACK, backgroundColor: colors.accentText },
  thumb: {
    position: 'absolute', top: (48 - THUMB) / 2, width: THUMB, height: THUMB, borderRadius: THUMB / 2,
    backgroundColor: colors.surface, borderWidth: 3, borderColor: colors.accentText,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
});
