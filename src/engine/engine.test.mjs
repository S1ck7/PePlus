import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import test from 'node:test';

// Metro resolves extensionless imports. Supply the extension for Node's TS loader.
const engineUrl = new URL('./index.ts', import.meta.url);
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === engineUrl.href && specifier === './constants') {
      return nextResolve('./constants.ts', context);
    }
    return nextResolve(specifier, context);
  },
});
const {
  debtFreeDate, debtToIncomeRatio, earlyRepaymentFee, eligibilityOutlook, estimateEligibility,
  monthlySurplus, payoffOrder, rankRefinanceOffers, realAnnualCost, simulatePayoff,
  spendingBreakdown, summarizeBudget,
} = await import(engineUrl.href);
hooks.deregister();

function debt(overrides = {}) {
  return {
    id: 'loan', type: 'personal_loan', lender: 'Demo Bank', balance: 1_200,
    originalAmount: 1_200, interestRate: 0, rateType: 'fixed', referenceIndex: 'none',
    dae: 0, monthlyPayment: 100, monthlyFees: 0, remainingMonths: 12, creditLimit: null,
    earlyRepaymentFeePct: 0, startDate: '2025-01-01', ...overrides,
  };
}

function persona(debts, overrides = {}) {
  return {
    id: 'demo', name: 'Demo', age: 32, city: 'Cluj', monthlyNetIncome: 1_000,
    hadLatePayments: false, accounts: [], transactions: [], debts, ...overrides,
  };
}

function offer(overrides = {}) {
  return {
    id: 'offer', bank: 'Demo Bank', product: 'personal_refinance', interestRate: 0,
    rateType: 'fixed', referenceIndex: 'none', dae: 0, originationFeePct: 1, monthlyFees: 3,
    minAmount: 100, maxAmount: 20_000, minTermMonths: 6, maxTermMonths: 60,
    sourceUrl: 'https://example.test', collectedOn: '2025-01-01', ...overrides,
  };
}

test('annual cost uses the current balance and recurring fees', () => {
  assert.equal(realAnnualCost(debt({ balance: 10_000, interestRate: 8.5, monthlyFees: 15 })), 1_030);
  assert.equal(realAnnualCost(debt({ balance: 0, monthlyFees: 15 })), 0);
});

test('budget replaces historical debt payments with current minimums and includes zero-spend months', () => {
  const user = persona([debt(), debt({ balance: 0, monthlyPayment: 40 })], {
    transactions: [
      { date: '2025-01-01', amount: 1_000, category: 'salary' },
      { date: '2025-01-02', amount: -200, category: 'groceries' },
      { date: '2025-01-03', amount: -140, category: 'debt_payment' },
      { date: '2025-02-01', amount: 1_000, category: 'salary' },
    ],
  });
  assert.deepEqual(summarizeBudget(user, 50), {
    monthlyIncome: 1_000, monthlyLivingExpenses: 100, monthlyDebtPayments: 100,
    monthlyExpenses: 200, monthlySurplus: 750, debtToIncomeRatio: 0.1,
  });
  assert.equal(monthlySurplus(100, 80, 25), -5);
  assert.equal(debtToIncomeRatio(100, 0), Infinity);
  assert.equal(debtToIncomeRatio(0, 0), 0);
});

test('payoff order ranks by the ongoing cost per leu and includes fee-heavy debts', () => {
  const mortgage = debt({ id: 'mortgage', balance: 200_000, interestRate: 7 });
  const card = debt({ id: 'card', balance: 1_000, interestRate: 20 });
  const feeLoan = debt({ id: 'fee-loan', balance: 500, interestRate: 4, monthlyFees: 10 });
  const order = payoffOrder([mortgage, card, feeLoan, debt({ balance: 0 })]);
  assert.deepEqual(order.map(row => row.debt.id), ['fee-loan', 'card', 'mortgage']);
  assert.equal(order[0].annualCostRate, 28);
  assert.equal(order[0].annualCost, 140);
});

