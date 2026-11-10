import type { BankOffer, Persona } from '../types';

export interface UserProfile {
  personaId?: string;
  connectedBanks?: string[];
  hadLatePayments?: boolean;
  extraAmount?: number;
  language?: 'en' | 'ro';
  /** Settings page: the user's own city and date of birth (YYYY-MM-DD), per demo profile. */
  details?: Record<string, { city?: string; birthDate?: string }>;
  /** References of refinance requests the user cancelled (hidden from the list, no longer duplicates). */
  cancelledApplications?: string[];
}

export interface BankSnapshot {
  persona: Persona;
  connectedBanks: string[];
  connectedAt: string;
}

export interface ApplicationInput {
  debtId: string;
  offerId: string;
  netSavings: number | null;
  monthlyPayment: number;
}

export interface RefinanceApplication extends ApplicationInput {
  reference: string;
  createdAt: string;
}

export type BackendStatus = 'unconfigured' | 'offline' | 'online';

export interface RemoteBackend {
  ensureSignedIn(): Promise<string>;
  loadProfile(uid: string): Promise<UserProfile | null>;
  saveProfile(uid: string, patch: UserProfile): Promise<void>;
  connectBanks(uid: string, snapshot: BankSnapshot, patch: UserProfile): Promise<void>;
  loadSnapshot(uid: string): Promise<BankSnapshot | null>;
  listOffers(): Promise<readonly BankOffer[]>;
  submitApplication(uid: string, application: RefinanceApplication): Promise<void>;
  listApplications(uid: string): Promise<RefinanceApplication[]>;
}

interface BackendOptions {
  remote?: RemoteBackend;
  storage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
  };
  storageKey: string;
  getPersona(id: string): Persona | undefined;
  bundledOffers: readonly BankOffer[];
  timeoutMs?: number;
}

interface LocalState {
  profile: UserProfile;
  pendingProfile: UserProfile;
  snapshot: BankSnapshot | null;
  applications: RefinanceApplication[];
}

type RemoteResult<T> = { ok: true; value: T } | { ok: false };

function withTimeout<T>(request: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Firebase request timed out')), timeoutMs);
  });
  return Promise.race([request, deadline]).finally(() => clearTimeout(timer));
}

