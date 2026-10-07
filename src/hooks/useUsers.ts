import { useEffect, useMemo, useState } from 'react';
import { subscribePublicProfiles } from '../services/userService';
import type { PublicProfile } from '../types/user';
import { toFriendlyError } from '../utils/errors';

export function useUsers(uid: string) {
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    return subscribePublicProfiles(
      (list) => {
        setProfiles(list);
        setError(null);
        setLoading(false);
      },
      (e) => {
        setError(toFriendlyError(e));
        setLoading(false);
      },
    );
  }, []);

  const profilesById = useMemo(() => new Map(profiles.map((p) => [p.uid, p])), [profiles]);

  // Nunca lista o próprio usuário (não pode conversar consigo mesmo)
  const users = useMemo(() => {
    const term = search.trim().toLowerCase();
    return profiles
      .filter((p) => p.uid !== uid && p.name.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [profiles, uid, search]);

  return { users, profilesById, loading, error, search, setSearch };
}
