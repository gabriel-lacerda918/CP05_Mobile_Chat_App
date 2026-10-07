import type { DispatchDoc } from '../types';
import { firestore } from './firebaseAdmin';

const STALE_MS = 60_000;

const dispatchRef = (conversationId: string, messageId: string) =>
  firestore.collection('notificationDispatches').doc(`${conversationId}__${messageId}`);

/**
 * Idempotência: só a primeira requisição (ou uma retentativa após falha / processamento travado)
 * obtém o "lock". Reenvios de uma mesma mensagem retornam false e não geram novo push.
 */
export async function claimDispatch(conversationId: string, messageId: string): Promise<boolean> {
  const ref = dispatchRef(conversationId, messageId);
  return firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();
    if (snap.exists) {
      const current = snap.data() as DispatchDoc;
      const inProgress = current.status === 'processing' && now - current.startedAt < STALE_MS;
      if (current.status === 'sent' || inProgress) return false;
    }
    const doc: DispatchDoc = { status: 'processing', startedAt: now };
    tx.set(ref, doc);
    return true;
  });
}

export async function finishDispatch(
  conversationId: string,
  messageId: string,
  result: Pick<DispatchDoc, 'status' | 'recipients' | 'sent' | 'failed'>,
): Promise<void> {
  await dispatchRef(conversationId, messageId).set({ ...result, finishedAt: Date.now() }, { merge: true });
}
