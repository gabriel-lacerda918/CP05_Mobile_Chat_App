import { collection, doc, getDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import type { ChatUser, PublicProfile, PublicProfileDoc, UserDoc } from '../types/user';
import { db } from './firebase';

/** Perfil completo. As regras só permitem ao próprio usuário ou a quem compartilha conversa/grupo. */
export async function getUser(uid: string): Promise<ChatUser | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { uid, ...(snap.data() as UserDoc) };
}

const toPublic = (uid: string, data: PublicProfileDoc): PublicProfile => ({
  uid,
  name: data.name,
  photoUrl: data.photoUrl,
});

export async function fetchPublicProfiles(uids: string[]): Promise<PublicProfile[]> {
  const snaps = await Promise.all(uids.map((uid) => getDoc(doc(db, 'publicProfiles', uid))));
  return snaps.flatMap((s) => (s.exists() ? [toPublic(s.id, s.data() as PublicProfileDoc)] : []));
}

export function subscribePublicProfiles(
  onData: (profiles: PublicProfile[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, 'publicProfiles'),
    (snap) => onData(snap.docs.map((d) => toPublic(d.id, d.data() as PublicProfileDoc))),
    onError,
  );
}
