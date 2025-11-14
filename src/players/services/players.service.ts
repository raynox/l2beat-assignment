import { Inject, NotFoundException } from '@nestjs/common';
import { PlayersDbRepository } from '../repositories/players-db.repository';
import {
  IPlayer,
  IPlayerGateway,
  IPlayerRepository,
  IPlayersService,
  IPlayerWithScore,
  IScore,
  IScoreRepository,
} from '../types';
import WebScrapingPlayersGateway from '../gateways/web-scrapping-players.gateway';
import { v4 as uuidv4 } from 'uuid';
import { ScoresDbRepository } from '../repositories/scores-db.repository';

export class PlayersService implements IPlayersService {
  constructor(
    @Inject(PlayersDbRepository)
    private readonly playersRepository: IPlayerRepository,
    @Inject(WebScrapingPlayersGateway)
    private readonly playersGateway: IPlayerGateway,
    @Inject(ScoresDbRepository)
    private readonly scoresRepository: IScoreRepository,
  ) {}

  async getTopPlayers(limit: number): Promise<IPlayerWithScore[]> {
    return this.playersRepository.findTopPlayers(limit);
  }

  async refreshScores(limit: number): Promise<void> {
    const datetime = new Date();
    const results = await this.playersGateway.fetchTopPlayers(limit);

    for (const player of results) {
      let dbPlayer: IPlayer | null =
        await this.playersRepository.findPlayerByNickname(player.name);

      if (!dbPlayer) {
        dbPlayer = await this.playersRepository.savePlayer({
          id: uuidv4(),
          nickname: player.name,
        });
      }

      await this.scoresRepository.saveScore(dbPlayer.id, {
        rank: player.rank,
        level: player.level,
        experience: player.experience,
        datetime,
      });
    }
  }

  async getPlayerById(id: string): Promise<IPlayer> {
    const player = await this.playersRepository.findPlayerById(id);

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    return player;
  }

  async getPlayerScores(
    id: string,
    startDate: Date,
    endDate: Date,
  ): Promise<IScore[]> {
    return this.scoresRepository.getPlayerScoresInRange(id, startDate, endDate);
  }
}
