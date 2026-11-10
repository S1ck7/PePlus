import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BankLogo } from '../components/BankLogo';
import { PersonaSwitcher } from '../components/PersonaSwitcher';
import { LatePaymentQuestion } from '../components/SessionBits';
import { Button, Label, PopIn, Sheet } from '../components/ui';
import { getPersona } from '../data';
import { useLanguage } from '../i18n';
import { colors, radius, spacing, touch, type } from '../theme';
import { usePlan } from './PlanContext';
import { useSession } from './SessionContext';

const BANKS = [
  { name: 'Banca Transilvania', code: 'BT' },
  { name: 'BCR', code: 'BCR' },
  { name: 'ING Bank', code: 'ING' },
  { name: 'Raiffeisen Bank', code: 'RZB' },
  { name: 'BRD', code: 'BRD' },
  { name: 'CEC Bank', code: 'CEC' },
  { name: 'UniCredit Bank', code: 'UCB' },
  { name: 'Credius IFN', code: 'CRD' },
  { name: 'Mokka', code: 'MOK' },
  { name: 'tbi bank', code: 'TBI' },
  { name: 'BT Leasing', code: 'BTL' },
] as const;

const logo = require('../../assets/brand/logo-mint.png');

const SYNC_STEPS = ['sync.step1', 'sync.step2', 'sync.step3', 'sync.step4'] as const;

