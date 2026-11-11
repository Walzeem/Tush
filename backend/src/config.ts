// Environment-driven configuration. `loadConfig` takes an env object so tests can
// build isolated configs without touching process.env.

export interface RateLimitConfig {
  windowMs: number;
  readMax: number;
  registerMax: number;
}

export interface AppConfig {
  nodeEnv: string;
  isProduction: boolean;
  port: number;
  host: string;
  dbPath: string;
  federationDomain: string;
  publicUrl: string;
  corsOrigins: string[];
  trustProxy: number;
  maxTagsPerAddress: number;
  rateLimit: RateLimitConfig;
}

const toList = (value: string | undefined, fallback: string): string[] =>
  (value ?? fallback)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const toInt = (value: string | undefined, fallback: number, name: string): number => {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw new Error(`${name} must be a non-negative integer (got "${value}")`);
  return n;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  const federationDomain = (env.FEDERATION_DOMAIN || 'localhost').trim().toLowerCase();
  if (isProduction && (federationDomain === 'localhost' || !federationDomain.includes('.'))) {
    throw new Error(
      'FEDERATION_DOMAIN must be set to the public domain serving this API (e.g. tags.example.com) in production.',
    );
  }

  return {
    nodeEnv,
    isProduction,
    port: toInt(env.PORT, 4000, 'PORT'),
    host: env.HOST || '0.0.0.0',
    dbPath: env.DB_PATH || './data/tags.db',
    federationDomain,
    publicUrl: env.PUBLIC_URL ? env.PUBLIC_URL.replace(/\/+$/, '') : '',
    corsOrigins: toList(env.CORS_ORIGINS, 'http://localhost:3000,http://localhost:3001,http://localhost:5173'),
    trustProxy: toInt(env.TRUST_PROXY, 0, 'TRUST_PROXY'),
    maxTagsPerAddress: toInt(env.MAX_TAGS_PER_ADDRESS, 3, 'MAX_TAGS_PER_ADDRESS'),
    rateLimit: {
      windowMs: toInt(env.RATE_LIMIT_WINDOW_MS, 60_000, 'RATE_LIMIT_WINDOW_MS'),
      readMax: toInt(env.RATE_LIMIT_READ_MAX, 120, 'RATE_LIMIT_READ_MAX'),
      registerMax: toInt(env.RATE_LIMIT_REGISTER_MAX, 10, 'RATE_LIMIT_REGISTER_MAX'),
    },
  };
}

