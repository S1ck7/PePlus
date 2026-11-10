import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Screen } from '../components/ui';
import { useLanguage } from '../i18n';
import type { TranslationKey } from '../i18n/en';
import { colors, spacing, type } from '../theme';

const SECTIONS: { title: TranslationKey; text?: TranslationKey; bullets: TranslationKey[] }[] = [
  { title: 'about.s1.title', text: 'about.s1.text', bullets: ['about.s1.b1', 'about.s1.b2'] },
  { title: 'about.s2.title', bullets: ['about.s2.b1', 'about.s2.b2', 'about.s2.b3', 'about.s2.b4'] },
  { title: 'about.s3.title', text: 'about.s3.text', bullets: [] },
  { title: 'about.s4.title', bullets: ['about.s4.b1', 'about.s4.b2', 'about.s4.b3'] },
];

export default function AboutScreen() {
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <Screen>
      <Text style={styles.subtitle}>{t('about.subtitle')}</Text>
      {SECTIONS.map(section => (
        <Card key={section.title} style={{ gap: spacing.sm }}>
          <Text accessibilityRole="header" style={styles.title}>{t(section.title)}</Text>
          {section.text ? <Text style={styles.body}>{t(section.text)}</Text> : null}
          {section.bullets.map(key => (
            <View key={key} style={styles.bullet}>
              <View style={styles.dot} />
              <Text style={[styles.body, { flex: 1 }]}>{t(key)}</Text>
            </View>
          ))}
        </Card>
      ))}
      <Button label={t('about.reconnect')} variant="secondary" onPress={() => router.replace('/connect')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { ...type.body, color: colors.textSecondary },
  title: { ...type.heading, fontSize: 18, color: colors.text },
  body: { ...type.small, fontSize: 15, lineHeight: 22, color: colors.textSecondary },
  bullet: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent, marginTop: 9 },
});
