import { useRef, useState, type ReactNode } from 'react';
import { Animated, LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadow, spacing, type } from '../../theme';

interface CollapsibleProps {
  title: string;
  /** Title colour, e.g. red for a warning. */
  titleColor?: string;
  /** Headline value shown on the closed row, so nothing important is hidden (D-020). */
  value?: string;
  valueColor?: string;
  /** Optional one-line preview under the title. */
  preview?: string;
  initiallyOpen?: boolean;
  children: ReactNode;
}

/** Accordion row: tap to expand/collapse with a smooth layout animation and a rotating chevron. */
export function Collapsible({ title, titleColor, value, valueColor, preview, initiallyOpen = false, children }: CollapsibleProps) {
  const [open, setOpen] = useState(initiallyOpen);
  const rotation = useRef(new Animated.Value(initiallyOpen ? 1 : 0)).current;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));
    Animated.timing(rotation, { toValue: open ? 0 : 1, duration: 220, useNativeDriver: true }).start();
    setOpen(!open);
  };

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={value ? `${title}, ${value}` : title}
        onPress={toggle}
        style={({ pressed }) => [styles.header, pressed && { opacity: 0.7 }]}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.title, titleColor ? { color: titleColor } : null]}>{title}</Text>
          {preview ? <Text style={styles.preview} numberOfLines={1}>{preview}</Text> : null}
        </View>
        {value ? (
          <Text style={[styles.value, valueColor ? { color: valueColor } : null]} numberOfLines={1}>{value}</Text>
        ) : null}
        <Animated.View style={[styles.chevron, { transform: [{ rotate }] }]}>
          <View style={styles.chevronMark} />
        </Animated.View>
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', ...shadow.card },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 64,
  },
  title: { ...type.bodyStrong, color: colors.text },
  preview: { ...type.small, fontSize: 13, color: colors.textMuted },
  value: { ...type.bodyStrong, color: colors.text, maxWidth: '45%' },
  chevron: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  // A drawn chevron (two borders of a small square turned 45°), crisp on every platform.
  chevronMark: {
    width: 8, height: 8, marginTop: -3, borderRightWidth: 2, borderBottomWidth: 2,
    borderColor: colors.textSecondary, transform: [{ rotate: '45deg' }],
  },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md },
});
