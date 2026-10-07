import { AppError } from './errors';

/** ID determinístico: dois uids ordenados. Garante uma única conversa por par. */
export function buildDirectConversationId(uidA: string, uidB: string): string {
  if (uidA === uidB) throw new AppError('Você não pode conversar consigo mesmo.');
  return [uidA, uidB].sort().join('_');
}

export function getDirectParticipants(conversationId: string): string[] {
  return conversationId.split('_');
}

export function getOtherParticipant(conversationId: string, myUid: string): string | null {
  const parts = getDirectParticipants(conversationId);
  return parts.length === 2 && parts.includes(myUid) ? parts.find((p) => p !== myUid) ?? null : null;
}
