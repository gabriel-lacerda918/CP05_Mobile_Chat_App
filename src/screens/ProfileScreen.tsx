import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import type { RootStackParamList } from '../navigation/types';
import { getUser } from '../services/userService';
import { colors, spacing } from '../theme';
import type { ChatUser } from '../types/user';
import { formatIsoDate } from '../utils/validation';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export function ProfileScreen({ route }: Props) {
  const { uid } = route.params;
  const [user, setUser] = useState<ChatUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getUser(uid)
      .then((result) => {
        if (!active) return;
        setUser(result);
        setUnavailable(result === null);
      })
      // As regras negam o acesso a quem não compartilha conversa/grupo com o perfil
      .catch(() => active && setUnavailable(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [uid]);

  if (loading) return <Loading />;
  if (unavailable || !user) {
    return (
      <View style={styles.pad}>
        <ErrorMessage message="Este perfil não está disponível. Você precisa compartilhar uma conversa ou grupo com a pessoa." />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Avatar uri={user.photoUrl} name={user.name} size={120} />
      <Text style={styles.name}>{user.name}</Text>
      <View style={styles.card}>
        <Field label="E-mail" value={user.email} />
        <Field label="Celular" value={user.phoneNumber} />
        <Field label="Data de nascimento" value={formatIsoDate(user.birthDate)} />
      </View>
    </ScrollView>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || 'Não informado'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { padding: spacing.lg },
  content: { alignItems: 'center', padding: spacing.xl, gap: spacing.lg },
  name: { fontSize: 24, fontWeight: '800', color: colors.text },
  card: { alignSelf: 'stretch', backgroundColor: colors.card, borderRadius: 12, padding: spacing.lg, gap: spacing.md },
  field: { gap: 2 },
  label: { color: colors.muted, fontSize: 13 },
  value: { color: colors.text, fontSize: 16 },
});
