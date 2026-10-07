import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { loadConfig } from '../config';

const config = loadConfig();

const app =
  getApps()[0] ??
  initializeApp({
    credential: cert({
      projectId: config.projectId,
      clientEmail: config.clientEmail,
      privateKey: config.privateKey,
    }),
    databaseURL: config.databaseURL,
  });

export const adminAuth = getAuth(app);
export const firestore = getFirestore(app);
export const rtdb = getDatabase(app);
export const messaging = getMessaging(app);
export const expoAccessToken = config.expoAccessToken;