test('payoff pays minimums first and rolls freed money into the next debt in the same month', () => {
  const startDate = '2024-01-31';
  const card = debt({ id: 'card', balance: 105, monthlyPayment: 20, interestRate: 12, monthlyFees: 1 });
  const loan = debt({ id: 'other', balance: 300, monthlyPayment: 40 });
  const plan = simulatePayoff([loan, card], { startDate, monthlyExtra: 100 });
  assert.equal(plan.initialBalance, 405);
  assert.deepEqual(plan.months[0], {
    month: 1, date: '2024-02-29', totalBalance: 247.05,
    payments: [
      { debtId: 'card', balance: 0, minimumPaid: 20, extraPrincipalPaid: 87.05, earlyRepaymentFee: 0 },
      { debtId: 'other', balance: 247.05, minimumPaid: 40, extraPrincipalPaid: 12.95, earlyRepaymentFee: 0 },
    ],
  });
  assert.equal(plan.months[1].payments[1].extraPrincipalPaid, 120);
  assert.equal(plan.monthsToPayoff, 3);
  assert.equal(plan.debtFreeDate, '2024-04-30');
  assert.equal(loan.balance, 300);

  const minimumOnly = simulatePayoff([loan, card], { startDate, rollOverPayments: false });
  assert.equal(minimumOnly.monthsToPayoff, 8);
  assert.ok(minimumOnly.months.every(month => month.payments.every(payment => payment.extraPrincipalPaid === 0)));
});

test('simulation includes early repayment fees in the extra payment budget', () => {
  const loan = debt({ balance: 200, monthlyPayment: 20, earlyRepaymentFeePct: 2, remainingMonths: 24 });
  const plan = simulatePayoff([loan], { startDate: '2025-01-01', monthlyExtra: 100 });
  assert.deepEqual(plan.months[0].payments[0], {
    debtId: 'loan', balance: 80.99, minimumPaid: 20, extraPrincipalPaid: 99.01, earlyRepaymentFee: 0.99,
  });
});

test('payoff handles settled debts, cash shortfalls, and projections beyond the horizon', () => {
  const startDate = '2025-01-31';
  const empty = simulatePayoff([debt({ balance: 0 })], { startDate });
  assert.equal(empty.debtFreeDate, startDate);
  assert.equal(empty.monthsToPayoff, 0);
  assert.deepEqual(empty.months, []);
  assert.equal(debtFreeDate(startDate, 2), '2025-03-31');
  assert.equal(debtFreeDate(startDate, null), null);

  const plan = simulatePayoff(
    [debt({ balance: 100, interestRate: 12, monthlyPayment: 1 })],
    { startDate, monthlyExtra: -25, maxMonths: 2 },
  );
  assert.deepEqual(plan.months.map(month => month.totalBalance), [100, 100]);
  assert.equal(plan.debtFreeDate, null);
});

test('settlement fees honor the contract percentage, term caps and exemptions', () => {
  const loan = debt({ balance: 1_000, earlyRepaymentFeePct: 2 });
  assert.equal(earlyRepaymentFee(loan), 5);
  assert.equal(earlyRepaymentFee({ ...loan, remainingMonths: 13 }), 10);
  assert.equal(earlyRepaymentFee({ ...loan, earlyRepaymentFeePct: 0.25 }), 2.5);
  assert.equal(earlyRepaymentFee({ ...loan, rateType: 'variable' }), 0);
  assert.equal(earlyRepaymentFee({ ...loan, type: 'mortgage' }), 0);
  assert.equal(earlyRepaymentFee({ ...loan, type: 'overdraft' }), 0);
});

test('refinancing ranks compatible offers by savings after recurring and one-off fees', () => {
  const loan = debt({ monthlyPayment: 110, monthlyFees: 10, earlyRepaymentFeePct: 1 });
  const user = persona([loan, debt({ id: 'other', monthlyPayment: 290 })]);
  const results = rankRefinanceOffers(user, loan, [
    offer({ id: 'costly', monthlyFees: 20 }),
    offer({ id: 'mid', monthlyFees: 5 }),
    offer({ id: 'best' }),
    offer({ id: 'wrong-product', product: 'mortgage_refinance' }),
    offer({ id: 'too-small', maxAmount: 1_000 }),
  ]);
  assert.deepEqual(results.map(row => row.offer.id), ['best', 'mid', 'costly']);
  const [best] = results;
  assert.equal(best.existingTotal, 1_320);
  assert.equal(best.newLoanTotal, 1_248);
  assert.equal(best.originationFee, 12);
  assert.equal(best.earlyRepaymentFee, 6);
  assert.equal(best.netSavings, 66);
  assert.equal(best.monthlyPayment, 103);
  assert.equal(best.eligibility.debtToIncomeRatio, 0.393);
  assert.equal(best.eligibility.eligible, true);
  assert.equal(results[2].netSavings, -138);
  assert.equal(results[2].eligibility.eligible, false);
});

