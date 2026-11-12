import { randomUUID } from 'node:crypto';
import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import type { AppConfig } from './config.ts';
import type { TagDatabase } from './db.ts';
import { AppError, notFound, type FieldIssue } from './errors.ts';
import { tagRoutes } from './routes/tags.ts';
import { wellKnownRoutes } from './routes/wellKnown.ts';

const envelope = (
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: FieldIssue[],
) =>
  res.status(status).json({
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
    correlation_id: res.locals.correlationId,
  });

const limiter = (windowMs: number, limit: number) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => envelope(res, 429, 'RATE_LIMITED', 'Too many requests. Please slow down.'),
  });

export function createApp({ config, db }: { config: AppConfig; db: TagDatabase }): Express {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);

  app.use((req, res, next) => {
    res.locals.correlationId = req.get('x-correlation-id') || randomUUID();
    res.set('x-correlation-id', res.locals.correlationId);
    res.set('x-content-type-options', 'nosniff');
    next();
  });

  const openCors = cors({ origin: '*', methods: ['GET'] });
  app.use('/.well-known', openCors);
  app.use('/federation', openCors);

  const appCors = cors({
    origin(origin, cb) {
      if (
        !origin ||
        config.corsOrigins.includes('*') ||
        config.corsOrigins.includes(origin) ||
        origin.startsWith('chrome-extension://')
      ) {
        cb(null, true);
        return;
      }
      cb(null, false);
    },
    methods: ['GET', 'POST'],
    maxAge: 600,
  });
  app.use(['/lookup', '/register'], appCors);

  app.use(express.json({ limit: '10kb' }));

  const readLimit = limiter(config.rateLimit.windowMs, config.rateLimit.readMax);
  const registerLimit = limiter(config.rateLimit.windowMs, config.rateLimit.registerMax);

  app.get('/health', (_req, res) => {
    let database = 'down';
    try {
      database = db.ping() ? 'up' : 'down';
    } catch {
      /* reported as down */
    }
    res.status(database === 'up' ? 200 : 503).json({
      status: database === 'up' ? 'UP' : 'DOWN',
      timestamp: new Date().toISOString(),
      database,
    });
  });

  app.use(wellKnownRoutes({ config, readLimit }));
  app.use(tagRoutes({ config, db, readLimit, registerLimit }));

  app.use((req, _res, next) => next(notFound(`Cannot ${req.method} ${req.path}`)));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error & { type?: string }, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) return envelope(res, err.status, err.code, err.message, err.details);
    if (err?.type === 'entity.parse.failed') return envelope(res, 400, 'INVALID_JSON', 'Request body is not valid JSON.');
    if (err?.type === 'entity.too.large') return envelope(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body is too large.');
    console.error(`[${res.locals.correlationId}]`, err);
    return envelope(res, 500, 'INTERNAL', 'Something went wrong on our side.');
  });

  return app;
}

