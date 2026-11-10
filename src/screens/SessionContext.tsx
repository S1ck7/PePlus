import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import {
  connectBanks, ensureSignedIn, getBackendStatus, listApplications, listOffers, loadProfile, loadSnapshot,
  saveProfile, submitApplication,
  type ApplicationInput, type BackendStatus, type BankSnapshot, type RefinanceApplication, type UserProfile,
} from '../backend';
import { getPersona, listBankOffers } from '../data';
import { useSelectedPersonaId } from '../data/PersonaContext';
import { useLanguage } from '../i18n';
import type { BankOffer } from '../types';

export interface SessionState {
  /** True once the first load from Firebase (or the local fallback) has finished. */
  loaded: boolean;
  status: BackendStatus;
  profile: UserProfile;
  snapshot: BankSnapshot | null;
  offers: readonly BankOffer[];
  applications: RefinanceApplication[];
  connect: (personaId: string, banks: readonly string[]) => Promise<BankSnapshot | null>;
  choosePersona: (personaId: string) => void;
  setLatePayments: (value: boolean) => void;
  saveExtra: (personaId: string, amount: number) => void;
  /** Refuses a second identical request (same debt, same bank) and returns the first one's reference. */
  submit: (input: ApplicationInput) => Promise<{ reference: string; duplicate: boolean }>;
  /** The earlier application for this debt at this bank, if any. */
  findApplication: (debtId: string, bank: string) => RefinanceApplication | undefined;
  /** Cancels a request: hidden from My applications and no longer blocks a new one to that bank. */
  cancelApplication: (reference: string) => void;
  /** Settings: the user's city and date of birth for this demo profile. */
}

const SessionContext = createContext<SessionState | null>(null);

function banksOf(personaId: string): string[] {
  const persona = getPersona(personaId);
  if (!persona) return [];
  return Array.from(new Set([...persona.accounts.map(a => a.bank), ...persona.debts.map(d => d.lender)]));
}

/**
 * Signs in anonymously on launch and keeps the user's profile, connected-bank snapshot and
 * applications in sync with the backend (Firebase, falling back to local data). The UI never
 * waits for it: screens start on bundled data and switch over once `loaded` is true.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const { language, setLanguage } = useLanguage();
  const [, setPersonaId] = useSelectedPersonaId();
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<BackendStatus>('offline');
  const [profile, setProfile] = useState<UserProfile>({});
  const [snapshot, setSnapshot] = useState<BankSnapshot | null>(null);
  const [offers, setOffers] = useState<readonly BankOffer[]>(listBankOffers());
  const [allApplications, setApplications] = useState<RefinanceApplication[]>([]);
  const extraTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cancelled requests stay stored (the rules allow no deletes) but leave the list and the duplicate check.
  const applications = allApplications.filter(app => !profile.cancelledApplications?.includes(app.reference));

  const refreshStatus = () => setStatus(getBackendStatus());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureSignedIn();
      const [savedProfile, savedSnapshot, savedOffers, savedApplications] = await Promise.all([
        loadProfile(), loadSnapshot(), listOffers(), listApplications(),
      ]);
      if (cancelled) return;
      setProfile(savedProfile);
      setSnapshot(savedSnapshot);
      setOffers(savedOffers);
      setApplications(savedApplications);
      if (savedProfile.language) setLanguage(savedProfile.language);
      if (savedProfile.personaId && getPersona(savedProfile.personaId)) setPersonaId(savedProfile.personaId);
      refreshStatus();
      setLoaded(true);
    })().catch(() => {
      if (!cancelled) setLoaded(true);
    });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Language persists across restarts.
  useEffect(() => {
    if (!loaded || profile.language === language) return;
    setProfile(p => ({ ...p, language }));
    void saveProfile({ language }).then(refreshStatus);
  }, [language, loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const connect = useCallback(async (personaId: string, banks: readonly string[]) => {
    const result = await connectBanks(personaId, banks);
    if (result) {
      setSnapshot(result);
      setProfile(p => ({ ...p, personaId, connectedBanks: result.connectedBanks }));
    }
    refreshStatus();
    return result;
  }, []);

  const choosePersona = useCallback((personaId: string) => {
    setPersonaId(personaId);
    // Switching demo profile reconnects all of that person's banks, so every tab reads a fresh snapshot.
    void connect(personaId, banksOf(personaId));
  }, [connect, setPersonaId]);

  const setLatePayments = useCallback((value: boolean) => {
    setProfile(p => ({ ...p, hadLatePayments: value }));
    void saveProfile({ hadLatePayments: value }).then(refreshStatus);
  }, []);

  const saveExtra = useCallback((personaId: string, amount: number) => {
    setProfile(p => ({ ...p, personaId, extraAmount: amount }));
    if (extraTimer.current) clearTimeout(extraTimer.current);
    extraTimer.current = setTimeout(() => {
      void saveProfile({ personaId, extraAmount: amount }).then(refreshStatus);
    }, 600);
  }, []);

  const bankOfOffer = useCallback((offerId: string) => offers.find(o => o.id === offerId)?.bank, [offers]);

  const findApplication = useCallback(
    (debtId: string, bank: string) =>
      applications.find(app => app.debtId === debtId && (bankOfOffer(app.offerId) ?? app.offerId) === bank),
    [applications, bankOfOffer],
  );

  const submit = useCallback(async (input: ApplicationInput) => {
    const bank = bankOfOffer(input.offerId) ?? input.offerId;
    const existing = findApplication(input.debtId, bank);
    if (existing) return { reference: existing.reference, duplicate: true };
    const reference = await submitApplication(input);
    setApplications(await listApplications());
    refreshStatus();
    return { reference, duplicate: false };
  }, [bankOfOffer, findApplication]);

  const cancelApplication = useCallback((reference: string) => {
    const next = Array.from(new Set([...(profile.cancelledApplications ?? []), reference]));
    setProfile(p => ({ ...p, cancelledApplications: next }));
    void saveProfile({ cancelledApplications: next }).then(refreshStatus);
  }, [profile.cancelledApplications]);


  return (
    <SessionContext.Provider
      value={{
        loaded, status, profile, snapshot, offers, applications,
        connect, choosePersona, setLatePayments, saveExtra, submit, findApplication, cancelApplication,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  const state = useContext(SessionContext);
  if (!state) throw new Error('useSession must be used inside SessionProvider');
  return state;
}
