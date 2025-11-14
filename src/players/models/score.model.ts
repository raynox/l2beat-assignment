import {
  Column,
  Table,
  Model,
  BelongsTo,
  ForeignKey,
  DataType,
} from 'sequelize-typescript';
import { Player } from './player.model';

@Table({ timestamps: false })
export class Score extends Model {
  @ForeignKey(() => Player)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare playerId: string;

  @BelongsTo(() => Player)
  declare player: Player;

  @Column
  declare rank: number;

  @Column
  declare level: number;

  @Column
  declare experience: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  declare datetime: Date;
}
