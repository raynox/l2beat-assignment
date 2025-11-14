import { IsDateString, IsUUID } from 'class-validator';

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
  getTopPlayers(limit: number): Promise<IPlayerWithScore[]>;
  getPlayerById(id: string): Promise<IPlayer>;
  refreshScores(limit: number): Promise<void>;
  getPlayerScores(
    id: string,
    startDate: Date,
    endDate: Date,
  ): Promise<IScore[]>;
}

export interface IPlayerRepository {
  findTopPlayers(limit: number): Promise<IPlayerWithScore[]>;
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
