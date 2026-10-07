export type NotificationPolicy =
  | 'all_group_messages'
  | 'mentioned_members'
  | 'direct_messages_only'
  | 'disabled';

export const NOTIFICATION_POLICIES: ReadonlyArray<{
  value: NotificationPolicy;
  label: string;
  description: string;
}> = [
  { value: 'all_group_messages', label: 'Todas as mensagens', description: 'Todos os integrantes (menos quem enviou) recebem push das mensagens gerais.' },
  { value: 'mentioned_members', label: 'Somente mencionados', description: 'Apenas integrantes mencionados ou selecionados recebem push.' },
  { value: 'direct_messages_only', label: 'Só conversas individuais', description: 'Mensagens do grupo não geram push.' },
  { value: 'disabled', label: 'Desativadas', description: 'Nenhuma mensagem deste grupo gera push.' },
];

export type NotificationSettings = {
  conversationId: string;
  policy: NotificationPolicy;
  updatedBy: string;
  updatedAt: number;
};

export type DeviceTokenType = 'fcm' | 'expo';

export type DeviceRecord = {
  token: string;
  tokenType: DeviceTokenType;
  platform: 'android' | 'ios';
  enabled: boolean;
  updatedAt: number;
};

export type NotificationData = {
  conversationId: string;
  conversationType: 'direct' | 'group';
};
