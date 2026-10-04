type Level = 'debug' | 'info' | 'warn' | 'error';
type ConfiguredLevel = Level | 'silent';

const ORDER: Record<ConfiguredLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

const SENSITIVE_KEY =
  /pass(word)?|token|secret|authorization|cookie|jwt|mongodb_uri|^email$/i;

let threshold: ConfiguredLevel = 'info';

export function setLogLevel(level: ConfiguredLevel): void {
  threshold = level;
}

/** Replaces values of sensitive-looking keys so they never reach the logs. */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) {
    out[key] = SENSITIVE_KEY.test(key)
      ? '[REDACTED]'
      : redact(inner, depth + 1);
  }
  return out;
}

function write(level: Level, message: string, meta?: Record<string, unknown>) {
  if (ORDER[level] < ORDER[threshold]) return;
  const line = `${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} ${message}`;
  const suffix = meta ? ` ${JSON.stringify(redact(meta))}` : '';
  const sink = level === 'error' ? console.error : console.log;
  sink(line + suffix);
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) =>
    write('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) =>
    write('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) =>
    write('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) =>
    write('error', message, meta),
};
