import { Inject } from '@nestjs/common';
import { IPlayersService } from '../types';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PlayersService } from './players.service';
import { ConfigService } from '@nestjs/config';

export class TasksService {
  private maxPlayers: number;

  constructor(
    @Inject(PlayersService)
    private readonly playersService: IPlayersService,
    private readonly configService: ConfigService,
  ) {
    this.maxPlayers = this.configService.get('MAX_PLAYERS') ?? 10;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    await this.playersService.refreshScores(this.maxPlayers);
  }
}
