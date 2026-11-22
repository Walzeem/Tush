import { loadConfig } from './config.ts';
import { openDatabase } from './db.ts';
import { createApp } from './app.ts';
import { createErrorReporter } from './alerts.ts';
import { scheduleBackups } from './backup.ts';

const config = loadConfig();
const reportError = createErrorReporter(config.errorWebhookUrl);
const db = openDatabase(config.dbPath);
const app = createApp({ config, db, reportError });
const stopBackups = scheduleBackups(db, config.backup, reportError);

if (config.isProduction && config.dbPath.startsWith('/app/data') && !process.env.TUSH_PERSISTENT_DISK) {
  console.warn(
    'WARNING: DB_PATH is inside the container. Without a mounted disk every deploy or restart wipes all tags. ' +
      'Mount a disk at /app/data and set TUSH_PERSISTENT_DISK=1 (see README "Running for real users").',
  );
}

const server = app.listen(config.port, config.host, () => {
  console.log(`Tag server listening on http://${config.host}:${config.port}`);
  console.log(`  tags resolve as name*${config.federationDomain}  |  database: ${config.dbPath}`);
});

process.on('unhandledRejection', (reason) => reportError(reason, { source: 'unhandledRejection' }));
process.on('uncaughtException', (err) => {
  reportError(err, { source: 'uncaughtException' });
  shutdown('uncaughtException', 1);
});

let shuttingDown = false;
function shutdown(signal: string, code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down`);
  stopBackups();
  server.close(() => {
    db.close();
    process.exit(code);
  });
  setTimeout(() => process.exit(code || 1), 10_000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
