import { useEffect, useMemo, useRef, useState } from 'react';
import { subscribeDirectConversations } from '../services/chatService';
import { fetchPublicProfiles } from '../services/userService';
import type { ConversationSummary, DirectConversation } from '../types/chat';
import type { PublicProfile } from '../types/user';
import { toFriendlyError } from '../utils/errors';
import { useGroups } from './useGroups';

export function useConversations(uid: string) {
  const { groups, loading: groupsLoading, error: groupsError } = useGroups(uid);
  const [directs, setDirects] = useState<DirectConversation[]>([]);
  const [directsLoading, setDirectsLoading] = useState(true);
  const [directsError, setDirectsError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, PublicProfile>>({});
  const requested = useRef<Set<string>>(new Set());

  useEffect(() => {
    return subscribeDirectConversations(
      uid,
      (list) => {
        setDirects(list);
        setDirectsError(null);
        setDirectsLoading(false);
      },
      (e) => {
        setDirectsError(toFriendlyError(e));
        setDirectsLoading(false);
      },
    );
  }, [uid]);

  // Busca os perfis (nome/foto) dos outros participantes ainda não carregados
  useEffect(() => {
    const missing = directs
      .map((d) => d.participants.find((p) => p !== uid) ?? '')
      .filter((id) => id !== '' && !requested.current.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => requested.current.add(id));
    fetchPublicProfiles(missing)
      .then((list) =>
        setProfiles((prev) => ({ ...prev, ...Object.fromEntries(list.map((p) => [p.uid, p])) })),
      )
      .catch(() => missing.forEach((id) => requested.current.delete(id)));
  }, [directs, uid]);

  const items = useMemo<ConversationSummary[]>(() => {
    const fromGroups: ConversationSummary[] = groups.map((g) => ({
      id: g.id,
      type: 'group',
      title: g.name,
      photoUrl: g.photoUrl,
      subtitle: `Grupo · ${g.memberIds.length}/${g.memberLimit} integrantes`,
      sortKey: g.updatedAt,
    }));
    const fromDirects: ConversationSummary[] = directs.map((d) => {
      const other = profiles[d.participants.find((p) => p !== uid) ?? ''];
      return {
        id: d.id,
        type: 'direct',
        title: other?.name ?? 'Carregando…',
        photoUrl: other?.photoUrl ?? '',
        subtitle: 'Conversa individual',
        sortKey: d.createdAt,
      };
    });
    return [...fromGroups, ...fromDirects].sort((a, b) => b.sortKey - a.sortKey);
  }, [groups, directs, profiles, uid]);

  return {
    items,
    loading: groupsLoading || directsLoading,
    error: groupsError ?? directsError,
  };
}
