import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PaymentCalendar } from '../components/PaymentCalendar';
import { AnimatedLei, Button, Card, Collapsible, HeroCard, Label, Screen, Slider, Tag, useTween } from '../components/ui';
import { spendingBreakdown } from '../engine';
import { useLanguage } from '../i18n';
import type { TranslationKey } from '../i18n/en';
import { debtName, duration, monthYear } from '../i18n/format';
import { colors, costColors, costLevel, formatLei, radius, spacing, touch, type } from '../theme';
import type { Debt } from '../types';
import { usePlan } from './PlanContext';

type T = ReturnType<typeof useLanguage>['t'];

function reasonFor(debt: Debt, rate: number, isFirst: boolean, t: T): string {
  const r = rate.toFixed(1);
  if (isFirst) return t('plan.reasonFirst', { rate: r });
  if (debt.interestRate === 0 && debt.monthlyFees === 0) return t('plan.reasonZero');
  if (debt.type === 'mortgage') return t('plan.reasonMortgage', { rate: r });
  return t('plan.reasonNext', { rate: r });
}

export default function PlanScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const {
    persona, budget, order, plan, payoffMonth, monthsVsPlan, savedVsPlan, extra, setExtra, suggestedExtra, maxExtra, startDate,
  } = usePlan();

  const shortfall = budget.monthlySurplus < 0;
  const top = order[0];
  const otherMinimums = top ? Math.max(0, budget.monthlyDebtPayments - top.debt.monthlyPayment) : 0;
  const animatedMonths = useTween(plan.monthsToPayoff ?? 0);
  // Time and interest against our recommended plan (all the left-over money), not against minimums only.
  const animatedVsPlan = useTween(Math.abs(monthsVsPlan ?? 0));
  const timeTone = !monthsVsPlan ? undefined : monthsVsPlan > 0 ? 'good' : 'bad';
  const savedTone = !savedVsPlan ? undefined : savedVsPlan > 0 ? 'good' : 'bad';

  return (
    <Screen>
      <HeroCard style={{ gap: spacing.md }}>
        <Label style={{ color: colors.textInverseMuted }}>{t('nav.plan')}</Label>
        {top && extra > 0 ? (
          <>
            {/* Total for the top debt = its own minimum + all the extra. */}
            <Text style={styles.headline}>
              {t('plan.headline', { amount: formatLei(top.debt.monthlyPayment + extra), debt: debtName(top.debt, t) })}
            </Text>
            <Text style={styles.heroBody}>{t('plan.why', { rate: top.annualCostRate.toFixed(1) })}</Text>
          </>
        ) : (
          <>
            <Text style={styles.headline}>{t('plan.headlineMinimum', { amount: formatLei(budget.monthlyDebtPayments) })}</Text>
            {shortfall ? (
              <Text style={[styles.heroBody, styles.heroDanger]}>{t('plan.whyMinimum')}</Text>
            ) : (
              <Text style={styles.heroBody}>{top ? t('plan.whyMinimumChoice', { debt: debtName(top.debt, t) }) : null}</Text>
            )}
          </>
        )}
        {top && extra > 0 && otherMinimums > 0 ? (
          <Text style={styles.heroNote}>{t('plan.minimumsOther', { amount: formatLei(otherMinimums) })}</Text>
        ) : null}
        {plan.debtFreeDate && !shortfall ? (
          <Text style={styles.heroNote}>
            {t('free.keepPaying', { amount: formatLei(budget.monthlyDebtPayments + extra), date: monthYear(plan.debtFreeDate, t) })}
          </Text>
        ) : null}
      </HeroCard>

      <Card style={{ gap: spacing.md }}>
        <Text accessibilityRole="header" style={styles.cardTitle}>{t('plan.whatIfTitle')}</Text>
        <View style={{ alignItems: 'center' }}>
          <AnimatedLei value={extra} prefix="+" style={styles.extra} />
          <Text style={styles.muted}>{t('plan.extraLabel')}</Text>
        </View>
        <View>
          <Slider
            value={extra}
            max={maxExtra}
            step={50}
            onChange={setExtra}
            accessibilityLabel={t('plan.extraLabel')}
            accessibilityValueText={formatLei(extra)}
          />
          <View style={styles.sliderEnds}>
            <Text style={styles.muted}>{formatLei(0)}</Text>
            <Text style={styles.muted}>{formatLei(maxExtra)}</Text>
          </View>
        </View>
        <Text style={[styles.muted, { textAlign: 'center' }]}>
          {t('plan.maxNote', { amount: formatLei(maxExtra) })}
        </Text>

        <View style={styles.results}>
          <Result
            label={t('plan.freeBy')}
            value={plan.debtFreeDate ? monthYear(plan.debtFreeDate, t) : t('plan.notInRange')}
            sub={plan.monthsToPayoff !== null ? duration(Math.round(animatedMonths), t) : undefined}
          />
          <Result
            label={t('plan.earlier')}
            value={monthsVsPlan ? duration(Math.max(1, Math.round(animatedVsPlan)), t) : '—'}
            sub={monthsVsPlan === null ? undefined : monthsVsPlan === 0 ? t('plan.onPlan') : t(monthsVsPlan > 0 ? 'plan.sooner' : 'plan.later')}
            tone={timeTone}
          />
          <Result
            label={t('plan.saved')}
            value={savedVsPlan
              ? <AnimatedLei value={Math.abs(savedVsPlan)} style={[styles.resultValue, { color: savedTone === 'good' ? colors.good : colors.danger }]} />
              : '—'}
            sub={savedVsPlan === null ? undefined : savedVsPlan === 0 ? t('plan.onPlan') : t(savedVsPlan > 0 ? 'plan.lessInterest' : 'plan.moreInterest')}
            tone={savedTone}
          />
        </View>
        <Text style={[styles.muted, { textAlign: 'center' }]}>{t('plan.vsPlanNote', { amount: formatLei(suggestedExtra) })}</Text>

        {extra !== suggestedExtra ? (
          <Pressable accessibilityRole="button" onPress={() => setExtra(suggestedExtra)} style={styles.reset}>
            <Text style={styles.resetText}>{t('plan.reset', { amount: formatLei(suggestedExtra) })}</Text>
          </Pressable>
        ) : (
          <Text style={[styles.muted, { textAlign: 'center' }]}>{t('plan.suggested', { amount: formatLei(suggestedExtra) })}</Text>
        )}
      </Card>

      <PaymentCalendar
        monthStart={startDate}
        debts={persona.debts}
        transactions={persona.transactions}
        extraDebtId={top?.debt.id}
        extra={extra}
      />

      <Button label={t('plan.ctaRefinance')} onPress={() => router.push('/refinance')} />

      {shortfall ? <Shortfall deficit={-budget.monthlySurplus} persona={persona} t={t} /> : null}
      <Collapsible
        title={t('plan.orderTitle')}
        value={t('home.debtsCount', { count: order.length })}
        preview={top ? t('plan.orderPreview', { debt: debtName(top.debt, t) }) : undefined}
      >
        <Text style={styles.muted}>{t('plan.orderSubtitle')}</Text>
        <View>
        {order.map(({ debt, annualCostRate }, index) => {
          const level = costLevel(annualCostRate);
          const isFirst = index === 0;
          const month = payoffMonth.get(debt.id);
          const paidDate = month ? plan.months[month - 1]?.date ?? null : null;
          const last = index === order.length - 1;
          return (
            <View key={debt.id} style={styles.step}>
              <View style={styles.rail}>
                <View style={[styles.node, { borderColor: costColors[level].fg }, isFirst && { backgroundColor: costColors[level].fg }]}>
                  <Text style={[styles.nodeText, { color: isFirst ? colors.white : costColors[level].fg }]}>{index + 1}</Text>
                </View>
                {!last ? <View style={styles.railLine} /> : null}
              </View>
              <Card style={[styles.stepCard, isFirst && styles.stepCardFirst]}>
                <View style={styles.stepTop}>
                  <Text style={[styles.stepName, { flex: 1 }]}>{debtName(debt, t)}</Text>
                  {isFirst && extra > 0 ? <Tag tone="accent" label={t('plan.now')} /> : null}
                </View>
                <Text style={styles.stepReason}>{reasonFor(debt, annualCostRate, isFirst, t)}</Text>
                <View style={styles.stepBottom}>
                  <Text style={styles.muted}>{formatLei(debt.balance)}</Text>
                  {paidDate ? <Text style={styles.paidBy}>{t('plan.paidOffBy', { date: monthYear(paidDate, t) })}</Text> : null}
                </View>
              </Card>
            </View>
          );
        })}
        </View>
      </Collapsible>

    </Screen>
  );
}

