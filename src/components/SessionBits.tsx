import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '../i18n';
import { useSession } from '../screens/SessionContext';
import { colors, radius, spacing, touch, type } from '../theme';

/** Discreet note shown only when Firebase is unreachable or not configured. */
export function OfflineNote() {
  const { t } = useLanguage();
  const { loaded, status } = useSession();
  if (!loaded || status === 'online') return null;
  return (
    <View style={styles.offline} accessibilityRole="text">
      <View style={styles.offlineDot} />
      <Text style={styles.offlineText}>{t('offline.note')}</Text>
    </View>
  );
}

/** The D-014 question: asked once, saved to the profile, used for eligibility. */
export function LatePaymentQuestion({ onAnswered }: { onAnswered?: (value: boolean) => void }) {
  const { t } = useLanguage();
  const { setLatePayments } = useSession();
  const answer = (value: boolean) => {
    setLatePayments(value);
    onAnswered?.(value);
  };
  return (
    <View style={{ gap: spacing.md }}>
      <Text style={styles.question}>{t('late.question')}</Text>
      <Text style={styles.why}>{t('late.why')}</Text>
      <View style={styles.answers}>
        {[false, true].map(value => (
          <Pressable
            key={String(value)}
            accessibilityRole="button"
            onPress={() => answer(value)}
            style={({ pressed }) => [styles.answer, pressed && { backgroundColor: colors.accent }]}
          >
            {({ pressed }) => (
              <Text style={[styles.answerText, pressed && { color: colors.textInverse }]}>
                {value ? t('late.yes') : t('late.no')}
              </Text>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** The same answer as a checkbox (ticked = had late payments). `inverse` sits on a plum hero card. */
export function LatePaymentCheckbox({ inverse }: { inverse?: boolean }) {
  const { t } = useLanguage();
  const { profile, setLatePayments } = useSession();
  const checked = profile.hadLatePayments === true;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={t('late.checkbox')}
      onPress={() => setLatePayments(!checked)}
      style={({ pressed }) => [styles.checkRow, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.box, inverse && styles.boxInverse, checked && (inverse ? styles.boxInverseOn : styles.boxOn)]}>
        {checked ? <View style={[styles.tick, { borderColor: inverse ? colors.accent : colors.textInverse }]} /> : null}
      </View>
      <Text style={[styles.checkText, inverse && { color: colors.textInverse }]}>{t('late.checkbox')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  offline: {
    alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surfaceMuted, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 5,
  },
  offlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.medium },
  offlineText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  question: { ...type.heading, fontSize: 18, lineHeight: 24, color: colors.text },
  why: { ...type.small, color: colors.textMuted },
  answers: { flexDirection: 'row', gap: spacing.md },
  answer: {
    ...touch, flex: 1, minHeight: 54, borderRadius: radius.md, backgroundColor: colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  answerText: { ...type.bodyStrong, color: colors.accentText },
  checkRow: { ...touch, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  box: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.textSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  boxInverse: { borderColor: colors.textInverse },
  boxInverseOn: { backgroundColor: colors.textInverse },
  // Drawn tick: two borders of a small box turned 45°.
  tick: { width: 7, height: 12, marginTop: -3, borderRightWidth: 2.5, borderBottomWidth: 2.5, transform: [{ rotate: '45deg' }] },
  checkText: { ...type.small, flex: 1, color: colors.text },
});
