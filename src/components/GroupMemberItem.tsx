import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, spacing } from '../theme';
import type { PublicProfile } from '../types/user';
import { Avatar } from './Avatar';

type Props = {
  user: PublicProfile;
  isOwner: boolean;
  onPress: (user: PublicProfile) => void;
  onRemove?: (user: PublicProfile) => void;
  removing?: boolean;
};

export function GroupMemberItem({ user, isOwner, onPress, onRemove, removing = false }: Props) {
  return (
    <Pressable style={styles.row} onPress={() => onPress(user)}>
      <Avatar uri={user.photoUrl} name={user.name} size={44} />
      <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
      {isOwner ? <Text style={styles.owner}>Proprietário</Text> : null}
      {onRemove && !isOwner ? (
        removing ? (
          <ActivityIndicator color={colors.danger} />
        ) : (
          <Pressable onPress={() => onRemove(user)} hitSlop={8}>
            <Text style={styles.remove}>Remover</Text>
          </Pressable>
        )
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  name: { flex: 1, fontSize: 16, color: colors.text },
  owner: { color: colors.primaryDark, fontWeight: '700', fontSize: 12 },
  remove: { color: colors.danger, fontWeight: '700' },
});
