import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeRecipients, type PolicyInput } from './recipientPolicy';

const base: PolicyInput = {
  conversationType: 'group',
  senderId: 'a',
  participants: ['a', 'b', 'c', 'd'],
  policy: 'all_group_messages',
  target: { type: 'conversation' },
  mentionedUserIds: [],
};

test('all_group_messages: mensagem geral notifica todos menos o remetente', () => {
  assert.deepEqual(computeRecipients(base).recipients.sort(), ['b', 'c', 'd']);
});

test('all_group_messages: mensagem direcionada notifica só o destinatário', () => {
  const r = computeRecipients({ ...base, target: { type: 'member', memberId: 'c' } });
  assert.deepEqual(r.recipients, ['c']);
  assert.deepEqual(r.mentioned, ['c']);
});

test('mentioned_members: mensagem geral não notifica ninguém', () => {
  assert.deepEqual(computeRecipients({ ...base, policy: 'mentioned_members' }).recipients, []);
});

test('mentioned_members: notifica mencionados e ignora quem não é integrante ou é o remetente', () => {
  const r = computeRecipients({
    ...base,
    policy: 'mentioned_members',
    target: { type: 'member', memberId: 'b' },
    mentionedUserIds: ['b', 'd', 'a', 'intruso'],
  });
  assert.deepEqual(r.recipients.sort(), ['b', 'd']);
});

test('direct_messages_only e disabled: grupos nunca geram push', () => {
  assert.deepEqual(computeRecipients({ ...base, policy: 'direct_messages_only' }).recipients, []);
  assert.deepEqual(computeRecipients({ ...base, policy: 'disabled' }).recipients, []);
});

test('conversa individual notifica apenas o outro participante', () => {
  const r = computeRecipients({
    conversationType: 'direct',
    senderId: 'a',
    participants: ['a', 'b'],
    policy: null,
    target: { type: 'conversation' },
    mentionedUserIds: [],
  });
  assert.deepEqual(r.recipients, ['b']);
});

test('remetente nunca é destinatário, mesmo se mencionar a si mesmo', () => {
  const r = computeRecipients({ ...base, policy: 'mentioned_members', mentionedUserIds: ['a'] });
  assert.deepEqual(r.recipients, []);
});
