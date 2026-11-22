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
  /** Writes a consistent, compacted copy of the live database to `destPath`. */
  backup(destPath: string): void;
  close(): void;
}

const SCHEMA = `
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA busy_timeout = 5000;
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

// Additive, numbered schema changes. Each entry runs once, inside a transaction,
// and bumps PRAGMA user_version, so a deploy never re-runs or half-applies one.
// Rules for live data: only add tables, columns (with defaults) or indexes here;
// never drop or rename in the same deploy that stops using something.
const MIGRATIONS: string[] = [
  // 1: baseline marker for databases created before versioning existed.
  'SELECT 1',
];

function migrate(db: DatabaseSync): void {
  const { user_version: current } = db.prepare('PRAGMA user_version').get() as { user_version: number };
  for (let v = current; v < MIGRATIONS.length; v += 1) {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(MIGRATIONS[v]);
      db.exec(`PRAGMA user_version = ${v + 1}`);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}

export function openDatabase(path: string): TagDatabase {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(SCHEMA);
  migrate(db);

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

    backup(destPath: string) {
      mkdirSync(dirname(destPath), { recursive: true });
      // VACUUM INTO takes a read transaction, so it is safe while the server is live.
      db.prepare('VACUUM INTO ?').run(destPath);
    },

    ping: () => (db.prepare('SELECT 1 AS ok').get() as { ok: number }).ok === 1,
    close: () => db.close(),
  };
}

