import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../errors';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 90;
const hits = new Map<string, { count: number; resetAt: number }>();

/** Limite simples por usuário (em memória) contra abuso do endpoint de push. */
export function rateLimit(req: Request, _res: Response, next: NextFunction): void {
  const now = Date.now();
  const entry = hits.get(req.uid);
  if (!entry || entry.resetAt < now) {
    hits.set(req.uid, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }
  entry.count += 1;
  if (entry.count > MAX_REQUESTS) throw new HttpError(429, 'rate_limited', 'Muitas requisições. Aguarde um instante.');
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of hits) if (value.resetAt < now) hits.delete(key);
}, WINDOW_MS).unref();
