# Database Schema Design
## SAP Unified Learning Hub Navigator (ULHN)

**Document Version:** 1.0  
**Date:** November 16, 2025  
**Database:** PostgreSQL 16+  

---

## Table of Contents
1. [Schema Overview](#1-schema-overview)
2. [Entity Relationship Diagram](#2-entity-relationship-diagram)
3. [Table Definitions](#3-table-definitions)
4. [Indexes](#4-indexes)
5. [Constraints](#5-constraints)
6. [Migrations](#6-migrations)

---

## 1. Schema Overview

### 1.1 Database Information
- **Database Name**: `ulhn_db`
- **Character Set**: UTF8
- **Collation**: `en_US.UTF-8`
- **Timezone**: UTC

### 1.2 Schema Organization

```
ulhn_db
├── public (default schema)
│   ├── users & authentication
│   ├── content & resources
│   ├── personalization
│   ├── analytics
│   └── system
```

---

## 2. Entity Relationship Diagram

```
┌─────────────────┐         ┌─────────────────┐
│     users       │         │    resources    │
│─────────────────│         │─────────────────│
│ id (PK)         │         │ id (PK)         │
│ email (UNIQUE)  │         │ title           │
│ password_hash   │         │ description     │
│ first_name      │         │ url (UNIQUE)    │
│ last_name       │         │ source_type     │
│ role            │         │ source_name     │
│ status          │         │ thumbnail_url   │
│ created_at      │         │ duration        │
│ updated_at      │         │ difficulty      │
└────────┬────────┘         │ language        │
         │                  │ fiori_app_id    │
         │                  │ t_code          │
         │                  │ created_at      │
         │                  │ updated_at      │
         │                  │ last_validated  │
         │                  │ is_active       │
         │                  └────────┬────────┘
         │                           │
         │ 1:N                       │ N:M
         ├───────────────────────────┤
         │                           │
┌────────▼────────┐         ┌────────▼────────┐
│   favorites     │         │ resource_modules│
│─────────────────│         │─────────────────│
│ id (PK)         │         │ resource_id (FK)│
│ user_id (FK)    │         │ module_id (FK)  │
│ resource_id(FK) │         │ created_at      │
│ folder_name     │         └─────────────────┘
│ created_at      │
└─────────────────┘         ┌─────────────────┐
                            │    modules      │
┌─────────────────┐         │─────────────────│
│   playlists     │         │ id (PK)         │
│─────────────────│         │ code (UNIQUE)   │
│ id (PK)         │         │ name            │
│ user_id (FK)    │         │ description     │
│ name            │         │ icon            │
│ description     │         │ parent_id (FK)  │
│ visibility      │         │ sort_order      │
│ share_token     │         │ is_active       │
│ created_at      │         └─────────────────┘
│ updated_at      │
└────────┬────────┘         ┌─────────────────┐
         │                  │resource_process │
         │ 1:N              │─────────────────│
┌────────▼────────┐         │ resource_id (FK)│
│ playlist_items  │         │ process_id (FK) │
│─────────────────│         │ step_number     │
│ id (PK)         │         │ created_at      │
│ playlist_id(FK) │         └─────────────────┘
│ resource_id(FK) │
│ sort_order      │         ┌─────────────────┐
│ created_at      │         │   processes     │
└─────────────────┘         │─────────────────│
                            │ id (PK)         │
┌─────────────────┐         │ code (UNIQUE)   │
│     notes       │         │ name            │
│─────────────────│         │ description     │
│ id (PK)         │         │ icon            │
│ user_id (FK)    │         │ sort_order      │
│ resource_id(FK) │         │ is_active       │
│ content         │         └─────────────────┘
│ created_at      │
│ updated_at      │         ┌─────────────────┐
└─────────────────┘         │ resource_roles  │
                            │─────────────────│
┌─────────────────┐         │ resource_id (FK)│
│    history      │         │ role_id (FK)    │
│─────────────────│         │ relevance_score │
│ id (PK)         │         │ created_at      │
│ user_id (FK)    │         └─────────────────┘
│ resource_id(FK) │
│ viewed_at       │         ┌─────────────────┐
│ duration        │         │     roles       │
└─────────────────┘         │─────────────────│
                            │ id (PK)         │
┌─────────────────┐         │ code (UNIQUE)   │
│user_preferences │         │ name            │
│─────────────────│         │ category        │
│ id (PK)         │         │ description     │
│ user_id (FK)    │         │ icon            │
│ language        │         │ sort_order      │
│ theme           │         │ is_active       │
│ primary_role_id │         └─────────────────┘
│ track_history   │
│ created_at      │         ┌─────────────────┐
│ updated_at      │         │      tags       │
└─────────────────┘         │─────────────────│
                            │ id (PK)         │
┌─────────────────┐         │ name (UNIQUE)   │
│    crawlers     │         │ slug            │
│─────────────────│         │ type            │
│ id (PK)         │         │ created_at      │
│ name (UNIQUE)   │         └────────┬────────┘
│ source_url      │                  │
│ crawler_type    │                  │ N:M
│ schedule        │         ┌────────▼────────┐
│ rate_limit      │         │ resource_tags   │
│ is_active       │         │─────────────────│
│ last_run_at     │         │ resource_id (FK)│
│ last_status     │         │ tag_id (FK)     │
│ created_at      │         │ created_at      │
│ updated_at      │         └─────────────────┘
└────────┬────────┘
         │
         │ 1:N
┌────────▼────────┐
│  crawler_logs   │
│─────────────────│
│ id (PK)         │
│ crawler_id (FK) │
│ status          │
│ items_processed │
│ items_added     │
│ items_updated   │
│ errors          │
│ started_at      │
│ completed_at    │
└─────────────────┘

┌─────────────────┐
│  analytics_events│
│─────────────────│
│ id (PK)         │
│ user_id (FK)    │
│ event_type      │
│ event_data      │
│ ip_address      │
│ user_agent      │
│ created_at      │
└─────────────────┘
```

---

## 3. Table Definitions

### 3.1 Users & Authentication

#### 3.1.1 users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) NOT NULL DEFAULT 'registered',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT chk_role CHECK (role IN ('anonymous', 'registered', 'premium', 'admin', 'super_admin')),
    CONSTRAINT chk_status CHECK (status IN ('active', 'suspended', 'deleted')),
    CONSTRAINT chk_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);

COMMENT ON TABLE users IS 'User accounts and authentication data';
COMMENT ON COLUMN users.role IS 'User role: anonymous, registered, premium, admin, super_admin';
COMMENT ON COLUMN users.status IS 'Account status: active, suspended, deleted';
```

#### 3.1.2 oauth_providers
```sql
CREATE TABLE oauth_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_provider CHECK (provider IN ('google', 'microsoft')),
    UNIQUE(provider, provider_user_id)
);

CREATE INDEX idx_oauth_user_id ON oauth_providers(user_id);
CREATE INDEX idx_oauth_provider ON oauth_providers(provider);

COMMENT ON TABLE oauth_providers IS 'OAuth provider connections for users';
```

#### 3.1.3 refresh_tokens
```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

COMMENT ON TABLE refresh_tokens IS 'JWT refresh tokens for session management';
```

### 3.2 Content & Resources

#### 3.2.1 resources
```sql
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    url VARCHAR(2000) NOT NULL UNIQUE,
    source_type VARCHAR(50) NOT NULL,
    source_name VARCHAR(100) NOT NULL,
    thumbnail_url VARCHAR(2000),
    duration INTEGER,
    difficulty VARCHAR(50),
    language VARCHAR(10) DEFAULT 'en',
    fiori_app_id VARCHAR(50),
    t_code VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_validated_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    views_count INTEGER DEFAULT 0,
    favorites_count INTEGER DEFAULT 0,
    
    CONSTRAINT chk_source_type CHECK (source_type IN ('course', 'demo', 'pdf', 'video', 'article', 'app', 'community')),
    CONSTRAINT chk_difficulty CHECK (difficulty IN ('beginner', 'intermediate', 'advanced') OR difficulty IS NULL),
    CONSTRAINT chk_duration CHECK (duration >= 0 OR duration IS NULL)
);

CREATE INDEX idx_resources_source_type ON resources(source_type);
CREATE INDEX idx_resources_source_name ON resources(source_name);
CREATE INDEX idx_resources_fiori_app_id ON resources(fiori_app_id) WHERE fiori_app_id IS NOT NULL;
CREATE INDEX idx_resources_t_code ON resources(t_code) WHERE t_code IS NOT NULL;
CREATE INDEX idx_resources_language ON resources(language);
CREATE INDEX idx_resources_difficulty ON resources(difficulty);
CREATE INDEX idx_resources_is_active ON resources(is_active);
CREATE INDEX idx_resources_created_at ON resources(created_at DESC);
CREATE INDEX idx_resources_views_count ON resources(views_count DESC);

-- Full-text search index
CREATE INDEX idx_resources_title_search ON resources USING gin(to_tsvector('english', title));
CREATE INDEX idx_resources_description_search ON resources USING gin(to_tsvector('english', description));

COMMENT ON TABLE resources IS 'Aggregated SAP learning resources from external sources';
COMMENT ON COLUMN resources.source_type IS 'Type: course, demo, pdf, video, article, app, community';
COMMENT ON COLUMN resources.duration IS 'Duration in minutes for videos/courses';
```

#### 3.2.2 modules
```sql
CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    parent_id UUID REFERENCES modules(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_modules_code ON modules(code);
CREATE INDEX idx_modules_parent_id ON modules(parent_id);
CREATE INDEX idx_modules_sort_order ON modules(sort_order);
CREATE INDEX idx_modules_is_active ON modules(is_active);

COMMENT ON TABLE modules IS 'SAP modules (FI, CO, MM, SD, PP, etc.)';
COMMENT ON COLUMN modules.parent_id IS 'For sub-modules, references parent module';
```

#### 3.2.3 processes
```sql
CREATE TABLE processes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_processes_code ON processes(code);
CREATE INDEX idx_processes_sort_order ON processes(sort_order);
CREATE INDEX idx_processes_is_active ON processes(is_active);

COMMENT ON TABLE processes IS 'Business processes (P2P, O2C, R2R, etc.)';
```

#### 3.2.4 roles
```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    icon VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_roles_code ON roles(code);
CREATE INDEX idx_roles_category ON roles(category);
CREATE INDEX idx_roles_sort_order ON roles(sort_order);
CREATE INDEX idx_roles_is_active ON roles(is_active);

COMMENT ON TABLE roles IS 'SAP user roles (AP Clerk, MM Buyer, etc.)';
COMMENT ON COLUMN roles.category IS 'Role category (Finance, MM, SD, Technical, etc.)';
```

#### 3.2.5 tags
```sql
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tags_slug ON tags(slug);
CREATE INDEX idx_tags_type ON tags(type);

COMMENT ON TABLE tags IS 'Flexible tagging system for resources';
```

### 3.3 Resource Relationships

#### 3.3.1 resource_modules
```sql
CREATE TABLE resource_modules (
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (resource_id, module_id)
);

CREATE INDEX idx_resource_modules_resource_id ON resource_modules(resource_id);
CREATE INDEX idx_resource_modules_module_id ON resource_modules(module_id);

COMMENT ON TABLE resource_modules IS 'Many-to-many relationship between resources and modules';
```

#### 3.3.2 resource_processes
```sql
CREATE TABLE resource_processes (
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
    step_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (resource_id, process_id)
);

CREATE INDEX idx_resource_processes_resource_id ON resource_processes(resource_id);
CREATE INDEX idx_resource_processes_process_id ON resource_processes(process_id);
CREATE INDEX idx_resource_processes_step_number ON resource_processes(step_number);

COMMENT ON TABLE resource_processes IS 'Many-to-many relationship between resources and processes';
COMMENT ON COLUMN resource_processes.step_number IS 'Optional step number in process flow';
```

#### 3.3.3 resource_roles
```sql
CREATE TABLE resource_roles (
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    relevance_score INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (resource_id, role_id),
    CONSTRAINT chk_relevance_score CHECK (relevance_score >= 0 AND relevance_score <= 100)
);

CREATE INDEX idx_resource_roles_resource_id ON resource_roles(resource_id);
CREATE INDEX idx_resource_roles_role_id ON resource_roles(role_id);
CREATE INDEX idx_resource_roles_relevance_score ON resource_roles(relevance_score DESC);

COMMENT ON TABLE resource_roles IS 'Many-to-many relationship between resources and roles';
COMMENT ON COLUMN resource_roles.relevance_score IS 'Relevance score 0-100 for ranking';
```

#### 3.3.4 resource_tags
```sql
CREATE TABLE resource_tags (
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (resource_id, tag_id)
);

CREATE INDEX idx_resource_tags_resource_id ON resource_tags(resource_id);
CREATE INDEX idx_resource_tags_tag_id ON resource_tags(tag_id);

COMMENT ON TABLE resource_tags IS 'Many-to-many relationship between resources and tags';
```

### 3.4 Personalization

#### 3.4.1 favorites
```sql
CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    folder_name VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, resource_id)
);

CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_resource_id ON favorites(resource_id);
CREATE INDEX idx_favorites_folder_name ON favorites(folder_name) WHERE folder_name IS NOT NULL;
CREATE INDEX idx_favorites_created_at ON favorites(created_at DESC);

COMMENT ON TABLE favorites IS 'User favorites (bookmarked resources)';
COMMENT ON COLUMN favorites.folder_name IS 'Optional folder organization (Premium feature)';
```

#### 3.4.2 playlists
```sql
CREATE TABLE playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    visibility VARCHAR(50) NOT NULL DEFAULT 'private',
    share_token VARCHAR(100) UNIQUE,
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_visibility CHECK (visibility IN ('private', 'public', 'organization'))
);

CREATE INDEX idx_playlists_user_id ON playlists(user_id);
CREATE INDEX idx_playlists_visibility ON playlists(visibility);
CREATE INDEX idx_playlists_share_token ON playlists(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_playlists_created_at ON playlists(created_at DESC);

COMMENT ON TABLE playlists IS 'User-created learning playlists';
COMMENT ON COLUMN playlists.share_token IS 'Unique token for public sharing';
```

#### 3.4.3 playlist_items
```sql
CREATE TABLE playlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(playlist_id, resource_id)
);

CREATE INDEX idx_playlist_items_playlist_id ON playlist_items(playlist_id);
CREATE INDEX idx_playlist_items_resource_id ON playlist_items(resource_id);
CREATE INDEX idx_playlist_items_sort_order ON playlist_items(sort_order);

COMMENT ON TABLE playlist_items IS 'Items within playlists';
```

#### 3.4.4 notes
```sql
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_resource_id ON notes(resource_id);
CREATE INDEX idx_notes_created_at ON notes(created_at DESC);

-- Full-text search on notes
CREATE INDEX idx_notes_content_search ON notes USING gin(to_tsvector('english', content));

COMMENT ON TABLE notes IS 'User personal notes on resources';
```

#### 3.4.5 history
```sql
CREATE TABLE history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    duration INTEGER
);

