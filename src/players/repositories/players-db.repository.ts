import { InjectModel } from '@nestjs/sequelize';
import { Player } from '../models/player.model';
import { IPlayer, IPlayerRepository, IScore } from '../types';
import { Score } from '../models/score.model';
import { NotFoundException } from '@nestjs/common';

export class PlayersDbRepository implements IPlayerRepository {
  constructor(
    @InjectModel(Player) private playerModel: typeof Player,
    @InjectModel(Score) private scoreModel: typeof Score,
  ) {}

  async findTopPlayers(limit: number) {
    const lastDatetime = await this.scoreModel.max('datetime');
    const players = await Player.findAll({
      limit,
      include: [
        { model: Score, as: 'scores', where: { datetime: lastDatetime } },
      ],
    });

    return players.map((player) => ({
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
