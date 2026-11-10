import type { Debt } from '../types';
import type { TranslationKey } from './en';

type T = (key: TranslationKey, values?: Record<string, string | number>) => string;

/** "2035-02-01" -> "Feb 2035" / "feb. 2035" */
export function monthYear(iso: string | null, t: T): string {
  if (!iso) return '—';
  const [year, month] = iso.split('-');
  return `${t(`month.${Number(month)}` as TranslationKey)} ${year}`;
}

/** 99 -> "8 yrs 3 mo" / "8 ani 3 luni" */
export function duration(months: number, t: T): string {
  if (months <= 0) return t('time.none');
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts: string[] = [];
  if (years === 1) parts.push(t('time.year'));
  else if (years >= 20) parts.push(t('time.yearsMany', { n: years }));
  else if (years > 1) parts.push(t('time.years', { n: years }));
  if (rest === 1) parts.push(t('time.month'));
  else if (rest > 1) parts.push(t('time.months', { n: rest }));
  return parts.join(' ');
}

export function debtName(debt: Debt, t: T): string {
  const typeLabel = t(`debt.type.${debt.type}` as TranslationKey);
  // Avoid "BT Leasing Leasing": the lender's name already says what it is.
  if (debt.lender.toLowerCase().includes(typeLabel.toLowerCase())) return debt.lender;
  // Avoid "Credius IFN IFN loan": say just "loan" when the lender's name already says IFN.
  const type = debt.type === 'ifn_loan' && /\bIFN\b/i.test(debt.lender) ? t('debt.loan') : typeLabel;
  return t('debt.name', { lender: debt.lender, type });
}

export function joinList(items: string[], t: T): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} ${t('list.and')} ${items[items.length - 1]}`;
}
