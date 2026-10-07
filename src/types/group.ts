import type { NotificationPolicy } from './notification';

export type ChatGroup = {
  id: string;
  name: string;
  photoUrl: string;
  ownerId: string;
  memberIds: string[];
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
  createdAt: number;
  updatedAt: number;
};

export type GroupDoc = Omit<ChatGroup, 'id'>;

export type CreateGroupInput = {
  name: string;
  photoUrl: string;
  memberIds: string[]; // sem o proprietário (o servidor inclui o uid do token)
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
};

export type GroupSettingsPatch = Partial<
  Pick<ChatGroup, 'name' | 'photoUrl' | 'memberLimit' | 'notificationPolicy'>
>;
