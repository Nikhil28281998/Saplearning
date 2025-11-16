import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Resource } from './resource.entity';

@Entity('history')
@Index(['userId', 'resourceId'])
@Index(['userId'])
@Index(['resourceId'])
@Index(['viewedAt'])
export class History {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'resource_id' })
  resourceId: string;

  @Column({ name: 'viewed_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  viewedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.history, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Resource, (resource) => resource.historyEntries, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'resource_id' })
  resource: Resource;
}
