import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { listPersonas } from '../data';
import { useSelectedPersonaId } from '../data/PersonaContext';
import { payoffOrder, simulatePayoff, summarizeBudget } from '../engine';
import type { BankOffer, Persona } from '../types';
import { useSession } from './SessionContext';
import { ageFrom } from './dates';

/** First day of the month after the latest transaction: the plan starts "today". */
function planStartDate(persona: Persona): string {
  const latest = persona.transactions.reduce((max, { date }) => (date > max ? date : max), '');
  if (!latest) return new Date().toISOString().slice(0, 8) + '01';
  const [y, m] = latest.split('-').map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  return `${next}-01`;
}

/** Everything paid in one projected month (minimums, extra and early-repayment fees). */
export function paidInMonth(month: ReturnType<typeof simulatePayoff>['months'][number] | undefined): number {
  return month ? month.payments.reduce((sum, p) => sum + p.minimumPaid + p.extraPrincipalPaid + p.earlyRepaymentFee, 0) : 0;
}

function totalPaid(months: ReturnType<typeof simulatePayoff>['months']): number {
  let total = 0;
  for (const month of months) {
    for (const p of month.payments) total += p.minimumPaid + p.extraPrincipalPaid + p.earlyRepaymentFee;
  }
  return total;
}

function buildPlan(persona: Persona, extra: number, suggestedExtra: number) {
  const startDate = planStartDate(persona);
  const budget = summarizeBudget(persona, 0);
  const order = payoffOrder(persona.debts);
  const plan = simulatePayoff(persona.debts, { startDate, monthlyExtra: extra });
  const minimum = simulatePayoff(persona.debts, { startDate, monthlyExtra: 0, rollOverPayments: false });
  // Our recommended plan (all the left-over money as extra): the slider is compared against this.
  const recommended = extra === suggestedExtra ? plan : simulatePayoff(persona.debts, { startDate, monthlyExtra: suggestedExtra });
  // Same payments as today, rolled over, no extra: shows how much of the gain is the rollover alone (D-047).
  const noExtra = extra === 0 ? plan : simulatePayoff(persona.debts, { startDate, monthlyExtra: 0 });
  const totalDebt = persona.debts.reduce((sum, d) => sum + Math.max(0, d.balance), 0);
  const totalBorrowed = persona.debts.reduce((sum, d) => sum + Math.max(d.originalAmount, d.balance), 0);
  const annualCost = order.reduce((sum, o) => sum + o.annualCost, 0);

  /** Month index (1-based) each debt reaches zero under the plan. */
  const payoffMonth = new Map<string, number>();
  for (const month of plan.months) {
    for (const p of month.payments) {
      if (p.balance === 0 && !payoffMonth.has(p.debtId)) payoffMonth.set(p.debtId, month.month);
    }
  }
  const interestAvoided = minimum.monthsToPayoff === null && plan.monthsToPayoff !== null
    ? null
    : Math.max(0, totalPaid(minimum.months) - totalPaid(plan.months));
  // Signed, against the recommended plan: positive = sooner / cheaper than our plan, negative = later / dearer.
  const bothEnd = plan.monthsToPayoff !== null && recommended.monthsToPayoff !== null;
  const monthsVsPlan = bothEnd ? recommended.monthsToPayoff! - plan.monthsToPayoff! : null;
  const savedVsPlan = bothEnd ? Math.round(totalPaid(recommended.months) - totalPaid(plan.months)) : null;

  return {
    startDate, budget, order, plan, minimum, totalDebt, totalBorrowed, annualCost, payoffMonth, interestAvoided,
    monthsVsPlan, savedVsPlan, noExtra,
  };
}

export type PlanState = ReturnType<typeof buildPlan> & {
  persona: Persona;
  personas: readonly Persona[];
  setPersonaId: (id: string) => void;
  offers: readonly BankOffer[];
  /** The money left over each month (never negative): the suggested extra. */
  suggestedExtra: number;
  /** Top of the "What if I pay more?" slider, from income (see below). */
  maxExtra: number;
  extra: number;
  setExtra: (value: number) => void;
};

const PlanContext = createContext<PlanState | null>(null);

/** Headroom on the "What if I pay more?" slider, as a share of monthly net income. */
const MAX_EXTRA_INCOME_SHARE = 0.1;

/** One plan for the selected persona, shared by every tab, so -/+ on Plan moves the date everywhere. */
export function PlanProvider({ children }: { children: ReactNode }) {
  const personas = listPersonas();
  const session = useSession();
  const [personaId] = useSelectedPersonaId();
  const bundled = personas.find(p => p.id === personaId) ?? personas[0];

  // The connected-bank snapshot (Firebase or local) wins over the bundled file for the same person.
  // The late-payment answer comes only from the user (D-014). Until they answer, we neither assume
  // nor state late payments: eligibility then rests on debt-to-income alone, and Pay less asks the question.
  const persona = useMemo<Persona>(() => {
    const base = session.snapshot?.persona.id === bundled.id ? session.snapshot.persona : bundled;
    // Settings (city, date of birth) override the demo file for this profile.
    const details = session.profile.details?.[bundled.id];
    return {
      ...base,
      hadLatePayments: session.profile.hadLatePayments ?? false,
      city: details?.city || base.city,
      age: details?.birthDate ? ageFrom(details.birthDate) : base.age,
    };
  }, [bundled, session.snapshot, session.profile.hadLatePayments, session.profile.details]);

  const suggestedExtra = useMemo(
    () => Math.max(0, Math.round(summarizeBudget(persona, 0).monthlySurplus)),
    [persona],
  );
  // Slider ceiling from income: the money left after living costs and minimum payments, plus 10%
  // of income as headroom for spending cuts (so the user can see what cutting back would buy).
  const maxExtra = useMemo(() => {
    const b = summarizeBudget(persona, 0);
    const free = Math.max(0, b.monthlyIncome - b.monthlyLivingExpenses - b.monthlyDebtPayments);
    const ceiling = Math.ceil((free + b.monthlyIncome * MAX_EXTRA_INCOME_SHARE) / 100) * 100;
    return Math.max(100, ceiling, Math.ceil(suggestedExtra / 100) * 100);
  }, [persona, suggestedExtra]);

  const savedExtra = session.profile.personaId === persona.id ? session.profile.extraAmount : undefined;
  const [extra, setExtraState] = useState(suggestedExtra);
  useEffect(
    () => setExtraState(Math.min(savedExtra ?? suggestedExtra, maxExtra)),
    [persona.id, suggestedExtra, maxExtra, session.loaded], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const setExtra = (v: number) => {
    const next = Math.max(0, Math.min(maxExtra, Math.round(v)));
    setExtraState(next);
    session.saveExtra(persona.id, next);
  };

  const derived = useMemo(() => buildPlan(persona, extra, suggestedExtra), [persona, extra, suggestedExtra]);
  const value: PlanState = {
    ...derived,
    persona,
    personas,
    setPersonaId: session.choosePersona,
    offers: session.offers,
    suggestedExtra,
    maxExtra,
    extra,
    setExtra,
  };

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanState {
  const state = useContext(PlanContext);
  if (!state) throw new Error('usePlan must be used inside PlanProvider');
  return state;
}
