import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetPlayerByIdParamsDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Unique identifier of the player',
    example: '1c9b7a4a-4f1e-4ad4-9d8d-b6e15d6c6e3a',
  })
  @IsUUID()
  id!: string;
}

export class GetPlayerScoresParamsDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Unique identifier of the player',
    example: '1c9b7a4a-4f1e-4ad4-9d8d-b6e15d6c6e3a',
  })
  @IsUUID()
  id!: string;
}

export class GetPlayerScoresQueryDto {
  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Start date (inclusive) for the score range',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsDateString()
  startDate!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'End date (exclusive) for the score range',
    example: '2025-01-31T23:59:59.999Z',
  })
  @IsDateString()
  endDate!: string;
}

export class GetTopPlayersQueryDto {
  @ApiPropertyOptional({
    minimum: 1,
    description: 'Page number to fetch',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    minimum: 1,
    description: 'Maximum number of players per page',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export interface IPlayer {
  id: string;
  nickname: string;
}

export interface IPlayerWithScore extends IPlayer {
  scores: IScore[];
}

export interface IScore {
  rank: number;
  level: number;
  experience: number;
  datetime: Date;
}

export interface IPaginatedPlayers {
  items: IPlayerWithScore[];
  totalItems: number;
  totalPages: number;
  page: number;
  limit: number;
}

export class ScoreDto implements IScore {
  @ApiProperty({
    description: 'Rank of the player in this snapshot',
    example: 1,
  })
  rank!: number;

  @ApiProperty({
    description: 'Player level',
    example: 120,
  })
  level!: number;

  @ApiProperty({
    description: 'Experience points for the player',
    example: 543210,
  })
  experience!: number;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Timestamp of when the score was recorded',
    example: '2025-01-01T12:00:00.000Z',
  })
  datetime!: Date;
}

export class PlayerDto implements IPlayer {
  @ApiProperty({
    format: 'uuid',
    description: 'Unique identifier of the player',
    example: '1c9b7a4a-4f1e-4ad4-9d8d-b6e15d6c6e3a',
  })
  id!: string;

  @ApiProperty({
    description: 'Public nickname of the player',
    example: 'MageOfLight',
  })
  nickname!: string;
}

export class PlayerWithScoreDto extends PlayerDto implements IPlayerWithScore {
  @ApiProperty({
    type: () => ScoreDto,
    isArray: true,
    description: 'Collection of scores associated with the player',
  })
  scores!: ScoreDto[];
}

export class PaginatedPlayersDto implements IPaginatedPlayers {
  @ApiProperty({
    type: () => PlayerWithScoreDto,
    isArray: true,
    description: 'Players for the requested page',
  })
  items!: PlayerWithScoreDto[];

  @ApiProperty({
    description: 'Total number of players available',
    example: 50,
  })
  totalItems!: number;

  @ApiProperty({
    description: 'Total number of available pages',
    example: 5,
  })
  totalPages!: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Number of players per page',
    example: 10,
  })
  limit!: number;
}

export interface IFindTopPlayersResult {
  players: IPlayerWithScore[];
  totalItems: number;
}

export interface IPlayerWebScrapperScore {
  rank: number;
  name: string;
  level: number;
  experience: number;
}

export interface IPlayerGateway {
  fetchTopPlayers(limit: number): Promise<IPlayerWebScrapperScore[]>;
}

export interface IPlayersService {
  getTopPlayers(page: number, limit: number): Promise<IPaginatedPlayers>;
  getPlayerById(id: string): Promise<IPlayer>;
  refreshScores(limit: number): Promise<void>;
  getPlayerScores(
    id: string,
    startDate: Date,
    endDate: Date,
  ): Promise<IScore[]>;
}

export interface IPlayerRepository {
  findTopPlayers(limit: number, offset: number): Promise<IFindTopPlayersResult>;
  findPlayerByNickname(nickname: string): Promise<IPlayer | null>;
  findPlayerById(id: string): Promise<IPlayer | null>;
  savePlayer(player: IPlayer): Promise<IPlayer>;
}

export interface IScoreRepository {
  saveScore(playerId: string, score: IScore): Promise<void>;
  getPlayerScoresInRange(
    playerId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<IScore[]>;
}
