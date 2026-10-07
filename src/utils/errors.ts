import { FirebaseError } from 'firebase/app';

/** Erro com mensagem já segura para exibir ao usuário. */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.status = status;
    this.code = code;
  }
}

const GENERIC = 'Não foi possível concluir a operação. Tente novamente.';

const API_MESSAGES: Record<string, string> = {
  group_full: 'O grupo atingiu o limite de integrantes.',
  limit_below_members: 'O limite não pode ser menor que o número atual de integrantes.',
  forbidden: 'Você não tem permissão para realizar esta ação.',
  not_found: 'Item não encontrado.',
  unauthenticated: 'Sessão expirada. Entre novamente.',
  network: 'Sem conexão com o servidor. Verifique sua internet.',
  not_configured: 'O servidor do aplicativo não está configurado.',
  invalid_request: 'Dados inválidos. Revise as informações e tente novamente.',
};

const FIREBASE_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/invalid-email': 'Informe um e-mail válido.',
  'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
  'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.',
  'auth/network-request-failed': 'Sem conexão. Verifique sua internet.',
  'auth/user-token-expired': 'Sessão expirada. Entre novamente.',
  'auth/requires-recent-login': 'Sessão expirada. Entre novamente.',
  'permission-denied': 'Você não tem permissão para acessar estes dados.',
  unavailable: 'Serviço indisponível. Verifique sua conexão.',
};

export function toFriendlyError(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof ApiError) return API_MESSAGES[error.code ?? ''] ?? GENERIC;
  if (error instanceof Error && error.message.toLowerCase().includes('permission_denied')) {
    return FIREBASE_MESSAGES['permission-denied'];
  }
  if (error instanceof FirebaseError) return FIREBASE_MESSAGES[error.code] ?? GENERIC;
  return GENERIC;
}
