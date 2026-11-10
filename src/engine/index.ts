import type { BankOffer, Debt, Persona, TransactionCategory } from '../types';
import {
  EARLY_REPAYMENT_CAPS_PCT,
  MAX_DEBT_TO_INCOME_RATIO,
  PROJECTION_LIMIT_MONTHS,
} from './constants';

const toCents = (lei: number) => Math.round(lei * 100);
const toLei = (cents: number) => cents / 100;

/** Annualized interest and recurring fees at today's balance, in lei. */
export function realAnnualCost(debt: Debt): number {
  if (debt.balance <= 0) return 0;
  return toLei(toCents(debt.balance * debt.interestRate / 100 + 12 * debt.monthlyFees));
}

export function minimumDebtPayments(debts: readonly Debt[]): number {
  const cents = debts.reduce(
    (sum, debt) => sum + (debt.balance > 0 ? toCents(debt.monthlyPayment) : 0), 0,
  );
  return toLei(cents);
}

/** Expenses include scheduled debt payments. A negative result is a shortfall. */
export function monthlySurplus(income: number, expenses: number, safetyBuffer: number): number {
  return toLei(toCents(income) - toCents(expenses) - toCents(safetyBuffer));
}

/** Returns a fraction, so 0.4 means 40%. */
export function debtToIncomeRatio(monthlyPayments: number, monthlyNetIncome: number): number {
  if (monthlyPayments === 0) return 0;
  return monthlyNetIncome > 0 ? toCents(monthlyPayments) / toCents(monthlyNetIncome) : Infinity;
}

type SpendingCategory = Exclude<TransactionCategory, 'debt_payment'>;

function aggregateLivingExpenses(persona: Persona) {
  const months = new Set<string>();
  const categoryTotals = new Map<SpendingCategory, number>();
  for (const { date, category, amount } of persona.transactions) {
    months.add(date.slice(0, 7));
    if (amount < 0 && category !== 'debt_payment') {
      categoryTotals.set(category, (categoryTotals.get(category) ?? 0) - toCents(amount));
    }
  }
  return { monthCount: months.size, categoryTotals };
}

/** Average monthly living expenses in lei by category, using all recorded months. */
export function spendingBreakdown(persona: Persona) {
  const { monthCount, categoryTotals } = aggregateLivingExpenses(persona);
  return Array.from(categoryTotals, ([category, cents]) => ({
    category,
    monthlyAmount: toLei(Math.round(cents / monthCount)),
  })).sort((a, b) => b.monthlyAmount - a.monthlyAmount);
}

/** Average living expenses across the transaction months, plus today's loan minimums. */
export function summarizeBudget(persona: Persona, monthlySafetyBuffer: number) {
  const { monthCount, categoryTotals } = aggregateLivingExpenses(persona);
  const livingExpenseCents = Array.from(categoryTotals.values()).reduce((sum, cents) => sum + cents, 0);
  const monthlyIncome = persona.monthlyNetIncome;
  const monthlyLivingExpenses = monthCount ? toLei(Math.round(livingExpenseCents / monthCount)) : 0;
  const monthlyDebtPayments = minimumDebtPayments(persona.debts);
  const monthlyExpenses = toLei(toCents(monthlyLivingExpenses) + toCents(monthlyDebtPayments));
  return {
    monthlyIncome,
    monthlyLivingExpenses,
    monthlyDebtPayments,
    monthlyExpenses,
    monthlySurplus: monthlySurplus(monthlyIncome, monthlyExpenses, monthlySafetyBuffer),
    debtToIncomeRatio: debtToIncomeRatio(monthlyDebtPayments, monthlyIncome),
  };
}

/** The cost rate measures current interest and fees per leu owed. Rates are percentages. */
export function payoffOrder(debts: readonly Debt[]) {
  return debts
    .filter(debt => debt.balance > 0)
    .map(debt => {
      const annualCost = realAnnualCost(debt);
      const annualCostRate = debt.interestRate + 1200 * debt.monthlyFees / debt.balance;
      return { debt, annualCost, annualCostRate };
    })
    .sort((a, b) => b.annualCostRate - a.annualCostRate);
}

