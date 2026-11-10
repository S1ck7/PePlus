import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { colors } from '../theme';

/* Brand marks of the lenders in our data (assets/banks/). Shown on one uniform white tile so
   different logos read as one set in the PePlus UI; unknown lenders fall back to initials. */
const LOGOS: Record<string, ImageSourcePropType> = {
  'Banca Transilvania': require('../../assets/banks/bt.png'),
  BCR: require('../../assets/banks/bcr.png'),
  'ING Bank': require('../../assets/banks/ing.png'),
  'Raiffeisen Bank': require('../../assets/banks/raiffeisen.png'),
  BRD: require('../../assets/banks/brd.png'),
  'CEC Bank': require('../../assets/banks/cec.png'),
  'UniCredit Bank': require('../../assets/banks/unicredit.png'),
  'Credius IFN': require('../../assets/banks/credius.png'),
  Mokka: require('../../assets/banks/mokka.png'),
  'tbi bank': require('../../assets/banks/tbi.png'),
  'BT Leasing': require('../../assets/banks/btleasing.png'),
};

export function hasBankLogo(bank: string): boolean {
  return bank in LOGOS;
}

interface BankLogoProps {
  bank: string;
  size?: number;
  /** Dim the logo (e.g. a bank that is not selected). */
  muted?: boolean;
}

export function BankLogo({ bank, size = 44, muted }: BankLogoProps) {
  const source = LOGOS[bank];
  const initials = bank.split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase();
  return (
    <View
      style={[styles.tile, { width: size, height: size, borderRadius: size * 0.28 }, muted && { opacity: 0.45 }]}
      accessibilityLabel={bank}
    >
      {source ? (
        <Image source={source} style={{ width: size * 0.78, height: size * 0.78 }} resizeMode="contain" />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.28 }]}>{initials}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: { fontWeight: '800', color: colors.textSecondary },
});
