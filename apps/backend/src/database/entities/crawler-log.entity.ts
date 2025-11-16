import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CrawlerStatus } from '@ulhn/types';
import { Crawler } from './crawler.entity';

@Entity('crawler_logs')
@Index(['crawlerId'])
@Index(['status'])
@Index(['startedAt'])
export class CrawlerLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'crawler_id' })
  crawlerId: string;

  @Column({
    type: 'enum',
    enum: CrawlerStatus,
  })
  status: CrawlerStatus;

  @Column({ name: 'started_at', type: 'timestamp' })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ name: 'resources_found', type: 'int', default: 0 })
  resourcesFound: number;

  @Column({ name: 'resources_created', type: 'int', default: 0 })
  resourcesCreated: number;

  @Column({ name: 'resources_updated', type: 'int', default: 0 })
  resourcesUpdated: number;

  @Column({ type: 'text', nullable: true })
  errors?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Crawler, (crawler) => crawler.logs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'crawler_id' })
  crawler: Crawler;
}
