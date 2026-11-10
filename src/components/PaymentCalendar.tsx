import { StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '../i18n';
import { debtName, monthYear } from '../i18n/format';
import { colors, formatLei, radius, spacing, type } from '../theme';
import type { Debt, Transaction } from '../types';
import { BankLogo } from './BankLogo';
import { Card } from './ui';

/** Day of the month a debt is due: the day of its latest payment in the bank data, else its start day. */
export function dueDay(debt: Debt, transactions: readonly Transaction[]): number {
  const paid = transactions
    .filter(tx => tx.debtId === debt.id && tx.category === 'debt_payment')
    .reduce((latest, tx) => (tx.date > latest ? tx.date : latest), '');
  return Number((paid || debt.startDate).slice(8, 10)) || 1;
}

interface Props {
  /** First day of the plan month, YYYY-MM-01. */
  monthStart: string;
  debts: readonly Debt[];
  transactions: readonly Transaction[];
  /** The debt that gets the extra money this month, and how much. */
  extraDebtId?: string;
  extra: number;
}

/** This month's grid with the days each debt is due, and the list of payments in date order. */
export function PaymentCalendar({ monthStart, debts, transactions, extraDebtId, extra }: Props) {
  const { t } = useLanguage();
  const [year, month] = monthStart.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7; // Monday = 0

  const payments = debts
    .filter(d => d.balance > 0)
    .map(d => {
      const withExtra = d.id === extraDebtId && extra > 0;
      return { debt: d, day: Math.min(dueDay(d, transactions), daysInMonth), amount: d.monthlyPayment + (withExtra ? extra : 0), withExtra };
    })
    .sort((a, b) => a.day - b.day);
  const dueDays = new Set(payments.map(p => p.day));
  const total = payments.reduce((sum, p) => sum + p.amount, 0);

  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>{t('cal.title')}</Text>
        <Text style={styles.month}>{monthYear(monthStart, t)}</Text>
      </View>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.row}>
          {t('cal.weekdays').split(',').map((d, i) => <Text key={i} style={styles.weekday}>{d}</Text>)}
        </View>
        {Array.from({ length: cells.length / 7 }, (_, w) => (
          <View key={w} style={styles.row}>
            {cells.slice(w * 7, w * 7 + 7).map((day, i) => {
              const due = day !== null && dueDays.has(day);
              return (
                <View key={i} style={styles.cell}>
                  {day !== null ? (
                    <View style={[styles.dayBubble, due && styles.dueBubble]}>
                      <Text style={[styles.day, due && styles.dueDay]}>{day}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}
      </View>
      <View style={{ gap: spacing.sm }}>
        {payments.map(p => (
          <View key={p.debt.id} style={styles.payment} accessible accessibilityLabel={`${t('cal.day', { day: p.day })}, ${debtName(p.debt, t)}, ${formatLei(p.amount)}`}>
            <View style={styles.dateChip}><Text style={styles.dateChipText}>{p.day}</Text></View>
            <BankLogo bank={p.debt.lender} size={28} />
            <View style={{ flex: 1 }}>
              <Text style={styles.debt} numberOfLines={1}>{debtName(p.debt, t)}</Text>
              {p.withExtra ? <Text style={styles.extra}>{t('cal.extra', { amount: formatLei(extra) })}</Text> : null}
            </View>
            <Text style={styles.amount}>{formatLei(p.amount)}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.total}>{t('cal.total', { amount: formatLei(total) })}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { ...type.heading, color: colors.text },
  month: { ...type.smallStrong, color: colors.textMuted },
  row: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.textMuted, paddingBottom: spacing.xs },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  dayBubble: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dueBubble: { backgroundColor: colors.accent },
  day: { fontSize: 13, color: colors.textSecondary },
  dueDay: { fontWeight: '800', color: colors.textInverse },
  payment: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dateChip: { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  dateChipText: { ...type.smallStrong, color: colors.accentText },
  debt: { ...type.small, color: colors.text },
  extra: { fontSize: 12, fontWeight: '700', color: colors.accentText },
  amount: { ...type.smallStrong, color: colors.text },
  total: { ...type.smallStrong, color: colors.textMuted, textAlign: 'right' },
});
