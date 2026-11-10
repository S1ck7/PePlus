import AsyncStorage from '@react-native-async-storage/async-storage';

import { getPersona, listBankOffers } from '../data';
import { createFirebaseBackend } from './firebase';
import { firebaseConfig } from './firebaseConfig';
import { createBackend } from './service';

export type { ApplicationInput, BackendStatus, BankSnapshot, RefinanceApplication, UserProfile } from './service';

export const {
  ensureSignedIn, loadProfile, saveProfile, connectBanks, loadSnapshot,
  listOffers, submitApplication, listApplications, getBackendStatus,
} = createBackend({
  getPersona,
  bundledOffers: listBankOffers(),
  remote: createFirebaseBackend(),
  storage: AsyncStorage,
  storageKey: `debt-planner/backend/${firebaseConfig.projectId || 'bundled'}`,
});
