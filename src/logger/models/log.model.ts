import { LogLevel } from '@nestjs/common';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
  timestamps: false,
})
export class Log extends Model {
  @Column({
    type: DataType.STRING(16),
    allowNull: false,
  })
  declare level: LogLevel;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  declare message: string;

  @Column({
    type: DataType.STRING(128),
    allowNull: true,
  })
  declare context?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare stack?: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  declare metadata?: Record<string, unknown>;

  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  declare correlationId?: string;

  @Column({
    field: 'logged_at',
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  declare loggedAt: Date;
}