CREATE INDEX idx_history_user_id ON history(user_id);
CREATE INDEX idx_history_resource_id ON history(resource_id);
CREATE INDEX idx_history_viewed_at ON history(viewed_at DESC);

COMMENT ON TABLE history IS 'User learning history (view tracking)';
COMMENT ON COLUMN history.duration IS 'Time spent viewing (seconds)';
```

#### 3.4.6 user_preferences
```sql
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(10) DEFAULT 'en',
    theme VARCHAR(50) DEFAULT 'light',
    primary_role_id UUID REFERENCES roles(id),
    track_history BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_language CHECK (language IN ('en', 'hi', 'ta', 'te')),
    CONSTRAINT chk_theme CHECK (theme IN ('light', 'dark', 'auto'))
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

COMMENT ON TABLE user_preferences IS 'User preferences and settings';
```

### 3.5 Crawlers & System

#### 3.5.1 crawlers
```sql
CREATE TABLE crawlers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL UNIQUE,
    source_url VARCHAR(2000) NOT NULL,
    crawler_type VARCHAR(100) NOT NULL,
    schedule VARCHAR(100) DEFAULT '0 0 * * 0',
    rate_limit INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMP WITH TIME ZONE,
    last_status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_last_status CHECK (last_status IN ('success', 'failed', 'running', 'pending') OR last_status IS NULL)
);

