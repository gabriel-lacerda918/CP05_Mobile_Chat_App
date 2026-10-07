import type { ConversationType, MessageTarget, NotificationPolicy } from '../types';

export type PolicyInput = {
  conversationType: ConversationType;
  senderId: string;
  /** direct: os 2 participantes; group: memberIds ativos */
  participants: readonly string[];
  /** política do grupo (null em conversa individual) */
  policy: NotificationPolicy | null;
  target: MessageTarget;
  mentionedUserIds: readonly string[];
};

export type PolicyResult = {
  recipients: string[];
  /** subconjunto de recipients explicitamente mencionado/selecionado */
  mentioned: string[];
};

/**
 * Regra pura de destinatários (sem I/O, testável).
 * Nunca inclui o remetente nem quem não participa da conversa.
 */
export function computeRecipients(input: PolicyInput): PolicyResult {
  const participants = new Set(input.participants);
  const explicit = new Set<string>(input.mentionedUserIds);
  if (input.target.type === 'member') explicit.add(input.target.memberId);

  const allowed = (uid: string): boolean => participants.has(uid) && uid !== input.senderId;
  let recipients: string[];

  if (input.conversationType === 'direct') {
    recipients = [...participants].filter(allowed);
    return { recipients, mentioned: [] };
  }

  switch (input.policy) {
    case 'all_group_messages':
      // Mensagem geral: todos. Mensagem direcionada: apenas os destinatários explícitos.
      recipients =
        input.target.type === 'conversation'
          ? [...participants].filter(allowed)
          : [...explicit].filter(allowed);
      break;
    case 'mentioned_members':
      recipients = [...explicit].filter(allowed);
      break;
    case 'direct_messages_only':
    case 'disabled':
    default:
      recipients = [];
  }
  return { recipients, mentioned: recipients.filter((uid) => explicit.has(uid)) };
}
