// Shared data contract.
// All money is in RON (lei). Rates are annual percentages, e.g. 8.5 means 8.5%.
// shortcut: RON only, no EUR loans; add a currency field if a persona needs one.

export type DebtType =
  | 'mortgage'
  | 'personal_loan'
  | 'credit_card'
  | 'overdraft'
  | 'ifn_loan'
  | 'bnpl'
  | 'leasing';

export type RateType = 'fixed' | 'variable';
export type ReferenceIndex = 'IRCC' | 'ROBOR' | 'none';

export interface Debt {
  id: string;
  type: DebtType;
  lender: string;               // e.g. "Banca Transilvania", "Credius", "Mokka"
  balance: number;              // amount still owed
  originalAmount: number;
  interestRate: number;         // current annual nominal rate (index + margin for variable)
  rateType: RateType;
  referenceIndex: ReferenceIndex;
  dae: number;                  // annual cost incl. fees as stated by the lender (DAE)
  monthlyPayment: number;       // current required payment (minimum payment for cards/overdraft)
  monthlyFees: number;          // admin/account fees on top of interest, per month
  remainingMonths: number | null; // null for revolving debt (credit card, overdraft)
  creditLimit: number | null;   // credit card / overdraft only
  earlyRepaymentFeePct: number; // % of the prepaid amount charged for early repayment
  startDate: string;            // YYYY-MM-DD
}

export interface Account {
  id: string;
  bank: string;
  iban: string;
  type: 'current' | 'savings';
  balance: number;
}

export type TransactionCategory =
  | 'salary' | 'other_income'
  | 'rent' | 'utilities' | 'groceries' | 'transport' | 'health'
  | 'entertainment' | 'shopping' | 'subscriptions'
  | 'debt_payment' | 'other_expense';

export interface Transaction {
  id: string;
  accountId: string;
  date: string;                 // YYYY-MM-DD
  amount: number;               // positive = money in, negative = money out
  category: TransactionCategory;
  description: string;
  debtId?: string;              // set when category is 'debt_payment'
}

export interface BankOffer {
  id: string;
  bank: string;
  product: 'personal_refinance' | 'mortgage_refinance';
  interestRate: number;
  rateType: RateType;
  referenceIndex: ReferenceIndex;
  dae: number;
  originationFeePct: number;    // one-off fee, % of the new loan
  monthlyFees: number;
  minAmount: number;
  maxAmount: number;
  minTermMonths: number;
  maxTermMonths: number;
  sourceUrl: string;
  collectedOn: string;          // YYYY-MM-DD
}

export interface Persona {
  id: string;
  name: string;
  age: number;
  city: string;
  monthlyNetIncome: number;
  hadLatePayments: boolean;     // the user's answer to the eligibility question (D-006)
  accounts: Account[];
  transactions: Transaction[];  // at least 3 months
  debts: Debt[];
}
