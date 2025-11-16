import { Test, TestingModule } from '@nestjs/testing';
import { SequelizeModule } from '@nestjs/sequelize';
import { PlayersDbRepository } from './players-db.repository';
import { Player } from '../models/player.model';
import { Score } from '../models/score.model';
import { IPlayer, IScore } from '../types';
import { v4 as uuidv4 } from 'uuid';

describe('PlayersDbRepository (integration with SQLite)', () => {
  let moduleRef: TestingModule;
  let repository: PlayersDbRepository;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        SequelizeModule.forRoot({
          dialect: 'sqlite',
          storage: ':memory:', // dedicated in-memory SQLite DB for tests
          models: [Player, Score],
          autoLoadModels: true,
          synchronize: true,
          logging: false,
        }),
        SequelizeModule.forFeature([Player, Score]),
      ],
      providers: [PlayersDbRepository],
    }).compile();

    repository = moduleRef.get(PlayersDbRepository);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('should persist and retrieve a player by id and nickname', async () => {
    const playerToSave: IPlayer = {
      id: uuidv4(),
      nickname: 'test-player-1',
    };

    const saved = await repository.savePlayer(playerToSave);

    expect(saved.id).toBeDefined();
    expect(saved.nickname).toBe(playerToSave.nickname);

    const foundById = await repository.findPlayerById(saved.id);
    expect(foundById.id).toBe(saved.id);
    expect(foundById.nickname).toBe(playerToSave.nickname);

    const foundByNickname = await repository.findPlayerByNickname(
      playerToSave.nickname,
    );

    expect(foundByNickname).not.toBeNull();
    expect(foundByNickname?.id).toBe(saved.id);
    expect(foundByNickname?.nickname).toBe(playerToSave.nickname);
  });

  it('should persist scores and return them from findTopPlayers', async () => {
    const now = new Date();

    const basePlayer: IPlayer = {
      id: uuidv4(),
      nickname: 'scored-player-1',
    };

    const savedPlayer = await repository.savePlayer(basePlayer);

    const scores: IScore[] = [
      {
        rank: 1,
        level: 10,
        experience: 1000,
        datetime: now,
      },
      {
        rank: 2,
        level: 9,
        experience: 900,
        datetime: now,
      },
    ];

    for (const score of scores) {
      await repository.savePlayerScore(savedPlayer.id, score);
    }

    const { players, totalItems } = await repository.findTopPlayers(10, 0);

    expect(totalItems).toBe(1);
    expect(players.length).toBe(1);

    const [player] = players;
    expect(player.id).toBe(savedPlayer.id);
    expect(player.nickname).toBe(basePlayer.nickname);
    expect(player.scores).toHaveLength(scores.length);

    // ensure scores are ordered by rank ASC as defined in the repository
    const ranks = player.scores.map((s) => s.rank);
    expect(ranks).toEqual([1, 2]);
  });
});
