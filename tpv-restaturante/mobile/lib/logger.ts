// mobile/lib/logger.ts

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: number;
}

class Logger {
  private isEnabled = true;
  private minLevel: LogLevel = 'info';
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  constructor() {
    const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
    this.minLevel = isDev ? 'debug' : 'warn';
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.isEnabled) return false;
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    if (!this.shouldLog(level)) return;
    const entry: LogEntry = { level, message, context, timestamp: Date.now() };
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) this.logs.shift();
    const timestamp = new Date(entry.timestamp).toISOString();
    const ctx = context ? ` | ${JSON.stringify(context)}` : '';
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}${ctx}`;
    switch (level) {
      case 'error': console.error(logMessage); break;
      case 'warn': console.warn(logMessage); break;
      case 'info': console.info(logMessage); break;
      case 'debug': console.log(logMessage); break;
    }
  }

  error(message: string, context?: Record<string, unknown>) { this.log('error', message, context); }
  warn(message: string, context?: Record<string, unknown>) { this.log('warn', message, context); }
  info(message: string, context?: Record<string, unknown>) { this.log('info', message, context); }
  debug(message: string, context?: Record<string, unknown>) { this.log('debug', message, context); }

  getRecentLogs(count = 50): LogEntry[] { return this.logs.slice(-count); }
  clearLogs() { this.logs = []; }
  setEnabled(enabled: boolean) { this.isEnabled = enabled; }
  setMinLevel(level: LogLevel) { this.minLevel = level; }
}

export const logger = new Logger();

let correlationId: string | undefined;
export function setCorrelationId(id: string) { correlationId = id; }

function enrich<T extends Record<string, unknown> | undefined>(obj: T): T {
  if (correlationId && obj) {
    (obj as Record<string, unknown>)['correlationId'] = correlationId;
  }
  return obj;
}

export const logError = (message: string, context?: Record<string, unknown>) => logger.error(message, enrich(context));
export const logWarn = (message: string, context?: Record<string, unknown>) => logger.warn(message, enrich(context));
export const logInfo = (message: string, context?: Record<string, unknown>) => logger.info(message, enrich(context));
export const logDebug = (message: string, context?: Record<string, unknown>) => logger.debug(message, enrich(context));
