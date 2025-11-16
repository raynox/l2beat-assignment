import { Test, TestingModule } from '@nestjs/testing';
import { SequelizeModule } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
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
          storage: ':memory:',
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

  beforeEach(async () => {
    const sequelize = moduleRef.get(Sequelize);
    await sequelize.sync({ force: true });
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

  it('should return players for closest next date when date parameter is provided', async () => {
    const firstDate = new Date('2024-01-01T10:00:00Z');
    const secondDate = new Date('2024-01-02T10:00:00Z');
    const thirdDate = new Date('2024-01-03T10:00:00Z');

    const player1: IPlayer = {
      id: uuidv4(),
      nickname: 'player-1',
    };
    const player2: IPlayer = {
      id: uuidv4(),
      nickname: 'player-2',
    };
    const player3: IPlayer = {
      id: uuidv4(),
      nickname: 'player-3',
    };

    const savedPlayer1 = await repository.savePlayer(player1);
    const savedPlayer2 = await repository.savePlayer(player2);
    const savedPlayer3 = await repository.savePlayer(player3);

    // Create scores at different dates
    await repository.savePlayerScore(savedPlayer1.id, {
      rank: 1,
      level: 10,
      experience: 1000,
      datetime: firstDate,
    });

    await repository.savePlayerScore(savedPlayer2.id, {
      rank: 1,
      level: 20,
      experience: 2000,
      datetime: secondDate,
    });

    await repository.savePlayerScore(savedPlayer3.id, {
      rank: 1,
      level: 30,
      experience: 3000,
      datetime: thirdDate,
    });

    // Query with date between first and second - should return second
    const queryDate = new Date('2024-01-01T15:00:00Z');
    const { players, totalItems } = await repository.findTopPlayers(
      10,
      0,
      queryDate,
    );

    expect(totalItems).toBe(1);
    expect(players).toHaveLength(1);
    expect(players[0].nickname).toBe('player-2');
    expect(players[0].scores[0].experience).toBe(2000);
  });

  it('should return empty when no date found after given date', async () => {
    const pastDate = new Date('2020-01-01T00:00:00Z');

    const player: IPlayer = {
      id: uuidv4(),
      nickname: 'past-player',
    };

    const savedPlayer = await repository.savePlayer(player);

    await repository.savePlayerScore(savedPlayer.id, {
      rank: 1,
      level: 10,
      experience: 1000,
      datetime: pastDate,
    });

    // Query with a date far in the future
    const futureDate = new Date('2099-12-31T00:00:00Z');
    const { players, totalItems } = await repository.findTopPlayers(
      10,
      0,
      futureDate,
    );

    expect(totalItems).toBe(0);
    expect(players).toHaveLength(0);
  });

  it('should return exact date when querying with exact date', async () => {
    const targetDate = new Date('2024-01-15T12:00:00Z');

    const player: IPlayer = {
      id: uuidv4(),
      nickname: 'exact-date-player',
    };

    const savedPlayer = await repository.savePlayer(player);

    await repository.savePlayerScore(savedPlayer.id, {
      rank: 1,
      level: 50,
      experience: 5000,
      datetime: targetDate,
    });

    const { players, totalItems } = await repository.findTopPlayers(
      10,
      0,
      targetDate,
    );

    expect(totalItems).toBe(1);
    expect(players).toHaveLength(1);
    expect(players[0].nickname).toBe('exact-date-player');
    expect(players[0].scores[0].experience).toBe(5000);
  });

  it('should use latest datetime when date parameter is not provided', async () => {
    const earlierDate = new Date('2024-01-01T10:00:00Z');
    const laterDate = new Date('2024-01-02T10:00:00Z');

    const player1: IPlayer = {
      id: uuidv4(),
      nickname: 'earlier-player',
    };
    const player2: IPlayer = {
      id: uuidv4(),
      nickname: 'later-player',
    };

    const savedPlayer1 = await repository.savePlayer(player1);
    const savedPlayer2 = await repository.savePlayer(player2);

    await repository.savePlayerScore(savedPlayer1.id, {
      rank: 1,
      level: 10,
      experience: 1000,
      datetime: earlierDate,
    });

    await repository.savePlayerScore(savedPlayer2.id, {
      rank: 1,
      level: 20,
      experience: 2000,
      datetime: laterDate,
    });

    // Query without date parameter - should return latest
    const { players, totalItems } = await repository.findTopPlayers(10, 0);

    expect(totalItems).toBe(1);
    expect(players).toHaveLength(1);
    expect(players[0].nickname).toBe('later-player');
    expect(players[0].scores[0].experience).toBe(2000);
  });
});
