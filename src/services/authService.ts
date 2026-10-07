import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type Unsubscribe,
  type User,
} from 'firebase/auth';
import { doc, writeBatch } from 'firebase/firestore';
import type { PublicProfileDoc, RegisterInput, UserDoc } from '../types/user';
import { auth, db } from './firebase';
import { uploadImage } from './imageService';

export async function registerUser(input: RegisterInput): Promise<User> {
  const photoUrl = input.photoUri ? await uploadImage(input.photoUri, 'profiles') : '';
  const credential = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
  const { user } = credential;
  try {
    const createdAt = Date.now();
    const userDoc: UserDoc = {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phoneNumber: input.phoneNumber,
      birthDate: input.birthDate,
      photoUrl,
      createdAt,
    };
    const publicDoc: PublicProfileDoc = { name: userDoc.name, photoUrl, createdAt };
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', user.uid), userDoc);
    batch.set(doc(db, 'publicProfiles', user.uid), publicDoc);
    await batch.commit();
    await updateProfile(user, { displayName: userDoc.name, photoURL: photoUrl || null });
    return user;
  } catch (error) {
    // Evita conta "meio criada" sem perfil
    await deleteUser(user).catch(() => undefined);
    throw error;
  }
}

export async function loginUser(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

export function logoutUser(): Promise<void> {
  return firebaseSignOut(auth);
}

export function observeAuth(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}
