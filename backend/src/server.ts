import { loadConfig } from './config.ts';
import { openDatabase } from './db.ts';
import { createApp } from './app.ts';

const config = loadConfig();
const db = openDatabase(config.dbPath);
const app = createApp({ config, db });

const server = app.listen(config.port, config.host, () => {
  console.log(`Tag server listening on http://${config.host}:${config.port}`);
  console.log(`  tags resolve as name*${config.federationDomain}  |  database: ${config.dbPath}`);
});

const shutdown = (signal: string) => {
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

