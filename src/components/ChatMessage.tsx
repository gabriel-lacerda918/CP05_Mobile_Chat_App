import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';
import type { ChatMessage as ChatMessageData } from '../types/chat';

type Props = {
  message: ChatMessageData;
  mine: boolean;
  authorName?: string; // exibido apenas em grupos, para mensagens de outros
  targetName?: string; // quando a mensagem é direcionada a um integrante
  onAuthorPress?: () => void;
};

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function ChatMessageBase({ message, mine, authorName, targetName, onAuthorPress }: Props) {
  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowOther]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
        {!mine && authorName ? (
          <Pressable onPress={onAuthorPress}>
            <Text style={styles.author}>{authorName}</Text>
          </Pressable>
        ) : null}
        {targetName ? <Text style={styles.target}>Para @{targetName}</Text> : null}
        <Text style={styles.text}>{message.text}</Text>
        <Text style={styles.time}>{formatTime(message.createdAt)}</Text>
      </View>
    </View>
  );
}

export const ChatMessage = memo(ChatMessageBase);

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.md, paddingVertical: 3, flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { backgroundColor: colors.mine, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.card, borderBottomLeftRadius: 4 },
  author: { color: colors.primaryDark, fontWeight: '700', marginBottom: 2 },
  target: { color: colors.muted, fontSize: 12, marginBottom: 2 },
  text: { color: colors.text, fontSize: 16 },
  time: { color: colors.muted, fontSize: 11, alignSelf: 'flex-end', marginTop: 2 },
});