function earlyRepaymentRate(debt: Debt, remainingMonths: number | null): number {
  if (remainingMonths !== null && remainingMonths <= 0) return 0;
  const caps = EARLY_REPAYMENT_CAPS_PCT;
  let cap: number;
  if (debt.type === 'mortgage') cap = caps.mortgage;
  else if (debt.type === 'overdraft') cap = caps.overdraft;
  else if (debt.rateType === 'variable') cap = caps.variable;
  else if (remainingMonths !== null && remainingMonths <= 12) cap = caps.fixedUpToOneYear;
  else cap = caps.fixedOverOneYear;
  return Math.min(cap, debt.earlyRepaymentFeePct) / 100;
}

/** The fee to settle the outstanding principal today, in lei. */
export function earlyRepaymentFee(debt: Debt): number {
  return toLei(Math.round(toCents(debt.balance) * earlyRepaymentRate(debt, debt.remainingMonths)));
}

function amountDue(balance: number, debt: Debt): number {
  return balance + Math.round(balance * debt.interestRate / 1200) + toCents(debt.monthlyFees);
}

function dateAfterMonths(startDate: string, months: number): string {
  const date = new Date(startDate + 'T00:00:00Z');
  const day = date.getUTCDate();
  date.setUTCMonth(date.getUTCMonth() + months + 1, 0);
  date.setUTCDate(Math.min(day, date.getUTCDate()));
  return date.toISOString().slice(0, 10);
}

export function debtFreeDate(startDate: string, monthsToPayoff: number | null): string | null {
  return monthsToPayoff === null ? null : dateAfterMonths(startDate, monthsToPayoff);
}

export interface PayoffOptions {
  /** YYYY-MM-DD of the starting balances. The first payment is one month later. */
  startDate: string;
  monthlyExtra?: number;
  /** Set to false with zero extra to compare against minimum payments alone. */
  rollOverPayments?: boolean;
  maxMonths?: number;
}

export interface PayoffMonth {
  month: number;
  date: string;
  totalBalance: number;
  payments: {
    debtId: string;
    balance: number;
    minimumPaid: number;
    extraPrincipalPaid: number;
    earlyRepaymentFee: number;
  }[];
}

/** Projects today's rates and minimum payments, with no new borrowing. All outputs are in lei. */
export function simulatePayoff(debts: readonly Debt[], options: PayoffOptions) {
  const {
    startDate, monthlyExtra = 0, rollOverPayments = true, maxMonths = PROJECTION_LIMIT_MONTHS,
  } = options;
  const order = payoffOrder(debts);
  const balances = order.map(({ debt }) => toCents(debt.balance));
  const extra = Math.max(0, toCents(monthlyExtra));
  const minimumBudget = toCents(minimumDebtPayments(debts));
  const months: PayoffMonth[] = [];
  const initialBalance = toLei(balances.reduce((sum, balance) => sum + balance, 0));
  let totalBalance = initialBalance;

  for (let month = 1; month <= maxMonths && totalBalance > 0; month++) {
    const minimums = order.map(({ debt }, i) => {
      if (balances[i] === 0) return 0;
      const due = amountDue(balances[i], debt);
      // A term loan is settled at its stated maturity, like existingRepayment (D-047).
      const paid = month === debt.remainingMonths ? due : Math.min(toCents(debt.monthlyPayment), due);
      balances[i] = due - paid;
      return paid;
    });
    const minimumPaid = minimums.reduce((sum, paid) => sum + paid, 0);
    let extraAvailable = extra + (rollOverPayments ? minimumBudget - minimumPaid : 0);

    const payments = order.map(({ debt }, i) => {
      const remainingMonths = debt.remainingMonths === null ? null : debt.remainingMonths - month;
      const feeRate = earlyRepaymentRate(debt, remainingMonths);
      let principal = Math.min(balances[i], Math.round(extraAvailable / (1 + feeRate)));
      let fee = Math.round(principal * feeRate);
      if (principal + fee > extraAvailable) {
        principal--;
        fee = Math.round(principal * feeRate);
      }
      balances[i] -= principal;
      extraAvailable -= principal + fee;
      return {
        debtId: debt.id,
        balance: toLei(balances[i]),
        minimumPaid: toLei(minimums[i]),
        extraPrincipalPaid: toLei(principal),
        earlyRepaymentFee: toLei(fee),
      };
    });
    totalBalance = toLei(balances.reduce((sum, balance) => sum + balance, 0));
    months.push({ month, date: dateAfterMonths(startDate, month), totalBalance, payments });
  }

  const monthsToPayoff = totalBalance === 0 ? months.length : null;
  return { order, initialBalance, months, monthsToPayoff, debtFreeDate: debtFreeDate(startDate, monthsToPayoff) };
}

