import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import { TextField } from '../components/TextField';
import { useAuth } from '../hooks/useAuth';
import type { RootStackParamList } from '../navigation/types';
import { pickImage } from '../services/imageService';
import { colors, spacing } from '../theme';
import { toFriendlyError } from '../utils/errors';
import {
  maskDate,
  normalizePhone,
  parseBirthDate,
  validateRegisterForm,
  type RegisterFormErrors,
  type RegisterFormValues,
} from '../utils/validation';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

const EMPTY: RegisterFormValues = { name: '', email: '', phone: '', birthDate: '', password: '', confirmPassword: '' };

export function RegisterScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [values, setValues] = useState<RegisterFormValues>(EMPTY);
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = useCallback(
    (field: keyof RegisterFormValues) => (text: string) =>
      setValues((prev) => ({ ...prev, [field]: field === 'birthDate' ? maskDate(text) : text })),
    [],
  );

  const choosePhoto = useCallback(async () => {
    try {
      const uri = await pickImage();
      if (uri) setPhotoUri(uri);
    } catch (e) {
      setError(toFriendlyError(e));
    }
  }, []);

  const submit = useCallback(async () => {
    const found = validateRegisterForm(values);
    setErrors(found);
    const birthDate = parseBirthDate(values.birthDate);
    if (Object.keys(found).length > 0 || birthDate === null) return;
    setError(null);
    setLoading(true);
    try {
      await signUp({
        name: values.name,
        email: values.email,
        password: values.password,
        phoneNumber: normalizePhone(values.phone),
        birthDate,
        photoUri,
      });
    } catch (e) {
      setError(toFriendlyError(e));
      setLoading(false);
    }
  }, [values, photoUri, signUp]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Criar conta</Text>
        <Pressable style={styles.photo} onPress={choosePhoto}>
          <Avatar uri={photoUri ?? undefined} name={values.name} size={96} />
          <Text style={styles.photoLabel}>{photoUri ? 'Trocar foto' : 'Escolher foto de perfil'}</Text>
        </Pressable>
        <TextField label="Nome" value={values.name} onChangeText={setField('name')} error={errors.name} autoComplete="name" />
        <TextField label="E-mail" value={values.email} onChangeText={setField('email')} error={errors.email} autoCapitalize="none" keyboardType="email-address" />
        <TextField label="Celular (com DDD)" value={values.phone} onChangeText={setField('phone')} error={errors.phone} keyboardType="phone-pad" placeholder="11912345678" />
        <TextField label="Data de nascimento" value={values.birthDate} onChangeText={setField('birthDate')} error={errors.birthDate} keyboardType="number-pad" placeholder="DD/MM/AAAA" />
        <TextField label="Senha" value={values.password} onChangeText={setField('password')} error={errors.password} secureTextEntry />
        <TextField label="Confirmar senha" value={values.confirmPassword} onChangeText={setField('confirmPassword')} error={errors.confirmPassword} secureTextEntry />
        {error ? <ErrorMessage message={error} /> : null}
        <View style={styles.actions}>
          <Button title="Cadastrar" onPress={submit} loading={loading} />
          <Button title="Já tenho conta" variant="secondary" onPress={() => navigation.goBack()} disabled={loading} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingTop: 56, gap: spacing.md },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  photo: { alignItems: 'center', gap: spacing.sm, marginVertical: spacing.sm },
  photoLabel: { color: colors.primary, fontWeight: '600' },
  actions: { gap: spacing.md, marginTop: spacing.sm },
});
