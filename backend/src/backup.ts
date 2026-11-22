// Scheduled SQLite snapshots. Copies land in BACKUP_DIR (ideally a different
// disk or a synced folder); only the newest BACKUP_KEEP files are kept.
import { readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { TagDatabase } from './db.ts';
import type { ErrorReporter } from './alerts.ts';

export function runBackup(db: TagDatabase, dir: string, keep: number): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = join(dir, `tags-${stamp}.db`);
  if (!db.backup) throw new Error('backups are only built in for SQLite');
  db.backup(dest);
  const old = readdirSync(dir)
    .filter((f) => /^tags-.*\.db$/.test(f))
    .sort()
    .reverse()
    .slice(Math.max(keep, 1));
  for (const f of old) rmSync(join(dir, f), { force: true });
  return dest;
}

export function scheduleBackups(
  db: TagDatabase,
  { dir, intervalHours, keep }: { dir: string; intervalHours: number; keep: number },
  reportError: ErrorReporter,
): () => void {
  // Postgres/Supabase is backed up outside the app (see .github/workflows/db-backup.yml).
  if (!dir || intervalHours === 0 || !db.backup) return () => {};
  const tick = () => {
    try {
      console.log(`backup written: ${runBackup(db, dir, keep)}`);
    } catch (err) {
      reportError(err, { job: 'sqlite-backup' });
    }
  };
  tick();
  const timer = setInterval(tick, intervalHours * 3_600_000);
  timer.unref();
  return () => clearInterval(timer);
}
