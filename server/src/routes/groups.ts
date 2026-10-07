import { Router } from 'express';
import { badRequest } from '../errors';
import { addMember, createGroup, removeMember, updateSettings } from '../services/groupService';

export const groupsRouter = Router();

const GROUP_ID = /^[A-Za-z0-9]{1,64}$/;
const groupId = (value: string): string => {
  if (!GROUP_ID.test(value)) throw badRequest('Grupo inválido.');
  return value;
};

groupsRouter.post('/', async (req, res) => {
  res.status(201).json(await createGroup(req.uid, req.body));
});

groupsRouter.post('/:id/members', async (req, res) => {
  await addMember(req.uid, groupId(req.params.id), req.body);
  res.json({ ok: true });
});

groupsRouter.delete('/:id/members/:uid', async (req, res) => {
  await removeMember(req.uid, groupId(req.params.id), req.params.uid);
  res.json({ ok: true });
});

groupsRouter.patch('/:id/settings', async (req, res) => {
  await updateSettings(req.uid, groupId(req.params.id), req.body);
  res.json({ ok: true });
});
