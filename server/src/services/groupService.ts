import { FieldValue } from 'firebase-admin/firestore';
import { HttpError, badRequest, forbidden, notFound } from '../errors';
import { NOTIFICATION_POLICIES, type GroupDoc, type NotificationPolicy } from '../types';
import { firestore, rtdb } from './firebaseAdmin';

const MIN_LIMIT = 2;
const MAX_LIMIT = 100;

const groupRef = (id: string) => firestore.collection('groups').doc(id);
const userGroupsRef = (uid: string) => firestore.collection('userGroups').doc(uid);
const mirrorRef = (groupId: string, uid: string) => rtdb.ref(`members/${groupId}/${uid}`);

const groupFull = () => new HttpError(409, 'group_full', 'O grupo atingiu o limite de integrantes.');

// ---------- validação de entrada ----------
type Body = Record<string, unknown>;
const asBody = (raw: unknown): Body => {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw badRequest('Corpo inválido.');
  return raw as Body;
};
const parseName = (v: unknown): string => {
  if (typeof v !== 'string' || v.trim().length < 2 || v.trim().length > 60) throw badRequest('Nome do grupo inválido.');
  return v.trim();
};
const parsePhoto = (v: unknown): string => {
  if (v === undefined || v === '') return '';
  if (typeof v !== 'string' || v.length > 500 || !v.startsWith('https://')) throw badRequest('URL da foto inválida.');
  return v;
};
const parseLimit = (v: unknown): number => {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < MIN_LIMIT || v > MAX_LIMIT) {
    throw badRequest(`O limite deve ser um inteiro entre ${MIN_LIMIT} e ${MAX_LIMIT}.`);
  }
  return v;
};
const parsePolicy = (v: unknown): NotificationPolicy => {
  if (typeof v !== 'string' || !NOTIFICATION_POLICIES.includes(v as NotificationPolicy)) {
    throw badRequest('Política de notificação inválida.');
  }
  return v as NotificationPolicy;
};
const parseUid = (v: unknown): string => {
  if (typeof v !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(v)) throw badRequest('Usuário inválido.');
  return v;
};

async function assertUsersExist(uids: string[]): Promise<void> {
  if (uids.length === 0) return;
  const snaps = await firestore.getAll(...uids.map((uid) => firestore.collection('publicProfiles').doc(uid)));
  if (snaps.some((s) => !s.exists)) throw badRequest('Algum usuário informado não existe.');
}

function requireGroup(snap: FirebaseFirestore.DocumentSnapshot): GroupDoc {
  if (!snap.exists) throw notFound('Grupo não encontrado.');
  return snap.data() as GroupDoc;
}

// ---------- operações ----------
export async function createGroup(ownerId: string, raw: unknown): Promise<{ id: string }> {
  const body = asBody(raw);
  const name = parseName(body.name);
  const photoUrl = parsePhoto(body.photoUrl);
  const memberLimit = parseLimit(body.memberLimit);
  const notificationPolicy = parsePolicy(body.notificationPolicy);
  if (!Array.isArray(body.memberIds)) throw badRequest('Lista de integrantes inválida.');

  const others = [...new Set(body.memberIds.map(parseUid))].filter((id) => id !== ownerId);
  const memberIds = [ownerId, ...others];
  if (memberIds.length < 2) throw badRequest('Um grupo precisa de ao menos 2 integrantes.');
  if (memberIds.length > memberLimit) throw groupFull();
  await assertUsersExist(others);

  const ref = firestore.collection('groups').doc();
  const now = Date.now();
  const group: GroupDoc = {
    name, photoUrl, ownerId, memberIds, memberLimit, notificationPolicy, createdAt: now, updatedAt: now,
  };

  // 1) espelho no RTDB (libera leitura das mensagens)  2) grupo + índice por usuário no Firestore
  await rtdb.ref(`members/${ref.id}`).set(Object.fromEntries(memberIds.map((uid) => [uid, true])));
  try {
    const batch = firestore.batch();
    batch.set(ref, group);
    memberIds.forEach((uid) => batch.set(userGroupsRef(uid), { groupIds: FieldValue.arrayUnion(ref.id) }, { merge: true }));
    await batch.commit();
  } catch (error) {
    await rtdb.ref(`members/${ref.id}`).remove().catch(() => undefined);
    throw error;
  }
  return { id: ref.id };
}

