export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  id: number;
  time: number;
  level: LogLevel;
  tag: string;
  message: string;
}

const MAX_ENTRIES = 300;
const entries: LogEntry[] = [];
let echoToConsole = __DEV__;
const listeners = new Set<() => void>();
let nextId = 1;

/** Turns console echo on or off (the in-app buffer is always kept). */
export function setLogEcho(enabled: boolean): void {
  echoToConsole = enabled;
}

/** Masks anything that looks like a credential before it is stored or printed. */
export function scrub(text: string): string {
  return text
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
    .replace(
      /((?:pass(?:word)?|token|secret|authorization)["']?\s*[:=]\s*["']?)[^"'\s,}&]+/gi,
      '$1[REDACTED]',
    )
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, '[JWT]');
}

function write(level: LogLevel, tag: string, message: string): void {
  const entry: LogEntry = {
    id: nextId++,
    time: Date.now(),
    level,
    tag,
    message: scrub(message),
  };
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) entries.shift();

  if (echoToConsole) {
    const sink = level === 'ERROR' ? console.error : console.log;
    sink(`[${level}] ${tag}: ${entry.message}`);
  }
  listeners.forEach(listener => listener());
}

/** Application logger. Keeps a ring buffer that the Developer screen displays. */
export const log = {
  debug: (tag: string, message: string) => write('DEBUG', tag, message),
  info: (tag: string, message: string) => write('INFO', tag, message),
  warn: (tag: string, message: string) => write('WARN', tag, message),
  error: (tag: string, message: string) => write('ERROR', tag, message),
};

export function getLogEntries(): readonly LogEntry[] {
  return entries;
}

export function subscribeToLogs(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function clearLogs(): void {
  entries.length = 0;
  nextId += 1;
  listeners.forEach(listener => listener());
}

/** Changes whenever a line is added or the buffer is cleared (for useSyncExternalStore). */
export function getLogVersion(): number {
  return nextId;
}
