import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { Loading } from '../components/Loading';
import { useRequiredUser } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroups';
import { useUsers } from '../hooks/useUsers';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import type { PublicProfile } from '../types/user';
import { formatSlots } from '../utils/groupValidation';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupMembers'>;

export function GroupMembersScreen({ route, navigation }: Props) {
  const { groupId } = route.params;
  const me = useRequiredUser();
  const { group, loading, error } = useGroup(groupId);
  const { profilesById } = useUsers(me.uid);

  const members = useMemo<PublicProfile[]>(
    () =>
      group
        ? group.memberIds.map((id) => profilesById.get(id) ?? { uid: id, name: 'Usuário', photoUrl: '' })
        : [],
    [group, profilesById],
  );

  const openProfile = useCallback(
    (member: PublicProfile) => navigation.navigate('Profile', { uid: member.uid }),
    [navigation],
  );

  if (loading) return <Loading />;
  if (error || !group) {
    return (
      <View style={styles.pad}>
        <ErrorMessage message={error ?? 'Grupo não encontrado.'} />
      </View>
    );
  }

  return (
    <FlatList
      data={members}
      keyExtractor={(m) => m.uid}
      ListHeaderComponent={
        <View style={styles.header}>
          <Avatar uri={group.photoUrl} name={group.name} size={96} />
          <Text style={styles.name}>{group.name}</Text>
          <Text style={styles.slots}>{formatSlots(group.memberLimit, group.memberIds.length)}</Text>
          {group.ownerId === me.uid ? (
            <Button title="Gerenciar grupo" onPress={() => navigation.navigate('GroupForm', { groupId })} />
          ) : null}
        </View>
      }
      renderItem={({ item }) => (
        <GroupMemberItem user={item} isOwner={item.uid === group.ownerId} onPress={openProfile} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  pad: { padding: spacing.lg },
  header: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
  name: { fontSize: 22, fontWeight: '800', color: colors.text },
  slots: { color: colors.muted, marginBottom: spacing.sm },
});
