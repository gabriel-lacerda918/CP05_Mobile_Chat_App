import type { User } from 'firebase/auth';
import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '../contexts/AuthContext';

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}

/** Para telas protegidas: garante um usuário autenticado. */
export function useRequiredUser(): User {
  const { user } = useAuth();
  if (!user) throw new Error('Tela protegida acessada sem usuário autenticado');
  return user;
}
