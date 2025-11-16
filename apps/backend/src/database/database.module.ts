import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { OAuthProvider } from './entities/oauth-provider.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Resource } from './entities/resource.entity';
import { Module as SAPModule } from './entities/module.entity';
import { Process } from './entities/process.entity';
import { Role } from './entities/role.entity';
import { Tag } from './entities/tag.entity';
import { Favorite } from './entities/favorite.entity';
import { Playlist } from './entities/playlist.entity';
import { PlaylistItem } from './entities/playlist-item.entity';
import { Note } from './entities/note.entity';
import { History } from './entities/history.entity';
import { UserPreferences } from './entities/user-preferences.entity';
import { Crawler } from './entities/crawler.entity';
import { CrawlerLog } from './entities/crawler-log.entity';
import { AnalyticsEvent } from './entities/analytics-event.entity';

const entities = [
  User,
  OAuthProvider,
  RefreshToken,
  Resource,
  SAPModule,
  Process,
  Role,
  Tag,
  Favorite,
  Playlist,
  PlaylistItem,
  Note,
  History,
  UserPreferences,
  Crawler,
  CrawlerLog,
  AnalyticsEvent,
];

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities,
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
        ssl: configService.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),
    TypeOrmModule.forFeature(entities),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
