import { Test, TestingModule } from '@nestjs/testing';
import { SequelizeModule, getModelToken } from '@nestjs/sequelize';
import { ScoresDbRepository } from './scores-db.repository';
import { Score } from '../models/score.model';
import { Player } from '../models/player.model';
import { IScore } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Sequelize } from 'sequelize-typescript';

describe('ScoresDbRepository (integration with SQLite)', () => {
  let moduleRef: TestingModule;
  let repository: ScoresDbRepository;
  let sequelize: Sequelize;
  let playerModel: typeof Player;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        SequelizeModule.forRoot({
          dialect: 'sqlite',
          storage: ':memory:',
          models: [Player, Score],
          autoLoadModels: true,
          synchronize: true,
          logging: false,
        }),
        SequelizeModule.forFeature([Player, Score]),
      ],
      providers: [ScoresDbRepository],
    }).compile();

    repository = moduleRef.get(ScoresDbRepository);
    sequelize = moduleRef.get(Sequelize);
    playerModel = moduleRef.get<typeof Player>(getModelToken(Player));
  });

  beforeEach(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('should persist a score and retrieve it within the given date range', async () => {
    const playerId = uuidv4();
    const now = new Date();

    await playerModel.create({ id: playerId, nickname: 'player-for-score-1' });

    const score: IScore = {
      rank: 1,
      level: 5,
      experience: 500,
      datetime: now,
    };

    await repository.saveScore(playerId, score);

    const start = new Date(now.getTime() - 1000);
    const end = new Date(now.getTime() + 1000);

    const scores = await repository.getPlayerScoresInRange(
      playerId,
      start,
      end,
    );

    expect(scores).toHaveLength(1);
    expect(scores[0].rank).toBe(score.rank);
    expect(scores[0].level).toBe(score.level);
    expect(scores[0].experience).toBe(score.experience);
  });

  it('should return only scores in the specified date range for a player', async () => {
    const playerId = uuidv4();
    const baseTime = new Date();

    await playerModel.create({ id: playerId, nickname: 'player-for-score-2' });

    const inRangeScore: IScore = {
      rank: 1,
      level: 10,
      experience: 1000,
      datetime: new Date(baseTime.getTime() + 1000),
    };

    const beforeRangeScore: IScore = {
      rank: 2,
      level: 8,
      experience: 800,
      datetime: new Date(baseTime.getTime() - 10_000),
    };

    const afterRangeScore: IScore = {
      rank: 3,
      level: 12,
      experience: 1200,
      datetime: new Date(baseTime.getTime() + 10_000),
    };

    await repository.saveScore(playerId, beforeRangeScore);
    await repository.saveScore(playerId, inRangeScore);
    await repository.saveScore(playerId, afterRangeScore);

    const start = new Date(baseTime.getTime());
    const end = new Date(baseTime.getTime() + 5000);

    const scores = await repository.getPlayerScoresInRange(
      playerId,
      start,
      end,
    );

    expect(scores).toHaveLength(1);
    expect(scores[0].rank).toBe(inRangeScore.rank);
    expect(scores[0].level).toBe(inRangeScore.level);
    expect(scores[0].experience).toBe(inRangeScore.experience);
  });
});
