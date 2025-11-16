import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  OneToMany,
  Index,
  JoinTable,
} from 'typeorm';
import { ResourceType, ResourceSource } from '@ulhn/types';
import { Module } from './module.entity';
import { Process } from './process.entity';
import { Role } from './role.entity';
import { Tag } from './tag.entity';
import { Favorite } from './favorite.entity';
import { PlaylistItem } from './playlist-item.entity';
import { Note } from './note.entity';
import { History } from './history.entity';

@Entity('resources')
@Index(['url'], { unique: true })
@Index(['type'])
@Index(['source'])
@Index(['fioriAppId'])
@Index(['tCode'])
@Index(['publishedAt'])
export class Resource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ unique: true })
  url: string;

  @Column({
    type: 'enum',
    enum: ResourceType,
  })
  type: ResourceType;

  @Column({
    type: 'enum',
    enum: ResourceSource,
  })
  source: ResourceSource;

  @Column({ name: 'thumbnail_url', nullable: true })
  thumbnailUrl?: string;

  @Column({ type: 'int', nullable: true })
  duration?: number;

  @Column({ length: 50, nullable: true })
  difficulty?: string;

  @Column({ length: 10, nullable: true })
  language?: string;

  @Column({ name: 'fiori_app_id', nullable: true })
  fioriAppId?: string;

  @Column({ name: 't_code', nullable: true })
  tCode?: string;

  @Column({ nullable: true })
  version?: string;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt?: Date;

  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount: number;

  @Column({ name: 'favorite_count', type: 'int', default: 0 })
  favoriteCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToMany(() => Module, (module) => module.resources)
  @JoinTable({
    name: 'resource_modules',
    joinColumn: { name: 'resource_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'module_id', referencedColumnName: 'id' },
  })
  modules: Module[];

  @ManyToMany(() => Process, (process) => process.resources)
  @JoinTable({
    name: 'resource_processes',
    joinColumn: { name: 'resource_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'process_id', referencedColumnName: 'id' },
  })
  processes: Process[];

  @ManyToMany(() => Role, (role) => role.resources)
  @JoinTable({
    name: 'resource_roles',
    joinColumn: { name: 'resource_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  @ManyToMany(() => Tag, (tag) => tag.resources)
  @JoinTable({
    name: 'resource_tags',
    joinColumn: { name: 'resource_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags: Tag[];

  @OneToMany(() => Favorite, (favorite) => favorite.resource)
  favorites: Favorite[];

  @OneToMany(() => PlaylistItem, (item) => item.resource)
  playlistItems: PlaylistItem[];

  @OneToMany(() => Note, (note) => note.resource)
  notes: Note[];

  @OneToMany(() => History, (history) => history.resource)
  historyEntries: History[];
}
