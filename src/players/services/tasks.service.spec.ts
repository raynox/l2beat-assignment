import { ConfigService } from '@nestjs/config';
import { TasksService } from './tasks.service';
import { IPlayersService } from '../types';

describe('TasksService', () => {
  let playersService: jest.Mocked<IPlayersService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    playersService = {
      refreshScores: jest.fn(),
      getTopPlayers: jest.fn(),
      getPlayerById: jest.fn(),
      getPlayerScores: jest.fn(),
    } as unknown as jest.Mocked<IPlayersService>;

    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;
  });

  it('uses MAX_PLAYERS from config when available', async () => {
    configService.get.mockReturnValue(50);
    const service = new TasksService(playersService, configService);

    await service.handleCron();

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(playersService.refreshScores).toHaveBeenCalledWith(50);
  });

  it('falls back to default value when MAX_PLAYERS is not set', async () => {
    configService.get.mockReturnValue(undefined);
    const service = new TasksService(playersService, configService);

    await service.handleCron();

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(playersService.refreshScores).toHaveBeenCalledWith(10);
  });
});
