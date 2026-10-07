import { ApiError } from '../utils/errors';
import { auth } from './firebase';

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
const TIMEOUT_MS = 15000;

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';
type ErrorBody = { code?: string; message?: string };

/** Chamada autenticada à API própria (Bearer = Firebase ID Token). */
export async function apiRequest<T>(method: Method, path: string, body?: object): Promise<T> {
  if (!API_URL) throw new ApiError('API não configurada', 0, 'not_configured');
  const user = auth.currentUser;
  if (!user) throw new ApiError('Sessão expirada', 401, 'unauthenticated');

  const token = await user.getIdToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    const data: unknown = text ? JSON.parse(text) : {};
    if (!res.ok) {
      const err = data as ErrorBody;
      throw new ApiError(err.message ?? 'Erro na API', res.status, err.code);
    }
    return data as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError('Sem conexão com o servidor', 0, 'network');
  } finally {
    clearTimeout(timer);
  }
}
