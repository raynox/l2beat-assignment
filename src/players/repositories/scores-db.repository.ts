import { InjectModel } from '@nestjs/sequelize';
import { Score } from '../models/score.model';
import { IScore, IScoreRepository } from '../types';
import { Op } from 'sequelize';

export class ScoresDbRepository implements IScoreRepository {
  constructor(@InjectModel(Score) private scoreModel: typeof Score) {}

  async saveScore(playerId: string, score: IScore): Promise<void> {
    await this.scoreModel.create({ ...score, playerId });
  }

  async getPlayerScoresInRange(
    playerId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<IScore[]> {
    return await this.scoreModel.findAll({
      where: { playerId, datetime: { [Op.between]: [startDate, endDate] } },
    });
  }
}
