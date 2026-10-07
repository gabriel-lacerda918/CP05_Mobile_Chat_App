import express, { type NextFunction, type Request, type Response } from 'express';
import { HttpError } from './errors';
import { authenticate } from './middleware/authenticate';
import { rateLimit } from './middleware/rateLimit';
import { groupsRouter } from './routes/groups';
import { notificationsRouter } from './routes/notifications';

export function createApp(): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));

  // Verificação de disponibilidade (pública, sem dados sensíveis)
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: Math.round(process.uptime()), time: new Date().toISOString() });
  });

  app.use('/notifications', authenticate, rateLimit, notificationsRouter);
  app.use('/groups', authenticate, rateLimit, groupsRouter);

  app.use((_req, _res, next) => next(new HttpError(404, 'not_found', 'Rota não encontrada.')));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof HttpError) {
      res.status(error.status).json({ code: error.code, message: error.message });
      return;
    }
    if (error instanceof SyntaxError) {
      res.status(400).json({ code: 'invalid_request', message: 'JSON inválido.' });
      return;
    }
    console.error('Erro inesperado:', error instanceof Error ? error.message : error);
    res.status(500).json({ code: 'internal', message: 'Erro interno do servidor.' });
  });

  return app;
}
