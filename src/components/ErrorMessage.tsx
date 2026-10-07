import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

type Props = {
  message: string;
  tone?: 'error' | 'warning';
  actionLabel?: string;
  onAction?: () => void;
};

export function ErrorMessage({ message, tone = 'error', actionLabel, onAction }: Props) {
  const warning = tone === 'warning';
  return (
    <View style={[styles.box, { backgroundColor: warning ? colors.warnBg : colors.dangerBg }]}>
      <Text style={[styles.text, { color: warning ? colors.warnText : colors.danger }]}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[styles.action, { color: warning ? colors.warnText : colors.danger }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: spacing.md, borderRadius: 10, gap: spacing.xs },
  text: { fontSize: 14 },
  action: { fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
});
