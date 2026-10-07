import { useEffect, useState } from 'react';
import { subscribeGroup, subscribeUserGroups } from '../services/groupService';
import type { ChatGroup } from '../types/group';
import { toFriendlyError } from '../utils/errors';

export function useGroups(uid: string) {
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    return subscribeUserGroups(
      uid,
      (list) => {
        setGroups(list);
        setError(null);
        setLoading(false);
      },
      (e) => {
        setError(toFriendlyError(e));
        setLoading(false);
      },
    );
  }, [uid]);

  return { groups, loading, error };
}

export function useGroup(groupId: string | null) {
  const [group, setGroup] = useState<ChatGroup | null>(null);
  const [loading, setLoading] = useState(groupId !== null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (groupId === null) {
      setGroup(null);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    setError(null);
    return subscribeGroup(
      groupId,
      (g) => {
        setGroup(g);
        setLoading(false);
      },
      (e) => {
        setError(toFriendlyError(e));
        setLoading(false);
      },
    );
  }, [groupId]);

  return { group, loading, error };
}
