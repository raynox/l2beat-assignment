import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { PlayersDbRepository } from '../repositories/players-db.repository';
import {
  IPlayer,
  IPlayerGateway,
  IPlayerRepository,
  IPlayersService,
  IPaginatedPlayers,
  IScore,
  IScoreRepository,
} from '../types';
import WebScrapingPlayersGateway from '../gateways/web-scrapping-players.gateway';
import { v4 as uuidv4 } from 'uuid';
import { ScoresDbRepository } from '../repositories/scores-db.repository';
import { DbLoggerService } from '../../logger/db-logger.service';

@Injectable()
export class PlayersService implements IPlayersService {
  constructor(
    @Inject(PlayersDbRepository)
    private readonly playersRepository: IPlayerRepository,
    @Inject(WebScrapingPlayersGateway)
    private readonly playersGateway: IPlayerGateway,
    @Inject(ScoresDbRepository)
    private readonly scoresRepository: IScoreRepository,
    @InjectConnection()
    private readonly sequelize: Sequelize,
    private readonly logger: DbLoggerService,
  ) {
    this.logger.setContext(PlayersService.name);
  }

  async getTopPlayers(
    page: number,
    limit: number,
    date?: Date,
  ): Promise<IPaginatedPlayers> {
    const safePage = Math.max(page, 1);
    const offset = (safePage - 1) * limit;
    const { players, totalItems } = await this.playersRepository.findTopPlayers(
      limit,
      offset,
      date,
    );

    const totalPages = totalItems || Math.ceil(totalItems / limit);

    return {
      items: players,
      totalItems,
      totalPages,
      page: safePage,
      limit,
    };
  }

  async refreshScores(limit: number): Promise<void> {
    const transaction = await this.sequelize.transaction();

    try {
      const datetime = new Date();
      const results = await this.playersGateway.fetchTopPlayers(limit);

      for (const player of results) {
        let dbPlayer: IPlayer | null =
          await this.playersRepository.findPlayerByNickname(
            player.name,
            transaction,
          );

        if (!dbPlayer) {
          dbPlayer = await this.playersRepository.savePlayer(
            {
              id: uuidv4(),
              nickname: player.name,
            },
            transaction,
          );
        }

        await this.scoresRepository.saveScore(
          dbPlayer.id,
          {
            rank: player.rank,
            level: player.level,
            experience: player.experience,
            datetime,
          },
          transaction,
        );
      }

      await transaction.commit();
      this.logger.log(
        `Successfully refreshed scores for ${results.length} players`,
      );
    } catch (error) {
      await transaction.rollback();
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      const errorStack = error instanceof Error ? error.stack : String(error);
      this.logger.error(
        `Failed to refresh scores: ${errorMessage}`,
        errorStack,
      );

      throw error;
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
