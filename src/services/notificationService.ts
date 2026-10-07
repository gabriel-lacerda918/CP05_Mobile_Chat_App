import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import type { DeviceRecord, DeviceTokenType, NotificationData } from '../types/notification';
import { apiRequest } from './apiClient';
import { db } from './firebase';

export type RegistrationResult =
  | { status: 'registered'; token: string }
  | { status: 'denied' }
  | { status: 'unavailable' };

let currentToken: string | null = null;

export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

function readProjectId(): string | undefined {
  const fromEas = Constants.easConfig?.projectId;
  if (typeof fromEas === 'string') return fromEas;
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId;
}

/**
 * Android: token FCM nativo (a API envia via Firebase Admin / FCM).
 * iOS: token do Expo Push Service (que entrega via APNs) - ver README.
 */
async function resolveToken(): Promise<{ token: string; tokenType: DeviceTokenType }> {
  if (Platform.OS === 'android') {
    const device = await Notifications.getDevicePushTokenAsync();
    return { token: String(device.data), tokenType: 'fcm' };
  }
  const expoToken = await Notifications.getExpoPushTokenAsync({ projectId: readProjectId() });
  return { token: expoToken.data, tokenType: 'expo' };
}

async function saveDevice(uid: string, token: string, tokenType: DeviceTokenType): Promise<void> {
  const record: DeviceRecord = {
    token,
    tokenType,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    enabled: true,
    updatedAt: Date.now(),
  };
  // O próprio token é o id do documento: evita duplicatas do mesmo aparelho
  await setDoc(doc(db, 'users', uid, 'devices', token), record);
  currentToken = token;
}

export async function registerDevice(uid: string): Promise<RegistrationResult> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Mensagens',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const granted = await ensurePermission();
    if (!granted) return { status: 'denied' };
    const { token, tokenType } = await resolveToken();
    await saveDevice(uid, token, tokenType);
    return { status: 'registered', token };
  } catch {
    return { status: 'unavailable' };
  }
}

/** Mantém o token atualizado quando o FCM o renova. Retorna função de limpeza. */
export function watchTokenRefresh(uid: string): () => void {
  const subscription = Notifications.addPushTokenListener((event) => {
    const tokenType: DeviceTokenType = Platform.OS === 'android' ? 'fcm' : 'expo';
    if (Platform.OS === 'android') {
      saveDevice(uid, String(event.data), tokenType).catch(() => undefined);
    }
  });
  return () => subscription.remove();
}

/** Desativa o token do aparelho no logout (o usuário anterior deixa de receber push aqui). */
export async function disableCurrentDevice(uid: string): Promise<void> {
  if (!currentToken) return;
  const token = currentToken;
  currentToken = null;
  try {
    await updateDoc(doc(db, 'users', uid, 'devices', token), { enabled: false, updatedAt: Date.now() });
  } catch {
    // melhor esforço: a API também desativa tokens inválidos
  }
}

/** Solicita à API o envio do push. A API é idempotente por messageId. */
export async function requestPush(conversationId: string, messageId: string): Promise<void> {
  try {
    await apiRequest<{ ok: true }>('POST', '/notifications/messages', { conversationId, messageId });
  } catch {
    await apiRequest<{ ok: true }>('POST', '/notifications/messages', { conversationId, messageId });
  }
}

export function parseNotificationData(data: Record<string, unknown> | undefined): NotificationData | null {
  if (!data) return null;
  const { conversationId, conversationType } = data;
  if (typeof conversationId === 'string' && (conversationType === 'direct' || conversationType === 'group')) {
    return { conversationId, conversationType };
  }
  return null;
}
