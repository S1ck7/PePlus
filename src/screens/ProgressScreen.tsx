import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BankLogo } from '../components/BankLogo';
import { LineChart, type ChartPoint } from '../components/LineChart';
import { Card, Collapsible, FreedomRing, HeroCard, Label, Screen } from '../components/ui';
import { useLanguage } from '../i18n';
import { debtName, duration, monthYear } from '../i18n/format';
import { colors, formatLei, spacing, type } from '../theme';
import { paidInMonth, usePlan } from './PlanContext';

const PAST_MONTHS = 3;
/** Span of the payments chart when minimums never finish (40 years). */
const PAYMENT_SPAN_FALLBACK = 480;

export default function ProgressScreen() {
  const { t } = useLanguage();
  const { persona, plan, minimum, noExtra, budget, payoffMonth, startDate, totalDebt, totalBorrowed, extra } = usePlan();

  // Past balances: today's balance plus the principal repaid each month at today's payments.
  const monthlyPrincipal = persona.debts.reduce((sum, d) => {
    if (d.balance <= 0) return sum;
    return sum + Math.max(0, d.monthlyPayment - d.balance * d.interestRate / 1200 - d.monthlyFees);
  }, 0);

  const milestones = useMemo(() => persona.debts
    .filter(d => payoffMonth.has(d.id))
    .map(d => ({ debt: d, month: payoffMonth.get(d.id)! }))
    .sort((a, b) => a.month - b.month), [persona, payoffMonth]);

  const months = plan.monthsToPayoff;
  const sooner = months !== null && minimum.monthsToPayoff !== null ? minimum.monthsToPayoff - months : null;
  const paidShare = totalBorrowed > 0 ? 1 - totalDebt / totalBorrowed : 0;

  // Chart points: 3 past months, today, then one per year until the plan is done.
  const years = months !== null ? Math.max(1, Math.ceil(months / 12)) : 10;
  const points: ChartPoint[] = [
    ...Array.from({ length: PAST_MONTHS }, (_, i) => ({
      key: `p${i}`, label: '', plan: totalDebt + monthlyPrincipal * (PAST_MONTHS - i), min: null, past: true,
    })),
    { key: 'now', label: t('free.today'), plan: totalDebt, min: totalDebt, past: false },
    ...Array.from({ length: years }, (_, i) => {
      const m = (i + 1) * 12;
      return {
        key: `y${i}`,
        label: `${Number(plan.months[0]?.date.slice(0, 4) ?? 2026) + i + 1}`.slice(2).padStart(3, "'"),
        plan: plan.months[m - 1]?.totalBalance ?? 0,
        min: minimum.months[m - 1]?.totalBalance ?? (minimum.monthsToPayoff !== null && m > minimum.monthsToPayoff ? 0 : totalDebt),
        past: false,
      };
    }),
  ];

  // What is paid each month, plan vs minimums only, every few years until both are done (at most 9 points).
  const spanMonths = Math.max(months ?? 0, minimum.monthsToPayoff ?? PAYMENT_SPAN_FALLBACK);
  const stepYears = Math.max(1, Math.ceil(spanMonths / 12 / 8));
  const paymentPoints: ChartPoint[] = [
    { key: 'now', label: t('free.today'), plan: paidInMonth(plan.months[0]), min: paidInMonth(minimum.months[0]), past: false },
    ...Array.from({ length: Math.ceil(spanMonths / 12 / stepYears) }, (_, i) => {
      const m = (i + 1) * stepYears * 12;
      return {
        key: `q${i}`,
        label: `${Number(plan.months[0]?.date.slice(0, 4) ?? 2026) + (i + 1) * stepYears}`.slice(2).padStart(3, "'"),
        plan: paidInMonth(plan.months[m - 1]),
        min: paidInMonth(minimum.months[m - 1]),
        past: false,
      };
    }),
  ];
  const extraGain = extra > 0 && noExtra.monthsToPayoff !== null && months !== null ? noExtra.monthsToPayoff - months : 0;

  return (
    <Screen>
      <HeroCard style={styles.hero}>
        {/* Static by design: the dial shows how much of what was borrowed is repaid; no animation. */}
        <FreedomRing progress={paidShare} size={220} ticks={72} instant>
          {months !== null ? (
            <>
              <Text style={styles.countNumber}>{months}</Text>
              <Text style={styles.countUnit}>{t('free.monthsUnit')}</Text>
              <Text style={styles.countCaption}>{t('free.countdown')}</Text>
            </>
          ) : (
            <Text style={styles.countUnit}>—</Text>
          )}
        </FreedomRing>
        {months !== null && plan.debtFreeDate ? (
          <>
            <Text style={styles.headline}>{t('free.headline', { date: monthYear(plan.debtFreeDate, t) })}</Text>
            {sooner !== null && sooner > 0 ? (
              <Text style={styles.sooner}>
                {t('free.vsMin', { time: duration(sooner, t), date: monthYear(minimum.debtFreeDate, t) })}
              </Text>
            ) : null}
            {sooner !== null && sooner > 0 ? (
              <Text style={styles.heroMuted}>
                {extraGain > 0 ? t('free.whyExtra', { amount: formatLei(extra), time: duration(extraGain, t) }) : t('free.why')}
              </Text>
            ) : null}
            <Text style={styles.heroMuted}>
              {t('free.keepPaying', { amount: formatLei(budget.monthlyDebtPayments + extra), date: monthYear(plan.debtFreeDate, t) })}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.headline}>{t('free.never')}</Text>
            <Text style={styles.heroMuted}>{t('free.neverBody')}</Text>
          </>
        )}
      </HeroCard>

      {/* Milestone timeline: today -> each debt paid off -> debt-free. */}
      <Card style={{ gap: spacing.md }}>
        <Label>{t('free.milestonesTitle')}</Label>
        <View>
          <TimelineStep
            first
            marker="start"
            title={t('free.today')}
            sub={t('free.owedNow', { amount: formatLei(totalDebt) })}
            date={monthYear(startDate, t)}
          />
          {milestones.map(({ debt, month }) => (
            <TimelineStep
              key={debt.id}
              marker="debt"
              bank={debt.lender}
              title={t('free.milestone', { debt: debtName(debt, t) })}
              sub={t('free.freed', { amount: formatLei(debt.monthlyPayment) })}
              date={monthYear(plan.months[month - 1]?.date ?? null, t)}
            />
          ))}
          {plan.debtFreeDate ? (
            <TimelineStep last marker="goal" title={t('free.done')} sub={t('free.final')} date={monthYear(plan.debtFreeDate, t)} />
          ) : null}
        </View>
      </Card>

      <Collapsible
        title={t('free.chartTitle')}
        value={sooner !== null && sooner > 0 ? t('free.soonerShort', { time: duration(sooner, t) }) : undefined}
        valueColor={colors.good}
      >
        <View style={styles.legend}>
          <Legend color={colors.mist} label={t('free.legendPast')} />
          <Legend color={colors.goodFill} label={t('free.legendPlan')} />
          <Legend color={colors.expensiveFill} label={t('free.legendMin')} />
        </View>
        <LineChart points={points} accessibilityLabel={t('free.chartTitle')} />
      </Collapsible>

      <Collapsible title={t('free.paymentsTitle')} value={formatLei(paymentPoints[0].plan)}>
        <View style={styles.legend}>
          <Legend color={colors.goodFill} label={t('free.legendPlan')} />
          <Legend color={colors.expensiveFill} label={t('free.legendMin')} />
        </View>
        <LineChart points={paymentPoints} accessibilityLabel={t('free.paymentsTitle')} />
        <Text style={styles.paymentsNote}>{t('free.paymentsNote')}</Text>
      </Collapsible>
    </Screen>
  );
}

