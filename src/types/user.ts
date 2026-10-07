export type ChatUser = {
  uid: string;
  name: string;
  email: string;
  phoneNumber: string;
  birthDate: string; // ISO: AAAA-MM-DD
  photoUrl: string;
  createdAt: number;
};

export type UserDoc = Omit<ChatUser, 'uid'>;

export type PublicProfile = { uid: string; name: string; photoUrl: string };
export type PublicProfileDoc = { name: string; photoUrl: string; createdAt: number };

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  birthDate: string;
  photoUri: string | null;
};
