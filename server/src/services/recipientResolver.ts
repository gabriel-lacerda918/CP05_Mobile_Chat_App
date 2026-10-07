import { forbidden, notFound } from '../errors';
import type { ConversationType, GroupDoc, MessageRecord } from '../types';
import { firestore, rtdb } from './firebaseAdmin';
import { computeRecipients } from './recipientPolicy';

export type ResolvedMessage = {
  conversationType: ConversationType;
  senderName: string;
  groupName?: string;
  recipients: string[];
  mentioned: Set<string>;
};

/**
 * Confere no servidor: mensagem existe, remetente = usuário autenticado, o remetente participa
 * da conversa e calcula os destinatários pela política. Nada vem do cliente além dos ids.
 */
export async function resolveMessage(
  uid: string,
  conversationId: string,
  messageId: string,
): Promise<ResolvedMessage> {
  const snap = await rtdb.ref(`messages/${conversationId}/${messageId}`).get();
  if (!snap.exists()) throw notFound('Mensagem não encontrada.');
  const message = snap.val() as MessageRecord;
  if (message.senderId !== uid) throw forbidden('A mensagem não pertence ao usuário autenticado.');

  const mentionedUserIds = Array.isArray(message.mentionedUserIds)
    ? message.mentionedUserIds.filter((id): id is string => typeof id === 'string')
    : [];

  let participants: string[];
  let policy: GroupDoc['notificationPolicy'] | null = null;
  let groupName: string | undefined;

  if (message.conversationType === 'group') {
    const groupSnap = await firestore.collection('groups').doc(conversationId).get();
    if (!groupSnap.exists) throw notFound('Grupo não encontrado.');
    const group = groupSnap.data() as GroupDoc;
    if (!group.memberIds.includes(uid)) throw forbidden('Você não é integrante deste grupo.');
    participants = group.memberIds;
    policy = group.notificationPolicy;
    groupName = group.name;
  } else if (message.conversationType === 'direct') {
    const parts = conversationId.split('_');
    if (parts.length !== 2 || !parts.includes(uid) || parts[0] === parts[1]) {
      throw forbidden('Você não participa desta conversa.');
    }
    const convSnap = await firestore.collection('directConversations').doc(conversationId).get();
    if (!convSnap.exists) throw notFound('Conversa não encontrada.');
    participants = parts;
  } else {
    throw forbidden('Tipo de conversa inválido.');
  }

  const profile = await firestore.collection('publicProfiles').doc(uid).get();
  const senderName = (profile.data() as { name?: string } | undefined)?.name ?? 'Alguém';

  const { recipients, mentioned } = computeRecipients({
    conversationType: message.conversationType,
    senderId: uid,
    participants,
    policy,
    target: message.target,
    mentionedUserIds,
  });

  return {
    conversationType: message.conversationType,
    senderName,
    groupName,
    recipients,
    mentioned: new Set(mentioned),
  };
}
