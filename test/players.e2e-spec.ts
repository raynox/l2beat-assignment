import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { Sequelize } from 'sequelize-typescript';
import { getModelToken } from '@nestjs/sequelize';
import WebScrapingPlayersGateway from '../src/players/gateways/web-scrapping-players.gateway';
import { IPlayerGateway, IPlayerWebScrapperScore } from '../src/players/types';
import { PlayersService } from '../src/players/services/players.service';
import { AppModule } from '../src/app.module';
import { Score } from '../src/players/models/score.model';

describe('Players endpoints (e2e)', () => {
  let app: INestApplication;
  let gatewayMock: jest.Mocked<IPlayerGateway>;
  let playersService: PlayersService;
  let sequelize: Sequelize;
  let scoreModel: typeof Score;

  beforeAll(async () => {
    gatewayMock = {
      fetchTopPlayers: jest.fn<Promise<IPlayerWebScrapperScore[]>, [number]>(
        () => Promise.resolve([]),
      ),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(WebScrapingPlayersGateway)
      .useValue(gatewayMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
      }),
    );

    await app.init();
    playersService = moduleFixture.get(PlayersService);
    sequelize = moduleFixture.get(Sequelize);
    scoreModel = moduleFixture.get<typeof Score>(getModelToken(Score));
  });

  beforeEach(async () => {
    await sequelize.sync({ force: true });
    gatewayMock.fetchTopPlayers.mockReset();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /players/top should return paginated top players', async () => {
    const gatewayPlayers: IPlayerWebScrapperScore[] = [
      { rank: 1, name: 'Alice', level: 99, experience: 13_000_000 },
      { rank: 2, name: 'Bob', level: 80, experience: 5_000_000 },
    ];

    gatewayMock.fetchTopPlayers.mockResolvedValue(gatewayPlayers);

    await playersService.refreshScores(2);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = await request(app.getHttpServer())
      .get('/players/top')
      .query({ page: 1, limit: 10 })
      .expect(200);

    expect(response.body.totalItems).toBe(2);
    expect(response.body.items).toHaveLength(2);

    const [first, second] = response.body.items;

    expect(first.nickname).toBe('Alice');
    expect(first.scores).toHaveLength(1);
    expect(first.scores[0].rank).toBe(1);

    expect(second.nickname).toBe('Bob');
    expect(second.scores).toHaveLength(1);
    expect(second.scores[0].rank).toBe(2);
  });

  it('GET /players/:id should return a single player by id', async () => {
    const gatewayPlayers: IPlayerWebScrapperScore[] = [
      { rank: 1, name: 'Charlie', level: 70, experience: 3_000_000 },
    ];

    gatewayMock.fetchTopPlayers.mockResolvedValue(gatewayPlayers);

    await playersService.refreshScores(1);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const topResponse = await request(app.getHttpServer())
      .get('/players/top')
      .query({ page: 1, limit: 10 })
      .expect(200);

    const player = topResponse.body.items[0];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = await request(app.getHttpServer())
      .get(`/players/${player.id}`)
      .expect(200);

    expect(response.body.id).toBe(player.id);
    expect(response.body.nickname).toBe('Charlie');
  });

  it('GET /players/:id should return 400 when id is not a valid uuid', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = await request(app.getHttpServer())
      .get('/players/not-a-uuid')
      .expect(400);

    expect(response.body.statusCode).toBe(400);
    expect(response.body.message).toEqual(
      expect.arrayContaining(['id must be a UUID']),
    );
    expect(response.body.error).toBe('Bad Request');
  });

  it('GET /players/:id should return 404 when player does not exist', async () => {
    const nonExistingId = '123e4567-e89b-12d3-a456-426614174000';

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = await request(app.getHttpServer())
      .get(`/players/${nonExistingId}`)
      .expect(404);

    expect(response.body.statusCode).toBe(404);
    expect(response.body.message).toBe('Player not found');
    expect(response.body.error).toBe('Not Found');
  });

  it('GET /players/:id/scores should return scores in date range', async () => {
    const gatewayPlayers: IPlayerWebScrapperScore[] = [
      { rank: 1, name: 'Delta', level: 50, experience: 1_000_000 },
    ];

    gatewayMock.fetchTopPlayers.mockResolvedValue(gatewayPlayers);

    await playersService.refreshScores(1);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const topResponse = await request(app.getHttpServer())
      .get('/players/top')
      .query({ page: 1, limit: 10 })
      .expect(200);

    const player = topResponse.body.items[0];

    const startDate = new Date(0).toISOString();
    const endDate = new Date(Date.now() + 60_000).toISOString();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = await request(app.getHttpServer())
      .get(`/players/${player.id}/scores`)
      .query({ startDate, endDate })
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].rank).toBe(1);
    expect(response.body[0].experience).toBe(1_000_000);
  });

  it('GET /players/:id/scores should require startDate and endDate', async () => {
    const gatewayPlayers: IPlayerWebScrapperScore[] = [
      { rank: 1, name: 'Echo', level: 60, experience: 2_000_000 },
    ];

    gatewayMock.fetchTopPlayers.mockResolvedValue(gatewayPlayers);

    await playersService.refreshScores(1);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const topResponse = await request(app.getHttpServer())
      .get('/players/top')
      .query({ page: 1, limit: 10 })
      .expect(200);

    const player = topResponse.body.items[0];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    let response = await request(app.getHttpServer())
      .get(`/players/${player.id}/scores`)
      .query({ endDate: new Date().toISOString() })
      .expect(400);

    expect(response.body.statusCode).toBe(400);
    expect(response.body.message).toEqual(
      expect.arrayContaining([
        'startDate must be a valid ISO 8601 date string',
      ]),
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    response = await request(app.getHttpServer())
      .get(`/players/${player.id}/scores`)
      .query({ startDate: new Date().toISOString() })
      .expect(400);

    expect(response.body.statusCode).toBe(400);
    expect(response.body.message).toEqual(
      expect.arrayContaining(['endDate must be a valid ISO 8601 date string']),
    );
  });

  it('GET /players/:id/scores should validate startDate and endDate as date strings', async () => {
    const gatewayPlayers: IPlayerWebScrapperScore[] = [
      { rank: 1, name: 'Foxtrot', level: 65, experience: 2_500_000 },
    ];

    gatewayMock.fetchTopPlayers.mockResolvedValue(gatewayPlayers);

    await playersService.refreshScores(1);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const topResponse = await request(app.getHttpServer())
      .get('/players/top')
      .query({ page: 1, limit: 10 })
      .expect(200);

    const player = topResponse.body.items[0];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = await request(app.getHttpServer())
      .get(`/players/${player.id}/scores`)
      .query({ startDate: 'not-a-date', endDate: 'also-not-a-date' })
      .expect(400);

    expect(response.body.statusCode).toBe(400);
    expect(response.body.message).toEqual(
      expect.arrayContaining([
        'startDate must be a valid ISO 8601 date string',
        'endDate must be a valid ISO 8601 date string',
      ]),
    );
  });

  it('GET /players/top should work without date parameter (backward compatibility)', async () => {
    const gatewayPlayers: IPlayerWebScrapperScore[] = [
      { rank: 1, name: 'Golf', level: 75, experience: 4_000_000 },
      { rank: 2, name: 'Hotel', level: 70, experience: 3_500_000 },
    ];

    gatewayMock.fetchTopPlayers.mockResolvedValue(gatewayPlayers);

    await playersService.refreshScores(2);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = await request(app.getHttpServer())
      .get('/players/top')
      .query({ page: 1, limit: 10 })
      .expect(200);

    expect(response.body.totalItems).toBe(2);
    expect(response.body.items).toHaveLength(2);
  });

  it('GET /players/top should return players for closest next date when date parameter is provided', async () => {
    const firstDate = new Date('2024-01-01T10:00:00Z');
    const secondDate = new Date('2024-01-02T10:00:00Z');
    const thirdDate = new Date('2024-01-03T10:00:00Z');

    gatewayMock.fetchTopPlayers
      .mockResolvedValueOnce([
        { rank: 1, name: 'Player1', level: 50, experience: 1_000_000 },
      ])
      .mockResolvedValueOnce([
        { rank: 1, name: 'Player2', level: 60, experience: 2_000_000 },
      ])
      .mockResolvedValueOnce([
        { rank: 1, name: 'Player3', level: 70, experience: 3_000_000 },
      ]);

    await playersService.refreshScores(1);
    const firstTop = await playersService.getTopPlayers(1, 10);
    const firstPlayerId = firstTop.items[0].id;
    await scoreModel.update(
      { datetime: firstDate },
      { where: { playerId: firstPlayerId } },
    );

    await playersService.refreshScores(1);
    const secondTop = await playersService.getTopPlayers(1, 10);
    const secondPlayerId = secondTop.items[0].id;
    await scoreModel.update(
      { datetime: secondDate },
      { where: { playerId: secondPlayerId } },
    );

    await playersService.refreshScores(1);
    const thirdTop = await playersService.getTopPlayers(1, 10);
    const thirdPlayerId = thirdTop.items[0].id;
    await scoreModel.update(
      { datetime: thirdDate },
      { where: { playerId: thirdPlayerId } },
    );

    const queryDate = new Date('2024-01-01T15:00:00Z'); // Between first and second
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = await request(app.getHttpServer())
      .get('/players/top')
      .query({ page: 1, limit: 10, date: queryDate.toISOString() })
      .expect(200);

    expect(response.body.totalItems).toBe(1);
    expect(response.body.items[0].nickname).toBe('Player2');
    expect(response.body.items[0].scores[0].experience).toBe(2_000_000);
  });

  it('GET /players/top should return empty when no date found after given date', async () => {
    const gatewayPlayers: IPlayerWebScrapperScore[] = [
      { rank: 1, name: 'India', level: 80, experience: 5_000_000 },
    ];

    gatewayMock.fetchTopPlayers.mockResolvedValue(gatewayPlayers);

    await playersService.refreshScores(1);

    const futureDate = new Date('2099-12-31T00:00:00Z');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = await request(app.getHttpServer())
      .get('/players/top')
      .query({ page: 1, limit: 10, date: futureDate.toISOString() })
      .expect(200);

    expect(response.body.totalItems).toBe(0);
    expect(response.body.items).toHaveLength(0);
  });

  it('GET /players/top should validate date parameter as ISO 8601 date string', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = await request(app.getHttpServer())
      .get('/players/top')
      .query({ page: 1, limit: 10, date: 'not-a-valid-date' })
      .expect(400);

    expect(response.body.statusCode).toBe(400);
    expect(response.body.message).toEqual(
      expect.arrayContaining(['date must be a valid ISO 8601 date string']),
    );
  });

  it('GET /players/top should return exact date when querying with exact date', async () => {
    const targetDate = new Date('2024-01-15T12:00:00Z');

    gatewayMock.fetchTopPlayers.mockResolvedValue([
      { rank: 1, name: 'Juliet', level: 90, experience: 6_000_000 },
    ]);

    await playersService.refreshScores(1);

    const top = await playersService.getTopPlayers(1, 10);
    const playerId = top.items[0].id;
    await scoreModel.update({ datetime: targetDate }, { where: { playerId } });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = await request(app.getHttpServer())
      .get('/players/top')
      .query({ page: 1, limit: 10, date: targetDate.toISOString() })
      .expect(200);

    expect(response.body.totalItems).toBe(1);
    expect(response.body.items[0].nickname).toBe('Juliet');
  });
});
