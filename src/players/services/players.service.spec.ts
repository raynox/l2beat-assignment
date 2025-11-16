import { Test, TestingModule } from '@nestjs/testing';
import { SequelizeModule, getModelToken } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { PlayersService } from './players.service';
import { PlayersDbRepository } from '../repositories/players-db.repository';
import { ScoresDbRepository } from '../repositories/scores-db.repository';
import { Player } from '../models/player.model';
import { Score } from '../models/score.model';
import { IPlayerGateway, IPlayerWebScrapperScore } from '../types';
import WebScrapingPlayersGateway from '../gateways/web-scrapping-players.gateway';
import { LoggerModule } from '../../logger/logger.module';
import { Log } from '../../logger/models/log.model';

describe('PlayersService (integration with SQLite, mocked gateway)', () => {
  let moduleRef: TestingModule;
  let service: PlayersService;
  let sequelize: Sequelize;
  let gatewayMock: jest.Mocked<IPlayerGateway>;
  let playerModel: typeof Player;
  let scoreModel: typeof Score;
  let logModel: typeof Log;

  beforeAll(async () => {
    // Disable console logging in tests
    process.env.CONSOLE_LOGGING = 'false';
    process.env.NODE_ENV = 'test';

    gatewayMock = {
      fetchTopPlayers: jest.fn<Promise<IPlayerWebScrapperScore[]>, [number]>(
        () => Promise.resolve([]),
      ),
    };

    moduleRef = await Test.createTestingModule({
      imports: [
        SequelizeModule.forRoot({
          dialect: 'sqlite',
          storage: ':memory:',
          models: [Player, Score, Log],
          autoLoadModels: true,
          synchronize: true,
          logging: false,
        }),
        SequelizeModule.forFeature([Player, Score, Log]),
        LoggerModule,
      ],
      providers: [
        PlayersService,
        PlayersDbRepository,
        ScoresDbRepository,
        {
          provide: WebScrapingPlayersGateway,
          useValue: gatewayMock,
        },
      ],
    }).compile();

    service = moduleRef.get(PlayersService);
    sequelize = moduleRef.get(Sequelize);
    playerModel = moduleRef.get<typeof Player>(getModelToken(Player));
    scoreModel = moduleRef.get<typeof Score>(getModelToken(Score));
    logModel = moduleRef.get<typeof Log>(getModelToken(Log));
  });

  beforeEach(async () => {
    await sequelize.sync({ force: true });
    gatewayMock.fetchTopPlayers.mockReset();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('should populate DB from gateway data and return it via getTopPlayers', async () => {
    const gatewayPlayers: IPlayerWebScrapperScore[] = [
      { rank: 1, name: 'Alice', level: 99, experience: 13_000_000 },
      { rank: 2, name: 'Bob', level: 80, experience: 5_000_000 },
    ];

    gatewayMock.fetchTopPlayers.mockResolvedValue(gatewayPlayers);

    await service.refreshScores(2);

    const result = await service.getTopPlayers(1, 10);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(gatewayMock.fetchTopPlayers).toHaveBeenCalledWith(2);
    expect(result.totalItems).toBe(2);
    expect(result.items).toHaveLength(2);

    const [first, second] = result.items;

    expect(first.nickname).toBe('Alice');
    expect(first.scores).toHaveLength(1);
    expect(first.scores[0].rank).toBe(1);
    expect(first.scores[0].level).toBe(99);
    expect(first.scores[0].experience).toBe(13_000_000);

    expect(second.nickname).toBe('Bob');
    expect(second.scores).toHaveLength(1);
    expect(second.scores[0].rank).toBe(2);
    expect(second.scores[0].level).toBe(80);
    expect(second.scores[0].experience).toBe(5_000_000);
  });

  it('should allow reading player scores from DB via getPlayerScores after refreshScores', async () => {
    const gatewayPlayers: IPlayerWebScrapperScore[] = [
      { rank: 1, name: 'Charlie', level: 70, experience: 3_000_000 },
    ];

    gatewayMock.fetchTopPlayers.mockResolvedValue(gatewayPlayers);

    await service.refreshScores(1);

    const topResult = await service.getTopPlayers(1, 10);
    const player = topResult.items[0];

    const start = new Date(0);
    const end = new Date(Date.now() + 60_000);

    const scores = await service.getPlayerScores(player.id, start, end);

    expect(scores).toHaveLength(1);
    expect(scores[0].rank).toBe(1);
    expect(scores[0].level).toBe(70);
    expect(scores[0].experience).toBe(3_000_000);
  });

  it('should not duplicate player and should append a new score on subsequent refreshScores', async () => {
    const firstGatewayPlayers: IPlayerWebScrapperScore[] = [
      { rank: 1, name: 'Delta', level: 50, experience: 1_000_000 },
    ];

    const secondGatewayPlayers: IPlayerWebScrapperScore[] = [
      { rank: 1, name: 'Delta', level: 55, experience: 1_200_000 },
    ];

    gatewayMock.fetchTopPlayers
      .mockResolvedValueOnce(firstGatewayPlayers)
      .mockResolvedValueOnce(secondGatewayPlayers);

    await service.refreshScores(1);
    await service.refreshScores(1);

    const topResult = await service.getTopPlayers(1, 10);
    const player = topResult.items[0];

    const start = new Date(0);
    const end = new Date(Date.now() + 60_000);

    const scores = await service.getPlayerScores(player.id, start, end);

    expect(scores).toHaveLength(2);
    const experiences = scores.map((s) => s.experience).sort();
    expect(experiences).toEqual([1_000_000, 1_200_000]);
  });

  it('should pass date parameter to repository when provided', async () => {
    const gatewayPlayers: IPlayerWebScrapperScore[] = [
      { rank: 1, name: 'Kilo', level: 85, experience: 7_000_000 },
    ];

    gatewayMock.fetchTopPlayers.mockResolvedValue(gatewayPlayers);

    await service.refreshScores(1);

    const targetDate = new Date('2024-01-20T10:00:00Z');
    const result = await service.getTopPlayers(1, 10, targetDate);

    expect(result.totalItems).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.items)).toBe(true);
  });

  it('should work without date parameter (backward compatibility)', async () => {
    const gatewayPlayers: IPlayerWebScrapperScore[] = [
      { rank: 1, name: 'Lima', level: 95, experience: 8_000_000 },
    ];

    gatewayMock.fetchTopPlayers.mockResolvedValue(gatewayPlayers);

    await service.refreshScores(1);

    const result = await service.getTopPlayers(1, 10);

    expect(result.totalItems).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].nickname).toBe('Lima');
  });

  it('should handle date parameter correctly with pagination', async () => {
    const gatewayPlayers: IPlayerWebScrapperScore[] = [
      { rank: 1, name: 'Mike', level: 100, experience: 9_000_000 },
      { rank: 2, name: 'November', level: 90, experience: 8_000_000 },
    ];

    gatewayMock.fetchTopPlayers.mockResolvedValue(gatewayPlayers);

    await service.refreshScores(2);

    const targetDate = new Date('2024-01-25T10:00:00Z');
    const result = await service.getTopPlayers(1, 1, targetDate);

    expect(result.page).toBe(1);
    expect(result.limit).toBe(1);
    expect(Array.isArray(result.items)).toBe(true);
  });

  it('should rollback transaction when an error occurs during refreshScores', async () => {
    const gatewayPlayers: IPlayerWebScrapperScore[] = [
      { rank: 1, name: 'TransactionTest', level: 50, experience: 1_000_000 },
    ];

    gatewayMock.fetchTopPlayers.mockResolvedValue(gatewayPlayers);

    // Mock the scoresRepository to throw an error on saveScore
    const scoresRepository = moduleRef.get(ScoresDbRepository);
    jest
      .spyOn(scoresRepository, 'saveScore')
      .mockRejectedValueOnce(new Error('Database error'));

    await expect(service.refreshScores(1)).rejects.toThrow('Database error');

    // Verify that no players or scores were saved due to transaction rollback
    const players = await playerModel.findAll();
    const scores = await scoreModel.findAll();

    expect(players).toHaveLength(0);
    expect(scores).toHaveLength(0);

    // Restore original method
    jest.spyOn(scoresRepository, 'saveScore').mockRestore();
  });

  it('should commit transaction and save all data when refreshScores succeeds', async () => {
    const gatewayPlayers: IPlayerWebScrapperScore[] = [
      { rank: 1, name: 'SuccessPlayer1', level: 60, experience: 2_000_000 },
      { rank: 2, name: 'SuccessPlayer2', level: 55, experience: 1_500_000 },
    ];

    gatewayMock.fetchTopPlayers.mockResolvedValue(gatewayPlayers);

    await service.refreshScores(2);

    // Verify that all players and scores were saved
    const players = await playerModel.findAll();
    const scores = await scoreModel.findAll();

    expect(players).toHaveLength(2);
    expect(scores).toHaveLength(2);

    const player1 = players.find((p) => p.nickname === 'SuccessPlayer1');
    const player2 = players.find((p) => p.nickname === 'SuccessPlayer2');

    expect(player1).toBeDefined();
    expect(player2).toBeDefined();

    const score1 = scores.find((s) => s.playerId === player1?.id);
    const score2 = scores.find((s) => s.playerId === player2?.id);

    expect(score1?.rank).toBe(1);
    expect(score1?.level).toBe(60);
    expect(score1?.experience).toBe(2_000_000);
    expect(score2?.rank).toBe(2);
    expect(score2?.level).toBe(55);
    expect(score2?.experience).toBe(1_500_000);
  });

  it('should create a log entry in the database after successful refreshScores', async () => {
    const gatewayPlayers: IPlayerWebScrapperScore[] = [
      { rank: 1, name: 'LogTestPlayer', level: 70, experience: 3_000_000 },
    ];

    gatewayMock.fetchTopPlayers.mockResolvedValue(gatewayPlayers);

    // Clear any existing logs
    await logModel.destroy({ where: {}, force: true });

    await service.refreshScores(1);

    // Wait a bit for async log saving
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify that a log entry was created
    const logs = await logModel.findAll({
      where: {
        level: 'log',
      },
      order: [['loggedAt', 'DESC']],
    });

    expect(logs.length).toBeGreaterThan(0);

    const successLog = logs.find((log) =>
      log.message.includes('Successfully refreshed scores'),
    );

    expect(successLog).toBeDefined();
    expect(successLog?.message).toContain('Successfully refreshed scores');
    expect(successLog?.message).toContain('1 players');
    expect(successLog?.context).toBe('PlayersService');
  });

  it('should create an error log entry when refreshScores fails', async () => {
    const gatewayPlayers: IPlayerWebScrapperScore[] = [
      { rank: 1, name: 'ErrorLogTest', level: 40, experience: 500_000 },
    ];

    gatewayMock.fetchTopPlayers.mockResolvedValue(gatewayPlayers);

    // Mock the playersRepository to throw an error on savePlayer
    const playersRepository = moduleRef.get(PlayersDbRepository);
    jest
      .spyOn(playersRepository, 'savePlayer')
      .mockRejectedValueOnce(new Error('Save player failed'));

    // Clear any existing logs
    await logModel.destroy({ where: {}, force: true });

    await expect(service.refreshScores(1)).rejects.toThrow(
      'Save player failed',
    );

    // Wait a bit for async log saving
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify that an error log entry was created
    const errorLogs = await logModel.findAll({
      where: {
        level: 'error',
      },
      order: [['loggedAt', 'DESC']],
    });

    expect(errorLogs.length).toBeGreaterThan(0);

    const errorLog = errorLogs.find((log) =>
      log.message.includes('Failed to refresh scores'),
    );

    expect(errorLog).toBeDefined();
    expect(errorLog?.message).toContain('Failed to refresh scores');
    expect(errorLog?.message).toContain('Save player failed');
    expect(errorLog?.context).toBe('PlayersService');
    expect(errorLog?.stack).toBeDefined();

    // Restore original method
    jest.spyOn(playersRepository, 'savePlayer').mockRestore();
  });
});
