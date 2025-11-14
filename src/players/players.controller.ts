import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import {
  GetPlayerByIdParamsDto,
  GetPlayerScoresParamsDto,
  GetPlayerScoresQueryDto,
  GetTopPlayersQueryDto,
  IPlayer,
  IPlayersService,
  IPaginatedPlayers,
  IScore,
} from './types';
import { PlayersService } from './services/players.service';
import { ConfigService } from '@nestjs/config';

@Controller('players')
export class PlayersController {
  private maxPlayers: number;

  constructor(
    @Inject(PlayersService)
    private readonly playersService: IPlayersService,
    private readonly configService: ConfigService,
  ) {
    this.maxPlayers = this.configService.get('MAX_PLAYERS') ?? 10;
  }

  @Get('top')
  async getTopPlayers(
    @Query() query: GetTopPlayersQueryDto,
  ): Promise<IPaginatedPlayers> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? this.maxPlayers, this.maxPlayers);

    return await this.playersService.getTopPlayers(page, limit);
  }

  @Get(':id')
  async getPlayerById(
    @Param() params: GetPlayerByIdParamsDto,
  ): Promise<IPlayer> {
    return await this.playersService.getPlayerById(params.id);
  }

  @Get(':id/scores')
  async getPlayerScores(
    @Param() params: GetPlayerScoresParamsDto,
    @Query() query: GetPlayerScoresQueryDto,
  ): Promise<IScore[]> {
    return await this.playersService.getPlayerScores(
      params.id,
      new Date(query.startDate),
      new Date(query.endDate),
    );
  }
}
