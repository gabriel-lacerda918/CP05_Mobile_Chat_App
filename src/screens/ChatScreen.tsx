import { useHeaderHeight } from '@react-navigation/elements';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo } from 'react';
import { FlatList, KeyboardAvoidingView, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { ChatInput } from '../components/ChatInput';
import { ChatMessage } from '../components/ChatMessage';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { useRequiredUser } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { useGroup } from '../hooks/useGroups';
import { useUsers } from '../hooks/useUsers';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import type { PublicProfile } from '../types/user';
import { getDirectParticipants, getOtherParticipant } from '../utils/conversationId';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export function ChatScreen({ route, navigation }: Props) {
  const { conversationId, conversationType } = route.params;
  const me = useRequiredUser();
  const headerHeight = useHeaderHeight();
  const isGroup = conversationType === 'group';

  const { group, loading: groupLoading, error: groupError } = useGroup(isGroup ? conversationId : null);
  const { profilesById } = useUsers(me.uid);

  const otherUid = useMemo(
    () => (isGroup ? null : getOtherParticipant(conversationId, me.uid)),
    [isGroup, conversationId, me.uid],
  );

  // Somente participantes ativos leem/enviam (usuário removido perde o acesso na hora)
  const allowed = isGroup
    ? group !== null && group.memberIds.includes(me.uid)
    : getDirectParticipants(conversationId).includes(me.uid);

  const chat = useChat(conversationId, conversationType, me.uid, allowed);
  const { send } = chat;

  const other = otherUid ? profilesById.get(otherUid) : undefined;
  const title = isGroup ? group?.name ?? 'Grupo' : other?.name ?? 'Conversa';
  const photoUrl = isGroup ? group?.photoUrl : other?.photoUrl;

  const openInfo = useCallback(() => {
    if (isGroup) navigation.navigate('GroupMembers', { groupId: conversationId });
    else if (otherUid) navigation.navigate('Profile', { uid: otherUid });
  }, [isGroup, otherUid, conversationId, navigation]);

  // Cabeçalho: foto + nome, tocáveis (perfil ou lista de integrantes)
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Pressable onPress={openInfo} style={styles.headerTitle}>
          <Avatar uri={photoUrl} name={title} size={36} />
          <Text style={styles.headerText} numberOfLines={1}>{title}</Text>
        </Pressable>
      ),
    });
  }, [navigation, openInfo, photoUrl, title]);

  const mentionCandidates = useMemo<PublicProfile[]>(() => {
    if (!isGroup || !group) return [];
    return group.memberIds
      .filter((id) => id !== me.uid)
      .map((id) => profilesById.get(id))
      .filter((p): p is PublicProfile => p !== undefined);
  }, [isGroup, group, me.uid, profilesById]);

  const handleSend = useCallback(
    (text: string, memberId: string | null) =>
      send(text, memberId ? { type: 'member', memberId } : { type: 'conversation' }, memberId ? [memberId] : []),
    [send],
  );

  // Lista invertida: a mensagem mais nova fica embaixo e a rolagem acompanha sozinha
  const inverted = useMemo(() => [...chat.messages].reverse(), [chat.messages]);

  if (isGroup && groupLoading) return <Loading />;
  if (!allowed) {
    return (
      <View style={styles.pad}>
        <ErrorMessage
          message={
            isGroup
              ? groupError ?? 'Você não faz parte deste grupo ou ele não existe mais.'
              : 'Você não participa desta conversa.'
          }
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={headerHeight}>
      <View style={styles.banners}>
        {!chat.online ? <ErrorMessage tone="warning" message="Sem conexão. As mensagens serão sincronizadas quando voltar a internet." /> : null}
        {chat.error ? <ErrorMessage message={chat.error} /> : null}
        {chat.sendError ? <ErrorMessage message={`Falha ao enviar: ${chat.sendError}`} /> : null}
        {chat.pushWarning ? <ErrorMessage tone="warning" message={chat.pushWarning} /> : null}
      </View>

      {chat.loading ? (
        <Loading label="Carregando mensagens…" />
      ) : chat.messages.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nenhuma mensagem ainda</Text>
          <Text style={styles.emptyText}>Envie a primeira mensagem desta conversa.</Text>
        </View>
      ) : (
        <FlatList
          data={inverted}
          inverted
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const mine = item.senderId === me.uid;
            const targetName = item.target.type === 'member' && isGroup ? profilesById.get(item.target.memberId)?.name : undefined;
            const senderUid = item.senderId;
            return (
              <ChatMessage
                message={item}
                mine={mine}
                authorName={isGroup ? profilesById.get(senderUid)?.name ?? 'Usuário' : undefined}
                targetName={targetName}
                onAuthorPress={() => navigation.navigate('Profile', { uid: senderUid })}
              />
            );
          }}
        />
      )}

      <ChatInput onSend={handleSend} sending={chat.sending} disabled={!chat.online} members={mentionCandidates} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg },
  banners: { gap: spacing.xs, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  list: { paddingVertical: spacing.sm },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, maxWidth: 240 },
  headerText: { fontSize: 17, fontWeight: '700', color: colors.text, flexShrink: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, padding: spacing.xl },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  emptyText: { color: colors.muted, textAlign: 'center' },
});
