import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { UserItem } from '../components/UserItem';
import { useRequiredUser } from '../hooks/useAuth';
import { useUsers } from '../hooks/useUsers';
import type { RootStackParamList } from '../navigation/types';
import { getOrCreateDirectConversation } from '../services/chatService';
import { colors, spacing } from '../theme';
import type { PublicProfile } from '../types/user';
import { toFriendlyError } from '../utils/errors';

type Props = NativeStackScreenProps<RootStackParamList, 'Users'>;

export function UsersScreen({ navigation }: Props) {
  const me = useRequiredUser();
  const { users, loading, error, search, setSearch } = useUsers(me.uid);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const startChat = useCallback(
    async (other: PublicProfile) => {
      if (starting) return;
      setStarting(true);
      setStartError(null);
      try {
        const conversationId = await getOrCreateDirectConversation(me.uid, other.uid);
        navigation.replace('Chat', { conversationId, conversationType: 'direct' });
      } catch (e) {
        setStartError(toFriendlyError(e));
        setStarting(false);
      }
    },
    [me.uid, navigation, starting],
  );

  if (loading) return <Loading label="Carregando usuários…" />;

  return (
    <View style={styles.container}>
      <TextInput style={styles.search} value={search} onChangeText={setSearch} placeholder="Buscar por nome" placeholderTextColor={colors.muted} autoCapitalize="none" />
      <View style={styles.banners}>
        {error ? <ErrorMessage message={error} /> : null}
        {startError ? <ErrorMessage message={startError} /> : null}
      </View>
      <FlatList
        data={users}
        keyExtractor={(u) => u.uid}
        renderItem={({ item }) => <UserItem user={item} onPress={startChat} />}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={styles.empty}>{search ? 'Nenhum usuário encontrado para esta busca.' : 'Nenhum outro usuário cadastrado ainda.'}</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  search: { margin: spacing.lg, minHeight: 44, borderRadius: 10, paddingHorizontal: 14, backgroundColor: colors.card, color: colors.text, borderWidth: 1, borderColor: colors.border },
  banners: { paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.sm },
  empty: { textAlign: 'center', color: colors.muted, padding: spacing.xl },
});
