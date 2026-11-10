import { readdirSync, readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';

// Resolve the engine's Metro-style import under Node, as the engine tests do.
const engineUrl = new URL('../src/engine/index.ts', import.meta.url);
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === engineUrl.href && specifier === './constants') {
      return nextResolve('./constants.ts', context);
    }
    return nextResolve(specifier, context);
  },
});
const {
  eligibilityOutlook, estimateEligibility, rankRefinanceOffers,
  simulatePayoff, summarizeBudget,
} = await import(engineUrl.href).finally(() => hooks.deregister());

const dataDir = new URL('../data/', import.meta.url);
const readData = name => JSON.parse(readFileSync(new URL(name, dataDir), 'utf8'));
const personaFiles = readdirSync(dataDir).filter(name => /^persona-.+\.json$/.test(name)).sort();
const offers = readData('bank-offers.json');
const startDate = '2026-11-01';
const safetyBuffer = 0;

const leiNumber = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
const rate = new Intl.NumberFormat('en-GB', { style: 'percent', maximumFractionDigits: 2 });
const ratio = new Intl.NumberFormat('en-GB', {
  style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1,
});
const monthYear = new Intl.DateTimeFormat('en-GB', {
  month: 'short', year: 'numeric', timeZone: 'UTC',
});
const reasons = {
  no_income: 'no income',
  over_debt_to_income_cap: 'over the DTI cap',
  late_payments: 'late payments reported',
};

const formatLei = amount => `${leiNumber.format(amount)} lei`;
const formatDate = date => date ? monthYear.format(new Date(date + 'T00:00:00Z')) : 'outside projection';
const formatRatio = value => Number.isFinite(value) ? ratio.format(value) : 'unavailable';
const formatDebt = debt => `${debt.lender} ${debt.type.replaceAll('_', ' ')}`;
const formatEligibility = result =>
  result.eligible ? 'eligible' : `ineligible (${result.reasons.map(reason => reasons[reason]).join(', ')})`;

console.log(`Demo snapshot: ${startDate} | Monthly safety buffer: ${formatLei(safetyBuffer)}`);

for (const file of personaFiles) {
  const persona = readData(file);
  const budget = summarizeBudget(persona, safetyBuffer);
  const extra = Math.max(0, budget.monthlySurplus);
  const eligibility = estimateEligibility(budget.monthlyIncome, budget.monthlyDebtPayments, persona.hadLatePayments);
  const plan = simulatePayoff(persona.debts, { startDate, monthlyExtra: extra, rollOverPayments: true });
  const minimumOnly = simulatePayoff(persona.debts, { startDate, monthlyExtra: 0, rollOverPayments: false });
  const outlook = eligibilityOutlook(persona, extra, startDate);

  console.log(`\n${persona.name} (${persona.id})`);
  console.log(`  Monthly surplus: ${formatLei(budget.monthlySurplus)} | Extra toward debt: ${formatLei(extra)}/month`);
  console.log(`  Debt-to-income: ${formatRatio(budget.debtToIncomeRatio)} | ${formatEligibility(eligibility)}`);
  const order = plan.order.map(({ debt }) => formatDebt(debt)).join(' -> ');
  console.log(`  Payoff order: ${order || 'no open debts'}`);
  console.log(`  Debt-free with plan: ${formatDate(plan.debtFreeDate)}`);
  console.log(`  Debt-free with minimum payments only: ${formatDate(minimumOnly.debtFreeDate)}`);
  if (plan.monthsToPayoff !== null && minimumOnly.monthsToPayoff !== null) {
    console.log(`  Months saved: ${minimumOnly.monthsToPayoff - plan.monthsToPayoff}`);
  }

  if (outlook?.month === 0) {
    console.log('  DTI outlook: already within the cap');
  } else if (outlook) {
    const paidOff = outlook.paidOffDebtIds.map(id => formatDebt(persona.debts.find(debt => debt.id === id)));
    console.log(`  DTI at or below ${rate.format(eligibility.cap)} by ${formatDate(outlook.date)} (${formatRatio(outlook.debtToIncomeRatio)})`);
    console.log(`  Debts paid off by then: ${paidOff.join(', ')}`);
  } else {
    console.log('  DTI outlook: no date within the projection');
  }

  console.log('  Best refinancing offers by net savings:');
  for (const debt of persona.debts) {
    const [best] = rankRefinanceOffers(persona, debt, offers);
    if (!best) {
      console.log(`    ${formatDebt(debt)}: no matching offer`);
      continue;
    }
    const savings = best.netSavings === null ? 'unavailable' : formatLei(best.netSavings);
    console.log(`    ${formatDebt(debt)}: ${best.offer.bank}, ${rate.format(best.offer.interestRate / 100)} ${best.offer.rateType}`);
    console.log(`      Net savings: ${savings} | Monthly payment: ${formatLei(debt.monthlyPayment)} -> ${formatLei(best.monthlyPayment)}`);
    console.log(`      Debt-to-income: ${formatRatio(best.eligibility.debtToIncomeRatio)} | ${formatEligibility(best.eligibility)}`);
  }
}
