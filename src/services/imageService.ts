import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { AppError } from '../utils/errors';

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '';

/** Abre a galeria. Retorna a URI local ou null se o usuário cancelar. */
export async function pickImage(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  // No Android 13+ o seletor do sistema (Photo Picker) dispensa permissão; no iOS ela é exigida.
  if (!permission.granted && Platform.OS === 'ios') {
    throw new AppError('Permissão para acessar fotos negada. Ative em Ajustes > ChatApp > Fotos.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
  });
  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}

/** Envia o arquivo ao Cloudinary e devolve apenas a URL final (https). */
export async function uploadImage(uri: string, folder: 'profiles' | 'groups'): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) throw new AppError('Serviço de imagens não configurado.');
  const form = new FormData();
  form.append('file', { uri, name: 'photo.jpg', type: 'image/jpeg' } as unknown as Blob);
  form.append('upload_preset', UPLOAD_PRESET);
  form.append('folder', folder);
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: form,
    });
    const data = (await res.json()) as { secure_url?: string };
    if (!res.ok || !data.secure_url) throw new Error('upload_failed');
    return data.secure_url;
  } catch {
    throw new AppError('Não foi possível enviar a imagem. Verifique sua conexão e tente novamente.');
  }
}
