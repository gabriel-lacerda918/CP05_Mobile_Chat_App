import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, spacing } from '../theme';
import type { PublicProfile } from '../types/user';
import { Avatar } from './Avatar';

type Props = {
  user: PublicProfile;
  onPress: (user: PublicProfile) => void;
  selected?: boolean;
  right?: ReactNode;
};

export function UserItem({ user, onPress, selected = false, right }: Props) {
  return (
    <Pressable style={[styles.row, selected && styles.selected]} onPress={() => onPress(user)}>
      <Avatar uri={user.photoUrl} name={user.name} size={44} />
      <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
      {selected ? <Text style={styles.check}>✓</Text> : null}
      {right}
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
  selected: { backgroundColor: colors.mine },
  name: { flex: 1, fontSize: 16, color: colors.text },
  check: { color: colors.primaryDark, fontWeight: '800', fontSize: 18 },
});
