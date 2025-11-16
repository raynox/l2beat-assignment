import { IsDateString, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Transaction } from 'sequelize';

export class GetPlayerByIdParamsDto {
  @IsUUID()
  id!: string;
}

export class GetPlayerScoresParamsDto {
  @IsUUID()
  id!: string;
}

export class GetPlayerScoresQueryDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}

export class GetTopPlayersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsDateString()
  date?: string;
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
  getTopPlayers(
    page: number,
    limit: number,
    date?: Date,
  ): Promise<IPaginatedPlayers>;
  getPlayerById(id: string): Promise<IPlayer>;
  refreshScores(limit: number): Promise<void>;
  getPlayerScores(
    id: string,
    startDate: Date,
    endDate: Date,
  ): Promise<IScore[]>;
}

export interface IPlayerRepository {
  findTopPlayers(
    limit: number,
    offset: number,
    date?: Date,
  ): Promise<IFindTopPlayersResult>;
  findPlayerByNickname(
    nickname: string,
    transaction?: Transaction,
  ): Promise<IPlayer | null>;
  findPlayerById(id: string): Promise<IPlayer | null>;
  savePlayer(player: IPlayer, transaction?: Transaction): Promise<IPlayer>;
}

export interface IScoreRepository {
  saveScore(
    playerId: string,
    score: IScore,
    transaction?: Transaction,
  ): Promise<void>;
  getPlayerScoresInRange(
    playerId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<IScore[]>;
}
