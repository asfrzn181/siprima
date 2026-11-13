import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { env } from './env.js';

let instance = null;

const buatApp = () => {
  if (instance) return instance;
  const yangAda = getApps();
  instance =
    yangAda.length > 0
      ? yangAda[0]
      : initializeApp({
          credential: cert({
            projectId: env.FIREBASE_PROJECT_ID,
            clientEmail: env.FIREBASE_CLIENT_EMAIL,
            privateKey: env.privateKey
          }),
          projectId: env.FIREBASE_PROJECT_ID
        });
  return instance;
};

export const dapatkanDb = () => getFirestore(buatApp());
export const dapatkanAuth = () => getAuth(buatApp());
