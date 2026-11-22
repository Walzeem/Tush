// Postgres storage (Supabase or any Postgres), used when DATABASE_URL is set.
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { AppError, conflict } from './errors.ts';
import type { RegisterInput, TagDatabase, TagRecord } from './db.ts';

const SCHEMA = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');

const COLUMNS = `username, address, is_primary, memo_type, memo,
  to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at`;

export async function openPostgres(connectionString: string): Promise<TagDatabase> {
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
  const pool = new pg.Pool({
    connectionString,
    // Supabase requires TLS. Its pooler certificate is not in Node's default CA
    // list, so the chain is not pinned here; set PGSSLROOTCERT to the Supabase CA
    // (Project settings > Database > SSL) for full verification.
    ssl: local ? undefined : { rejectUnauthorized: Boolean(process.env.PGSSLROOTCERT), ca: process.env.PGSSLROOTCERT ? readFileSync(process.env.PGSSLROOTCERT, 'utf8') : undefined },
    max: Number(process.env.PG_POOL_MAX || 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  pool.on('error', (err) => console.error('postgres pool error', err.message));
  await pool.query(SCHEMA);

  const one = async (sql: string, params: unknown[]) =>
    ((await pool.query(sql, params)).rows[0] as TagRecord | undefined) ?? null;

  return {
    kind: 'postgres',
    findByName: (username) => one(`select ${COLUMNS} from public.tags where username = $1`, [username]),
    findPrimaryByAddress: (address) =>
      one(`select ${COLUMNS} from public.tags where address = $1 and is_primary = 1`, [address]),

    async register({ username, address, memo_type, memo }: RegisterInput, maxTagsPerAddress: number) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        // Serialise registrations per wallet so the tag limit and "first tag is
        // primary" rule hold even when two requests arrive together.
        await client.query('select pg_advisory_xact_lock(hashtext($1))', [address]);

        const byName = async () =>
          ((await client.query(`select ${COLUMNS} from public.tags where username = $1`, [username])).rows[0] as
            | TagRecord
            | undefined) ?? null;

        const existing = await byName();
        if (existing) {
          await client.query('rollback');
          if (existing.address === address) return { tag: existing, created: false };
          throw conflict('Username is already taken. Please choose another.');
        }

        const { rows } = await client.query('select count(*)::int as n from public.tags where address = $1', [address]);
        const n = rows[0].n as number;
        if (n >= maxTagsPerAddress) {
          await client.query('rollback');
          throw new AppError(
            409,
            'TAG_LIMIT_REACHED',
            `This wallet already has ${maxTagsPerAddress} tag${maxTagsPerAddress === 1 ? '' : 's'}.`,
          );
        }

        const inserted = await client.query(
          `insert into public.tags (username, address, is_primary, memo_type, memo)
           values ($1, $2, $3, $4, $5) on conflict (username) do nothing returning ${COLUMNS}`,
          [username, address, n === 0 ? 1 : 0, memo_type, memo],
        );
        if (inserted.rowCount === 0) {
          // Another wallet claimed the same name a moment ago.
          await client.query('rollback');
          const winner = await one(`select ${COLUMNS} from public.tags where username = $1`, [username]);
          if (winner?.address === address) return { tag: winner, created: false };
          throw conflict('Username is already taken. Please choose another.');
        }
        await client.query('commit');
        return { tag: inserted.rows[0] as TagRecord, created: true };
      } catch (err) {
        await client.query('rollback').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },

    ping: async () => (await pool.query('select 1 as ok')).rows[0]?.ok === 1,
    close: () => pool.end(),
  };
}
