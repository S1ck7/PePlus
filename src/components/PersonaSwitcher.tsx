import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLanguage, type Language } from '../i18n';
import { usePlan } from '../screens/PlanContext';
import { colors, formatLei, radius, spacing, type } from '../theme';
import { Label, Sheet } from './ui';

function initials(name: string) {
  return name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
}

/** Small avatar in the header. Opens a sheet to switch demo profile (and language) for the whole app. */
export function PersonaSwitcher() {
  const { t, language, setLanguage } = useLanguage();
  const { persona, personas, setPersonaId } = usePlan();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('header.persona', { name: persona.name })}
        onPress={() => setOpen(true)}
        style={styles.chip}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(persona.name)}</Text>
        </View>
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)}>
        <View style={styles.sheetHeader}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text style={styles.sheetTitle}>{t('persona.sheetTitle')}</Text>
            <Text style={styles.sheetNote}>{t('persona.sheetNote')}</Text>
          </View>
          {/* Language switch, top-right of the profile menu. */}
          <View style={styles.segment} accessibilityLabel={t('settings.language')}>
            {(['en', 'ro'] as Language[]).map(lang => {
              const active = language === lang;
              return (
                <Pressable
                  key={lang}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={lang === 'en' ? 'English' : 'Română'}
                  onPress={() => setLanguage(lang)}
                  style={[styles.segmentItem, active && styles.segmentActive]}
                >
                  <Text style={[styles.segmentText, active && { color: colors.textInverse }]}>{lang.toUpperCase()}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        {personas.map(p => {
          const active = p.id === persona.id;
          return (
            <Pressable
              key={p.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => { setPersonaId(p.id); setOpen(false); }}
              style={[styles.row, active && styles.rowActive]}
            >
              <View style={[styles.avatar, styles.avatarLarge, active && { backgroundColor: colors.accent }]}>
                <Text style={[styles.avatarText, active && { color: colors.textInverse }]}>{initials(p.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{p.name}</Text>
                <Text style={styles.rowLine}>
                  {t('persona.line', { age: active ? persona.age : p.age, city: active ? persona.city : p.city, income: formatLei(p.monthlyNetIncome) })}
                </Text>
              </View>
              {active ? <Label style={{ color: colors.accentText }}>✓</Label> : null}
            </Pressable>
          );
        })}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  chip: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  avatar: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  avatarLarge: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { fontSize: 13, fontWeight: '800', color: colors.accentText },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  sheetTitle: { ...type.heading, color: colors.text },
  sheetNote: { ...type.small, color: colors.textMuted },
  segment: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: radius.full, padding: 3, gap: 2 },
  segmentItem: { minWidth: 44, minHeight: 36, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  segmentActive: { backgroundColor: colors.accent },
  segmentText: { ...type.smallStrong, color: colors.textSecondary },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, minHeight: 64,
  },
  rowActive: { borderColor: colors.accentText, backgroundColor: colors.accentSoft },
  rowName: { ...type.bodyStrong, color: colors.text },
  rowLine: { ...type.small, color: colors.textMuted },
});
