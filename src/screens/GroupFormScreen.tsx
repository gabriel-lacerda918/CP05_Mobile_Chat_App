import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { Loading } from '../components/Loading';
import { TextField } from '../components/TextField';
import { UserItem } from '../components/UserItem';
import { useRequiredUser } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroups';
import { useUsers } from '../hooks/useUsers';
import type { RootStackParamList } from '../navigation/types';
import { addMember, createGroup, removeMember, updateGroupSettings } from '../services/groupService';
import { pickImage, uploadImage } from '../services/imageService';
import { colors, spacing } from '../theme';
import type { GroupSettingsPatch } from '../types/group';
import { NOTIFICATION_POLICIES, type NotificationPolicy } from '../types/notification';
import type { PublicProfile } from '../types/user';
import { toFriendlyError } from '../utils/errors';
import { formatSlots, parseLimit, validateGroupForm } from '../utils/groupValidation';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupForm'>;

export function GroupFormScreen({ route, navigation }: Props) {
  const groupId = route.params?.groupId ?? null;
  const me = useRequiredUser();
  const { group, loading: groupLoading, error: groupError } = useGroup(groupId);
  const { users, profilesById, loading: usersLoading, error: usersError, search, setSearch } = useUsers(me.uid);

  const [name, setName] = useState('');
  const [limitText, setLimitText] = useState('10');
  const [policy, setPolicy] = useState<NotificationPolicy>('all_group_messages');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Edição: preenche o formulário uma única vez com os dados do grupo
  useEffect(() => {
    if (group && !hydrated) {
      setName(group.name);
      setLimitText(String(group.memberLimit));
      setPolicy(group.notificationPolicy);
      setHydrated(true);
    }
  }, [group, hydrated]);

  const limit = useMemo(() => parseLimit(limitText), [limitText]);
  const memberIds = useMemo(
    () => (groupId !== null ? group?.memberIds ?? [] : [me.uid, ...selected]),
    [groupId, group, me.uid, selected],
  );
  // Na edição, as vagas consideram o limite já salvo no servidor
  const effectiveLimit = groupId !== null ? group?.memberLimit ?? null : limit;
  const slots = effectiveLimit === null ? null : effectiveLimit - memberIds.length;

  const candidates = useMemo(
    () => (groupId !== null ? users.filter((u) => !memberIds.includes(u.uid)) : users),
    [groupId, users, memberIds],
  );
  const currentMembers = useMemo<PublicProfile[]>(
    () => memberIds.map((id) => profilesById.get(id) ?? { uid: id, name: 'Usuário', photoUrl: '' }),
    [memberIds, profilesById],
  );

  const choosePhoto = useCallback(async () => {
    try {
      const uri = await pickImage();
      if (uri) setPhotoUri(uri);
    } catch (e) {
      setFormError(toFriendlyError(e));
    }
  }, []);

  const onPressUser = useCallback(
    async (user: PublicProfile) => {
      setFormError(null);
      setNotice(null);
      if (groupId === null) {
        if (selected.includes(user.uid)) {
          setSelected(selected.filter((id) => id !== user.uid));
        } else if (slots !== null && slots <= 0) {
          setFormError('O grupo está sem vagas. Aumente o limite para adicionar mais integrantes.');
        } else {
          setSelected([...selected, user.uid]);
        }
        return;
      }
      if (slots !== null && slots <= 0) {
        setFormError('O grupo está sem vagas. Aumente o limite para adicionar mais integrantes.');
        return;
      }
      setBusyUid(user.uid);
      try {
        await addMember(groupId, user.uid); // o servidor revalida limite e propriedade em transação
      } catch (e) {
        setFormError(toFriendlyError(e));
      } finally {
        setBusyUid(null);
      }
    },
    [groupId, selected, slots],
  );

  const confirmRemove = useCallback(
    (user: PublicProfile) => {
      if (groupId === null) return;
      Alert.alert('Remover integrante', `Remover ${user.name} do grupo?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            setBusyUid(user.uid);
            setFormError(null);
            try {
              await removeMember(groupId, user.uid);
            } catch (e) {
              setFormError(toFriendlyError(e));
            } finally {
              setBusyUid(null);
            }
          },
        },
      ]);
    },
    [groupId],
  );

  const submit = useCallback(async () => {
    setFormError(null);
    setNotice(null);
    const memberCount = groupId !== null ? group?.memberIds.length ?? 0 : selected.length + 1;
    const invalid = validateGroupForm({ name, limit, memberCount });
    if (invalid || limit === null) {
      setFormError(invalid);
      return;
    }
    setSaving(true);
    try {
      if (groupId === null) {
        const photoUrl = photoUri ? await uploadImage(photoUri, 'groups') : '';
        const id = await createGroup({
          name: name.trim(),
          photoUrl,
          memberIds: selected,
          memberLimit: limit,
          notificationPolicy: policy,
        });
        navigation.replace('Chat', { conversationId: id, conversationType: 'group' });
        return;
      }
      if (!group) return;
      const patch: GroupSettingsPatch = {};
      if (name.trim() !== group.name) patch.name = name.trim();
      if (limit !== group.memberLimit) patch.memberLimit = limit;
      if (policy !== group.notificationPolicy) patch.notificationPolicy = policy;
      if (photoUri) patch.photoUrl = await uploadImage(photoUri, 'groups');
      if (Object.keys(patch).length === 0) {
        setNotice('Nenhuma alteração para salvar.');
      } else {
        await updateGroupSettings(groupId, patch);
        setPhotoUri(null);
        setNotice('Configurações salvas.');
      }
    } catch (e) {
      setFormError(toFriendlyError(e));
    } finally {
      setSaving(false);
    }
  }, [groupId, group, name, limit, policy, photoUri, selected, navigation]);

  if (groupId !== null && groupLoading) return <Loading />;
  if (groupId !== null && (groupError || !group)) {
    return <View style={styles.pad}><ErrorMessage message={groupError ?? 'Grupo não encontrado.'} /></View>;
  }
  if (group && group.ownerId !== me.uid) {
    return <View style={styles.pad}><ErrorMessage message="Somente o proprietário pode gerenciar o grupo." /></View>;
  }
  if (usersLoading) return <Loading label="Carregando usuários…" />;

  const header = (
    <View style={styles.form}>
      <Pressable style={styles.photo} onPress={choosePhoto}>
        <Avatar uri={photoUri ?? group?.photoUrl} name={name} size={96} />
        <Text style={styles.photoLabel}>{photoUri || group?.photoUrl ? 'Trocar foto do grupo' : 'Escolher foto do grupo'}</Text>
      </Pressable>
      <TextField label="Nome do grupo" value={name} onChangeText={setName} maxLength={60} />
      <TextField label="Limite de integrantes (inclui você)" value={limitText} onChangeText={setLimitText} keyboardType="number-pad" />
      <Text style={styles.slots}>{formatSlots(effectiveLimit, memberIds.length)}</Text>

      <Text style={styles.section}>Notificações push</Text>
      {NOTIFICATION_POLICIES.map((p) => (
        <Pressable key={p.value} style={[styles.policy, policy === p.value && styles.policyActive]} onPress={() => setPolicy(p.value)}>
          <Text style={styles.policyLabel}>{policy === p.value ? '● ' : '○ '}{p.label}</Text>
          <Text style={styles.policyDesc}>{p.description}</Text>
        </Pressable>
      ))}

      {formError ? <ErrorMessage message={formError} /> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <Button title={groupId === null ? 'Criar grupo' : 'Salvar configurações'} onPress={submit} loading={saving} />

      {groupId !== null ? (
        <>
          <Text style={styles.section}>Integrantes</Text>
          {currentMembers.map((m) => (
            <GroupMemberItem key={m.uid} user={m} isOwner={m.uid === group?.ownerId} onPress={(u) => navigation.navigate('Profile', { uid: u.uid })} onRemove={confirmRemove} removing={busyUid === m.uid} />
          ))}
        </>
      ) : null}

      <Text style={styles.section}>{groupId === null ? 'Escolher integrantes' : 'Adicionar integrantes'}</Text>
      <TextInput style={styles.search} value={search} onChangeText={setSearch} placeholder="Buscar por nome" placeholderTextColor={colors.muted} autoCapitalize="none" />
      {usersError ? <ErrorMessage message={usersError} /> : null}
    </View>
  );

  return (
    <FlatList
      data={candidates}
      keyExtractor={(u) => u.uid}
      ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled"
      renderItem={({ item }) => (
        <UserItem
          user={item}
          onPress={onPressUser}
          selected={selected.includes(item.uid)}
          right={busyUid === item.uid ? <Text style={styles.busy}>…</Text> : groupId !== null ? <Text style={styles.add}>Adicionar</Text> : null}
        />
      )}
      ListEmptyComponent={<Text style={styles.empty}>Nenhum usuário disponível.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  pad: { padding: spacing.lg },
  form: { padding: spacing.lg, gap: spacing.md },
  photo: { alignItems: 'center', gap: spacing.sm },
  photoLabel: { color: colors.primary, fontWeight: '600' },
  slots: { color: colors.primaryDark, fontWeight: '700' },
  section: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: spacing.md },
  policy: { padding: spacing.md, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  policyActive: { borderColor: colors.primary, backgroundColor: colors.mine },
  policyLabel: { fontWeight: '700', color: colors.text },
  policyDesc: { color: colors.muted, marginTop: 2 },
  notice: { color: colors.primaryDark, fontWeight: '600' },
  search: { minHeight: 44, borderRadius: 10, paddingHorizontal: 14, backgroundColor: colors.card, color: colors.text, borderWidth: 1, borderColor: colors.border },
  add: { color: colors.primary, fontWeight: '700' },
  busy: { color: colors.muted, fontWeight: '700' },
  empty: { textAlign: 'center', color: colors.muted, padding: spacing.xl },
});