export interface EligibilityOutlook {
  month: number;
  date: string;
  debtToIncomeRatio: number;
  /** Debts settled by this month, ordered by settlement month. */
  paidOffDebtIds: string[];
}

function outlookStartDate(persona: Persona): string {
  const latestTransaction = persona.transactions.reduce(
    (latest, { date }) => date > latest ? date : latest, '',
  );
  if (latestTransaction) return dateAfterMonths(latestTransaction.slice(0, 7) + '-01', 1);
  return persona.debts.reduce((latest, { startDate }) => startDate > latest ? startDate : latest, '');
}

/**
 * Projects when scheduled debt payments reach the DTI cap, independent of late payments.
 * Month 0 means the ratio is already within the cap. The default start is the first day
 * of the month after the latest transaction, or the latest loan start date without history.
 */
export function eligibilityOutlook(
  persona: Persona,
  monthlyExtra: number,
  startDate = outlookStartDate(persona),
): EligibilityOutlook | null {
  if (persona.monthlyNetIncome <= 0 || !startDate) return null;
  let paymentCents = toCents(minimumDebtPayments(persona.debts));
  const currentRatio = debtToIncomeRatio(toLei(paymentCents), persona.monthlyNetIncome);
  if (currentRatio <= MAX_DEBT_TO_INCOME_RATIO) {
    return { month: 0, date: startDate, debtToIncomeRatio: currentRatio, paidOffDebtIds: [] };
  }

  const openPayments = new Map(persona.debts.map(debt => [debt.id, toCents(debt.monthlyPayment)]));
  const paidOffDebtIds: string[] = [];
  const { months } = simulatePayoff(persona.debts, { startDate, monthlyExtra });
  for (const { month, date, payments } of months) {
    for (const { debtId, balance } of payments) {
      const payment = openPayments.get(debtId);
      if (balance > 0 || payment === undefined) continue;
      openPayments.delete(debtId);
      paymentCents -= payment;
      paidOffDebtIds.push(debtId);
    }
    const ratio = debtToIncomeRatio(toLei(paymentCents), persona.monthlyNetIncome);
    if (ratio <= MAX_DEBT_TO_INCOME_RATIO) {
      return { month, date, debtToIncomeRatio: ratio, paidOffDebtIds };
    }
  }
  return null;
}

export type EligibilityReason = 'no_income' | 'over_debt_to_income_cap' | 'late_payments';

export function estimateEligibility(
  monthlyNetIncome: number,
  projectedMonthlyPayments: number,
  hadLatePayments: boolean,
) {
  const ratio = debtToIncomeRatio(projectedMonthlyPayments, monthlyNetIncome);
  const reasons: EligibilityReason[] = [];
  if (monthlyNetIncome <= 0) reasons.push('no_income');
  else if (ratio > MAX_DEBT_TO_INCOME_RATIO) reasons.push('over_debt_to_income_cap');
  if (hadLatePayments) reasons.push('late_payments');
  return { eligible: reasons.length === 0, reasons, debtToIncomeRatio: ratio, cap: MAX_DEBT_TO_INCOME_RATIO };
}

