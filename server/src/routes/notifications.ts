import { Router } from 'express';
import { badRequest } from '../errors';
import { claimDispatch, finishDispatch } from '../services/dispatchLock';
import { firestore } from '../services/firebaseAdmin';
import { sendDeliveries, type Delivery } from '../services/notificationSender';
import { resolveMessage } from '../services/recipientResolver';
import type { DeviceDoc } from '../types';

const ID = /^[A-Za-z0-9_-]{1,128}$/;
export const notificationsRouter = Router();

// POST /notifications/messages  { conversationId, messageId }
notificationsRouter.post('/messages', async (req, res) => {
  const body: unknown = req.body;
  const { conversationId, messageId } = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  if (typeof conversationId !== 'string' || typeof messageId !== 'string' || !ID.test(conversationId) || !ID.test(messageId)) {
    throw badRequest('conversationId e messageId são obrigatórios.');
  }

  // 1) valida usuário, mensagem e participação; 2) calcula destinatários NO SERVIDOR
  const resolved = await resolveMessage(req.uid, conversationId, messageId);

  // 3) idempotência: reenvios da mesma mensagem não geram push repetido
  if (!(await claimDispatch(conversationId, messageId))) {
    res.json({ ok: true, duplicate: true });
    return;
  }

  try {
    const deliveries: Delivery[] = [];
    await Promise.all(
      resolved.recipients.map(async (uid) => {
        const devices = await firestore.collection('users').doc(uid).collection('devices').where('enabled', '==', true).get();
        const isGroup = resolved.conversationType === 'group';
        const title = isGroup ? resolved.groupName ?? 'Grupo' : resolved.senderName;
        // O texto da mensagem nunca vai na notificação (evita expor conteúdo na tela de bloqueio)
        const body = !isGroup
          ? 'Nova mensagem'
          : resolved.mentioned.has(uid)
            ? `${resolved.senderName} mencionou você`
            : `${resolved.senderName} enviou uma mensagem`;
        devices.forEach((doc) => {
          const device = doc.data() as DeviceDoc;
          deliveries.push({
            token: device.token,
            tokenType: device.tokenType,
            deviceRef: doc.ref,
            title,
            body,
            data: { conversationId, conversationType: resolved.conversationType, messageId },
          });
        });
      }),
    );

    const stats = await sendDeliveries(deliveries);
    await finishDispatch(conversationId, messageId, {
      status: 'sent',
      recipients: resolved.recipients.length,
      sent: stats.sent,
      failed: stats.failed,
    });
    res.json({ ok: true, recipients: resolved.recipients.length, sent: stats.sent, failed: stats.failed });
  } catch (error) {
    await finishDispatch(conversationId, messageId, { status: 'failed' }).catch(() => undefined);
    throw error;
  }
});
