import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { useSession } from '../src/screens/SessionContext';
import { colors } from '../src/theme';

const logo = require('../assets/brand/logo-mint.png');

/** Brand screen shown at least this long, so it reads as a splash rather than a flicker. */
const MIN_SPLASH_MS = 1200;
/** Never hold the user longer than this (the backend times out at 4 s). */
const MAX_SPLASH_MS = 6000;

/**
 * Start screen: full-viewport plum with the white PePlus logo in the centre, while the session
 * loads. Returning users (banks already connected) then open on Home; new users start at Connect.
 */
export default function Index() {
  const { loaded, snapshot } = useSession();
  const [minElapsed, setMinElapsed] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    const min = setTimeout(() => setMinElapsed(true), MIN_SPLASH_MS);
    const max = setTimeout(() => setGaveUp(true), MAX_SPLASH_MS);
    return () => { clearTimeout(min); clearTimeout(max); };
  }, []);

  if (!minElapsed || (!loaded && !gaveUp)) {
    return (
      <View style={styles.splash} accessibilityLabel="PePlus">
        <Image source={logo} style={styles.logo} resizeMode="contain" />
      </View>
    );
  }
  return <Redirect href={snapshot ? '/overview' : '/connect'} />;
}

const styles = StyleSheet.create({
  // Fills the whole viewport (100% width and height) with the primary brand colour.
  splash: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 180, height: 120 },
});
