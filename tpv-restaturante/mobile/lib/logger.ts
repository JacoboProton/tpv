/**
 * Sistema de logging simple para la aplicación móvil
 * Niveles: error, warn, info, debug
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: number;
}

class Logger {
  private isEnabled: boolean = true;
  private minLevel: LogLevel = 'info';
  private logs: LogEntry[] = [];
  private maxLogs: number = 100;

  constructor() {
    // En desarrollo, log todo. En producción, solo warn y error
    // En tests, usar debug para poder verificar el comportamiento
    const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
    if (isDev) {
      this.minLevel = 'debug';
    } else {
      this.minLevel = 'warn';
    }
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.isEnabled) return false;
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: Date.now(),
    };

    // Guardar en memoria (últimos N logs)
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Output a consola
    const timestamp = new Date(entry.timestamp).toISOString();
    const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;

    switch (level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'info':
        console.info(logMessage);
        break;
      case 'debug':
        console.log(logMessage);
        break;
    }
  }

  error(message: string, context?: Record<string, unknown>) {
    this.log('error', message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, context);
  }

  // Obtener logs recientes (útil para debugging/reporting)
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Limpiar logs
  clearLogs() {
    this.logs = [];
  }

  // Habilitar/deshabilitar logging
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  // Cambiar nivel mínimo de logging
  setMinLevel(level: LogLevel) {
    this.minLevel = level;
  }
}

// Singleton instance
export const logger = new Logger();

// Convenience functions
export const logError = (message: string, context?: Record<string, unknown>) => logger.error(message, context);
export const logWarn = (message: string, context?: Record<string, unknown>) => logger.warn(message, context);
export const logInfo = (message: string, context?: Record<string, unknown>) => logger.info(message, context);
export const logDebug = (message: string, context?: Record<string, unknown>) => logger.debug(message, context);