function TimelineStep({
  title, sub, date, marker, bank, first, last,
}: {
  title: string; sub: string; date: string; marker: 'start' | 'debt' | 'goal'; bank?: string; first?: boolean; last?: boolean;
}) {
  return (
    <View style={styles.step}>
      <View style={styles.rail}>
        <View style={[styles.railLine, first && { top: 20 }, last && { bottom: undefined, height: 20 }]} />
        {marker === 'debt' && bank ? (
          <View style={styles.markerWrap}><BankLogo bank={bank} size={32} /></View>
        ) : (
          <View style={[styles.marker, marker === 'goal' ? styles.markerGoal : styles.markerStart]}>
            {marker === 'goal' ? <View style={styles.markerGoalInner} /> : null}
          </View>
        )}
      </View>
      <View style={styles.stepBody}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.stepTitle, marker === 'goal' && { color: colors.accentText }]}>{title}</Text>
          <Text style={styles.stepSub}>{sub}</Text>
        </View>
        <Text style={styles.stepDate}>{date}</Text>
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendLine, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  countNumber: { fontSize: 64, lineHeight: 70, fontWeight: '800', letterSpacing: -2, color: colors.textInverse },
  countUnit: { ...type.bodyStrong, color: colors.textInverse },
  countCaption: { fontSize: 12, color: colors.textInverseMuted, textAlign: 'center' },
  headline: { ...type.title, fontSize: 26, color: colors.textInverse, textAlign: 'center' },
  sooner: { ...type.bodyStrong, color: colors.textInverse, textAlign: 'center' },
  heroMuted: { ...type.small, color: colors.textInverseMuted, textAlign: 'center' },
  step: { flexDirection: 'row', gap: spacing.md, minHeight: 64 },
  rail: { width: 36, alignItems: 'center' },
  railLine: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: colors.border },
  markerWrap: { marginTop: 4, backgroundColor: colors.surface },
  marker: { marginTop: 12, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  markerStart: { backgroundColor: colors.surface, borderWidth: 3, borderColor: colors.goodFill },
  markerGoal: { width: 24, height: 24, borderRadius: 12, marginTop: 9, backgroundColor: colors.accentText },
  markerGoalInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.surface },
  stepBody: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingTop: 8, paddingBottom: spacing.md },
  stepTitle: { ...type.bodyStrong, fontSize: 15, color: colors.text },
  stepSub: { ...type.small, fontSize: 13, color: colors.textMuted },
  stepDate: { ...type.smallStrong, color: colors.text },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  paymentsNote: { ...type.small, color: colors.textMuted },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendLine: { width: 16, height: 3, borderRadius: 2 },
  legendText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
});
