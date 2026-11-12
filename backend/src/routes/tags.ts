import { Router, type RequestHandler } from 'express';
import type { AppConfig } from '../config.ts';
import type { TagDatabase, TagRecord } from '../db.ts';
import { AppError, notFound, unauthenticated, validationError, type FieldIssue } from '../errors.ts';
import { isValidAddress, normalizeUsername, parseMemo, usernameIssues } from '../validation.ts';
import { registrationMessage, verifySignature } from '../signature.ts';

export function tagRoutes({
  config,
  db,
  readLimit,
  registerLimit,
}: {
  config: AppConfig;
  db: TagDatabase;
  readLimit: RequestHandler;
  registerLimit: RequestHandler;
}): Router {
  const router = Router();
  const toStellarAddress = (username: string): string => `${username}*${config.federationDomain}`;

  const memoFields = (row: TagRecord): { memo_type?: string; memo?: string } =>
    row.memo_type && row.memo ? { memo_type: row.memo_type, memo: row.memo } : {};

  const sep2NotFound = (message: string): AppError => {
    const err = notFound(message);
    err.details = undefined;
    return err;
  };

  router.post('/register', registerLimit, (req, res) => {
    const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
    const issues: FieldIssue[] = [];
    const field = (name: string, message: string) => issues.push({ field: name, message });

    usernameIssues(body.username).forEach((m) => field('username', m));

    if (typeof body.address !== 'string' || body.address === '') field('address', 'address is required');
    else if (!isValidAddress(body.address)) field('address', 'address must be a valid Stellar public key (G...)');

    const memoIssues: string[] = [];
    const memo = parseMemo(body.memo_type, body.memo, memoIssues);
    memoIssues.forEach((m) => field('memo', m));

    if (body.signerAddress !== undefined && body.signerAddress !== body.address) {
      field('signerAddress', 'signerAddress must match address; delegated signers are not supported');
    }
    if (issues.length) throw validationError(issues);

    const username = normalizeUsername(body.username);
    const address = body.address as string;

    if (typeof body.signature !== 'string' || body.signature === '') {
      throw unauthenticated('A signature from the wallet is required to register a username.');
    }
    const message = registrationMessage({ username, address, ...memo });
    if (!verifySignature({ address, message, signature: body.signature })) {
      throw unauthenticated('Signature verification failed.');
    }

    const { tag, created } = db.register({ username, address, ...memo }, config.maxTagsPerAddress);
    res.status(created ? 201 : 200).json({
      ok: true,
      username: toStellarAddress(tag.username),
      address: tag.address,
      is_primary: tag.is_primary === 1,
      federation_address: toStellarAddress(tag.username),
      ...(created ? {} : { already_registered: true }),
    });
  });

  router.get('/federation', readLimit, (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const type = typeof req.query.type === 'string' ? req.query.type : '';
    if (!q || !type) {
      throw new AppError(400, 'BAD_REQUEST', 'Both q and type query parameters are required.');
    }

    let row: TagRecord | null = null;
    if (type === 'name') {
      const [name, domain, ...extra] = q.toLowerCase().split('*');
      const allowedDomains = new Set([
        config.federationDomain,
        'tush.stellar',
        'tush-wallet.vercel.app',
        'tush.vercel.app',
        'tush-alpha.vercel.app',
        'localhost',
      ]);
      if (extra.length || (domain !== undefined && !allowedDomains.has(domain))) {
        throw sep2NotFound('Name tag not found');
      }
      row = db.findByName(normalizeUsername(name));
      if (!row) throw sep2NotFound('Name tag not found');
    } else if (type === 'id') {
      if (!isValidAddress(q)) throw new AppError(400, 'BAD_REQUEST', 'q must be a valid Stellar address for type=id.');
      row = db.findPrimaryByAddress(q);
      if (!row) throw sep2NotFound('No tag found for that address');
    } else {
      throw new AppError(400, 'UNSUPPORTED_TYPE', `Federation type "${type}" is not supported. Use name or id.`);
    }

    res.json({
      stellar_address: toStellarAddress(row.username),
      account_id: row.address,
      ...memoFields(row),
    });
  });

  router.get('/lookup', readLimit, (req, res) => {
    const address = typeof req.query.address === 'string' ? req.query.address.trim() : '';
    if (!isValidAddress(address)) {
      throw validationError([{ field: 'address', message: 'address must be a valid Stellar public key (G...)' }]);
    }
    const row = db.findPrimaryByAddress(address);
    if (!row) throw notFound('No username registered for this address');
    res.json({ username: toStellarAddress(row.username), address: row.address, ...memoFields(row) });
  });

  return router;
}