function existingRepayment(debt: Debt): { total: number; months: number } | null {
  let balance = toCents(debt.balance);
  let totalPaid = 0;
  const limit = debt.remainingMonths ?? PROJECTION_LIMIT_MONTHS;
  for (let month = 1; month <= limit; month++) {
    const due = amountDue(balance, debt);
    // Any principal still outstanding is due at the stated maturity.
    const payment = month === debt.remainingMonths ? due : Math.min(due, toCents(debt.monthlyPayment));
    totalPaid += payment;
    if (payment === due) return { total: toLei(totalPaid), months: month };
    if (debt.remainingMonths === null && due - payment >= balance) return null;
    balance = due - payment;
  }
  return null;
}

function refinancePayment(balance: number, interestRate: number, termMonths: number): number {
  const rate = interestRate / 1200;
  if (rate === 0) return balance / termMonths;
  return balance * rate / -Math.expm1(-termMonths * Math.log1p(rate));
}

export interface RefinanceEstimate {
  offer: BankOffer;
  termMonths: number;
  monthlyPayment: number;
  existingMonths: number | null;
  existingTotal: number | null;
  newLoanTotal: number;
  originationFee: number;
  earlyRepaymentFee: number;
  netSavings: number | null;
  eligibility: ReturnType<typeof estimateEligibility>;
}

/** Compares matching offers for one debt at current rates. One-off fees are paid up front. */
export function rankRefinanceOffers(
  persona: Persona,
  debt: Debt,
  offers: readonly BankOffer[],
  requestedTermMonths?: number,
): RefinanceEstimate[] {
  if (debt.balance <= 0) return [];
  const product = debt.type === 'mortgage' ? 'mortgage_refinance' : 'personal_refinance';
  const existing = existingRepayment(debt);
  const settlementFee = earlyRepaymentFee(debt);
  const otherPayments = minimumDebtPayments(persona.debts.filter(other => other.id !== debt.id));
  const estimates: RefinanceEstimate[] = [];

  for (const offer of offers) {
    if (offer.product !== product || debt.balance < offer.minAmount || debt.balance > offer.maxAmount) {
      continue;
    }
    const currentTerm = debt.remainingMonths ?? existing?.months ?? offer.minTermMonths;
    const termMonths = requestedTermMonths ??
      Math.min(offer.maxTermMonths, Math.max(offer.minTermMonths, currentTerm));
    if (!Number.isInteger(termMonths) || termMonths < Math.max(1, offer.minTermMonths) ||
        termMonths > offer.maxTermMonths) continue;

    const installment = refinancePayment(debt.balance, offer.interestRate, termMonths);
    const monthlyPayment = toLei(toCents(installment + offer.monthlyFees));
    const originationFee = toLei(toCents(debt.balance * offer.originationFeePct / 100));
    const newLoanTotal = toLei(toCents((installment + offer.monthlyFees) * termMonths + originationFee));
    estimates.push({
      offer,
      termMonths,
      monthlyPayment,
      existingMonths: existing?.months ?? null,
      existingTotal: existing?.total ?? null,
      newLoanTotal,
      originationFee,
      earlyRepaymentFee: settlementFee,
      netSavings: existing === null ? null :
        toLei(toCents(existing.total) - toCents(newLoanTotal) - toCents(settlementFee)),
      eligibility: estimateEligibility(
        persona.monthlyNetIncome, otherPayments + monthlyPayment, persona.hadLatePayments,
      ),
    });
  }

  return estimates.sort((a, b) => (b.netSavings ?? -Infinity) - (a.netSavings ?? -Infinity));
}
