// Minimal error tracking: every unexpected error is logged with its correlation id
// and, when ERROR_WEBHOOK_URL is set (Discord, Slack or any JSON webhook), posted
// there too. Alerts are throttled so a failure loop cannot flood the channel.

const THROTTLE_MS = 60_000;
const lastSent = new Map<string, number>();

export interface ErrorReporter {
  (err: unknown, context?: Record<string, unknown>): void;
}

export function createErrorReporter(webhookUrl: string, service = 'tush-tags-backend'): ErrorReporter {
  return (err, context = {}) => {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(JSON.stringify({ level: 'error', service, message: error.message, stack: error.stack, ...context }));
    if (!webhookUrl) return;

    const key = `${error.name}:${error.message}`;
    const now = Date.now();
    if (now - (lastSent.get(key) ?? 0) < THROTTLE_MS) return;
    lastSent.set(key, now);
    if (lastSent.size > 500) lastSent.clear();

    const text = `🚨 ${service}: ${error.message}\n${Object.entries(context)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join('\n')}`.slice(0, 1900);
    // `content` is Discord's field, `text` is Slack's; extra fields are ignored.
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text, text }),
      signal: AbortSignal.timeout(5000),
    }).catch(() => {
      /* never let alerting take the server down */
    });
  };
}
