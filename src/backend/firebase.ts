import { getApps, initializeApp } from 'firebase/app';
import { signInAnonymously } from 'firebase/auth';
import {
  collection, doc, getDoc, getDocs, getFirestore, setDoc, writeBatch,
} from 'firebase/firestore/lite';

import type { BankOffer } from '../types';
import { getAppAuth } from './auth';
import { firebaseConfig } from './firebaseConfig';
import type { BankSnapshot, RefinanceApplication, RemoteBackend, UserProfile } from './service';

function initializeClient() {
  const name = 'debt-planner';
  const app = getApps().find(candidate => candidate.name === name) ?? initializeApp(firebaseConfig, name);
  const auth = getAppAuth(app);
  const db = getFirestore(app);
  return { auth, db };
}

export function createFirebaseBackend(): RemoteBackend | undefined {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) return undefined;

  let initialized: ReturnType<typeof initializeClient> | undefined;
  const client = () => initialized ??= initializeClient();
  const user = (uid: string) => doc(client().db, 'users', uid);
  const snapshot = (uid: string) => doc(user(uid), 'snapshot', 'current');
  const applications = (uid: string) => collection(user(uid), 'applications');

  return {
    async ensureSignedIn() {
      const { auth } = client();
      await auth.authStateReady();
      const signedIn = auth.currentUser ?? (await signInAnonymously(auth)).user;
      return signedIn.uid;
    },
    async loadProfile(uid) {
      const data = (await getDoc(user(uid))).data();
      return (data as UserProfile | undefined) ?? null;
    },
    async saveProfile(uid, patch) {
      await setDoc(user(uid), patch, { merge: true });
    },
    async connectBanks(uid, data, patch) {
      const batch = writeBatch(client().db);
      batch.set(user(uid), patch, { merge: true });
      batch.set(snapshot(uid), data);
      await batch.commit();
    },
    async loadSnapshot(uid) {
      const data = (await getDoc(snapshot(uid))).data();
      return (data as BankSnapshot | undefined) ?? null;
    },
    async listOffers() {
      const result = await getDocs(collection(client().db, 'offers'));
      return result.docs.map(row => ({ ...row.data(), id: row.id }) as BankOffer);
    },
    async submitApplication(uid, application) {
      await setDoc(doc(applications(uid), application.reference), application);
    },
    async listApplications(uid) {
      const result = await getDocs(applications(uid));
      return result.docs.map(row => ({ ...row.data(), reference: row.id }) as RefinanceApplication);
    },
  };
}
