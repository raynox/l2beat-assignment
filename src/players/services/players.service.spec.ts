import { Test, TestingModule } from '@nestjs/testing';
import { SequelizeModule } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { PlayersService } from './players.service';
import { PlayersDbRepository } from '../repositories/players-db.repository';
import { ScoresDbRepository } from '../repositories/scores-db.repository';
import { Player } from '../models/player.model';
import { Score } from '../models/score.model';
import { IPlayerGateway, IPlayerWebScrapperScore } from '../types';
import WebScrapingPlayersGateway from '../gateways/web-scrapping-players.gateway';

describe('PlayersService (integration with SQLite, mocked gateway)', () => {
  let moduleRef: TestingModule;
  let service: PlayersService;
  let sequelize: Sequelize;
  let gatewayMock: jest.Mocked<IPlayerGateway>;

  beforeAll(async () => {
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
          models: [Player, Score],
          autoLoadModels: true,
          synchronize: true,
          logging: false,
        }),
        SequelizeModule.forFeature([Player, Score]),
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
});
