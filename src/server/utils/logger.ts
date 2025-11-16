const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
} as const;

export interface ILogger {
  log(...args: unknown[]): void;
  error(...args: unknown[]): void;
  info(...args: unknown[]): void;
  logCommand(type: string, data: unknown): void;
  logResult(type: string, status: string, data?: unknown): void;
  logConnection(message: string): void;
}

class Logger implements ILogger {
  log(...args: unknown[]): void {
    console.log(...args);
  }

  error(...args: unknown[]): void {
    const coloredArgs = args.map((arg, index) => {
      if (index === 0 && typeof arg === 'string') {
        return `${colors.red}${colors.bright}[ERROR]${colors.reset} ${colors.red}${arg}${colors.reset}`;
      }
      return arg;
    });
    console.error(...coloredArgs);
  }

  info(...args: unknown[]): void {
    const coloredArgs = args.map((arg, index) => {
      if (index === 0 && typeof arg === 'string') {
        return `${colors.blue}${colors.bright}[INFO]${colors.reset} ${colors.blue}${arg}${colors.reset}`;
      }
      return arg;
    });
    console.log(...coloredArgs);
  }

  logCommand(type: string, data: unknown): void {
    const message = `type: ${type}, data: ${JSON.stringify(data)}`;
    console.log(
      `${colors.yellow}${colors.bright}[COMMAND]${colors.reset} ${colors.yellow}${message}${colors.reset}`
    );
  }

  logResult(type: string, status: string, data?: unknown): void {
    const dataStr = data ? `, data: ${JSON.stringify(data)}` : '';
    const message = `type: ${type}, status: ${status}${dataStr}`;

    const statusColor =
      status === 'success' || status === 'sent' || status === 'broadcast'
        ? colors.green
        : colors.cyan;

    console.log(
      `${statusColor}${colors.bright}[RESULT]${colors.reset} ${statusColor}${message}${colors.reset}`
    );
  }

  logConnection(message: string): void {
    console.log(
      `${colors.magenta}${colors.bright}[CONNECTION]${colors.reset} ${colors.magenta}${message}${colors.reset}`
    );
  }
}

export const logger = new Logger();

export function logCommand(type: string, data: unknown): void {
  logger.logCommand(type, data);
}

export function logResult(type: string, status: string, data: unknown = null): void {
  logger.logResult(type, status, data);
}

export function logError(message: string, error: Error | null = null): void {
  if (error) {
    logger.error(message, error);
  } else {
    logger.error(message);
  }
}

export function logInfo(message: string): void {
  logger.info(message);
}

export function logConnection(message: string): void {
  logger.logConnection(message);
}
