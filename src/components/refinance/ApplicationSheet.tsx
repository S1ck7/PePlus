import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RefinanceEstimate } from '../../engine';
import { useLanguage } from '../../i18n';
import { debtName, monthYear } from '../../i18n/format';
import { colors, formatLei, radius, spacing, touch, type } from '../../theme';
import type { Debt, Persona } from '../../types';
import type { RefinanceApplication } from '../../backend';
import { useSession } from '../../screens/SessionContext';
import { BankLogo } from '../BankLogo';
import { Button, Label, PopIn, Sheet } from '../ui';

interface ApplicationSheetProps {
  estimate: RefinanceEstimate | null;
  debt: Debt;
  persona: Persona;
  onClose: () => void;
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'good' }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, tone === 'good' && { color: colors.good }]}>{value}</Text>
    </View>
  );
}

/** Simulated refinancing application that ends with "Application sent". */
export function ApplicationSheet({ estimate, debt, persona, onClose }: ApplicationSheetProps) {
  const { t } = useLanguage();
  const [consent, setConsent] = useState(false);
  const { submit, findApplication } = useSession();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [reference, setReference] = useState('');
  // An identical request (same debt, same bank) found when the sheet opened: we show it instead of a form.
  const [earlier, setEarlier] = useState<RefinanceApplication | undefined>(undefined);

  useEffect(() => {
    if (estimate) {
      setConsent(false);
      setSent(false);
      setSending(false);
      setReference('');
      setEarlier(findApplication(debt.id, estimate.offer.bank));
    }
  }, [estimate]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!estimate) return null;
  const { offer, monthlyPayment, termMonths, earlyRepaymentFee, netSavings } = estimate;

  // Saved to Firebase (users/{uid}/applications) or kept locally when offline; either way we get a reference.
  const send = async () => {
    setSending(true);
    try {
      const result = await submit({ debtId: debt.id, offerId: offer.id, netSavings, monthlyPayment });
      if (result.duplicate) setEarlier(findApplication(debt.id, offer.bank));
      else {
        setReference(result.reference);
        setSent(true);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet visible onClose={onClose}>
      {earlier && !sent ? (
        <View style={styles.sent}>
          <BankLogo bank={offer.bank} size={64} />
          <Text accessibilityRole="header" style={styles.title}>{t('apply.duplicateTitle')}</Text>
          <Text style={[styles.body, { textAlign: 'center' }]}>
            {t('apply.duplicateBody', { bank: offer.bank, date: monthYear(earlier.createdAt.slice(0, 10), t) })}
          </Text>
          <Text style={styles.muted}>{t('apply.reference', { ref: earlier.reference })}</Text>
          <Button label={t('apply.done')} onPress={onClose} style={{ alignSelf: 'stretch' }} />
        </View>
      ) : sent ? (
        <View style={styles.sent}>
          <PopIn style={styles.check}><Text style={styles.checkText}>✓</Text></PopIn>
          <Text accessibilityRole="header" style={styles.title}>{t('apply.sentTitle')}</Text>
          <Text style={[styles.muted, { textAlign: 'center' }]}>{t('apply.sentBody', { bank: offer.bank })}</Text>
          {netSavings !== null && netSavings > 0 ? (
            <Text style={styles.savingBig}>{formatLei(netSavings)}</Text>
          ) : null}
          <Text style={styles.muted}>{t('apply.reference', { ref: reference })}</Text>
          <Button label={t('apply.done')} onPress={onClose} style={{ alignSelf: 'stretch' }} />
        </View>
      ) : (
        <>
          <View style={{ gap: spacing.xs }}>
            <View style={styles.titleRow}>
              <BankLogo bank={offer.bank} size={40} />
              <Text accessibilityRole="header" style={[styles.title, { flex: 1 }]}>{t('apply.title', { bank: offer.bank })}</Text>
            </View>
            <Text style={styles.muted}>{t('apply.subtitle')}</Text>
          </View>

          <View style={styles.group}>
            <Label>{t('apply.you')}</Label>
            <Row label={t('apply.name')} value={persona.name} />
            <Row label={t('apply.income')} value={formatLei(persona.monthlyNetIncome)} />
            <Row label={t('settings.city')} value={persona.city} />
            <Row label={t('settings.age')} value={String(persona.age)} />
          </View>
          <View style={styles.group}>
            <Label>{t('apply.moving')}</Label>
            <Row label={debtName(debt, t)} value={formatLei(debt.balance)} />
            <Row label={t('apply.earlyFee')} value={formatLei(earlyRepaymentFee)} />
          </View>
          <View style={styles.group}>
            <Label>{t('apply.to')}</Label>
            <Row label={t('apply.payment')} value={formatLei(monthlyPayment)} />
            <Row label={t('apply.term')} value={t('refi.term', { months: termMonths })} />
            {netSavings !== null && netSavings > 0 ? (
              <Row label={t('apply.saving')} value={formatLei(netSavings)} tone="good" />
            ) : null}
          </View>

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent }}
            onPress={() => setConsent(!consent)}
            style={styles.consent}
          >
            <View style={[styles.box, consent && styles.boxOn]}>
              {consent ? <Text style={styles.boxCheck}>✓</Text> : null}
            </View>
            <Text style={[styles.body, { flex: 1 }]}>{t('apply.consent', { bank: offer.bank })}</Text>
          </Pressable>

          <Button label={sending ? t('apply.sending') : t('apply.submit')} onPress={send} disabled={!consent || sending} />
          <Button label={t('apply.cancel')} variant="ghost" onPress={onClose} />
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  title: { ...type.heading, color: colors.text },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  muted: { ...type.small, color: colors.textMuted },
  body: { ...type.small, color: colors.textSecondary },
  group: { gap: spacing.sm, backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  rowLabel: { ...type.small, color: colors.textSecondary, flex: 1 },
  rowValue: { ...type.smallStrong, color: colors.text },
  consent: { ...touch, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  box: {
    width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: colors.textMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  boxCheck: { color: colors.textInverse, fontWeight: '800' },
  sent: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  check: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: colors.good,
    alignItems: 'center', justifyContent: 'center',
  },
  checkText: { color: colors.white, fontSize: 44, fontWeight: '800' },
  savingBig: { ...type.title, color: colors.good },
});
