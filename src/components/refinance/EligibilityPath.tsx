import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { eligibilityOutlook, rankRefinanceOffers, summarizeBudget } from '../../engine';
import { MAX_DEBT_TO_INCOME_RATIO } from '../../engine/constants';
import { useLanguage } from '../../i18n';
import { debtName, joinList, monthYear } from '../../i18n/format';
import { colors, formatLei, formatPercent, radius, spacing, type } from '../../theme';
import type { BankOffer, Persona } from '../../types';
import { Button, Meter } from '../ui';

interface EligibilityPathProps {
  persona: Persona;
  offers: readonly BankOffer[];
  extra: number;
  onViewPlan: () => void;
}

/** "Not eligible yet, here's your path": why, what to pay off, and by when. */
export function EligibilityPath({ persona, offers, extra, onViewPlan }: EligibilityPathProps) {
  const { t } = useLanguage();
  const budget = summarizeBudget(persona, 0);
  const overCap = budget.debtToIncomeRatio > MAX_DEBT_TO_INCOME_RATIO;

  const outlook = useMemo(() => eligibilityOutlook(persona, extra), [persona, extra]);

  const laterSavings = useMemo(() => {
    if (!outlook) return 0;
    const remaining = persona.debts.filter(d => !outlook.paidOffDebtIds.includes(d.id));
    return remaining.reduce((sum, d) => {
      const saving = rankRefinanceOffers(persona, d, offers)[0]?.netSavings ?? 0;
      return sum + Math.max(0, saving);
    }, 0);
  }, [outlook, persona, offers]);

  const paidOffNames = outlook
    ? outlook.paidOffDebtIds
      .map(id => persona.debts.find(d => d.id === id))
      .filter((d): d is NonNullable<typeof d> => !!d)
      .map(d => debtName(d, t))
    : [];

  const steps: string[] = [];
  if (overCap && outlook) {
    if (paidOffNames.length) steps.push(t('path.step1', { debts: joinList(paidOffNames, t) }));
    steps.push(t('path.step2', { date: monthYear(outlook.date, t), dti: formatPercent(outlook.debtToIncomeRatio) }));
    if (laterSavings > 0) steps.push(t('path.step3', { amount: formatLei(laterSavings) }));
  }

  return (
    <View style={styles.card}>

      {overCap ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.body}>{t('path.whyDti', { dti: formatPercent(budget.debtToIncomeRatio) })}</Text>
          <Meter
            value={budget.debtToIncomeRatio}
            max={Math.max(0.8, budget.debtToIncomeRatio)}
            limit={MAX_DEBT_TO_INCOME_RATIO}
            color={colors.expensiveFill}
          />
        </View>
      ) : null}
      {persona.hadLatePayments ? <Text style={styles.body}>{t('path.whyLate')}</Text> : null}

      {steps.length ? (
        <View style={styles.steps}>
          {steps.map((text, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.num}><Text style={styles.numText}>{i + 1}</Text></View>
              <Text style={[styles.body, { flex: 1 }]}>{text}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Button label={t('path.cta')} variant="secondary" onPress={onViewPlan} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  title: { ...type.heading, color: colors.text },
  body: { ...type.body, fontSize: 15, lineHeight: 22, color: colors.textSecondary },
  steps: { gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md },
  step: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  num: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: colors.good,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  numText: { color: colors.white, fontWeight: '800', fontSize: 13 },
});
