export {};

declare global {
  namespace Express {
    interface Request {
      /** uid do usuário autenticado (definido por middleware/authenticate). */
      uid: string;
    }
  }
}
