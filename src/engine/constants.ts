// Prototype defaults for RON loans. Update here when T02 confirms the demo rules.
// BNR Regulation 17/2012, art. 19: https://legislatie.just.ro/Public/DetaliiDocument/250947
export const MAX_DEBT_TO_INCOME_RATIO = 0.4;

// OUG 50/2010, arts. 67–68: https://legislatie.just.ro/public/DetaliiDocument/119472
// The prototype treats mortgages as covered by OUG 52/2016, art. 41:
// https://legislatie.just.ro/Public/FormaPrintabila/00000G0H4BU6A2QNLVC06KOPPNU0XAPA
export const EARLY_REPAYMENT_CAPS_PCT = {
  mortgage: 0,
  overdraft: 0,
  variable: 0,
  fixedUpToOneYear: 0.5,
  fixedOverOneYear: 1,
} as const;

export const PROJECTION_LIMIT_MONTHS = 600;