/** Remove o integrante no Firestore dentro de uma transação. */
async function removeFromFirestore(groupId: string, uid: string): Promise<void> {
  await firestore.runTransaction(async (tx) => {
    const group = requireGroup(await tx.get(groupRef(groupId)));
    if (!group.memberIds.includes(uid)) return;
    tx.update(groupRef(groupId), { memberIds: group.memberIds.filter((id) => id !== uid), updatedAt: Date.now() });
    tx.set(userGroupsRef(uid), { groupIds: FieldValue.arrayRemove(groupId) }, { merge: true });
  });
}

/**
 * Limite protegido contra concorrência: a leitura, a checagem de vagas e a escrita acontecem na mesma
 * transação do Firestore. Se dois pedidos disputam a última vaga, o segundo é reexecutado pelo
 * Firestore, relê o grupo já cheio e falha com `group_full`.
 */
export async function addMember(actorId: string, groupId: string, raw: unknown): Promise<void> {
  const uid = parseUid(asBody(raw).uid);
  await assertUsersExist([uid]);

  await firestore.runTransaction(async (tx) => {
    const group = requireGroup(await tx.get(groupRef(groupId)));
    if (group.ownerId !== actorId) throw forbidden('Somente o proprietário pode adicionar integrantes.');
    if (group.memberIds.includes(uid)) return;
    if (group.memberIds.length >= group.memberLimit) throw groupFull();
    tx.update(groupRef(groupId), { memberIds: [...group.memberIds, uid], updatedAt: Date.now() });
    tx.set(userGroupsRef(uid), { groupIds: FieldValue.arrayUnion(groupId) }, { merge: true });
  });

  try {
    await mirrorRef(groupId, uid).set(true);
  } catch (error) {
    await removeFromFirestore(groupId, uid).catch(() => undefined); // compensação
    throw error;
  }
}

export async function removeMember(actorId: string, groupId: string, rawUid: string): Promise<void> {
  const uid = parseUid(rawUid);
  const group = requireGroup(await groupRef(groupId).get());
  if (uid === group.ownerId) throw forbidden('O proprietário não pode ser removido.');
  if (actorId !== group.ownerId && actorId !== uid) throw forbidden('Sem permissão para remover este integrante.');
  if (!group.memberIds.includes(uid)) return;

  // Corta primeiro o acesso às mensagens (direção segura); se o Firestore falhar, restaura.
  await mirrorRef(groupId, uid).remove();
  try {
    await removeFromFirestore(groupId, uid);
  } catch (error) {
    const current = await groupRef(groupId).get();
    if (current.exists && (current.data() as GroupDoc).memberIds.includes(uid)) {
      await mirrorRef(groupId, uid).set(true).catch(() => undefined);
    }
    throw error;
  }
}

export async function updateSettings(actorId: string, groupId: string, raw: unknown): Promise<void> {
  const body = asBody(raw);
  const patch: Partial<Pick<GroupDoc, 'name' | 'photoUrl' | 'memberLimit' | 'notificationPolicy'>> = {};
  if (body.name !== undefined) patch.name = parseName(body.name);
  if (body.photoUrl !== undefined) patch.photoUrl = parsePhoto(body.photoUrl);
  if (body.memberLimit !== undefined) patch.memberLimit = parseLimit(body.memberLimit);
  if (body.notificationPolicy !== undefined) patch.notificationPolicy = parsePolicy(body.notificationPolicy);
  if (Object.keys(patch).length === 0) throw badRequest('Nenhuma alteração informada.');

  await firestore.runTransaction(async (tx) => {
    const group = requireGroup(await tx.get(groupRef(groupId)));
    if (group.ownerId !== actorId) throw forbidden('Somente o proprietário pode alterar o grupo.');
    if (patch.memberLimit !== undefined && patch.memberLimit < group.memberIds.length) {
      throw new HttpError(409, 'limit_below_members', 'O limite não pode ser menor que o número de integrantes.');
    }
    tx.update(groupRef(groupId), { ...patch, updatedAt: Date.now() });
  });
}
