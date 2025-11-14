import {
  ConsoleLogger,
  Injectable,
  LoggerService,
  Scope,
} from '@nestjs/common';
import { LogsRepository } from './repositories/logs.repository';

@Injectable({ scope: Scope.TRANSIENT })
export class DbLoggerService extends ConsoleLogger implements LoggerService {
  constructor(private readonly logsRepository: LogsRepository) {
    super();
  }

  log(message: any, context?: string): void {
    super.log(message, context);
    void this.logsRepository.saveLog({
      level: 'log',
      message,
      context,
      loggedAt: new Date(),
    });
  }

  error(message: any, stackOrContext?: string): void {
    super.error(message, stackOrContext);
    void this.logsRepository.saveLog({
      level: 'error',
      message,
      stack: stackOrContext,
      loggedAt: new Date(),
    });
  }

  warn(message: any, context?: string): void {
    super.warn(message, context);
    void this.logsRepository.saveLog({
      level: 'warn',
      message,
      context,
      loggedAt: new Date(),
    });
  }

  debug(message: any, context?: string): void {
    super.debug(message, context);
    void this.logsRepository.saveLog({
      level: 'debug',
      message,
      context,
      loggedAt: new Date(),
    });
  }

  verbose(message: any, context?: string): void {
    super.verbose(message, context);
    void this.logsRepository.saveLog({
      level: 'verbose',
      message,
      context,
      loggedAt: new Date(),
    });
  }
}
