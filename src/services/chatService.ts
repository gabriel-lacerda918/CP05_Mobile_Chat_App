import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query as fsQuery,
  setDoc,
  where,
  type Unsubscribe as FsUnsubscribe,
} from 'firebase/firestore';
import { limitToLast, onValue, push, query, ref, set, type Unsubscribe } from 'firebase/database';
import type {
  ChatMessage,
  DirectConversation,
  DirectConversationDoc,
  MessageRecord,
  SendMessageInput,
} from '../types/chat';
import { buildDirectConversationId } from '../utils/conversationId';
import { db, rtdb } from './firebase';

/** Localiza ou cria a conversa individual. O ID determinístico impede duplicidade. */
export async function getOrCreateDirectConversation(myUid: string, otherUid: string): Promise<string> {
  const id = buildDirectConversationId(myUid, otherUid);
  const conversationRef = doc(db, 'directConversations', id);
  const snap = await getDoc(conversationRef);
  if (!snap.exists()) {
    const data: DirectConversationDoc = {
      participantIds: [myUid, otherUid].sort() as [string, string],
      createdAt: Date.now(),
    };
    await setDoc(conversationRef, data);
  }
  return id;
}

export function subscribeDirectConversations(
  uid: string,
  onData: (list: DirectConversation[]) => void,
  onError: (error: Error) => void,
): FsUnsubscribe {
  const q = fsQuery(collection(db, 'directConversations'), where('participantIds', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) =>
      onData(
        snap.docs.map((d) => {
          const data = d.data() as DirectConversationDoc;
          return { id: d.id, type: 'direct', participants: data.participantIds, createdAt: data.createdAt };
        }),
      ),
    onError,
  );
}

/** Persiste a mensagem no Realtime Database e devolve o id gerado. */
export async function sendMessage(input: SendMessageInput): Promise<string> {
  const messageRef = push(ref(rtdb, `messages/${input.conversationId}`));
  if (!messageRef.key) throw new Error('message_key_unavailable');
  const record: MessageRecord = {
    conversationType: input.conversationType,
    senderId: input.senderId,
    text: input.text,
    target: input.target,
    createdAt: Date.now(),
    // RTDB rejeita `undefined`; só grava o campo quando há menções
    ...(input.mentionedUserIds.length > 0 ? { mentionedUserIds: input.mentionedUserIds } : {}),
  };
  await set(messageRef, record);
  return messageRef.key;
}

/** Listener em tempo real das últimas mensagens. Retorna a função que o remove. */
export function subscribeMessages(
  conversationId: string,
  onData: (messages: ChatMessage[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(ref(rtdb, `messages/${conversationId}`), limitToLast(200));
  return onValue(
    q,
    (snap) => {
      const list: ChatMessage[] = [];
      snap.forEach((child) => {
        if (!child.key) return;
        const v = child.val() as MessageRecord;
        list.push({
          id: child.key,
          conversationId,
          conversationType: v.conversationType,
          senderId: v.senderId,
          text: v.text,
          target: v.target,
          mentionedUserIds: v.mentionedUserIds ?? [],
          createdAt: v.createdAt,
        });
      });
      onData(list);
    },
    (error) => onError(error),
  );
}

export function subscribeConnection(onChange: (online: boolean) => void): Unsubscribe {
  return onValue(ref(rtdb, '.info/connected'), (snap) => onChange(snap.val() === true));
}
