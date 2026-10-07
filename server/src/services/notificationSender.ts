import type { DocumentReference } from 'firebase-admin/firestore';
import { expoAccessToken, messaging } from './firebaseAdmin';

export type Delivery = {
  token: string;
  tokenType: 'fcm' | 'expo';
  deviceRef: DocumentReference;
  title: string;
  body: string;
  data: Record<string, string>;
};

export type SendStats = { sent: number; failed: number; disabled: number };

const INVALID_FCM_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);
const FCM_CHUNK = 500;
const EXPO_CHUNK = 100;

async function disableDevices(devices: Delivery[], reason: string): Promise<void> {
  await Promise.all(
    devices.map((d) =>
      d.deviceRef.update({ enabled: false, updatedAt: Date.now(), disabledReason: reason }).catch(() => undefined),
    ),
  );
}

async function sendFcm(list: Delivery[]): Promise<SendStats> {
  const stats: SendStats = { sent: 0, failed: 0, disabled: 0 };
  for (let i = 0; i < list.length; i += FCM_CHUNK) {
    const chunk = list.slice(i, i + FCM_CHUNK);
    const response = await messaging.sendEach(
      chunk.map((d) => ({
        token: d.token,
        notification: { title: d.title, body: d.body },
        data: d.data,
        android: { priority: 'high' as const, notification: { channelId: 'default' } },
      })),
    );
    const invalid: Delivery[] = [];
    response.responses.forEach((r, index) => {
      if (r.success) stats.sent += 1;
      else {
        stats.failed += 1;
        if (r.error && INVALID_FCM_CODES.has(r.error.code)) invalid.push(chunk[index]);
      }
    });
    await disableDevices(invalid, 'invalid_token');
    stats.disabled += invalid.length;
  }
  return stats;
}

type ExpoTicket = { status?: string; details?: { error?: string } };

async function sendExpo(list: Delivery[]): Promise<SendStats> {
  const stats: SendStats = { sent: 0, failed: 0, disabled: 0 };
  for (let i = 0; i < list.length; i += EXPO_CHUNK) {
    const chunk = list.slice(i, i + EXPO_CHUNK);
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (expoAccessToken) headers.Authorization = `Bearer ${expoAccessToken}`;
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers,
      body: JSON.stringify(
        chunk.map((d) => ({ to: d.token, title: d.title, body: d.body, data: d.data, sound: 'default' })),
      ),
    });
    if (!response.ok) {
      stats.failed += chunk.length;
      continue;
    }
    const payload = (await response.json()) as { data?: ExpoTicket[] };
    const invalid: Delivery[] = [];
    (payload.data ?? []).forEach((ticket, index) => {
      if (ticket.status === 'ok') stats.sent += 1;
      else {
        stats.failed += 1;
        if (ticket.details?.error === 'DeviceNotRegistered') invalid.push(chunk[index]);
      }
    });
    await disableDevices(invalid, 'invalid_token');
    stats.disabled += invalid.length;
  }
  return stats;
}

/** Envia por FCM (Android) e Expo Push Service (iOS); tokens inválidos são desativados. */
export async function sendDeliveries(deliveries: Delivery[]): Promise<SendStats> {
  const [fcm, expo] = await Promise.all([
    sendFcm(deliveries.filter((d) => d.tokenType === 'fcm')),
    sendExpo(deliveries.filter((d) => d.tokenType === 'expo')),
  ]);
  return {
    sent: fcm.sent + expo.sent,
    failed: fcm.failed + expo.failed,
    disabled: fcm.disabled + expo.disabled,
  };
}
