import { Test, TestingModule } from '@nestjs/testing';
import { SequelizeModule, getModelToken } from '@nestjs/sequelize';
import { LogsRepository } from './logs.repository';
import { Log } from '../models/log.model';
import { ILog } from '../types';
import { Sequelize } from 'sequelize-typescript';

describe('LogsRepository (integration with SQLite)', () => {
  let moduleRef: TestingModule;
  let repository: LogsRepository;
  let sequelize: Sequelize;
  let logModel: typeof Log;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        SequelizeModule.forRoot({
          dialect: 'sqlite',
          storage: ':memory:',
          models: [Log],
          autoLoadModels: true,
          synchronize: true,
          logging: false,
        }),
        SequelizeModule.forFeature([Log]),
      ],
      providers: [LogsRepository],
    }).compile();

    repository = moduleRef.get(LogsRepository);
    sequelize = moduleRef.get(Sequelize);
    logModel = moduleRef.get<typeof Log>(getModelToken(Log));
  });

  beforeEach(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('should persist a log with all required fields', async () => {
    const log: ILog = {
      level: 'error',
      message: 'Test error message',
      loggedAt: new Date(),
    };

    await repository.saveLog(log);

    const savedLogs = await logModel.findAll();
    expect(savedLogs).toHaveLength(1);

    const savedLog = savedLogs[0];
    expect(savedLog.level).toBe(log.level);
    expect(savedLog.message).toBe(log.message);
    expect(savedLog.loggedAt).toBeDefined();
  });

  it('should persist a log with all optional fields', async () => {
    const log: ILog = {
      level: 'warn',
      message: 'Test warning message',
      context: 'TestContext',
      stack: 'Error stack trace',
      metadata: { key1: 'value1', key2: 123 },
      correlationId: 'correlation-123',
      loggedAt: new Date(),
    };

    await repository.saveLog(log);

    const savedLogs = await logModel.findAll();
    expect(savedLogs).toHaveLength(1);

    const savedLog = savedLogs[0];
    expect(savedLog.level).toBe(log.level);
    expect(savedLog.message).toBe(log.message);
    expect(savedLog.context).toBe(log.context);
    expect(savedLog.stack).toBe(log.stack);
    expect(savedLog.metadata).toEqual(log.metadata);
    expect(savedLog.correlationId).toBe(log.correlationId);
    expect(savedLog.loggedAt).toBeDefined();
  });

  it('should persist multiple logs', async () => {
    const logs: ILog[] = [
      {
        level: 'log',
        message: 'Info message 1',
        loggedAt: new Date(),
      },
      {
        level: 'debug',
        message: 'Debug message 2',
        context: 'DebugContext',
        loggedAt: new Date(),
      },
      {
        level: 'error',
        message: 'Error message 3',
        stack: 'Error stack',
        loggedAt: new Date(),
      },
    ];

    for (const log of logs) {
      await repository.saveLog(log);
    }

    const savedLogs = await logModel.findAll();
    expect(savedLogs).toHaveLength(3);

    expect(savedLogs[0].level).toBe('log');
    expect(savedLogs[0].message).toBe('Info message 1');

    expect(savedLogs[1].level).toBe('debug');
    expect(savedLogs[1].message).toBe('Debug message 2');
    expect(savedLogs[1].context).toBe('DebugContext');

    expect(savedLogs[2].level).toBe('error');
    expect(savedLogs[2].message).toBe('Error message 3');
    expect(savedLogs[2].stack).toBe('Error stack');
  });

  it('should persist logs with different log levels', async () => {
    const logLevels = ['verbose', 'debug', 'log', 'warn', 'error'] as const;

    for (const level of logLevels) {
      const log: ILog = {
        level,
        message: `Message for ${level}`,
        loggedAt: new Date(),
      };
      await repository.saveLog(log);
    }

    const savedLogs = await logModel.findAll();
    expect(savedLogs).toHaveLength(logLevels.length);

    savedLogs.forEach((savedLog, index) => {
      expect(savedLog.level).toBe(logLevels[index]);
    });
  });

  it('should persist log with complex metadata', async () => {
    const log: ILog = {
      level: 'log',
      message: 'Log with complex metadata',
      metadata: {
        userId: 'user-123',
        action: 'create',
        details: {
          nested: {
            value: 'deeply nested',
            number: 42,
          },
        },
        array: [1, 2, 3],
        boolean: true,
      },
      loggedAt: new Date(),
    };

    await repository.saveLog(log);

    const savedLogs = await logModel.findAll();
    expect(savedLogs).toHaveLength(1);

    const savedLog = savedLogs[0];
    expect(savedLog.metadata).toEqual(log.metadata);
  });
});
