import { env } from "../config";

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private readonly minLevel: LogLevel;

  constructor(level: string) {
    this.minLevel = this.parseLevel(level);
  }

  debug(message: string, context?: LogContext): void {
    this.write("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.write("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.write("warn", message, context);
  }

  error(message: string, error?: unknown, context?: LogContext): void {
    const errorContext: LogContext = { ...context };

    if (error instanceof Error) {
      errorContext.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (error !== undefined) {
      errorContext.error = error;
    }

    this.write("error", message, errorContext);
  }

  private parseLevel(level: string): LogLevel {
    if (level === "debug" || level === "info" || level === "warn" || level === "error") {
      return level;
    }
    return "info";
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }

  private write(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      app: env.appName,
      env: env.nodeEnv,
      ...context,
    };

    const output = env.isProduction ? JSON.stringify(entry) : this.formatPretty(entry);

    switch (level) {
      case "error":
        console.error(output);
        break;
      case "warn":
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  }

  private formatPretty(entry: Record<string, unknown>): string {
    const { timestamp, level, message, ...rest } = entry;
    const contextKeys = Object.keys(rest);

    if (contextKeys.length === 0) {
      return `[${String(timestamp)}] ${String(level).toUpperCase()}: ${String(message)}`;
    }

    return `[${String(timestamp)}] ${String(level).toUpperCase()}: ${String(message)} ${JSON.stringify(rest)}`;
  }
}

export const logger = new Logger(env.logLevel);
