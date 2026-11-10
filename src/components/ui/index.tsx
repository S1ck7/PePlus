import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View,
  type StyleProp, type TextStyle, type ViewStyle,
} from 'react-native';

import { colors, costColors, formatLei, radius, shadow, spacing, touch, type, type CostLevel } from '../../theme';
import { GlassHero } from './GlassHero';
import { useTween } from './useTween';

export { Collapsible } from './Collapsible';
export { FreedomRing } from './FreedomRing';
export { ProgressArc } from './ProgressArc';
export { Slider } from './Slider';
export { useTween } from './useTween';

/** Scrollable page with the standard gutter and bottom room. */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Dark card used once per screen for the answer to that screen's question. */
/** The mint highlighted card of each screen, in the glass design (D-043). */
export function HeroCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <GlassHero style={style}>{children}</GlassHero>;
}

export function Label({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Text accessibilityRole="header" style={styles.sectionTitleText}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  /** `inverse` is the primary action on a plum hero card: white button, plum text. */
  variant?: 'primary' | 'secondary' | 'ghost' | 'inverse';
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Each screen has exactly one `primary` button: its main action. */
export function Button({ label, onPress, variant = 'primary', disabled, accessibilityLabel, style }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'inverse' && styles.buttonInverse,
        pressed && variant === 'primary' && { backgroundColor: colors.accentPressed },
        pressed && variant !== 'primary' && { opacity: 0.8 },
        disabled && styles.buttonDisabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === 'primary' ? { color: colors.textInverse } : { color: colors.accentText },
          disabled && { color: colors.textMuted },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Small coloured tag that carries the app-wide colour meaning. */
export function Tag({ label, tone }: { label: string; tone: CostLevel | 'good' | 'accent' }) {
  const palette = tone === 'good'
    ? { fg: colors.good, bg: colors.goodSoft }
    : tone === 'accent'
      ? { fg: colors.accentText, bg: colors.accentSoft }
      : costColors[tone];
  return (
    <View style={[styles.tag, { backgroundColor: palette.bg }]}>
      <Text style={[styles.tagText, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

/** A lei amount that animates whenever its value changes. */
export function AnimatedLei({
  value, style, prefix = '', format = formatLei,
}: { value: number; style?: StyleProp<TextStyle>; prefix?: string; format?: (n: number) => string }) {
  const shown = useTween(value);
  return <Text style={style}>{prefix}{format(shown)}</Text>;
}

/** Bottom sheet used for consent, application and the profile switcher. */
export function Sheet({
  visible, onClose, children,
}: { visible: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="close" />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** Springs in from small when it mounts: used for "paid off" and "sent" moments. */
export function PopIn({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const scale = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 140, delay, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 180, delay, useNativeDriver: true }),
    ]).start();
  }, [scale, opacity, delay]);
  return <Animated.View style={[style, { opacity, transform: [{ scale }] }]}>{children}</Animated.View>;
}

/** Horizontal meter with an optional limit mark (e.g. the 40% BNR cap). */
export function Meter({
  value, limit, color, max = 1,
}: { value: number; limit?: number; color: string; max?: number }) {
  const width = useTween(Math.max(0, Math.min(1, value / max)), 900, 0);
  return (
    <View style={styles.meterTrack}>
      <View style={[styles.meterFill, { width: `${width * 100}%`, backgroundColor: color }]} />
      {limit !== undefined ? <View style={[styles.meterLimit, { left: `${(limit / max) * 100}%` }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  screenContent: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  hero: {
    backgroundColor: colors.hero,
    borderRadius: radius.xl,
    padding: spacing.xl,
    overflow: 'hidden',
  },
  label: { ...type.label, color: colors.textMuted },
  sectionTitle: { gap: spacing.xs, marginTop: spacing.sm },
  sectionTitleText: { ...type.heading, color: colors.text },
  sectionSubtitle: { ...type.small, color: colors.textMuted },
  button: {
    ...touch,
    minHeight: 54,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: { backgroundColor: colors.accent },
  buttonSecondary: { backgroundColor: colors.accentSoft },
  buttonGhost: { backgroundColor: 'transparent', minHeight: 48 },
  buttonInverse: { backgroundColor: colors.surface },
  buttonDisabled: { backgroundColor: colors.surfaceMuted },
  buttonText: { ...type.bodyStrong, textAlign: 'center' },
  tag: { alignSelf: 'flex-start', borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  tagText: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(43,51,72,0.45)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '90%',
  },
  sheetHandle: {
    alignSelf: 'center', width: 40, height: 5, borderRadius: 3,
    backgroundColor: colors.border, marginTop: spacing.sm,
  },
  sheetContent: { padding: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg },
  meterTrack: {
    height: 10, borderRadius: 5, backgroundColor: colors.surfaceMuted, overflow: 'visible', justifyContent: 'center',
  },
  meterFill: { height: 10, borderRadius: 5 },
  meterLimit: { position: 'absolute', width: 2, height: 18, marginLeft: -1, backgroundColor: colors.ink },
});
