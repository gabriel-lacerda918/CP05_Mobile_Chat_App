import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { ConversationItem } from '../components/ConversationItem';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { useAuth, useRequiredUser } from '../hooks/useAuth';
import { useConversations } from '../hooks/useConversations';
import { useNotifications } from '../hooks/useNotifications';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import type { ConversationSummary } from '../types/chat';

type Props = NativeStackScreenProps<RootStackParamList, 'Conversations'>;

export function ConversationsScreen({ navigation }: Props) {
  const user = useRequiredUser();
  const { profile, signOut } = useAuth();
  const { items, loading, error } = useConversations(user.uid);
  const { state: push, retry } = useNotifications(user.uid);
  const [loggingOut, setLoggingOut] = useState(false);

  const open = useCallback(
    (item: ConversationSummary) =>
      navigation.navigate('Chat', { conversationId: item.id, conversationType: item.type }),
    [navigation],
  );

  const confirmLogout = useCallback(() => {
    Alert.alert('Sair', 'Deseja encerrar a sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          setLoggingOut(true);
          signOut().catch(() => setLoggingOut(false));
        },
      },
    ]);
  }, [signOut]);

  if (loading) return <Loading label="Carregando conversas…" />;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable style={styles.me} onPress={() => navigation.navigate('Profile', { uid: user.uid })}>
          <Avatar uri={profile?.photoUrl} name={profile?.name} size={36} />
          <Text style={styles.meName} numberOfLines={1}>{profile?.name ?? 'Meu perfil'}</Text>
        </Pressable>
        <Pressable onPress={confirmLogout} disabled={loggingOut} hitSlop={8}>
          <Text style={styles.logout}>{loggingOut ? 'Saindo…' : 'Sair'}</Text>
        </Pressable>
      </View>

      <View style={styles.actions}>
        <View style={styles.flex}><Button title="Nova conversa" onPress={() => navigation.navigate('Users')} /></View>
        <View style={styles.flex}><Button title="Novo grupo" variant="secondary" onPress={() => navigation.navigate('GroupForm')} /></View>
      </View>

      <View style={styles.banners}>
        {push?.status === 'denied' ? (
          <ErrorMessage tone="warning" message="Notificações desativadas. Ative-as nas configurações para receber mensagens em segundo plano." actionLabel="Abrir configurações" onAction={() => Linking.openSettings()} />
        ) : null}
        {push?.status === 'unavailable' ? (
          <ErrorMessage tone="warning" message="Não foi possível registrar este aparelho para notificações (sem token disponível)." actionLabel="Tentar novamente" onAction={retry} />
        ) : null}
        {error ? <ErrorMessage message={error} /> : null}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => `${item.type}:${item.id}`}
        renderItem={({ item }) => <ConversationItem item={item} onPress={open} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nenhuma conversa ainda</Text>
            <Text style={styles.emptyText}>Toque em “Nova conversa” para falar com alguém ou crie um grupo.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  me: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  meName: { fontWeight: '700', color: colors.text, flexShrink: 1 },
  logout: { color: colors.danger, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  banners: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  empty: { alignItems: 'center', padding: spacing.xl * 2, gap: spacing.sm },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText: { color: colors.muted, textAlign: 'center' },
});