CREATE INDEX idx_crawlers_is_active ON crawlers(is_active);
CREATE INDEX idx_crawlers_last_run_at ON crawlers(last_run_at);

COMMENT ON TABLE crawlers IS 'Content crawler configurations';
COMMENT ON COLUMN crawlers.schedule IS 'Cron expression for scheduling';
COMMENT ON COLUMN crawlers.rate_limit IS 'Requests per second limit';
```

#### 3.5.2 crawler_logs
```sql
CREATE TABLE crawler_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crawler_id UUID NOT NULL REFERENCES crawlers(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    items_processed INTEGER DEFAULT 0,
    items_added INTEGER DEFAULT 0,
    items_updated INTEGER DEFAULT 0,
    errors JSONB,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT chk_status CHECK (status IN ('success', 'failed', 'running'))
);

CREATE INDEX idx_crawler_logs_crawler_id ON crawler_logs(crawler_id);
CREATE INDEX idx_crawler_logs_status ON crawler_logs(status);
CREATE INDEX idx_crawler_logs_started_at ON crawler_logs(started_at DESC);

COMMENT ON TABLE crawler_logs IS 'Crawler execution logs';
```

### 3.6 Analytics

#### 3.6.1 analytics_events
```sql
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at DESC);

-- Partition by month for performance
CREATE INDEX idx_analytics_events_created_at_month ON analytics_events(DATE_TRUNC('month', created_at));

