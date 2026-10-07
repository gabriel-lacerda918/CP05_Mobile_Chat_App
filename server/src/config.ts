function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

export type Config = {
  port: number;
  projectId: string;
  clientEmail: string;
  privateKey: string;
  databaseURL: string;
  expoAccessToken?: string;
};

export function loadConfig(): Config {
  return {
    port: Number(process.env.PORT ?? 3000),
    projectId: required('FIREBASE_PROJECT_ID'),
    clientEmail: required('FIREBASE_CLIENT_EMAIL'),
    // Hospedagens costumam guardar a chave com "\n" literal
    privateKey: required('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
    databaseURL: required('FIREBASE_DATABASE_URL'),
    expoAccessToken: process.env.EXPO_ACCESS_TOKEN || undefined,
  };
}
