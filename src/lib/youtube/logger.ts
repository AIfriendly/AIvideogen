/**
 * YouTube API Logger
 *
 * Structured logging for YouTube API operations with:
 * - JSON format for log aggregation
 * - Context-rich log entries
 * - Log level filtering (DEBUG, INFO, WARN, ERROR)
 * - Sensitive data sanitization
 */

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * Log level numeric values for filtering
 */
const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3
};

/**
 * Log entry structure
 */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    code?: string;
    stack?: string;
  };
  requestId?: string;
}

/**
 * YouTube API Logger
 *
 * Provides structured logging for YouTube API operations with
 * context preservation and sensitive data sanitization.
 */
export class YouTubeLogger {
  private isDevelopment: boolean;
  private minLevel: LogLevel;

  /**
   * Create logger
   *
   * @param isDevelopment - Whether running in development mode
   */
  constructor(isDevelopment: boolean = false) {
    this.isDevelopment = isDevelopment;

    // Set minimum log level based on environment
    const envLogLevel = process.env.YOUTUBE_LOG_LEVEL?.toUpperCase() as LogLevel;
    this.minLevel = envLogLevel && envLogLevel in LogLevel
      ? envLogLevel
      : (isDevelopment ? LogLevel.DEBUG : LogLevel.INFO);
  }

  /**
   * Log debug message
   *
   * For detailed debugging information. Only logged in development mode.
   *
   * @param message - Log message
   * @param context - Optional context object
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log info message
   *
   * For general informational messages.
   *
   * @param message - Log message
   * @param context - Optional context object
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log warning message
   *
   * For warning conditions that don't prevent operation.
   *
   * @param message - Log message
   * @param context - Optional context object
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log error message
   *
   * For error conditions.
   *
   * @param message - Log message
   * @param error - Optional error object
   * @param context - Optional context object
   */
  error(message: string, error?: Error, context?: Record<string, any>): void {
    const errorContext = error ? {
      name: error.name,
      message: error.message,
      code: (error as any).code,
      stack: this.isDevelopment ? error.stack : undefined
    } : undefined;

    this.log(LogLevel.ERROR, message, context, errorContext);
  }

  /**
   * Internal log method
   *
   * @param level - Log level
   * @param message - Log message
   * @param context - Optional context object
   * @param error - Optional error context
   * @private
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Record<string, any>
  ): void {
    // Check if log level is enabled
    if (LOG_LEVEL_VALUES[level] < LOG_LEVEL_VALUES[this.minLevel]) {
      return;
    }

    // Sanitize context (remove sensitive data)
    const sanitizedContext = context ? this.sanitizeContext(context) : undefined;

    // Format error if provided
    const formattedError = error ? {
      name: error.name || 'Error',
      message: error.message || String(error),
      code: error.code,
      stack: error.stack
    } : undefined;

    // Create log entry
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: sanitizedContext,
      error: formattedError
    };

    // Format and output log
    const formatted = this.formatLog(entry);
    this.output(level, formatted);
  }

  /**
   * Format log entry
   *
   * @param entry - Log entry to format
   * @returns Formatted log string
   * @private
   */
  private formatLog(entry: LogEntry): string {
    if (this.isDevelopment) {
      // Human-readable format for development
      const parts: string[] = [
        `[${entry.timestamp}]`,
        `[${entry.level}]`,
        entry.message
      ];

      if (entry.context) {
        parts.push(JSON.stringify(entry.context, null, 2));
      }

      if (entry.error) {
        parts.push(`Error: ${entry.error.name}: ${entry.error.message}`);
        if (entry.error.stack) {
          parts.push(entry.error.stack);
        }
      }

      return parts.join(' ');
    } else {
      // JSON format for production (log aggregation)
      return JSON.stringify(entry);
    }
  }

  /**
   * Output log to console
   *
   * @param level - Log level
   * @param formatted - Formatted log string
   * @private
   */
  private output(level: LogLevel, formatted: string): void {
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.log(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        break;
    }
  }

  /**
   * Sanitize context object
   *
   * Removes or masks sensitive data like API keys, tokens, etc.
   *
   * @param context - Context object to sanitize
   * @returns Sanitized context
   * @private
   */
  private sanitizeContext(context: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(context)) {
      // Mask API keys and tokens
      if (this.isSensitiveKey(key)) {
        sanitized[key] = this.maskValue(value);
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = Array.isArray(value)
          ? value.map(item => typeof item === 'object' ? this.sanitizeContext(item) : item)
          : this.sanitizeContext(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Check if key name indicates sensitive data
   *
   * @param key - Context key name
   * @returns True if key is sensitive
   * @private
   */
  private isSensitiveKey(key: string): boolean {
    const sensitivePatterns = [
      /api[_-]?key/i,
      /token/i,
      /secret/i,
      /password/i,
      /auth/i,
      /credential/i
    ];

    return sensitivePatterns.some(pattern => pattern.test(key));
  }

  /**
   * Mask sensitive value
   *
   * @param value - Value to mask
   * @returns Masked value
   * @private
   */
  private maskValue(value: any): string {
    if (typeof value !== 'string') {
      return '[REDACTED]';
    }

    // Show first 4 and last 4 characters if long enough
    if (value.length > 12) {
      return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
    }

    return '[REDACTED]';
  }
}