function Result({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: string; tone?: 'good' | 'bad' }) {
  const toneColor = tone === 'good' ? colors.good : tone === 'bad' ? colors.danger : undefined;
  return (
    <View style={styles.result}>
      <Text style={styles.resultLabel}>{label}</Text>
      {typeof value === 'string'
        ? <Text style={[styles.resultValue, toneColor ? { color: toneColor } : null]}>{value}</Text>
        : value}
      {sub ? <Text style={[styles.resultSub, toneColor ? { color: toneColor } : null]}>{sub}</Text> : null}
    </View>
  );
}

function Shortfall({ deficit, persona, t }: { deficit: number; persona: ReturnType<typeof usePlan>['persona']; t: T }) {
  const cuts = spendingBreakdown(persona)
    .filter(c => c.category !== 'rent' && c.category !== 'utilities' && c.category !== 'health')
    .slice(0, 3)
    .map(c => ({ ...c, cut: Math.round(c.monthlyAmount * 0.2) }));
  const totalCut = cuts.reduce((sum, c) => sum + c.cut, 0);
  const after = totalCut - deficit;

  return (
    <Collapsible
      title={t('plan.shortTitle')}
      titleColor={colors.danger}
      value={t('plan.shortValue', { amount: formatLei(deficit) })}
      valueColor={colors.danger}
      initiallyOpen
    >
      <Text style={styles.body}>{t('plan.shortBody', { amount: formatLei(deficit) })}</Text>
      <Label>{t('plan.cutsTitle')}</Label>
      {cuts.map(c => (
        <View key={c.category} style={styles.cutRow}>
          <Text style={[styles.body, { flex: 1 }]}>
            {t('plan.cutLine', { category: t(`category.${c.category}` as TranslationKey) })}
          </Text>
          <Text style={styles.cutAmount}>{t('plan.cutAmount', { amount: formatLei(c.cut) })}</Text>
        </View>
      ))}
      <View style={styles.cutTotal}>
        <Text style={styles.cutTotalText}>{t('plan.cutsTotal', { amount: formatLei(totalCut) })}</Text>
        <Text style={styles.body}>
          {after >= 0
            ? t('plan.cutsCloses', { amount: formatLei(after) })
            : t('plan.cutsPartly', { amount: formatLei(-after) })}
        </Text>
      </View>
    </Collapsible>
  );
}

