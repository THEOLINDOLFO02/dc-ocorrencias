import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCEWKYx4tXz03LMybIaTgQHseYMkmqtcto',
  authDomain: 'ro-defesa-civil.firebaseapp.com',
  projectId: 'ro-defesa-civil',
  storageBucket: 'ro-defesa-civil.firebasestorage.app',
  messagingSenderId: '464459225560',
  appId: '1:464459225560:web:be82811279ceb37e67baad',
};

// Teste local integrado (npm run dev:local): usa os emuladores do Firebase, sem tocar no projeto real.
const usarEmuladores = import.meta.env.VITE_USE_EMULATORS === '1';

export const app  = initializeApp(usarEmuladores ? { ...firebaseConfig, projectId: 'demo-dc-ocorrencias' } : firebaseConfig);
export const auth = getAuth(app);

// persistentSingleTabManager: compatível com iOS Safari e todos os Android
// Dados ficam no IndexedDB — persistem offline e sincronizam ao voltar online
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager({ forceOwnership: true }),
  }),
});

if (usarEmuladores) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8097);
}
