/**
 * Environment-based logging utility
 * Provides controlled logging that can be disabled in production
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: Date;
  component?: string;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private isDevelopment: boolean;

  private constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR;
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const levelStr = LogLevel[entry.level];
    const component = entry.component ? `[${entry.component}]` : '';
    return `${timestamp} ${levelStr} ${component} ${entry.message}`;
  }

  private logToConsole(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const message = this.formatMessage(entry);

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(message, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data || '');
        break;
      case LogLevel.ERROR:
        console.error(message, entry.data || '');
        break;
    }
  }

  public debug(message: string, data?: any, component?: string): void {
    this.logToConsole({
      level: LogLevel.DEBUG,
      message,
      data,
      component,
      timestamp: new Date(),
    });
  }

  public info(message: string, data?: any, component?: string): void {
    this.logToConsole({
      level: LogLevel.INFO,
      message,
      data,
      component,
      timestamp: new Date(),
    });
  }

  public warn(message: string, data?: any, component?: string): void {
    this.logToConsole({
      level: LogLevel.WARN,
      message,
      data,
      component,
      timestamp: new Date(),
    });
  }

  public error(message: string, data?: any, component?: string): void {
    this.logToConsole({
      level: LogLevel.ERROR,
      message,
      data,
      component,
      timestamp: new Date(),
    });
  }

  // Convenience method for GPS-related logging
  public gps(message: string, data?: any): void {
    this.debug(message, data, 'GPS');
  }

  // Convenience method for API-related logging
  public api(message: string, data?: any): void {
    this.debug(message, data, 'API');
  }

  // Convenience method for map-related logging
  public map(message: string, data?: any): void {
    this.debug(message, data, 'MAP');
  }

  // Convenience method for trip-related logging
  public trip(message: string, data?: any): void {
    this.debug(message, data, 'TRIP');
  }

  // Convenience method for analytics-related logging
  public analytics(message: string, data?: any): void {
    this.debug(message, data, 'Analytics');
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience functions for easier usage
export const log = {
  debug: (message: string, data?: any, component?: string) => logger.debug(message, data, component),
  info: (message: string, data?: any, component?: string) => logger.info(message, data, component),
  warn: (message: string, data?: any, component?: string) => logger.warn(message, data, component),
  error: (message: string, data?: any, component?: string) => logger.error(message, data, component),
  gps: (message: string, data?: any) => logger.gps(message, data),
  api: (message: string, data?: any) => logger.api(message, data),
  map: (message: string, data?: any) => logger.map(message, data),
  trip: (message: string, data?: any) => logger.trip(message, data),
  analytics: (message: string, data?: any) => logger.analytics(message, data),
};