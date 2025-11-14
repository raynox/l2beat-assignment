# RuneScape Leaderboard Service

Simple NestJS service that periodically scrapes the official RuneScape hiscores
table, persists players and their scores, and exposes a REST API for querying
the latest leaderboard snapshot.

## API

| Method | Path                  | Description                                              |
| ------ | --------------------- | -------------------------------------------------------- |
| GET    | `/players/top`        | Returns the most recent snapshot of the top _N_ players. |
| GET    | `/players/:id`        | Returns a single player (by DB id).                      |
| GET    | `/players/:id/scores` | Returns a player's score history in a given time range.  |

**Defaults & params**

- `N` (the number of players returned by `/players/top`) defaults to the
  `MAX_PLAYERS` env variable (10 if undefined).
- `/players/:id` and `/players/:id/scores` validate that `id` is a UUID and throw `404` when the player cannot be found.
- `/players/:id/scores` requires ISO 8601 `startDate` and `endDate` query params, returning the score trail between those timestamps (inclusive).

### Sample response (`GET /players/top`)

```json
[
  {
    "id": "ad0c2cd0-7c53-4c72-89a7-26e8f0a0fb09",
    "nickname": "Zezima",
    "scores": [
      {
        "rank": 1,
        "level": 2277,
        "experience": 4600000000,
        "datetime": "2025-11-14T11:00:00.000Z"
      }
    ]
  }
]
```

### Sample response (`GET /players/:id`)

```json
{
  "id": "ad0c2cd0-7c53-4c72-89a7-26e8f0a0fb09",
  "nickname": "Zezima"
}
```

### Sample response (`GET /players/:id/scores?startDate=2025-11-14T00:00:00.000Z&endDate=2025-11-15T00:00:00.000Z`)

```json
[
  {
    "rank": 1,
    "level": 2277,
    "experience": 4600000000,
    "datetime": "2025-11-14T11:00:00.000Z"
  }
]
```

## System components

- `src/players/gateways/web-scrapping-players.gateway.ts`  
  Wraps the RuneScape hiscores page. Uses Axios + Cheerio to fetch and parse
  leaderboard rows, normalizes them to `{ rank, name, level, experience }`, and
  enforces pagination until the requested limit is satisfied.

- `src/players/services/players.service.ts`  
  Domain service orchestrating scraping + persistence. It refreshes leaderboard
  data (`refreshScores`) by calling the gateway, creating players that do not
  yet exist, and saving a timestamped score entry for each player. It also
  exposes read methods for the controller (`getTopPlayers`, `getPlayerById`).

- `src/players/repositories/players-db.repository.ts`  
  Sequelize-based persistence layer for `Player` and `Score` models. Knows how
  to fetch the latest snapshot, lookup players by nickname or id, and insert new
  score records bound to a player.

- `src/players/services/tasks.service.ts`  
  Cron job (every minute) that invokes `PlayersService.refreshScores(maxPlayers)`
  using `MAX_PLAYERS` from the config. This keeps the leaderboard snapshot
  up-to-date without manual intervention.

- `src/players/players.controller.ts`  
  Exposes the REST endpoints listed above. Delegates to `PlayersService` and
  uses `MAX_PLAYERS` to determine the maximum number of rows served.

## Configuration

| Variable        | Description                            | Default |
| --------------- | -------------------------------------- | ------- |
| `RUNESCAPE_URL` | Base hiscores URL used by the gateway. | none    |
| `MAX_PLAYERS`   | Leaderboard size & cron refresh limit. | `10`    |

Provide these via `.env` or your preferred config source before running the
NestJS application.
