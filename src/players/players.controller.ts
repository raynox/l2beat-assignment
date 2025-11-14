import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  GetPlayerByIdParamsDto,
  GetPlayerScoresParamsDto,
  GetPlayerScoresQueryDto,
  GetTopPlayersQueryDto,
  IPlayer,
  IPlayersService,
  IPaginatedPlayers,
  IScore,
  PaginatedPlayersDto,
  PlayerDto,
  ScoreDto,
} from './types';
import { PlayersService } from './services/players.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('players')
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
  @ApiOperation({
    summary: 'Retrieve a paginated list of players ordered by score',
  })
  @ApiOkResponse({ type: PaginatedPlayersDto })
  async getTopPlayers(
    @Query() query: GetTopPlayersQueryDto,
  ): Promise<IPaginatedPlayers> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? this.maxPlayers, this.maxPlayers);

    return await this.playersService.getTopPlayers(page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a single player by id' })
  @ApiOkResponse({ type: PlayerDto })
  @ApiNotFoundResponse({ description: 'Player not found' })
  async getPlayerById(
    @Param() params: GetPlayerByIdParamsDto,
  ): Promise<IPlayer> {
    return await this.playersService.getPlayerById(params.id);
  }

  @Get(':id/scores')
  @ApiOperation({
    summary: 'Retrieve all scores for a player within a date range',
  })
  @ApiOkResponse({ type: ScoreDto, isArray: true })
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
