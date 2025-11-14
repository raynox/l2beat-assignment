import { Column, Table, Model, HasMany, DataType } from 'sequelize-typescript';
import { Score } from './score.model';

@Table({})
export class Player extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @HasMany(() => Score, 'playerId')
  declare scores?: Score[];

  @Column
  declare nickname: string;
}