COMMENT ON TABLE analytics_events IS 'User activity and analytics events';
COMMENT ON COLUMN analytics_events.event_data IS 'JSON data specific to event type';
```

---

## 4. Indexes

### 4.1 Performance Indexes

```sql
-- Composite indexes for common queries

-- Search by module and type
CREATE INDEX idx_resources_module_type ON resource_modules(module_id, resource_id);

-- Search by role and type
CREATE INDEX idx_resources_role_relevance ON resource_roles(role_id, relevance_score DESC);

-- User's favorites with resource details
CREATE INDEX idx_favorites_user_created ON favorites(user_id, created_at DESC);

-- User's playlists
CREATE INDEX idx_playlists_user_created ON playlists(user_id, created_at DESC);

-- User's history chronological
CREATE INDEX idx_history_user_viewed ON history(user_id, viewed_at DESC);

-- Analytics by user and date
CREATE INDEX idx_analytics_user_date ON analytics_events(user_id, created_at DESC) WHERE user_id IS NOT NULL;
```

### 4.2 Unique Constraints

```sql
-- Ensure unique combinations
ALTER TABLE favorites ADD CONSTRAINT uq_favorites_user_resource UNIQUE (user_id, resource_id);
ALTER TABLE playlist_items ADD CONSTRAINT uq_playlist_items_playlist_resource UNIQUE (playlist_id, resource_id);
```

---

## 5. Constraints

### 5.1 Foreign Key Constraints

All foreign key constraints are defined with appropriate `ON DELETE` actions:
- `CASCADE`: Child records deleted when parent deleted (favorites, playlists, etc.)
- `SET NULL`: Foreign key set to NULL (analytics_events.user_id)
- `RESTRICT`: Prevent deletion if children exist (default for reference tables)

### 5.2 Check Constraints

Implemented for data integrity:
- Enum-like columns (role, status, source_type, etc.)
- Value ranges (relevance_score 0-100, duration >= 0)
- Format validation (email regex)

---

## 6. Migrations

### 6.1 Migration Strategy

Using TypeORM migrations:

```typescript
// Example migration file structure
export class InitialSchema1700000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create tables
    }
    
    public async down(queryRunner: QueryRunner): Promise<void> {
        // Rollback tables
    }
}
```

### 6.2 Migration Order

1. **001_initial_schema.ts**: Core tables (users, resources, modules, processes, roles)
2. **002_resource_relationships.ts**: Junction tables
3. **003_personalization.ts**: Favorites, playlists, notes, history
4. **004_crawlers.ts**: Crawler tables
5. **005_analytics.ts**: Analytics tables
6. **006_indexes.ts**: Performance indexes
7. **007_seed_data.ts**: Initial reference data

### 6.3 Seed Data

```sql
-- Seed SAP Modules
INSERT INTO modules (code, name, description, sort_order) VALUES
('FI', 'Financial Accounting', 'General ledger, accounts payable/receivable', 1),
('CO', 'Controlling', 'Cost center accounting, internal orders', 2),
('MM', 'Materials Management', 'Procurement, inventory management', 3),
('SD', 'Sales & Distribution', 'Sales orders, deliveries, billing', 4),
('PP', 'Production Planning', 'Manufacturing, capacity planning', 5),
('QM', 'Quality Management', 'Quality planning, inspection', 6),
('PM', 'Plant Maintenance', 'Equipment maintenance', 7),
('WM', 'Warehouse Management', 'Warehouse operations', 8),
('EWM', 'Extended Warehouse Management', 'Advanced warehousing', 9),
('HCM', 'Human Capital Management', 'HR, payroll, recruitment', 10),
('BASIS', 'SAP Basis', 'System administration', 11),
('ABAP', 'ABAP Development', 'Programming, customization', 12),
('FIORI', 'SAP Fiori', 'Modern UX, UI5 development', 13);

