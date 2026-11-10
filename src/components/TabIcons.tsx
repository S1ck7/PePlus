import { StyleSheet, View } from 'react-native';

/* Tab-bar icons drawn with plain Views (no icon font or SVG dependency), 24x24, tinted by `color`.
   Home = house, This month = calendar, Pay less = bank building, Goal = bullseye. */

const S = 24;
const W = 2; // stroke width

export function HomeIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      {/* Roof: two edges of a square turned 45 degrees. */}
      <View style={[styles.abs, {
        top: 4.5, left: 5, width: 14, height: 14, borderTopWidth: W, borderLeftWidth: W,
        borderColor: color, borderTopLeftRadius: 2, transform: [{ rotate: '45deg' }],
      }]} />
      {/* Walls. */}
      <View style={[styles.abs, {
        top: 11, left: 6, width: 12, height: 10, borderWidth: W, borderTopWidth: 0,
        borderColor: color, borderBottomLeftRadius: 2, borderBottomRightRadius: 2,
      }]} />
      {/* Door. */}
      <View style={[styles.abs, { top: 15, left: 10.5, width: 3, height: 6, backgroundColor: color, borderRadius: 1 }]} />
    </View>
  );
}

export function CalendarIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={[styles.abs, { top: 5, left: 3, width: 18, height: 16, borderWidth: W, borderColor: color, borderRadius: 3 }]} />
      <View style={[styles.abs, { top: 5, left: 3, width: 18, height: 5, backgroundColor: color, borderTopLeftRadius: 3, borderTopRightRadius: 3 }]} />
      {/* Binder rings. */}
      <View style={[styles.abs, { top: 2, left: 7, width: W, height: 5, backgroundColor: color, borderRadius: 1 }]} />
      <View style={[styles.abs, { top: 2, left: 15, width: W, height: 5, backgroundColor: color, borderRadius: 1 }]} />
      {/* Days. */}
      {[[7, 13], [11, 13], [15, 13], [7, 16.5], [11, 16.5]].map(([left, top]) => (
        <View key={`${left}-${top}`} style={[styles.abs, { top, left, width: 2.5, height: 2.5, borderRadius: 1, backgroundColor: color }]} />
      ))}
    </View>
  );
}

/** Bank building: pediment, lintel, three columns, base. */
export function BankIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      {/* Pediment: a filled triangle (border trick). */}
      <View style={[styles.abs, {
        top: 1, left: 2, width: 0, height: 0,
        borderLeftWidth: 10, borderRightWidth: 10, borderBottomWidth: 6,
        borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color,
      }]} />
      {/* Lintel. */}
      <View style={[styles.abs, { top: 8, left: 3, width: 18, height: 2.5, backgroundColor: color, borderRadius: 1 }]} />
      {/* Columns. */}
      {[5, 10.75, 16.5].map(left => (
        <View key={left} style={[styles.abs, { top: 11.5, left, width: 2.5, height: 7, backgroundColor: color, borderRadius: 1 }]} />
      ))}
      {/* Base steps. */}
      <View style={[styles.abs, { top: 19.5, left: 3, width: 18, height: 2, backgroundColor: color, borderRadius: 1 }]} />
      <View style={[styles.abs, { top: 22, left: 1.5, width: 21, height: 2, backgroundColor: color, borderRadius: 1 }]} />
    </View>
  );
}

export function GoalIcon({ color }: { color: string }) {
  return (
    <View style={[styles.box, { alignItems: 'center', justifyContent: 'center' }]}>
      <View style={[styles.ring, { width: 20, height: 20, borderRadius: 10, borderColor: color }]}>
        <View style={[styles.ring, { width: 12, height: 12, borderRadius: 6, borderColor: color }]}>
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: S, height: S },
  abs: { position: 'absolute' },
  ring: { borderWidth: W, alignItems: 'center', justifyContent: 'center' },
});
