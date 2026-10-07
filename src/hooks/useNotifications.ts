import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { navigationRef } from '../navigation/navigationRef';
import {
  parseNotificationData,
  registerDevice,
  watchTokenRefresh,
  type RegistrationResult,
} from '../services/notificationService';

let lastHandledResponseId: string | null = null;

export function useNotifications(uid: string) {
  const [state, setState] = useState<RegistrationResult | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Registro do dispositivo (permissão + token) e renovação do token
  useEffect(() => {
    let active = true;
    registerDevice(uid).then((result) => {
      if (active) setState(result);
    });
    const stopRefresh = watchTokenRefresh(uid);
    return () => {
      active = false;
      stopRefresh();
    };
  }, [uid, attempt]);

  // Toque na notificação: abre a conversa indicada no payload
  const openFromResponse = useCallback((response: Notifications.NotificationResponse) => {
    const id = response.notification.request.identifier;
    if (id === lastHandledResponseId) return;
    const data = parseNotificationData(response.notification.request.content.data);
    if (data && navigationRef.isReady()) {
      lastHandledResponseId = id;
      navigationRef.navigate('Chat', data);
    }
  }, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(openFromResponse);
    // App aberto a partir de uma notificação (estava fechado)
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) openFromResponse(response);
    });
    return () => subscription.remove();
  }, [openFromResponse]);

  const retry = useCallback(() => {
    setState(null);
    setAttempt((n) => n + 1);
  }, []);

  return { state, retry };
}
