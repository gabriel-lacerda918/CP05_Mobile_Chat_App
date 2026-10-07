import { useCallback, useEffect, useState } from 'react';
import { sendMessage, subscribeConnection, subscribeMessages } from '../services/chatService';
import { requestPush } from '../services/notificationService';
import type { ChatMessage, ConversationType, MessageTarget } from '../types/chat';
import { toFriendlyError } from '../utils/errors';

const MAX_LENGTH = 2000;

export function useChat(
  conversationId: string,
  conversationType: ConversationType,
  senderId: string,
  enabled: boolean,
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [pushWarning, setPushWarning] = useState<string | null>(null);
  const [online, setOnline] = useState(true);

  // Listener da conversa aberta; removido ao desmontar ou trocar de conversa/permissão
  useEffect(() => {
    setMessages([]);
    setError(null);
    if (!enabled) {
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    return subscribeMessages(
      conversationId,
      (list) => {
        setMessages(list);
        setLoading(false);
      },
      (e) => {
        setError(toFriendlyError(e));
        setLoading(false);
      },
    );
  }, [conversationId, enabled]);

  useEffect(() => subscribeConnection(setOnline), []);

  const send = useCallback(
    async (text: string, target: MessageTarget, mentionedUserIds: string[]): Promise<boolean> => {
      const trimmed = text.trim();
      if (!trimmed) return false;
      if (trimmed.length > MAX_LENGTH) {
        setSendError(`A mensagem pode ter no máximo ${MAX_LENGTH} caracteres.`);
        return false;
      }
      setSending(true);
      setSendError(null);
      setPushWarning(null);
      try {
        const messageId = await sendMessage({
          conversationId,
          conversationType,
          senderId,
          text: trimmed,
          target,
          mentionedUserIds,
        });
        // A mensagem já está salva; falha no push não deve bloquear o chat
        requestPush(conversationId, messageId).catch((e: unknown) =>
          setPushWarning(`Mensagem enviada, mas a notificação falhou: ${toFriendlyError(e)}`),
        );
        return true;
      } catch (e) {
        setSendError(toFriendlyError(e));
        return false;
      } finally {
        setSending(false);
      }
    },
    [conversationId, conversationType, senderId],
  );

  return { messages, loading, error, sending, sendError, pushWarning, online, send };
}
