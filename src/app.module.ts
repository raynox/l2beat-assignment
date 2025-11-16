import { Module } from '@nestjs/common';
import { PlayersModule } from './players/players.module';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { Player } from './players/models/player.model';
import { Score } from './players/models/score.model';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from './logger/logger.module';
import { Log } from './logger/models/log.model';

@Module({
  imports: [
    PlayersModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),
    ScheduleModule.forRoot(),
    SequelizeModule.forRootAsync({
      useFactory: () => {
        const loggingEnv = process.env.DB_LOGGING;

        return {
          dialect: 'sqlite' as const,
          storage: process.env.DB_STORAGE ?? 'database.sqlite',
          models: [Player, Score, Log],
          autoLoadModels: true,
          // default to true when not explicitly configured
          logging:
            loggingEnv === undefined
              ? true
              : loggingEnv.toLowerCase() === 'true',
        };
      },
    }),
    LoggerModule,
  ],
})
export class AppModule {}
