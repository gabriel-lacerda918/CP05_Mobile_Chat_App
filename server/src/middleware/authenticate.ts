import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../errors';
import { adminAuth } from '../services/firebaseAdmin';

/** Valida o Firebase ID Token do cabeçalho Authorization: Bearer <token>. */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.header('Authorization') ?? '';
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) throw new HttpError(401, 'unauthenticated', 'Token ausente.');
  try {
    const decoded = await adminAuth.verifyIdToken(match[1]);
    req.uid = decoded.uid;
    next();
  } catch {
    throw new HttpError(401, 'unauthenticated', 'Token inválido ou expirado.');
  }
}