test('refinancing enforces term bounds and calculates payments with nonzero interest', () => {
  const loan = debt({ balance: 2_010 });
  const user = persona([loan]);
  const shortOffer = offer({ minTermMonths: 2, maxTermMonths: 6, interestRate: 12, monthlyFees: 0 });
  assert.deepEqual(rankRefinanceOffers(user, loan, [shortOffer], 1), []);
  assert.deepEqual(rankRefinanceOffers(user, loan, [shortOffer], 2.5), []);
  assert.equal(rankRefinanceOffers(user, loan, [shortOffer])[0].termMonths, 6);
  const [estimate] = rankRefinanceOffers(user, loan, [shortOffer], 2);
  assert.equal(estimate.monthlyPayment, 1_020.1);
  assert.equal(estimate.newLoanTotal, 2_060.3);
});

test('revolving balances support finite comparisons and unknown savings', () => {
  const loan = debt({ type: 'credit_card', balance: 600, monthlyPayment: 100, remainingMonths: null });
  const [amortizing] = rankRefinanceOffers(persona([loan]), loan, [offer()]);
  assert.equal(amortizing.existingTotal, 600);
  assert.equal(amortizing.existingMonths, 6);

  const interestOnly = { ...loan, balance: 1_000, monthlyPayment: 10, interestRate: 12 };
  const [unknown] = rankRefinanceOffers(persona([interestOnly]), interestOnly, [offer()]);
  assert.equal(unknown.existingTotal, null);
  assert.equal(unknown.netSavings, null);
});

test('eligibility reports late payments, missing income and ratios strictly over the cap', () => {
  assert.equal(estimateEligibility(1_000, 400, false).eligible, true);
  assert.deepEqual(estimateEligibility(1_000, 400.01, true).reasons, [
    'over_debt_to_income_cap', 'late_payments',
  ]);
  assert.deepEqual(estimateEligibility(0, 0, false).reasons, ['no_income']);
});

test('eligibility outlook finds the first month the remaining minimums are at the cap', () => {
  const user = persona([
    debt({ id: 'card', balance: 450 }),
    debt({ id: 'loan', balance: 4_000, monthlyPayment: 400 }),
  ]);
  const startDate = '2024-01-31';
  assert.deepEqual(eligibilityOutlook(user, 150, startDate), {
    month: 2, date: '2024-03-31', debtToIncomeRatio: 0.4, paidOffDebtIds: ['card'],
  });
  assert.equal(eligibilityOutlook(user, 0, startDate).month, 5);
});

test('eligibility outlook lists settled debts once and uses the transaction month by default', () => {
  const user = persona([
    debt({ id: 'first', balance: 150 }),
    debt({ id: 'second', balance: 450 }),
    debt({ id: 'loan', balance: 4_000, monthlyPayment: 400 }),
    debt({ id: 'settled', balance: 0, monthlyPayment: 600 }),
  ], {
    transactions: [{ date: '2025-12-30' }, { date: '2025-11-01' }],
    hadLatePayments: true,
  });
  assert.deepEqual(eligibilityOutlook(user, 0), {
    month: 3, date: '2026-04-01', debtToIncomeRatio: 0.4, paidOffDebtIds: ['first', 'second'],
  });
});

test('eligibility outlook handles an affordable budget, missing income and a stalled payoff', () => {
  const user = persona([debt()]);
  assert.deepEqual(eligibilityOutlook(user, 0), {
    month: 0, date: '2025-01-01', debtToIncomeRatio: 0.1, paidOffDebtIds: [],
  });
  assert.equal(eligibilityOutlook({ ...user, monthlyNetIncome: 0 }, 100), null);
  assert.equal(eligibilityOutlook(persona([debt({ monthlyPayment: 500, monthlyFees: 500 })]), 0), null);
});