-- Seed Business Processes
INSERT INTO processes (code, name, description, sort_order) VALUES
('P2P', 'Procure-to-Pay', 'End-to-end procurement process', 1),
('O2C', 'Order-to-Cash', 'Sales order to payment receipt', 2),
('R2R', 'Record-to-Report', 'Financial close and reporting', 3),
('MTS', 'Make-to-Stock', 'Production to inventory', 4),
('HTR', 'Hire-to-Retire', 'Employee lifecycle management', 5);

-- Seed Roles (sample)
INSERT INTO roles (code, name, category, sort_order) VALUES
('AP_CLERK', 'Accounts Payable Clerk', 'Finance', 1),
('AR_CLERK', 'Accounts Receivable Clerk', 'Finance', 2),
('GL_ACCOUNTANT', 'General Ledger Accountant', 'Finance', 3),
('MM_BUYER', 'Materials Management Buyer', 'Logistics', 4),
('SD_SPECIALIST', 'Sales & Distribution Specialist', 'Sales', 5),
('PP_PLANNER', 'Production Planner', 'Manufacturing', 6),
('WM_OPERATOR', 'Warehouse Operator', 'Logistics', 7),
('ABAP_DEV', 'ABAP Developer', 'Technical', 8),
('FIORI_DEV', 'Fiori Developer', 'Technical', 9),
('BASIS_ADMIN', 'Basis Administrator', 'Technical', 10);
```

---

## 7. Database Maintenance

### 7.1 Backup Strategy

```sql
-- Daily full backup
pg_dump ulhn_db > backup_$(date +%Y%m%d).sql

-- Hourly incremental using WAL archiving
archive_command = 'test ! -f /archive/%f && cp %p /archive/%f'
```

### 7.2 Vacuum & Analyze

```sql
-- Weekly vacuum
VACUUM ANALYZE;

-- Monitor table bloat
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 7.3 Index Maintenance

```sql
-- Rebuild indexes monthly
REINDEX DATABASE ulhn_db;

-- Check for unused indexes
SELECT schemaname, tablename, indexname
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND schemaname = 'public';
```

---

**Document Control:**
- **Created**: November 16, 2025
- **Last Modified**: November 16, 2025
- **Version**: 1.0
- **Database Version**: PostgreSQL 16+
