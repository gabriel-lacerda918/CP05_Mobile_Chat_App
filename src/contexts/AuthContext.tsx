import type { User } from 'firebase/auth';
import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { loginUser, logoutUser, observeAuth, registerUser } from '../services/authService';
import { disableCurrentDevice } from '../services/notificationService';
import { getUser } from '../services/userService';
import type { ChatUser, RegisterInput } from '../types/user';

export type AuthContextValue = {
  user: User | null;
  profile: ChatUser | null;
  initializing: boolean;
  signUp: (input: RegisterInput) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ChatUser | null>(null);
  const [initializing, setInitializing] = useState(true);
  const registering = useRef(false);

  // Recupera a sessão persistida e acompanha login/logout
  useEffect(() => {
    return observeAuth(async (firebaseUser) => {
      if (registering.current) return; // o cadastro conclui o estado sozinho
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          setProfile(await getUser(firebaseUser.uid));
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setInitializing(false);
    });
  }, []);

  const signUp = useCallback(async (input: RegisterInput) => {
    registering.current = true;
    try {
      const created = await registerUser(input);
      setProfile(await getUser(created.uid));
      setUser(created);
    } finally {
      registering.current = false;
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await loginUser(email, password);
  }, []);

  const signOut = useCallback(async () => {
    if (user) await disableCurrentDevice(user.uid);
    await logoutUser();
    setUser(null);
    setProfile(null);
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, initializing, signUp, signIn, signOut }),
    [user, profile, initializing, signUp, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