const styles = StyleSheet.create({
  headline: { ...type.title, color: colors.textInverse },
  heroBody: { ...type.body, color: colors.textInverseMuted },
  heroDanger: { color: colors.danger, fontWeight: '700' },
  heroNote: { ...type.small, color: colors.textInverseMuted, borderTopWidth: 1, borderTopColor: colors.heroRaised, paddingTop: spacing.md },
  cardTitle: { ...type.heading, color: colors.text },
  body: { ...type.body, color: colors.textSecondary },
  muted: { ...type.small, color: colors.textMuted },
  sliderEnds: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  extra: { ...type.display, fontSize: 38, lineHeight: 44, color: colors.text },
  results: { flexDirection: 'row', gap: spacing.sm },
  result: { flex: 1, backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: spacing.md, gap: 2 },
  resultLabel: { fontSize: 12, lineHeight: 16, color: colors.textMuted, fontWeight: '600' },
  resultValue: { ...type.bodyStrong, color: colors.text },
  resultSub: { fontSize: 12, color: colors.textMuted },
  reset: { ...touch, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  resetText: { ...type.smallStrong, color: colors.accentText },
  step: { flexDirection: 'row', gap: spacing.md },
  rail: { width: 32, alignItems: 'center' },
  node: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, marginTop: spacing.md,
  },
  nodeText: { fontSize: 14, fontWeight: '800' },
  railLine: { flex: 1, width: 2, backgroundColor: colors.border },
  stepCard: { flex: 1, gap: spacing.xs, marginBottom: spacing.md, backgroundColor: colors.surfaceMuted, shadowOpacity: 0, elevation: 0 },
  stepCardFirst: { borderWidth: 1.5, borderColor: colors.accentText },
  stepTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepName: { ...type.bodyStrong, color: colors.text },
  stepReason: { ...type.small, color: colors.textSecondary },
  stepBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  paidBy: { ...type.smallStrong, color: colors.good },
  shortCard: { borderWidth: 1.5, borderColor: colors.expensiveSoft },
  cutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cutAmount: { ...type.bodyStrong, color: colors.good },
  cutTotal: { backgroundColor: colors.goodSoft, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  cutTotalText: { ...type.bodyStrong, color: colors.good },
});
