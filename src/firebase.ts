import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCEWKYx4tXz03LMybIaTgQHseYMkmqtcto',
  authDomain: 'ro-defesa-civil.firebaseapp.com',
  projectId: 'ro-defesa-civil',
  storageBucket: 'ro-defesa-civil.firebasestorage.app',
  messagingSenderId: '464459225560',
  appId: '1:464459225560:web:be82811279ceb37e67baad',
};

export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Cache persistente no IndexedDB — suporta múltiplas abas e modo offline
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
