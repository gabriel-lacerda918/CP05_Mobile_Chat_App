import { collection, doc, onSnapshot, query, where, type Unsubscribe } from 'firebase/firestore';
import type { ChatGroup, CreateGroupInput, GroupDoc, GroupSettingsPatch } from '../types/group';
import { AppError } from '../utils/errors';
import { validateGroupForm } from '../utils/groupValidation';
import { apiRequest } from './apiClient';
import { db } from './firebase';

const toGroup = (id: string, data: GroupDoc): ChatGroup => ({ id, ...data });

// Leitura: direto do Firestore (tempo real). Escrita: sempre via API (transação no servidor).
export function subscribeUserGroups(
  uid: string,
  onData: (groups: ChatGroup[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(collection(db, 'groups'), where('memberIds', 'array-contains', uid));
  return onSnapshot(q, (snap) => onData(snap.docs.map((d) => toGroup(d.id, d.data() as GroupDoc))), onError);
}

export function subscribeGroup(
  groupId: string,
  onData: (group: ChatGroup | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'groups', groupId),
    (snap) => onData(snap.exists() ? toGroup(snap.id, snap.data() as GroupDoc) : null),
    onError,
  );
}

export async function createGroup(input: CreateGroupInput): Promise<string> {
  const error = validateGroupForm({
    name: input.name,
    limit: input.memberLimit,
    memberCount: input.memberIds.length + 1,
  });
  if (error) throw new AppError(error);
  const { id } = await apiRequest<{ id: string }>('POST', '/groups', input);
  return id;
}

export async function addMember(groupId: string, uid: string): Promise<void> {
  await apiRequest<{ ok: true }>('POST', `/groups/${groupId}/members`, { uid });
}

export async function removeMember(groupId: string, uid: string): Promise<void> {
  await apiRequest<{ ok: true }>('DELETE', `/groups/${groupId}/members/${uid}`);
}

export async function updateGroupSettings(groupId: string, patch: GroupSettingsPatch): Promise<void> {
  await apiRequest<{ ok: true }>('PATCH', `/groups/${groupId}/settings`, patch);
}
