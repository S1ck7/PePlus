import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { BankLogo } from '../components/BankLogo';
import { OfflineNote } from '../components/SessionBits';
import { AnimatedLei, Button, Collapsible, HeroCard, Label, Meter, ProgressArc, Screen, Tag } from '../components/ui';
import { MAX_DEBT_TO_INCOME_RATIO } from '../engine/constants';
import { useLanguage } from '../i18n';
import { debtName, monthYear } from '../i18n/format';
import { colors, costColors, costLevel, formatLei, formatPercent, radius, spacing, type } from '../theme';
import { usePlan } from './PlanContext';

export default function OverviewScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const { persona, budget, order, plan, totalDebt, totalBorrowed, annualCost } = usePlan();

  const shortfall = budget.monthlySurplus < 0;
  const paidShare = totalBorrowed > 0 ? 1 - totalDebt / totalBorrowed : 0;
  const overCap = budget.debtToIncomeRatio > MAX_DEBT_TO_INCOME_RATIO;
  const firstName = persona.name.split(' ')[0];

  const verdict = shortfall
    ? t('home.verdictShortfall', { amount: formatLei(-budget.monthlySurplus) })
    : plan.debtFreeDate
      ? t('home.verdictPlan', { date: monthYear(plan.debtFreeDate, t) })
      : '';

  return (
    <Screen>
      <OfflineNote />
      <HeroCard style={{ gap: spacing.lg }}>
        <Text style={styles.greeting}>{t('home.greeting', { name: firstName })}</Text>
        <View style={styles.heroRow}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Label style={{ color: colors.textInverseMuted }}>{t('home.totalLabel')}</Label>
            <AnimatedLei value={totalDebt} style={styles.total} />
            <Text style={[styles.verdict, shortfall && { color: colors.danger }]}>{verdict}</Text>
          </View>
          {/* Arc = share of what was borrowed that is already paid off. */}
          <ProgressArc progress={paidShare} size={132} stroke={10}>
            <Text style={styles.ringPercent}>{formatPercent(paidShare)}</Text>
            <Text style={styles.ringCaption}>{t('home.ringPaid')}</Text>
          </ProgressArc>
        </View>
        <Button variant="inverse" label={t('home.cta')} onPress={() => router.push('/plan')} />
      </HeroCard>

      <Collapsible
        title={t('home.costTitle')}
        value={t('home.costValue', { amount: formatLei(annualCost / 12) })}
        valueColor={colors.expensive}
      >
        <Text style={styles.statNote}>{t('home.costNote')}</Text>
      </Collapsible>

      <Collapsible
        title={t('home.dtiTitle')}
        value={formatPercent(budget.debtToIncomeRatio)}
        valueColor={overCap ? colors.danger : colors.good}
      >
        <Meter
          value={budget.debtToIncomeRatio}
          max={Math.max(0.8, budget.debtToIncomeRatio)}
          limit={MAX_DEBT_TO_INCOME_RATIO}
          color={overCap ? colors.dangerFill : colors.goodFill}
        />
        <Text style={[styles.statNote, overCap && { color: colors.danger }]}>{overCap ? t('home.dtiOver') : t('home.dtiUnder')}</Text>
      </Collapsible>

      <Collapsible
        title={t('home.monthTitle')}
        value={`${shortfall ? t('home.short') : t('home.left')} ${formatLei(Math.abs(budget.monthlySurplus))}`}
        valueColor={shortfall ? colors.danger : colors.good}
      >
        <MonthBar
          income={budget.monthlyIncome}
          living={budget.monthlyLivingExpenses}
          debt={budget.monthlyDebtPayments}
        />
        <View style={styles.legend}>
          <LegendItem color={colors.cheapFill} label={t('home.living')} value={formatLei(budget.monthlyLivingExpenses)} />
          <LegendItem color={colors.expensiveFill} label={t('home.debtPayments')} value={formatLei(budget.monthlyDebtPayments)} />
          <LegendItem
            color={shortfall ? colors.dangerFill : colors.goodFill}
            textColor={shortfall ? colors.danger : colors.good}
            label={shortfall ? t('home.short') : t('home.left')}
            value={formatLei(Math.abs(budget.monthlySurplus))}
          />
        </View>
        <Text style={styles.statNote}>{t('home.income')}: {formatLei(budget.monthlyIncome)}</Text>
      </Collapsible>

      <Collapsible
        title={t('home.debtsTitle')}
        value={t('home.debtsCount', { count: order.length })}
      >
        {order.map(({ debt, annualCost: cost, annualCostRate }, index) => {
          const level = costLevel(annualCostRate);
          return (
            <View key={debt.id} style={[styles.debtRow, index > 0 && styles.debtDivider]}>
              <View style={[styles.heat, { backgroundColor: costColors[level].fill }]} />
              <BankLogo bank={debt.lender} size={36} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.debtName}>{debtName(debt, t)}</Text>
                <Text style={styles.debtMeta}>
                  {t('home.debtMeta', { balance: formatLei(debt.balance), payment: formatLei(debt.monthlyPayment) })}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={[styles.debtCost, { color: costColors[level].fg }]}>
                  {t('home.debtCost', { amount: formatLei(cost) })}
                </Text>
                <Tag tone={level} label={t('home.debtRate', { rate: annualCostRate.toFixed(1) })} />
              </View>
            </View>
          );
        })}
      </Collapsible>
    </Screen>
  );
}

