import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { CrawlerStatus, ResourceSource } from '@ulhn/types';
import { CrawlerLog } from './crawler-log.entity';

@Entity('crawlers')
@Index(['source'])
@Index(['status'])
export class Crawler {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: ResourceSource,
  })
  source: ResourceSource;

  @Column()
  url: string;

  @Column({ default: '0 0 * * 0' })
  schedule: string;

  @Column({
    type: 'enum',
    enum: CrawlerStatus,
    default: CrawlerStatus.IDLE,
  })
  status: CrawlerStatus;

  @Column({ default: true })
  enabled: boolean;

  @Column({ name: 'last_run_at', type: 'timestamp', nullable: true })
  lastRunAt?: Date;

  @Column({ name: 'next_run_at', type: 'timestamp', nullable: true })
  nextRunAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => CrawlerLog, (log) => log.crawler)
  logs: CrawlerLog[];
}
