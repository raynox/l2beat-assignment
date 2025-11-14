import { Module } from '@nestjs/common';
import { LogsRepository } from './repositories/logs.repository';
import { Log } from './models/log.model';
import { SequelizeModule } from '@nestjs/sequelize';
import { DbLoggerService } from './db-logger.service';

@Module({
  imports: [SequelizeModule.forFeature([Log])],
  providers: [LogsRepository, DbLoggerService],
  exports: [LogsRepository, DbLoggerService],
})
export class LoggerModule {}
