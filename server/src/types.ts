export type NotificationPolicy =
  | 'all_group_messages'
  | 'mentioned_members'
  | 'direct_messages_only'
  | 'disabled';

export const NOTIFICATION_POLICIES: readonly NotificationPolicy[] = [
  'all_group_messages',
  'mentioned_members',
  'direct_messages_only',
  'disabled',
];

export type ConversationType = 'direct' | 'group';

export type MessageTarget = { type: 'conversation' } | { type: 'member'; memberId: string };

export type MessageRecord = {
  conversationType: ConversationType;
  senderId: string;
  text: string;
  target: MessageTarget;
  mentionedUserIds?: string[];
  createdAt: number;
};

export type GroupDoc = {
  name: string;
  photoUrl: string;
  ownerId: string;
  memberIds: string[];
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
  createdAt: number;
  updatedAt: number;
};

export type DeviceDoc = {
  token: string;
  tokenType: 'fcm' | 'expo';
  platform: 'android' | 'ios';
  enabled: boolean;
  updatedAt: number;
};

export type DispatchDoc = {
  status: 'processing' | 'sent' | 'failed';
  startedAt: number;
  finishedAt?: number;
  recipients?: number;
  sent?: number;
  failed?: number;
};
