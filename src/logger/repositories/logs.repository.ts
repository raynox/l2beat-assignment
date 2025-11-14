import { InjectModel } from '@nestjs/sequelize';
import { ILog, ILogsRepository } from '../types';
import { Log } from '../models/log.model';

export class LogsRepository implements ILogsRepository {
  constructor(@InjectModel(Log) private logModel: typeof Log) {}

  async saveLog(log: ILog): Promise<void> {
    await this.logModel.create({
      level: log.level,
      message: log.message,
      context: log.context,
      stack: log.stack,
      metadata: log.metadata,
      correlationId: log.correlationId,
      loggedAt: log.loggedAt,
    });
  }
}
