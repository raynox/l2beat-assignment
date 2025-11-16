import { Module } from '@nestjs/common';
import { PlayersController } from './players.controller';
import WebScrapingPlayersService from './gateways/web-scrapping-players.gateway';
import { ConfigModule } from '@nestjs/config';
import { PlayersService } from './services/players.service';
import { PlayersDbRepository } from './repositories/players-db.repository';
import { SequelizeModule } from '@nestjs/sequelize';
import { Player } from './models/player.model';
import { Score } from './models/score.model';
import { TasksService } from './services/tasks.service';
import { ScoresDbRepository } from './repositories/scores-db.repository';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [
    ConfigModule,
    SequelizeModule.forFeature([Player, Score]),
    LoggerModule,
  ],
  controllers: [PlayersController],
  providers: [
    WebScrapingPlayersService,
    PlayersService,
    PlayersDbRepository,
    ScoresDbRepository,
    TasksService,
  ],
})
export class PlayersModule {}