export function createBackend(options: BackendOptions) {
  const { remote, storage, storageKey, getPersona, bundledOffers, timeoutMs = 4_000 } = options;
  let status: BackendStatus = remote ? 'offline' : 'unconfigured';
  let local: LocalState | undefined;
  let queue = Promise.resolve();
  let inFlight: Promise<unknown> | undefined;

  function inOrder<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation);
    queue = result.then(() => undefined, () => undefined);
    return result;
  }

  async function readLocal(): Promise<LocalState> {
    if (!local) {
      local = { profile: {}, pendingProfile: {}, snapshot: null, applications: [] };
      try {
        const json = await storage.getItem(storageKey);
        if (json) local = { ...local, ...JSON.parse(json) };
      } catch {
        // The in-memory state still works if local storage is unavailable.
      }
    }
    return local!;
  }

  async function writeLocal(value: LocalState): Promise<void> {
    local = value;
    try {
      await storage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // Keep the current session usable if storage is full or disabled.
    }
  }

  async function request<T>(
    operation: (client: RemoteBackend, uid: string) => T | Promise<T>,
  ): Promise<RemoteResult<T>> {
    if (!remote || inFlight) return { ok: false };
    let expired = false;
    const pending = Promise.resolve().then(() => remote.ensureSignedIn()).then(uid => {
      if (expired) throw new Error('Firebase sign-in timed out');
      return operation(remote, uid);
    });
    inFlight = pending;
    const clear = () => { inFlight = undefined; };
    void pending.then(clear, clear);

    try {
      const value = await withTimeout(pending, timeoutMs);
      status = 'online';
      return { ok: true, value };
    } catch {
      expired = true;
      status = 'offline';
      return { ok: false };
    }
  }

  function ensureSignedIn(): Promise<string | null> {
    return inOrder(async () => {
      const result = await request((_, uid) => uid);
      return result.ok ? result.value : null;
    });
  }

  function loadProfile(): Promise<UserProfile> {
    return inOrder(async () => {
      const state = await readLocal();
      const result = await request((client, uid) => client.loadProfile(uid));
      if (!result.ok) return state.profile;
      const profile = { ...(result.value ?? state.profile), ...state.pendingProfile };
      await writeLocal({ ...state, profile });
      return profile;
    });
  }

  function saveProfile(partial: Omit<UserProfile, 'connectedBanks'>): Promise<UserProfile> {
    return inOrder(async () => {
      const state = await readLocal();
      const patch = Object.fromEntries(Object.entries(partial).filter(([, value]) => value !== undefined));
      const profile = { ...state.profile, ...patch };
      const pendingProfile = { ...state.pendingProfile, ...patch };
      await writeLocal({ ...state, profile, pendingProfile });
      // Only a successful snapshot batch should publish a change in connected banks.
      const { connectedBanks: pendingBanks, ...remotePatch } = pendingProfile;
      if (Object.keys(remotePatch).length > 0) {
        const result = await request((client, uid) => client.saveProfile(uid, remotePatch));
        if (result.ok) {
          await writeLocal({
            ...state, profile,
            pendingProfile: pendingBanks === undefined ? {} : { connectedBanks: pendingBanks },
          });
        }
      }
      return profile;
    });
  }

  function connectBanks(personaId: string, banks: readonly string[]): Promise<BankSnapshot | null> {
    return inOrder(async () => {
      const persona = getPersona(personaId);
      if (!persona) return null;
      const connectedBanks = Array.from(new Set(banks));
      const selected = new Set(connectedBanks);
      const accounts = persona.accounts.filter(account => selected.has(account.bank));
      const accountIds = new Set(accounts.map(account => account.id));
      const snapshot: BankSnapshot = {
        connectedBanks,
        connectedAt: new Date().toISOString(),
        persona: {
          ...persona,
          accounts,
          debts: persona.debts.filter(debt => selected.has(debt.lender)),
          transactions: persona.transactions.filter(transaction => accountIds.has(transaction.accountId)),
        },
      };
      const state = await readLocal();
      const patch = { ...state.pendingProfile, personaId, connectedBanks };
      const profile = { ...state.profile, ...patch };
      await writeLocal({ ...state, profile, pendingProfile: patch, snapshot });
      const result = await request((client, uid) => client.connectBanks(uid, snapshot, patch));
      if (result.ok) await writeLocal({ ...state, profile, pendingProfile: {}, snapshot });
      return snapshot;
    });
  }

  function loadSnapshot(): Promise<BankSnapshot | null> {
    return inOrder(async () => {
      const state = await readLocal();
      const result = await request((client, uid) => client.loadSnapshot(uid));
      const remoteSnapshot = result.ok ? result.value : null;
      if (!remoteSnapshot || (state.snapshot && state.snapshot.connectedAt > remoteSnapshot.connectedAt)) {
        return state.snapshot;
      }
      await writeLocal({ ...state, snapshot: remoteSnapshot });
      return remoteSnapshot;
    });
  }

  function listOffers(): Promise<readonly BankOffer[]> {
    return inOrder(async () => {
      const result = await request(client => client.listOffers());
      return result.ok && result.value.length > 0 ? result.value : bundledOffers;
    });
  }

  function submitApplication(input: ApplicationInput): Promise<string> {
    return inOrder(async () => {
      const state = await readLocal();
      const now = new Date();
      const reference = `VH-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 12)}`.toUpperCase();
      const application: RefinanceApplication = { ...input, reference, createdAt: now.toISOString() };
      await writeLocal({ ...state, applications: [application, ...state.applications] });
      await request((client, uid) => client.submitApplication(uid, application));
      return reference;
    });
  }

  function listApplications(): Promise<RefinanceApplication[]> {
    return inOrder(async () => {
      const state = await readLocal();
      const result = await request((client, uid) => client.listApplications(uid));
      if (!result.ok) return state.applications;
      const byReference = new Map(state.applications.map(app => [app.reference, app]));
      for (const app of result.value) byReference.set(app.reference, app);
      const applications = Array.from(byReference.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      await writeLocal({ ...state, applications });
      return applications;
    });
  }

  return {
    ensureSignedIn, loadProfile, saveProfile, connectBanks, loadSnapshot,
    listOffers, submitApplication, listApplications,
    getBackendStatus: (): BackendStatus => status,
  };
}
