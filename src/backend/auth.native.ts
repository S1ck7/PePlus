import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FirebaseApp } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';

// Metro loads this export on native, but the SDK's shared declarations omit it.
const { getReactNativePersistence } = firebaseAuth as typeof firebaseAuth & {
  getReactNativePersistence(storage: typeof AsyncStorage): firebaseAuth.Persistence;
};

export function getAppAuth(app: FirebaseApp) {
  try {
    return firebaseAuth.initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch (error) {
    if ((error as { code?: string }).code === 'auth/already-initialized') return firebaseAuth.getAuth(app);
    throw error;
  }
}
