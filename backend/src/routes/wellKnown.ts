import { Router, type RequestHandler } from 'express';
import type { AppConfig } from '../config.ts';

export function wellKnownRoutes({
  config,
  readLimit,
}: {
  config: AppConfig;
  readLimit: RequestHandler;
}): Router {
  const router = Router();

  router.get('/.well-known/stellar.toml', readLimit, (req, res) => {
    const base = config.publicUrl || `${req.protocol}://${req.get('host')}`;
    res.type('text/plain').send(`FEDERATION_SERVER="${base}/federation"\n`);
  });

  return router;
}

