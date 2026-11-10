import { StyleSheet, Text, View } from 'react-native';

import type { EligibilityReason, RefinanceEstimate } from '../../engine';
import { useLanguage } from '../../i18n';
import { colors, formatLei, formatPercent, radius, spacing, type } from '../../theme';
import type { Debt } from '../../types';
import { BankLogo } from '../BankLogo';
import { Button, Card, Tag } from '../ui';

const reasonKey: Record<EligibilityReason, 'refi.whyDti' | 'refi.whyLate' | 'refi.whyIncome'> = {
  over_debt_to_income_cap: 'refi.whyDti',
  late_payments: 'refi.whyLate',
  no_income: 'refi.whyIncome',
};

interface OfferCardProps {
  debt: Debt;
  estimate: RefinanceEstimate;
  featured: boolean;
  /** An identical application (same debt, same bank) was already sent. */
  alreadySent?: boolean;
  onApply: () => void;
}

export function OfferCard({ debt, estimate, featured, alreadySent, onApply }: OfferCardProps) {
  const { t } = useLanguage();
  const { offer, netSavings, monthlyPayment, termMonths, earlyRepaymentFee, originationFee, eligibility } = estimate;
  const saves = netSavings !== null && netSavings > 0;
  const dti = formatPercent(eligibility.debtToIncomeRatio);
  const rate = offer.rateType === 'fixed'
    ? t('refi.rateFixed', { rate: offer.interestRate })
    : t('refi.rateVariable', { rate: offer.interestRate, index: offer.referenceIndex });

  return (
    <Card style={[styles.card, featured && styles.featured]}>
      <View style={styles.top}>
        <BankLogo bank={offer.bank} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={styles.bank}>{offer.bank}</Text>
          <Text style={styles.muted}>{rate} · DAE {offer.dae}% · {t('refi.term', { months: termMonths })}</Text>
        </View>
      </View>

      <View style={styles.numbers}>
        <View style={{ flex: 1 }}>
          <Text style={styles.small}>{t('refi.saveTotal')}</Text>
          {netSavings === null ? (
            <Text style={styles.saving}>—</Text>
          ) : saves ? (
            <Text style={[styles.saving, featured && styles.savingBig]}>{formatLei(netSavings)}</Text>
          ) : (
            <Text style={[styles.saving, { color: colors.expensive }]}>
              {t('refi.costsMore', { amount: formatLei(-netSavings) })}
            </Text>
          )}
          {saves ? <Text style={styles.muted}>{t('refi.afterFees')}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.small}>{t('refi.newPayment')}</Text>
          <Text style={styles.payment}>{formatLei(monthlyPayment)}</Text>
          <Text style={styles.muted}>{t('refi.vsNow', { amount: formatLei(debt.monthlyPayment) })}</Text>
        </View>
      </View>

      {featured ? (
        <Text style={styles.muted}>
          {t('refi.fees', { early: formatLei(earlyRepaymentFee), origination: formatLei(originationFee) })}
        </Text>
      ) : null}

      <View style={styles.eligibility}>
        <Tag tone={eligibility.eligible ? 'good' : 'expensive'} label={eligibility.eligible ? t('refi.eligible') : t('refi.notEligible')} />
        <Text style={[styles.muted, { flex: 1 }]}>
          {eligibility.eligible
            ? t('refi.eligibleWhy', { dti })
            : eligibility.reasons.map(r => t(reasonKey[r], { dti })).join(' ')}
        </Text>
      </View>

      {saves && eligibility.eligible ? (
        <Button
          label={alreadySent ? t('refi.alreadySent') : t('refi.cta', { bank: offer.bank })}
          variant={featured ? 'primary' : 'secondary'}
          onPress={onApply}
          disabled={alreadySent}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, shadowOpacity: 0, elevation: 0, borderWidth: 1, borderColor: colors.border },
  featured: { borderWidth: 2, borderColor: colors.good },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bank: { ...type.bodyStrong, color: colors.text },
  muted: { ...type.small, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  small: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  numbers: {
    flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md, padding: spacing.md,
  },
  saving: { ...type.heading, color: colors.good },
  savingBig: { fontSize: 28, lineHeight: 34 },
  payment: { ...type.heading, color: colors.text },
  eligibility: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
});