test('spending breakdown ranks monthly averages and excludes debt payments and inflows', () => {
  const user = persona([], {
    transactions: [
      { date: '2026-08-01', amount: -90.02, category: 'groceries' },
      { date: '2026-08-08', amount: -30, category: 'utilities' },
      { date: '2026-09-02', amount: -90, category: 'groceries' },
      { date: '2026-09-10', amount: -900, category: 'debt_payment' },
      { date: '2026-10-01', amount: 1_000, category: 'salary' },
      { date: '2026-10-03', amount: 20, category: 'groceries' },
    ],
  });
  assert.deepEqual(spendingBreakdown(user), [
    { category: 'groceries', monthlyAmount: 60.01 },
    { category: 'utilities', monthlyAmount: 10 },
  ]);
  assert.deepEqual(spendingBreakdown(persona([])), []);
});

test('bundled demo profiles preserve the payoff and refinancing stories', () => {
  const loadFixture = file => JSON.parse(readFileSync(new URL(`../../data/${file}`, import.meta.url), 'utf8'));
  const radu = loadFixture('persona-1.json');
  const elena = loadFixture('persona-2.json');
  const offers = loadFixture('bank-offers.json');

  const raduBudget = summarizeBudget(radu, 0);
  assert.equal(raduBudget.monthlySurplus, 600);
  assert.equal(payoffOrder(radu.debts)[0]?.debt.type, 'credit_card');
  const raduEligibility = estimateEligibility(
    radu.monthlyNetIncome, raduBudget.monthlyDebtPayments, radu.hadLatePayments,
  );
  assert.equal(raduEligibility.eligible, true);
  const personalLoan = radu.debts.find(debt => debt.type === 'personal_loan');
  assert.ok(personalLoan, 'Radu needs a personal loan for the refinancing demo');
  assert.ok(
    rankRefinanceOffers(radu, personalLoan, offers)
      .some(offer => offer.eligibility.eligible && (offer.netSavings ?? 0) > 0),
    'Radu needs an eligible personal loan offer with positive net savings',
  );

  const elenaBudget = summarizeBudget(elena, 0);
  assert.ok(elenaBudget.monthlySurplus < 0, 'Elena needs a monthly budget shortfall');
  const elenaEligibility = estimateEligibility(
    elena.monthlyNetIncome, elenaBudget.monthlyDebtPayments, elena.hadLatePayments,
  );
  assert.equal(elenaEligibility.eligible, false);
  assert.deepEqual(elenaEligibility.reasons, ['over_debt_to_income_cap', 'late_payments']);
});

test('This month compares the slider against the recommended plan: more extra is sooner and cheaper, less is later and dearer', () => {
  const radu = JSON.parse(readFileSync(new URL('../../data/persona-1.json', import.meta.url), 'utf8'));
  const startDate = '2026-11-01';
  const paid = r => r.months.reduce((s, m) => s + m.payments.reduce((a, p) => a + p.minimumPaid + p.extraPrincipalPaid + p.earlyRepaymentFee, 0), 0);
  const recommended = simulatePayoff(radu.debts, { startDate, monthlyExtra: 600 });
  const more = simulatePayoff(radu.debts, { startDate, monthlyExtra: 1200 });
  const none = simulatePayoff(radu.debts, { startDate, monthlyExtra: 0 });
  assert.ok(recommended.monthsToPayoff - more.monthsToPayoff > 0, 'more extra finishes sooner');
  assert.ok(paid(recommended) - paid(more) > 0, 'more extra pays less in total');
  assert.ok(recommended.monthsToPayoff - none.monthsToPayoff < 0, 'no extra finishes later');
  assert.ok(paid(recommended) - paid(none) < 0, 'no extra pays more in total');
});

test('minimums-only projection settles a term loan at its contract end (D-047)', () => {
  const radu = JSON.parse(readFileSync(new URL('../../data/persona-1.json', import.meta.url), 'utf8'));
  const mortgage = radu.debts.find(d => d.type === 'mortgage');
  const result = simulatePayoff(radu.debts, { startDate: '2026-11-01', rollOverPayments: false });
  assert.equal(result.monthsToPayoff, mortgage.remainingMonths, 'ends with the mortgage term, not later');
  assert.equal(result.debtFreeDate, '2054-06-01');
});
