import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { colors } from '../theme';

export interface ChartPoint {
  key: string;
  label: string;
  /** Balance on the user's plan (or the actual past balance). */
  plan: number;
  /** Balance paying only the minimums; null where there is no comparison (the past). */
  min: number | null;
  past: boolean;
}

interface LineChartProps {
  points: ChartPoint[];
  height?: number;
  accessibilityLabel: string;
}

const STROKE = 3;
const DOT = 8;
const PAD = DOT; // keep dots inside the plot area
const AXIS = 54; // left gutter for the y-axis labels
const TICKS = 4; // y-axis steps (5 labels incl. 0)

/** Round the top of the axis up to a clean number: 358.600 -> 400.000. */
export function niceMax(value: number): number {
  const raw = Math.max(value, 1) / TICKS;
  const unit = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * unit).find(s => s >= raw) ?? 10 * unit;
  return step * TICKS;
}

/** 300000 -> "300k lei", 1500 -> "1,5k lei", 800 -> "800 lei" (no Intl: not every Android JS engine has it). */
export function axisLabel(value: number): string {
  if (value >= 1000) return `${String(Math.round(value / 100) / 10).replace('.', ',')}k lei`;
  return `${Math.round(value)} lei`;
}

type XY = { x: number; y: number };

/** A line between two points: a thin bar rotated around its centre (no SVG needed). */
function Segment({ a, b, color }: { a: XY; b: XY; color: string }) {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: (a.x + b.x) / 2 - length / 2,
        top: (a.y + b.y) / 2 - STROKE / 2,
        width: length,
        height: STROKE,
        borderRadius: STROKE,
        backgroundColor: color,
        transform: [{ rotate: `${angle}rad` }],
      }}
    />
  );
}

function Dot({ p, color, hollow }: { p: XY; color: string; hollow?: boolean }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute', left: p.x - DOT / 2, top: p.y - DOT / 2, width: DOT, height: DOT, borderRadius: DOT,
        backgroundColor: hollow ? colors.surface : color, borderWidth: 2, borderColor: color,
      }}
    />
  );
}

/** Two-series line chart: past + plan (slate/mist) against minimums only (plum). */
export function LineChart({ points, height = 160, accessibilityLabel }: LineChartProps) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const max = niceMax(Math.max(...points.map(p => Math.max(p.plan, p.min ?? 0)), 1));
  const step = points.length > 1 ? (width - AXIS - PAD * 2) / (points.length - 1) : 0;
  const yOf = (value: number) => PAD + (1 - value / max) * (height - PAD * 2);
  const at = (i: number, value: number): XY => ({
    x: AXIS + PAD + i * step,
    y: PAD + (1 - value / max) * (height - PAD * 2),
  });

  const plan = points.map((p, i) => at(i, p.plan));
  const min = points.map((p, i) => (p.min === null ? null : at(i, p.min)));

  return (
    <View accessible accessibilityLabel={accessibilityLabel}>
      <View style={{ height }} onLayout={onLayout}>
        {/* Y axis: what is still owed, with a grid line at every step. */}
        {Array.from({ length: TICKS + 1 }, (_, k) => {
          const value = (max / TICKS) * k;
          const top = yOf(value);
          return (
            <View key={`y${k}`} pointerEvents="none">
              <View style={[styles.grid, { top, left: AXIS, opacity: k === 0 ? 1 : 0.5 }]} />
              <Text style={[styles.yLabel, { top: top - 7 }]} numberOfLines={1}>{axisLabel(value)}</Text>
            </View>
          );
        })}
        {width > 0 ? (
          <>
            {points.slice(1).map((p, i) => {
              const a = min[i];
              const b = min[i + 1];
              return a && b ? <Segment key={`m${p.key}`} a={a} b={b} color={colors.expensiveFill} /> : null;
            })}
            {points.slice(1).map((p, i) => (
              <Segment
                key={`p${p.key}`}
                a={plan[i]}
                b={plan[i + 1]}
                color={points[i].past ? colors.mist : colors.goodFill /* segments leaving a past month are history */}
              />
            ))}
            {points.map((p, i) => (min[i] && p.key !== 'now' ? <Dot key={`dm${p.key}`} p={min[i]!} color={colors.expensiveFill} hollow /> : null))}
            {points.map((p, i) => (
              <Dot key={`dp${p.key}`} p={plan[i]} color={p.past ? colors.mist : colors.goodFill} />
            ))}
          </>
        ) : null}
      </View>
      <View style={styles.labels}>
        {width > 0 ? points.map((p, i) => (
          <Text
            key={`l${p.key}`}
            numberOfLines={1}
            style={[styles.label, { left: AXIS + PAD + i * step - 20 }, p.key === 'now' && styles.labelNow]}
          >
            {p.label}
          </Text>
        )) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.border },
  labels: { height: 18, marginTop: 6 },
  label: { position: 'absolute', width: 40, textAlign: 'center', fontSize: 10, color: colors.textMuted },
  yLabel: { position: 'absolute', left: 0, width: AXIS - 6, textAlign: 'right', fontSize: 10, lineHeight: 14, color: colors.textMuted },
  labelNow: { color: colors.text, fontWeight: '800' },
});