function MonthBar({ income, living, debt }: { income: number; living: number; debt: number }) {
  const total = Math.max(income, living + debt, 1);
  const left = Math.max(0, income - living - debt);
  const short = Math.max(0, living + debt - income);
  return (
    <View style={styles.bar}>
      <View style={{ flex: living / total, backgroundColor: colors.cheapFill }} />
      <View style={{ flex: debt / total, backgroundColor: colors.expensiveFill }} />
      {left > 0 ? <View style={{ flex: left / total, backgroundColor: colors.goodFill }} /> : null}
      {/* The part of the spending that income does not cover, in red over the end of the bar. */}
      {short > 0 ? <View style={[styles.barShort, { width: `${(short / total) * 100}%` }]} /> : null}
    </View>
  );
}

function LegendItem({ color, label, value, textColor }: { color: string; label: string; value: string; textColor?: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <View>
        <Text style={styles.legendLabel}>{label}</Text>
        <Text style={[styles.legendValue, textColor ? { color: textColor } : null]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  greeting: { ...type.title, fontSize: 26, lineHeight: 32, color: colors.textInverse },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  total: { ...type.display, fontSize: 36, lineHeight: 42, color: colors.textInverse },
  verdict: { ...type.bodyStrong, color: colors.textInverse },
  ringPercent: { fontSize: 30, lineHeight: 34, fontWeight: '800', color: colors.textInverse, textAlign: 'center' },
  ringCaption: { fontSize: 12, lineHeight: 15, color: colors.textInverseMuted, textAlign: 'center' },
  statRow: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, gap: spacing.sm },
  statValue: { ...type.heading, fontSize: 22 },
  statNote: { ...type.small, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  bar: { flexDirection: 'row', height: 16, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  barShort: { position: 'absolute', right: 0, top: 0, bottom: 0, backgroundColor: colors.dangerFill },
  legend: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  legendItem: { flexDirection: 'row', gap: 6, flex: 1 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  legendLabel: { fontSize: 12, color: colors.textMuted },
  legendValue: { ...type.smallStrong, color: colors.text },
  debtRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, minHeight: 64 },
  debtDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  heat: { width: 6, alignSelf: 'stretch', borderRadius: radius.sm },
  debtName: { ...type.bodyStrong, fontSize: 15, color: colors.text },
  debtMeta: { ...type.small, fontSize: 13, color: colors.textMuted },
  debtCost: { ...type.smallStrong },
});
