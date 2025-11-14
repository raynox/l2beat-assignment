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
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    SequelizeModule.forRoot({
      dialect: 'sqlite',
      storage: 'database.sqlite',
      models: [Player, Score, Log],
      autoLoadModels: true,
    }),
    LoggerModule,
  ],
})
export class AppModule {}
