import { InjectModel } from '@nestjs/sequelize';
import { Player } from '../models/player.model';
import {
  IFindTopPlayersResult,
  IPlayer,
  IPlayerRepository,
  IScore,
} from '../types';
import { Score } from '../models/score.model';
import { NotFoundException } from '@nestjs/common';
import { Op } from 'sequelize';

export class PlayersDbRepository implements IPlayerRepository {
  constructor(
    @InjectModel(Player) private playerModel: typeof Player,
    @InjectModel(Score) private scoreModel: typeof Score,
  ) {}

  async findTopPlayers(
    limit: number,
    offset: number,
    date?: Date,
  ): Promise<IFindTopPlayersResult> {
    let targetDatetime: Date | null;

    if (date) {
      // Find the closest next date (>= provided date)
      const closestDate = await this.scoreModel.findOne({
        where: {
          datetime: {
            [Op.gte]: date,
          },
        },
        order: [['datetime', 'ASC']],
        attributes: ['datetime'],
      });

      if (!closestDate) {
        return { players: [], totalItems: 0 };
      }

      targetDatetime = closestDate.datetime;
    } else {
      // Use the latest datetime (current behavior)
      targetDatetime = await this.scoreModel.max('datetime');
    }

    if (!targetDatetime) {
      return { players: [], totalItems: 0 };
    }

    const { rows, count } = await this.playerModel.findAndCountAll({
      include: [
        {
          model: Score,
          as: 'scores',
          where: { datetime: targetDatetime },
          required: true,
        },
      ],
      limit,
      offset,
      distinct: true,
      order: [[{ model: Score, as: 'scores' }, 'rank', 'ASC']],
    });

    const players = rows.map((player) => ({
      id: player.id,
      nickname: player.nickname,
      scores:
        player?.scores?.map((score) => ({
          rank: score.rank,
          level: score.level,
          experience: score.experience,
          datetime: score.datetime,
        })) ?? [],
    }));

    return { players, totalItems: count };
  }

  async savePlayer(player: IPlayer) {
    const dbPlayer = await this.playerModel.create({
      nickname: player.nickname,
    });

    return dbPlayer.toJSON<IPlayer>();
  }

  async savePlayerScore(playerId: string, score: IScore) {
    await this.scoreModel.create({ ...score, playerId });
  }

  async findPlayerByNickname(nickname: string) {
    const player = await this.playerModel.findOne({ where: { nickname } });
    return player?.toJSON<IPlayer>() ?? null;
  }

  async findPlayerById(id: string) {
    const player = await this.playerModel.findByPk(id);

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    return {
      id: player.id,
      nickname: player.nickname,
    };
  }
}
