import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BankLogo } from '../components/BankLogo';
import { ApplicationSheet } from '../components/refinance/ApplicationSheet';
import { EligibilityPath } from '../components/refinance/EligibilityPath';
import { OfferCard } from '../components/refinance/OfferCard';
import { LatePaymentCheckbox, OfflineNote } from '../components/SessionBits';
import { Button, Card, Collapsible, HeroCard, Label, Screen } from '../components/ui';
import { listPersonas } from '../data';
import { rankRefinanceOffers, type RefinanceEstimate } from '../engine';
import { MAX_DEBT_TO_INCOME_RATIO } from '../engine/constants';
import { useLanguage } from '../i18n';
import { debtName, monthYear } from '../i18n/format';
import { colors, formatLei, formatPercent, radius, spacing, touch, type } from '../theme';
import { usePlan } from './PlanContext';
import { useSession } from './SessionContext';

const COLLAPSED_OFFERS = 3;

export default function RefinanceScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const { persona, offers, budget, extra } = usePlan();
  const session = useSession();

  const ranked = useMemo(
    () => new Map(persona.debts.map(d => [d.id, rankRefinanceOffers(persona, d, offers)])),
    [persona, offers],
  );
  const refinanceable = persona.debts.filter(d => (ranked.get(d.id)?.length ?? 0) > 0);

  // Open on the consumer debt with the biggest saving: a mortgage switch is a separate, bigger decision.
  const defaultDebtId = useMemo(() => {
    const best = (candidates: typeof refinanceable) => candidates
      .map(d => ({ id: d.id, saving: ranked.get(d.id)?.[0]?.netSavings ?? -Infinity }))
      .sort((a, b) => b.saving - a.saving)[0]?.id;
    return best(refinanceable.filter(d => d.type !== 'mortgage')) ?? best(refinanceable) ?? persona.debts[0]?.id;
  }, [persona, ranked]); // eslint-disable-line react-hooks/exhaustive-deps

  const [debtId, setDebtId] = useState(defaultDebtId);
  useEffect(() => setDebtId(defaultDebtId), [defaultDebtId]);
  const [expanded, setExpanded] = useState(false);
  const [applying, setApplying] = useState<RefinanceEstimate | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  // The "tap again" state expires, so the list never stays armed.
  useEffect(() => {
    if (!confirmCancel) return;
    const timer = setTimeout(() => setConfirmCancel(null), 4000);
    return () => clearTimeout(timer);
  }, [confirmCancel]);

  const debt = persona.debts.find(d => d.id === debtId) ?? persona.debts[0];
  const debtOffers = debt ? ranked.get(debt.id) ?? [] : [];
  const best = debtOffers[0];
  const notEligibleNow = budget.debtToIncomeRatio > MAX_DEBT_TO_INCOME_RATIO || persona.hadLatePayments;
  const shown = expanded ? debtOffers : debtOffers.slice(0, COLLAPSED_OFFERS);

  if (!debt) return <Screen><OfflineNote /></Screen>;

  const bestCanApply = !!best && best.eligibility.eligible && best.netSavings !== null && best.netSavings > 0;

  return (
    <Screen>
      <OfflineNote />

      <HeroCard style={{ gap: spacing.md }}>
        <Label style={{ color: colors.textInverseMuted }}>{t('nav.refinance')}</Label>
        <Text style={styles.headline}>
          {best && best.netSavings !== null && best.netSavings > 0
            ? t(best.eligibility.eligible ? 'refi.headlineBest' : 'refi.headlineLater', {
              debt: debtName(debt, t), bank: best.offer.bank, amount: formatLei(best.netSavings),
            })
            : t('refi.headlineNone', { debt: debtName(debt, t) })}
        </Text>
        <LatePaymentCheckbox inverse />
        {bestCanApply ? (
          <Button
            variant="inverse"
            label={session.findApplication(debt.id, best.offer.bank) ? t('refi.alreadySent') : t('refi.cta', { bank: best.offer.bank })}
            disabled={!!session.findApplication(debt.id, best.offer.bank)}
            onPress={() => setApplying(best)}
          />
        ) : null}
      </HeroCard>

      {notEligibleNow ? (
        <Collapsible
          title={t('path.title')}
          value={budget.debtToIncomeRatio > MAX_DEBT_TO_INCOME_RATIO ? formatPercent(budget.debtToIncomeRatio) : undefined}
          valueColor={colors.expensive}
          initiallyOpen
        >
          <EligibilityPath persona={persona} offers={offers} extra={extra} onViewPlan={() => router.push('/plan')} />
        </Collapsible>
      ) : null}

      <Collapsible
        title={t('refi.chooseDebt')}
        preview={debtName(debt, t)}
        value={t('home.debtsCount', { count: persona.debts.length })}
      >
        <View style={styles.chips}>
          {persona.debts.map(d => {
            const active = d.id === debt.id;
            const saving = ranked.get(d.id)?.[0]?.netSavings ?? null;
            return (
              <Pressable
                key={d.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => { setDebtId(d.id); setExpanded(false); }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <BankLogo bank={d.lender} size={34} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.chipTitle, active && { color: colors.white }]} numberOfLines={1}>
                    {debtName(d, t)}
                  </Text>
                  <Text style={[styles.chipSub, active && { color: colors.white }]}>
                    {saving !== null && saving > 0 ? t('refi.chipSave', { amount: formatLei(saving) }) : formatLei(d.balance)}
                  </Text>
                </View>
                {active ? <Text style={styles.chipCheck}>✓</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </Collapsible>

      <Collapsible title={t('refi.offersTitle')} value={t('refi.offersCount', { count: debtOffers.length })}>
        {debtOffers.length === 0 ? (
          <Text style={styles.muted}>{t('refi.noOffers')}</Text>
        ) : (
          shown.map((estimate, index) => (
            <OfferCard
              key={estimate.offer.id}
              debt={debt}
              estimate={estimate}
              featured={index === 0}
              alreadySent={!!session.findApplication(debt.id, estimate.offer.bank)}
              onApply={() => setApplying(estimate)}
            />
          ))
        )}
        {debtOffers.length > COLLAPSED_OFFERS ? (
          <Button
            variant="ghost"
            label={expanded ? t('refi.showLess') : t('refi.showMore', { count: debtOffers.length - COLLAPSED_OFFERS })}
            onPress={() => setExpanded(!expanded)}
          />
        ) : null}
      </Collapsible>

      <Collapsible title={t('refi.disclosureTitle')}>
        <Text style={styles.disclosureText}>{t('refi.disclosure')}</Text>
      </Collapsible>

      {session.applications.length > 0 ? (
        <Card style={{ gap: 0 }}>
          <View style={styles.appsHeader}>
            <Text style={styles.appsTitle}>{t('apps.title')}</Text>
            <Text style={styles.appsCount}>{session.applications.length}</Text>
          </View>
          {session.applications.map((app, index) => {
            const offer = offers.find(o => o.id === app.offerId);
            // Applications can come from any demo profile, so look the debt up across all of them.
            const fromDebt = persona.debts.find(d => d.id === app.debtId)
              ?? listPersonas().flatMap(p => p.debts).find(d => d.id === app.debtId);
            return (
              <View key={app.reference} style={[styles.appRow, index > 0 && styles.appDivider]}>
                <BankLogo bank={offer?.bank ?? ''} size={36} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.appTitle}>
                    {t('apps.item', { debt: fromDebt ? debtName(fromDebt, t) : app.debtId, bank: offer?.bank ?? app.offerId })}
                  </Text>
                  <Text style={styles.muted}>
                    {t('apps.meta', { date: monthYear(app.createdAt.slice(0, 10), t), ref: app.reference })}
                  </Text>
                  {app.netSavings !== null && app.netSavings > 0 ? (
                    <Text style={styles.appSaving}>{t('apps.saving', { amount: formatLei(app.netSavings) })}</Text>
                  ) : null}
                </View>
                {/* Two taps to cancel, so a stray tap never withdraws a request. */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={confirmCancel === app.reference ? t('apps.cancelConfirm') : t('apps.cancel')}
                  onPress={() => {
                    if (confirmCancel === app.reference) {
                      session.cancelApplication(app.reference);
                      setConfirmCancel(null);
                    } else setConfirmCancel(app.reference);
                  }}
                  style={({ pressed }) => [
                    styles.cancel,
                    confirmCancel === app.reference && styles.cancelConfirm,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.cancelText, confirmCancel === app.reference && { color: colors.white }]}>
                    {confirmCancel === app.reference ? t('apps.cancelConfirm') : t('apps.cancel')}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </Card>
      ) : null}

      <ApplicationSheet estimate={applying} debt={debt} persona={persona} onClose={() => setApplying(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headline: { ...type.title, fontSize: 24, lineHeight: 30, color: colors.textInverse },
  chips: { gap: spacing.sm },
  chip: {
    ...touch, minHeight: 60, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    justifyContent: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipTitle: { ...type.bodyStrong, fontSize: 15, color: colors.text },
  chipSub: { fontSize: 13, fontWeight: '700', color: colors.good },
  chipCheck: { fontSize: 18, fontWeight: '800', color: colors.white },
  appsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.xs },
  appsTitle: { ...type.bodyStrong, color: colors.text },
  appsCount: { ...type.bodyStrong, color: colors.good },
  disclosure: { backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: spacing.md },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, minHeight: 60 },
  appDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  appTitle: { ...type.smallStrong, color: colors.text },
  appSaving: { ...type.smallStrong, color: colors.good },
  cancel: {
    ...touch, minWidth: 72, paddingHorizontal: spacing.md, borderRadius: radius.full,
    borderWidth: 1.5, borderColor: colors.expensive, alignItems: 'center', justifyContent: 'center',
  },
  cancelConfirm: { backgroundColor: colors.expensive },
  cancelText: { ...type.smallStrong, color: colors.expensive },
  disclosureText: { ...type.small, color: colors.textSecondary },
  muted: { ...type.small, color: colors.textMuted },
});
