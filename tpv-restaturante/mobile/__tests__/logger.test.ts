import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logger, logError, logWarn, logInfo, logDebug } from '../lib/logger';

describe('Logger', () => {
  beforeEach(() => {
    // Limpiar logs antes de cada test
    logger.clearLogs();
    // Restaurar estado inicial
    logger.setEnabled(true);
    logger.setMinLevel('debug');
  });

  describe('Funciones de conveniencia', () => {
    it('logError debería llamar a logger.error', () => {
      const spy = vi.spyOn(logger, 'error');
      logError('Test error', { test: 'data' });
      expect(spy).toHaveBeenCalledWith('Test error', { test: 'data' });
    });

    it('logWarn debería llamar a logger.warn', () => {
      const spy = vi.spyOn(logger, 'warn');
      logWarn('Test warning', { test: 'data' });
      expect(spy).toHaveBeenCalledWith('Test warning', { test: 'data' });
    });

    it('logInfo debería llamar a logger.info', () => {
      const spy = vi.spyOn(logger, 'info');
      logInfo('Test info', { test: 'data' });
      expect(spy).toHaveBeenCalledWith('Test info', { test: 'data' });
    });

    it('logDebug debería llamar a logger.debug', () => {
      const spy = vi.spyOn(logger, 'debug');
      logDebug('Test debug', { test: 'data' });
      expect(spy).toHaveBeenCalledWith('Test debug', { test: 'data' });
    });
  });

  describe('Niveles de log', () => {
    it('debería guardar logs en memoria', () => {
      logger.info('Test message');
      const logs = logger.getRecentLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Test message');
    });

    it('debería mantener un máximo de logs', () => {
      // Añadir más logs que el máximo
      for (let i = 0; i < 150; i++) {
        logger.info(`Message ${i}`);
      }
      const logs = logger.getRecentLogs();
      expect(logs.length).toBeLessThanOrEqual(100);
    });

    it('debería respetar el nivel mínimo de log', () => {
      logger.setMinLevel('warn');
      
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');
      
      const logs = logger.getRecentLogs();
      expect(logs).toHaveLength(2); // Solo warn y error
      expect(logs.every(log => log.level === 'warn' || log.level === 'error')).toBe(true);
    });

    it('debería deshabilitar logs cuando está deshabilitado', () => {
      logger.setEnabled(false);
      logger.info('Test message');
      const logs = logger.getRecentLogs();
      expect(logs).toHaveLength(0);
    });
  });

  describe('getRecentLogs', () => {
    it('debería devolver los logs más recientes', () => {
      logger.info('First');
      logger.info('Second');
      logger.info('Third');
      
      const recentLogs = logger.getRecentLogs(2);
      expect(recentLogs).toHaveLength(2);
      expect(recentLogs[0].message).toBe('Second');
      expect(recentLogs[1].message).toBe('Third');
    });

    it('debería devolver todos los logs si se solicita más de los existentes', () => {
      logger.info('First');
      logger.info('Second');
      
      const recentLogs = logger.getRecentLogs(10);
      expect(recentLogs).toHaveLength(2);
    });
  });

  describe('clearLogs', () => {
    it('debería limpiar todos los logs', () => {
      logger.info('First');
      logger.info('Second');
      logger.clearLogs();
      
      const logs = logger.getRecentLogs();
      expect(logs).toHaveLength(0);
    });
  });

  describe('Estructura de logs', () => {
    it('debería incluir timestamp', () => {
      logger.info('Test');
      const logs = logger.getRecentLogs();
      expect(logs[0].timestamp).toBeDefined();
      expect(typeof logs[0].timestamp).toBe('number');
    });

    it('debería incluir nivel', () => {
      logger.error('Test');
      const logs = logger.getRecentLogs();
      expect(logs[0].level).toBe('error');
    });

    it('debería incluir contexto cuando se proporciona', () => {
      logger.info('Test', { key: 'value' });
      const logs = logger.getRecentLogs();
      expect(logs[0].context).toEqual({ key: 'value' });
    });

    it('debería no incluir contexto cuando no se proporciona', () => {
      logger.info('Test');
      const logs = logger.getRecentLogs();
      expect(logs[0].context).toBeUndefined();
    });
  });
});
