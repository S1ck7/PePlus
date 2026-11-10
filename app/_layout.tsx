import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { PersonaSwitcher } from '../src/components/PersonaSwitcher';
import { BankIcon, CalendarIcon, GoalIcon, HomeIcon } from '../src/components/TabIcons';
import { PersonaProvider } from '../src/data/PersonaContext';
import { LanguageProvider, useLanguage } from '../src/i18n';
import { PlanProvider } from '../src/screens/PlanContext';
import { SessionProvider } from '../src/screens/SessionContext';
import { colors, touch } from '../src/theme';

const logo = require('../assets/brand/logo-mint.png');

// Each tab answers one question: How bad is it? / What do I do this month? / Can I pay less? / When am I free?
const tabs = [
  { name: 'overview', title: 'nav.overview', Icon: HomeIcon },
  { name: 'plan', title: 'nav.plan', Icon: CalendarIcon },
  { name: 'refinance', title: 'nav.refinance', Icon: BankIcon },
  { name: 'progress', title: 'nav.progress', Icon: GoalIcon },
] as const;

function HeaderRight() {
  const router = useRouter();
  const { t } = useLanguage();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('header.about')}
      onPress={() => router.push('/about')}
      style={styles.headerButton}
    >
      <View style={styles.infoCircle}>
        <Text style={styles.infoText}>i</Text>
      </View>
    </Pressable>
  );
}

/** Profile avatar on the left; the language switch lives in the profile sheet. */
function HeaderLeft() {
  return <View style={styles.headerLeft}><PersonaSwitcher /></View>;
}

/** Logo only; the page title is read out for screen readers but not shown. */
function HeaderTitle({ title }: { title: string }) {
  return (
    <View accessibilityRole="header" accessibilityLabel={`PePlus, ${title}`}>
      <Image source={logo} style={styles.logo} resizeMode="contain" />
    </View>
  );
}

function AppTabs() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerLeft: () => <HeaderLeft />,
        headerRight: () => <HeaderRight />,
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerTitleContainerStyle: { paddingVertical: 2 },
        headerStyle: { backgroundColor: colors.background },
        headerTitle: ({ children }) => <HeaderTitle title={String(children)} />,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.accentText,
        tabBarInactiveTintColor: colors.textMuted,
        // Always show text labels under the icons (wide screens would otherwise put them beside or drop them).
        tabBarShowLabel: true,
        tabBarLabelPosition: 'below-icon',
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
        // Room for icon + label, plus the device's bottom inset (Android gesture bar); on web the inset is 0.
        tabBarStyle: {
          backgroundColor: colors.surface, borderTopColor: colors.border,
          height: 62 + insets.bottom, paddingTop: 6, paddingBottom: Math.max(6, insets.bottom),
        },
      }}
    >
      <Tabs.Screen name="index" options={{ href: null, headerShown: false, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen
        name="connect"
        options={{ href: null, headerShown: false, tabBarStyle: { display: 'none' }, title: t('nav.connect') }}
      />
      <Tabs.Screen
        name="about"
        options={{ href: null, title: t('about.title'), headerRight: () => null }}
      />
      {tabs.map(({ name, title, Icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: t(title),
            tabBarAccessibilityLabel: t(title),
            tabBarIcon: ({ color }) => <Icon color={String(color)} />,
          }}
        />
      ))}
    </Tabs>
  );
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <PersonaProvider>
        <SessionProvider>
        <PlanProvider>
          <StatusBar style="dark" />
          <AppTabs />
        </PlanProvider>
        </SessionProvider>
      </PersonaProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  headerButton: { ...touch, alignItems: 'center', justifyContent: 'center', marginHorizontal: 8 },
  headerLeft: { marginLeft: 8 },
  infoCircle: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: colors.textSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  infoText: { fontSize: 15, fontWeight: '800', color: colors.textSecondary, fontStyle: 'italic' },
  icon: { fontSize: 20, lineHeight: 24 },
  logo: { width: 56, height: 32 },
});
