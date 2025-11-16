import {
  ConsoleLogger,
  Injectable,
  LoggerService,
  Optional,
  Scope,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LogsRepository } from './repositories/logs.repository';

@Injectable({ scope: Scope.TRANSIENT })
export class DbLoggerService extends ConsoleLogger implements LoggerService {
  private readonly enableConsoleOutput: boolean;

  constructor(
    private readonly logsRepository: LogsRepository,
    @Optional() private readonly configService?: ConfigService,
  ) {
    super();
    const isTestEnv = process.env.NODE_ENV === 'test';
    const consoleLoggingEnv =
      this.configService?.get<string>('CONSOLE_LOGGING') ??
      process.env.CONSOLE_LOGGING;

    this.enableConsoleOutput =
      consoleLoggingEnv !== undefined
        ? consoleLoggingEnv.toLowerCase() === 'true'
        : !isTestEnv;
  }

  log(message: any, context?: string): void {
    if (this.enableConsoleOutput) {
      super.log(message, context);
    }

    void this.logsRepository.saveLog({
      level: 'log',
      message,
      context: context ?? this.context,
      loggedAt: new Date(),
    });
  }

  error(message: any, stackOrContext?: string): void {
    if (this.enableConsoleOutput) {
      super.error(message, stackOrContext);
    }

    void this.logsRepository.saveLog({
      level: 'error',
      message,
      context: this.context,
      stack: stackOrContext,
      loggedAt: new Date(),
    });
  }

  warn(message: any, context?: string): void {
    if (this.enableConsoleOutput) {
      super.warn(message, context);
    }

    void this.logsRepository.saveLog({
      level: 'warn',
      message,
      context: context ?? this.context,
      loggedAt: new Date(),
    });
  }

  debug(message: any, context?: string): void {
    if (this.enableConsoleOutput) {
      super.debug(message, context);
    }

    void this.logsRepository.saveLog({
      level: 'debug',
      message,
      context: context ?? this.context,
      loggedAt: new Date(),
    });
  }

  verbose(message: any, context?: string): void {
    if (this.enableConsoleOutput) {
      super.verbose(message, context);
    }

    void this.logsRepository.saveLog({
      level: 'verbose',
      message,
      context: context ?? this.context,
      loggedAt: new Date(),
    });
  }
}
