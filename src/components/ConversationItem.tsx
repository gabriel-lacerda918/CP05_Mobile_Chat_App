import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';
import type { ConversationSummary } from '../types/chat';
import { Avatar } from './Avatar';

type Props = { item: ConversationSummary; onPress: (item: ConversationSummary) => void };

export function ConversationItem({ item, onPress }: Props) {
  const isGroup = item.type === 'group';
  return (
    <Pressable style={styles.row} onPress={() => onPress(item)}>
      <Avatar uri={item.photoUrl} name={item.title} size={52} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{item.subtitle}</Text>
      </View>
      <View style={[styles.badge, isGroup ? styles.badgeGroup : styles.badgeDirect]}>
        <Text style={[styles.badgeText, { color: isGroup ? colors.primaryDark : colors.muted }]}>
          {isGroup ? 'Grupo' : 'Individual'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  body: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  subtitle: { color: colors.muted, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeGroup: { backgroundColor: colors.mine },
  badgeDirect: { backgroundColor: colors.border },
  badgeText: { fontSize: 12, fontWeight: '600' },
});
