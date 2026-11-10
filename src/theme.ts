/**
 * PePlus design tokens (D-019; mint since D-041, pastel mint since D-042).
 * Pastel mint #B5E8D3 is the brand fill (hero cards, primary buttons, selected states) with DARK
 * green text on it (`textInverse` #123B2C). Mint-coloured text on white uses `accentText` #2F6B55;
 * white text is kept only on dark fills (`white`). Slate #7185A8 / Mist #AABFDA = savings, progress.
 * Fixed meaning: deep mint text #316351 + mint fills = costs; slate = savings, paid off.
 * WCAG AA, checked with the formula: text on pastel mint 9.2, muted on it 5.8, accentText on white
 * 6.3 / background 5.8 / soft 5.6, text on pressed mint 8.0, white on deep mint 6.9, progress ring on
 * pastel 5.9, good (deep slate) on white 6.15, textMuted on background 5.0+.
 * The token is still called `palette.plum` so no screen code changes.
 */

export const palette = {
  plum: '#B5E8D3', // pastel mint since D-042 (was #9D5068, then #3A725E); name kept so nothing else changes
  slate: '#7185A8',
  mist: '#AABFDA',
  blush: '#C9EEDD',
  rose: '#8FD6B8',
} as const;

export const colors = {
  // Paper and ink
  background: '#F7F5F8',
  surface: '#FFFFFF',
  surfaceMuted: '#F1EEF3',
  border: '#E6E1E9',
  ink: '#2B3348',
  text: '#2B3348',
  textSecondary: '#454D63',
  textMuted: '#5E6578',
  /** Text on the pastel mint fills (hero cards, primary buttons, selected chips): dark green. */
  textInverse: '#123B2C',
  textInverseMuted: '#2E5A49',
  /** White text on dark fills (slate circles, dark chips, the cancel-confirm button). */
  white: '#FFFFFF',
  /** Mint-coloured text and lines on white (links, secondary buttons, active tab, slider). */
  accentText: '#2F6B55',

  // The one accent: mint (D-041, replaces plum)
  accent: palette.plum,
  accentPressed: '#9BDDC2',
  accentSoft: '#E3F6EE',

  // Hero card (mint, white text)
  hero: palette.plum,
  heroRaised: '#93D3B8',
  heroTrack: '#93D3B8',
  heroLit: '#1F5A45',

  // Meaning: costs (deep mint / soft mint) ...
  expensive: '#316351',
  expensiveFill: '#5FB894',
  expensiveSoft: '#DDF4EA',
  medium: '#2F6B55',
  mediumFill: palette.rose,
  mediumSoft: '#EEF9F4',
  cheap: '#5E6578',
  cheapFill: '#C9CDD8',
  cheapSoft: '#EFEDF2',
  // ... and savings / progress (slate/mist)
  good: '#4E6286',
  goodFill: palette.slate,
  goodSoft: '#E8EEF6',
  mist: palette.mist,
  blush: palette.blush,
  // Warnings only (over the 40% limit, spending more than you earn): the one red in the app.
  danger: '#B3261E', // 6.5:1 on white
  dangerFill: '#E5534B',
  dangerSoft: '#FCE4E2',
  overlay: 'rgba(43,51,72,0.45)',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, full: 999 } as const;

/** Type scale: 12 / 14 / 16 / 20 / 28 / 44. */
export const type = {
  display: { fontSize: 44, lineHeight: 50, fontWeight: '800' as const, letterSpacing: -1.2 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800' as const, letterSpacing: -0.6 },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const, letterSpacing: -0.3 },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '700' as const },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  smallStrong: { fontSize: 14, lineHeight: 20, fontWeight: '700' as const },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '700' as const, letterSpacing: 0.6, textTransform: 'uppercase' as const },
} as const;

export const shadow = {
  card: {
    shadowColor: '#2B3348',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
} as const;

export const touch = { minHeight: 48, minWidth: 48 } as const;

/** Cost level of a debt by its annual cost rate (interest + fees, % per year). */
export type CostLevel = 'expensive' | 'medium' | 'cheap';

export function costLevel(annualCostRate: number): CostLevel {
  if (annualCostRate >= 15) return 'expensive';
  if (annualCostRate >= 9) return 'medium';
  return 'cheap';
}

/** fg = text/borders (AA on white and on bg), bg = tag background, fill = bars and dots. */
export const costColors: Record<CostLevel, { fg: string; bg: string; fill: string }> = {
  expensive: { fg: colors.expensive, bg: colors.expensiveSoft, fill: colors.expensiveFill },
  medium: { fg: colors.medium, bg: colors.mediumSoft, fill: colors.mediumFill },
  cheap: { fg: colors.cheap, bg: colors.cheapSoft, fill: colors.cheapFill },
};

/** Romanian grouping with dots, independent of the device's Intl support: 1250 -> "1.250". */
export function formatNumber(amount: number): string {
  const rounded = Math.round(amount);
  const digits = Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return rounded < 0 ? `−${digits}` : digits;
}

/** 1250 -> "1.250 lei" */
export function formatLei(amount: number): string {
  return `${formatNumber(amount)} lei`;
}

export function formatPercent(fraction: number, digits = 0): string {
  if (!Number.isFinite(fraction)) return '—';
  return `${(fraction * 100).toFixed(digits)}%`;
}
