import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import WebScrapingPlayersGateway from './web-scrapping-players.gateway';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WebScrapingPlayersGateway', () => {
  const baseUrl = 'https://example.com/hiscores';
  let gateway: WebScrapingPlayersGateway;

  beforeEach(() => {
    mockedAxios.get.mockReset();

    const configService = {
      get: jest
        .fn()
        .mockImplementation((key: string) =>
          key === 'RUNESCAPE_URL' ? baseUrl : undefined,
        ),
    } as unknown as ConfigService;

    gateway = new WebScrapingPlayersGateway(configService);
  });

  const buildHtml = (
    rows: Array<{
      rank: number;
      name: string;
      level: number;
      experience: number;
    }>,
  ) => `
    <table>
      ${rows
        .map(
          ({ rank, name, level, experience }) => `
        <tr class="personal-hiscores__row">
          <td>${rank}</td>
          <td>${name}</td>
          <td>${level}</td>
          <td>${experience.toLocaleString()}</td>
        </tr>
      `,
        )
        .join('')}
    </table>
  `;

  it('fetches pages until enough players are collected and parses the rows', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({
        data: buildHtml([
          { rank: 1, name: 'Player One', level: 99, experience: 13_034_431 },
          { rank: 2, name: 'Player Two', level: 98, experience: 12_000_000 },
        ]),
      })
      .mockResolvedValueOnce({
        data: buildHtml([
          { rank: 3, name: 'Player Three', level: 97, experience: 11_500_000 },
          { rank: 4, name: 'Player Four', level: 96, experience: 10_800_000 },
        ]),
      });

    const result = await gateway.fetchTopPlayers(3);

    /* eslint-disable @typescript-eslint/unbound-method */
    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    expect(mockedAxios.get).toHaveBeenCalledWith(`${baseUrl}?table=0&page=1`);
    expect(mockedAxios.get).toHaveBeenCalledWith(`${baseUrl}?table=0&page=2`);
    /* eslint-enable @typescript-eslint/unbound-method */

    expect(result).toEqual([
      { rank: 1, name: 'Player One', level: 99, experience: 13_034_431 },
      { rank: 2, name: 'Player Two', level: 98, experience: 12_000_000 },
      { rank: 3, name: 'Player Three', level: 97, experience: 11_500_000 },
    ]);
  });

  it('returns only existing players when pages start repeating and avoids duplicates', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({
        data: buildHtml([
          { rank: 1, name: 'Player One', level: 99, experience: 13_034_431 },
          { rank: 2, name: 'Player Two', level: 98, experience: 12_000_000 },
        ]),
      })
      .mockResolvedValueOnce({
        data: buildHtml([
          { rank: 3, name: 'Player Three', level: 97, experience: 11_500_000 },
          { rank: 4, name: 'Player Four', level: 96, experience: 10_800_000 },
        ]),
      })
      // Third page returns the same content as the first page when requesting a page beyond the last one
      .mockResolvedValueOnce({
        data: buildHtml([
          { rank: 1, name: 'Player One', level: 99, experience: 13_034_431 },
          { rank: 2, name: 'Player Two', level: 98, experience: 12_000_000 },
        ]),
      });

    const result = await gateway.fetchTopPlayers(5);

    /* eslint-disable @typescript-eslint/unbound-method */
    expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    expect(mockedAxios.get).toHaveBeenCalledWith(`${baseUrl}?table=0&page=1`);
    expect(mockedAxios.get).toHaveBeenCalledWith(`${baseUrl}?table=0&page=2`);
    expect(mockedAxios.get).toHaveBeenCalledWith(`${baseUrl}?table=0&page=3`);
    /* eslint-enable @typescript-eslint/unbound-method */

    // We requested 5 players, but only 4 unique players exist.
    // The gateway should not return duplicates when pages start repeating.
    expect(result).toEqual([
      { rank: 1, name: 'Player One', level: 99, experience: 13_034_431 },
      { rank: 2, name: 'Player Two', level: 98, experience: 12_000_000 },
      { rank: 3, name: 'Player Three', level: 97, experience: 11_500_000 },
      { rank: 4, name: 'Player Four', level: 96, experience: 10_800_000 },
    ]);
  });
});
