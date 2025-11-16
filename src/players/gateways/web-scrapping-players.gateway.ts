import { Injectable } from '@nestjs/common';
import { IPlayerGateway, IPlayerWebScrapperScore } from '../types';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { parseNumber } from 'src/shared/utils/parse-number';
import { ConfigService } from '@nestjs/config';

@Injectable()
export default class WebScrapingPlayersGateway implements IPlayerGateway {
  private baseUrl: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get('RUNESCAPE_URL');
  }

  async fetchTopPlayers(limit: number): Promise<IPlayerWebScrapperScore[]> {
    let page = 1;
    const players: IPlayerWebScrapperScore[] = [];
    const seenPlayers = new Set<string>();

    while (players.length < limit) {
      const newPlayers = await this.scrapPage(page);

      const uniqueNewPlayers = newPlayers.filter((player) => {
        const key = `${player.rank}:${player.name}`;

        if (seenPlayers.has(key)) {
          return false;
        }

        seenPlayers.add(key);
        return true;
      });

      if (uniqueNewPlayers.length === 0) {
        break;
      }

      players.push(...uniqueNewPlayers);
      page++;
    }

    return players.slice(0, limit);
  }

  private async scrapPage(page: number): Promise<IPlayerWebScrapperScore[]> {
    if (!this.baseUrl) {
      throw new Error('runescape base url is not set');
    }

    const { data } = await axios.get(`${this.baseUrl}?table=0&page=${page}`);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const $ = cheerio.load(data);
    const players = $('.personal-hiscores__row')
      .map((i, row) => {
        const tds = $(row).find('td');

        const rank = parseNumber(tds.eq(0).text().trim());
        const name = tds.eq(1).text().trim();
        const level = parseNumber(tds.eq(2).text().trim());
        const experience = parseNumber(tds.eq(3).text().trim());

        return {
          rank,
          name,
          level,
          experience,
        };
      })
      .get();

    return players;
  }
}
