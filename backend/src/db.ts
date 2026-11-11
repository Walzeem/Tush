// SQLite storage via Node's built-in `node:sqlite` (no native build step).
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { AppError, conflict } from './errors.ts';

export interface TagRecord {
  username: string;
  address: string;
  is_primary: number;
  memo_type: string | null;
  memo: string | null;
  created_at: string;
}

export interface TagDatabase {
  findByName(username: string): TagRecord | null;
  findPrimaryByAddress(address: string): TagRecord | null;
  register(
    input: { username: string; address: string; memo_type: string | null; memo: string | null },
    maxTagsPerAddress: number,
  ): { tag: TagRecord; created: boolean };
  ping(): boolean;
  close(): void;
}

const SCHEMA = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS tags (
    username   TEXT PRIMARY KEY CHECK (username = lower(username)),
    address    TEXT NOT NULL,
    is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
    memo_type  TEXT,
    memo       TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS tags_address_idx ON tags (address);
  CREATE UNIQUE INDEX IF NOT EXISTS tags_one_primary_idx ON tags (address) WHERE is_primary = 1;
`;

export function openDatabase(path: string): TagDatabase {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(SCHEMA);

  const byName = db.prepare('SELECT * FROM tags WHERE username = ?');
  const primaryByAddress = db.prepare('SELECT * FROM tags WHERE address = ? AND is_primary = 1');
  const countByAddress = db.prepare('SELECT COUNT(*) AS n FROM tags WHERE address = ?');
  const insert = db.prepare(
    'INSERT INTO tags (username, address, is_primary, memo_type, memo) VALUES (?, ?, ?, ?, ?)',
  );

  return {
    findByName: (username: string) => (byName.get(username) as TagRecord | undefined) ?? null,
    findPrimaryByAddress: (address: string) =>
      (primaryByAddress.get(address) as TagRecord | undefined) ?? null,

    register({ username, address, memo_type, memo }, maxTagsPerAddress) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const existing = byName.get(username) as TagRecord | undefined;
        if (existing) {
          db.exec('ROLLBACK');
          if (existing.address === address) return { tag: existing, created: false };
          throw conflict('Username is already taken. Please choose another.');
        }

        const { n } = countByAddress.get(address) as { n: number };
        if (n >= maxTagsPerAddress) {
          db.exec('ROLLBACK');
          throw new AppError(
            409,
            'TAG_LIMIT_REACHED',
            `This wallet already has ${maxTagsPerAddress} tag${maxTagsPerAddress === 1 ? '' : 's'}.`,
          );
        }

        insert.run(username, address, n === 0 ? 1 : 0, memo_type, memo);
        db.exec('COMMIT');
        return { tag: byName.get(username) as unknown as TagRecord, created: true };
      } catch (err) {
        if (db.isTransaction) db.exec('ROLLBACK');
        throw err;
      }
    },

    ping: () => (db.prepare('SELECT 1 AS ok').get() as { ok: number }).ok === 1,
    close: () => db.close(),
  };
}