export default function ConnectScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const { persona: planPersona } = usePlan();
  const session = useSession();
  // The bank list shows everything the person has, not just what was connected last time.
  const persona = getPersona(planPersona.id) ?? planPersona;

  const found = useMemo(() => {
    const names = new Set<string>();
    persona.accounts.forEach(a => names.add(a.bank));
    persona.debts.forEach(d => names.add(d.lender));
    return names;
  }, [persona]);

  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    setSelected(BANKS.filter(b => found.has(b.name)).map(b => b.name));
  }, [found]);

  const [consentOpen, setConsentOpen] = useState(false);
  const [syncStep, setSyncStep] = useState<number | null>(null);

  useEffect(() => {
    if (syncStep === null || syncStep >= SYNC_STEPS.length) return;
    const timer = setTimeout(() => setSyncStep(syncStep + 1), 650);
    return () => clearTimeout(timer);
  }, [syncStep]);

  const toggle = (name: string) =>
    setSelected(prev => (prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]));

  // Allow -> write the snapshot (Firebase, or local when offline) while the sync steps play.
  const [connected, setConnected] = useState<{ debts: number; lenders: number } | null>(null);
  const startSync = () => {
    setConsentOpen(false);
    setConnected(null);
    setSyncStep(0);
    void session.connect(persona.id, selected).then(snapshot => {
      const debts = snapshot?.persona.debts ?? persona.debts.filter(d => selected.includes(d.lender));
      setConnected({ debts: debts.length, lenders: new Set(debts.map(d => d.lender)).size });
    });
  };

  const syncing = syncStep !== null;
  const syncDone = syncStep !== null && syncStep >= SYNC_STEPS.length && connected !== null;
  const needsLateAnswer = session.profile.hadLatePayments === undefined;

  const finish = () => {
    setSyncStep(null);
    router.replace('/overview');
  };

  const ctaLabel = selected.length === 0
    ? t('connect.ctaNone')
    : selected.length === 1 ? t('connect.ctaOne') : t('connect.cta', { count: selected.length });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <PersonaSwitcher />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Image source={logo} style={styles.logo} resizeMode="contain" accessibilityLabel="PePlus" />
          <Text accessibilityRole="header" style={styles.title}>{t('connect.title')}</Text>
          <Text style={styles.subtitle}>{t('connect.subtitle')}</Text>
        </View>

        <Label>{t('connect.pickTitle')}</Label>
        <View style={styles.grid}>
          {BANKS.map(bank => {
            const isOn = selected.includes(bank.name);
            const isFound = found.has(bank.name);
            return (
              <Pressable
                key={bank.name}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isOn }}
                accessibilityLabel={isFound ? t('connect.foundA11y', { bank: bank.name }) : bank.name}
                onPress={() => toggle(bank.name)}
                style={[styles.bank, isOn && styles.bankOn]}
              >
                <View style={styles.bankTop}>
                  <BankLogo bank={bank.name} size={44} muted={!isOn} />
                  {isOn ? <View style={styles.check}><Text style={styles.checkText}>✓</Text></View> : null}
                </View>
                <Text style={styles.bankName} numberOfLines={2}>{bank.name}</Text>
                {isFound ? <Text style={styles.found}>● {t('connect.found')}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button label={ctaLabel} onPress={() => setConsentOpen(true)} disabled={selected.length === 0} />
        <Text style={styles.trust}>🔒 {t('connect.trust')}</Text>
      </View>

      <Sheet visible={consentOpen} onClose={() => setConsentOpen(false)}>
        <View style={{ gap: spacing.xs }}>
          <Text style={styles.sheetTitle}>{t('consent.title')}</Text>
          <Text style={styles.muted}>{t('consent.subtitle')}</Text>
        </View>
        <View style={styles.bankChips}>
          {selected.map(name => (
            <View key={name} style={styles.bankChip}>
              <BankLogo bank={name} size={22} />
              <Text style={styles.bankChipText}>{name}</Text>
            </View>
          ))}
        </View>
        <View style={{ gap: spacing.sm }}>
          <Label>{t('consent.scopeTitle')}</Label>
          {(['consent.scopeAccounts', 'consent.scopeLoans', 'consent.scopeCards', 'consent.scopeTransactions'] as const)
            .map(key => <Text key={key} style={styles.scope}>✓  {t(key)}</Text>)}
        </View>
        <View style={styles.never}>
          <Text style={styles.neverText}>{t('consent.never')}</Text>
        </View>
        <Text style={styles.muted}>{t('consent.legal')}</Text>
        <Button label={t('consent.allow')} onPress={startSync} />
        <Button label={t('consent.cancel')} variant="ghost" onPress={() => setConsentOpen(false)} />
      </Sheet>

      <Sheet visible={syncing} onClose={() => (syncDone ? finish() : undefined)}>
        <Text style={styles.sheetTitle}>
          {syncDone && connected ? t('sync.done', connected) : t('sync.title')}
        </Text>
        <View style={{ gap: spacing.md }}>
          {SYNC_STEPS.map((key, i) => {
            const done = (syncStep ?? 0) > i;
            const active = syncStep === i;
            return (
              <View key={key} style={styles.syncRow}>
                {done ? (
                  <PopIn style={[styles.syncDot, styles.syncDotDone]}><Text style={styles.syncCheck}>✓</Text></PopIn>
                ) : (
                  <View style={[styles.syncDot, active && styles.syncDotActive]} />
                )}
                <Text style={[styles.syncText, !done && !active && { color: colors.textMuted }]}>{t(key)}</Text>
              </View>
            );
          })}
        </View>
        {syncDone && needsLateAnswer ? (
          <View style={styles.lateBox}>
            <Label>{t('late.title')}</Label>
            <LatePaymentQuestion onAnswered={finish} />
          </View>
        ) : (
          <Button label={t('sync.cta')} onPress={finish} disabled={!syncDone} />
        )}
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.sm },
  content: { padding: spacing.lg, paddingTop: 0, gap: spacing.lg, paddingBottom: spacing.xl },
  intro: { gap: spacing.md, paddingVertical: spacing.md },
  logo: { width: 112, height: 72 },
  title: { ...type.title, fontSize: 34, lineHeight: 40, color: colors.text },
  subtitle: { ...type.body, color: colors.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  bank: {
    width: '31.5%', minHeight: 112, padding: spacing.md, borderRadius: radius.md, gap: spacing.sm,
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
  },
  bankOn: { borderColor: colors.accent },
  bankTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  check: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  checkText: { color: colors.textInverse, fontSize: 12, fontWeight: '800' },
  bankName: { ...type.smallStrong, fontSize: 13, lineHeight: 17, color: colors.text },
  found: { fontSize: 11, fontWeight: '700', color: colors.good },
  footer: {
    padding: spacing.lg, paddingTop: spacing.md, gap: spacing.sm,
    backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border,
  },
  trust: { ...type.small, fontSize: 12, lineHeight: 17, color: colors.textMuted, textAlign: 'center' },
  sheetTitle: { ...type.heading, color: colors.text },
  muted: { ...type.small, color: colors.textMuted },
  bankChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  bankChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accentSoft,
    borderRadius: radius.full, paddingLeft: 4, paddingRight: 10, paddingVertical: 4,
  },
  bankChipText: { fontSize: 12, fontWeight: '700', color: colors.accentText },
  scope: { ...type.body, color: colors.text },
  never: { backgroundColor: colors.goodSoft, borderRadius: radius.md, padding: spacing.md },
  neverText: { ...type.smallStrong, color: colors.good },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 32 },
  syncDot: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  syncDotActive: { borderColor: colors.accent },
  syncDotDone: { backgroundColor: colors.good, borderColor: colors.good },
  syncCheck: { color: colors.white, fontWeight: '800', fontSize: 13 },
  syncText: { ...type.body, color: colors.text, flex: 1 },
  lateBox: { gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.lg },
});
