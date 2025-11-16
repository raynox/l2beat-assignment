# RuneScape Leaderboard Service

Simple NestJS service that periodically scrapes the official RuneScape hiscores
table, persists players and their scores, and exposes a REST API for querying
the latest leaderboard snapshot.

## Setup and Run

### Prerequisites

- **Node.js** (v18 or higher recommended)
- **npm** or **yarn** package manager
- **SQLite3** (included as a dependency, no separate installation needed)

### Installation

1. Clone the repository and navigate to the project directory:

   ```bash
   cd l2beat-assignment
   ```

2. Install dependencies:

   ```bash
   # Using npm
   npm install

   # Or using yarn
   yarn install
   ```

### Configuration

1. Create a `.env` file in the root directory:

   ```bash
   cp .env.example .env  # If you have an example file
   # Or create a new .env file
   ```

2. Configure the required environment variables (see [Configuration](#configuration) section below):

   ```env
   RUNESCAPE_URL=https://secure.runescape.com/m=hiscore_oldschool/index_lite.ws
   MAX_PLAYERS=10
   PORT=3000
   ```

   **Note:** `RUNESCAPE_URL` is required and should be the base URL without query parameters. The application automatically appends `?table=0&page={pageNumber}` when fetching leaderboard data. Other variables have defaults but can be customized.

### Running the Application

#### Development Mode

Start the application in watch mode (auto-reloads on file changes):

```bash
npm run start:dev
# Or
yarn start:dev
```

The application will be available at `http://localhost:3000` (or the port specified in `PORT`).

#### Production Mode

1. Build the application:

   ```bash
   npm run build
   # Or
   yarn build
   ```

2. Start the production server:
   ```bash
   npm run start:prod
   # Or
   yarn start:prod
   ```

#### Debug Mode

Start with debugging enabled:

```bash
npm run start:debug
# Or
yarn start:debug
```

### Testing

Run unit tests:

```bash
npm test
# Or
yarn test
```

Run tests in watch mode:

```bash
npm run test:watch
# Or
yarn test:watch
```

Run tests with coverage:

```bash
npm run test:cov
# Or
yarn test:cov
```

Run end-to-end tests:

```bash
npm run test:e2e
# Or
yarn test:e2e
```

### Database

The application uses SQLite for data persistence. The database file is created automatically on first run at the location specified by `DB_STORAGE` (default: `database.sqlite` in the project root).

- **Players** and **Scores** are stored in the database
- **Logs** are also persisted to the database for queryable logging

The database schema is automatically created by Sequelize when the application starts.

### Verification

Once the application is running, you can verify it's working by:

1. Checking the health of the API:

   ```bash
   curl http://localhost:3000/players/top
   ```

2. The cron job runs every minute to refresh leaderboard data. You should see log entries indicating successful scraping.

## API

| Method | Path                  | Description                                                                                                         |
| ------ | --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| GET    | `/players/top`        | Returns a paginated snapshot of the top players. Supports optional date filtering to retrieve historical snapshots. |
| GET    | `/players/:id`        | Returns a single player by their UUID. Returns 404 if the player is not found.                                      |
| GET    | `/players/:id/scores` | Returns a player's score history within a specified time range. Requires startDate and endDate query parameters.    |

### Endpoint Details

#### `GET /players/top`

Returns a paginated list of top players with their latest scores. Optionally filter by a specific date to retrieve historical snapshots.

**Query Parameters:**

- `page` (optional, integer, min: 1, default: `1`) - Page number for pagination
- `limit` (optional, integer, min: 1, default: `MAX_PLAYERS` env variable or `10`) - Number of items per page. Automatically capped at `MAX_PLAYERS` value
- `date` (optional, ISO 8601 date string) - Filter snapshot by specific date/time. If not provided, returns the most recent snapshot

**Example:** `GET /players/top?page=1&limit=10&date=2025-11-14T11:00:00.000Z`

#### `GET /players/:id`

Returns detailed information about a single player by their UUID.

**Path Parameters:**

- `id` (required, UUID) - The unique identifier of the player

**Example:** `GET /players/ad0c2cd0-7c53-4c72-89a7-26e8f0a0fb09`

**Error Responses:**

- `404 Not Found` - Player with the given ID does not exist
- `400 Bad Request` - Invalid UUID format

#### `GET /players/:id/scores`

Returns the score history for a specific player within a given time range. Both start and end dates are inclusive.

**Path Parameters:**

- `id` (required, UUID) - The unique identifier of the player

**Query Parameters:**

- `startDate` (required, ISO 8601 date string) - Start of the time range (inclusive)
- `endDate` (required, ISO 8601 date string) - End of the time range (inclusive)

**Example:** `GET /players/ad0c2cd0-7c53-4c72-89a7-26e8f0a0fb09/scores?startDate=2025-11-14T00:00:00.000Z&endDate=2025-11-15T00:00:00.000Z`

**Error Responses:**

- `404 Not Found` - Player with the given ID does not exist
- `400 Bad Request` - Invalid UUID format or missing/invalid date parameters

### Sample response (`GET /players/top`)

```json
{
  "items": [
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
  ],
  "totalItems": 100,
  "totalPages": 10,
  "page": 1,
  "limit": 10
}
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

## Architecture

### Modules

The application is organized into two main modules:

- **PlayersModule** - Core business logic for managing player data and leaderboard functionality. Handles web scraping, data persistence, scheduled tasks, and REST API endpoints for querying player information and scores.

- **LoggerModule** - Provides database-backed logging functionality. Extends NestJS's `ConsoleLogger` to persist all log entries (log, error, warn, debug, verbose) to the database while optionally maintaining console output. Supports configurable console logging and is used throughout the application for structured logging.

## System components

### Players Module

- `src/players/gateways/web-scrapping-players.gateway.ts`  
  External gateway that wraps the RuneScape hiscores page. Uses Axios to fetch HTML content and Cheerio to parse leaderboard rows from the DOM. Normalizes scraped data to `{ rank, name, level, experience }` format and handles pagination to fetch the requested number of top players.

- `src/players/services/players.service.ts`  
  Domain service that orchestrates the scraping and persistence workflow. The `refreshScores` method coordinates fetching leaderboard data from the gateway, creating new player records for players that don't exist in the database, and saving timestamped score entries for each player. Also provides read operations for the controller: `getTopPlayers` (with pagination and optional date filtering), `getPlayerById`, and `getPlayerScores` (for historical score queries).

- `src/players/repositories/players-db.repository.ts`  
  Sequelize-based repository for `Player` model operations. Handles fetching paginated top players (with optional date filtering for historical snapshots), looking up players by nickname or UUID, and creating new player records. Manages database transactions for data consistency.

- `src/players/repositories/scores-db.repository.ts`  
  Sequelize-based repository for `Score` model operations. Responsible for persisting timestamped score entries linked to players and querying score history within date ranges for individual players.

- `src/players/services/tasks.service.ts`  
  Scheduled task service that runs a cron job every minute. Automatically invokes `PlayersService.refreshScores(maxPlayers)` using the `MAX_PLAYERS` configuration value. This ensures the leaderboard snapshot stays up-to-date without manual intervention.

- `src/players/players.controller.ts`  
  REST API controller that exposes the three endpoints documented above. Handles request validation (UUID format, date strings, pagination parameters), delegates business logic to `PlayersService`, and enforces the `MAX_PLAYERS` limit for pagination.

### Logger Module

- `src/logger/db-logger.service.ts`  
  Custom logger service that extends NestJS's `ConsoleLogger`. Implements all standard logging methods (log, error, warn, debug, verbose) and persists every log entry to the database via `LogsRepository`. Console output can be controlled via the `CONSOLE_LOGGING` environment variable (disabled by default in test environment). Supports context tracking and stack trace capture for errors.

- `src/logger/repositories/logs.repository.ts`  
  Sequelize-based repository for persisting log entries. Saves log records with level, message, context, optional stack traces, metadata, and correlation IDs to the `Log` model for later analysis and debugging.

## Configuration

| Variable          | Description                                                                                          | Default                   |
| ----------------- | ---------------------------------------------------------------------------------------------------- | ------------------------- |
| `RUNESCAPE_URL`   | Base hiscores URL used by the gateway.                                                               | none (required)           |
| `MAX_PLAYERS`     | Leaderboard size & cron refresh limit.                                                               | `10`                      |
| `PORT`            | HTTP server port.                                                                                    | `3000`                    |
| `DB_STORAGE`      | SQLite database file path.                                                                           | `database.sqlite`         |
| `DB_LOGGING`      | Enable Sequelize query logging (`true`/`false`).                                                     | `true`                    |
| `CONSOLE_LOGGING` | Enable console output for logger (`true`/`false`).                                                   | `true` (disabled in test) |
| `NODE_ENV`        | Environment mode. When set to `test`, uses `.env.test` file and disables console logging by default. | none                      |

Provide these via `.env` or your preferred config source before running the
NestJS application.
