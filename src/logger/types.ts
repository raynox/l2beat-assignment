import { LogLevel } from '@nestjs/common';

export interface ILog {
  level: LogLevel;
  message: string;
  context?: string;
  stack?: string;
  metadata?: Record<string, unknown>;
  correlationId?: string;
  loggedAt: Date;
}

export interface ILogsRepository {
  saveLog(log: ILog): Promise<void>;
}
