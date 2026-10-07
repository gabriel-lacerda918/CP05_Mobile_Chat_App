import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, spacing } from '../theme';
import type { PublicProfile } from '../types/user';

type Props = {
  onSend: (text: string, memberId: string | null) => Promise<boolean>;
  sending: boolean;
  disabled?: boolean;
  members?: PublicProfile[]; // candidatos a destinatário/menção (somente em grupos)
};

export function ChatInput({ onSend, sending, disabled = false, members = [] }: Props) {
  const [text, setText] = useState('');
  const [memberId, setMemberId] = useState<string | null>(null);
  const canSend = !disabled && !sending && text.trim().length > 0;

  const submit = useCallback(async () => {
    const ok = await onSend(text, memberId);
    if (ok) {
      setText('');
      setMemberId(null);
    }
  }, [onSend, text, memberId]);

  return (
    <View style={styles.container}>
      {members.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Text style={styles.chipsLabel}>Para:</Text>
          <Chip label="Todos" active={memberId === null} onPress={() => setMemberId(null)} />
          {members.map((m) => (
            <Chip key={m.uid} label={m.name} active={memberId === m.uid} onPress={() => setMemberId(m.uid)} />
          ))}
        </ScrollView>
      ) : null}
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={disabled ? 'Sem conexão…' : 'Digite uma mensagem'}
          placeholderTextColor={colors.muted}
          multiline
          editable={!disabled}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enviar"
          onPress={submit}
          disabled={!canSend}
          style={[styles.send, { opacity: canSend ? 1 : 0.45 }]}
        >
          <Text style={styles.sendText}>{sending ? '…' : 'Enviar'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  chips: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  chipsLabel: { color: colors.muted },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.sm },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.bg,
    color: colors.text,
  },
  send: { height: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '700' },
});
