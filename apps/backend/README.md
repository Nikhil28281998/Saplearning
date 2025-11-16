# SAP ULHN - Backend API

NestJS-based REST API for the SAP Unified Learning Hub Navigator.

## 🚀 Features

- **Authentication**: JWT + OAuth (Google, Microsoft)
- **User Management**: Registration, login, profile management
- **Content Management**: Resources, modules, processes, roles
- **Search**: Meilisearch integration with full-text search
- **Personalization**: Favorites, playlists, notes, history
- **Admin Panel**: User management, content moderation, analytics
- **Rate Limiting**: Protect API from abuse
- **Swagger Documentation**: Auto-generated API docs

## 📋 Prerequisites

- Node.js 20+ LTS
- pnpm 8+
- PostgreSQL 16+
- Redis 7+
- Meilisearch 1.5+

## 🛠️ Installation

```bash
# From project root
pnpm install

# Or from backend directory
cd apps/backend
pnpm install
```

## ⚙️ Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update environment variables in `.env`:
   - Database credentials
   - JWT secrets
   - OAuth credentials (Google, Microsoft)
   - Redis connection
   - Meilisearch connection

## 🗄️ Database Setup

### Using Docker (Recommended)
```bash
# From project root
docker-compose up -d postgres redis meilisearch
```

### Manual Setup
```bash
# Create database
createdb ulhn_db

# Run migrations
pnpm migration:run

# Seed data (optional)
pnpm seed
```

## 🚦 Running the Application

### Development
```bash
pnpm dev
```

### Production
```bash
pnpm build
pnpm start:prod
```

### Watch Mode
```bash
pnpm start:dev
```

## 📚 API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:4000/api/docs
- **Health Check**: http://localhost:4000/api/health

## 🧪 Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Test coverage
pnpm test:cov
```

## 📂 Project Structure

```
src/
├── main.ts                 # Application entry point
├── app.module.ts          # Root module
├── config/                # Configuration files
├── database/              # Database setup
│   ├── entities/         # TypeORM entities
│   └── migrations/       # Database migrations
├── modules/              # Feature modules
│   ├── auth/            # Authentication
│   ├── users/           # User management
│   ├── resources/       # Resource management
│   ├── search/          # Search functionality
│   ├── favorites/       # User favorites
│   ├── playlists/       # User playlists
│   ├── notes/           # User notes
│   ├── history/         # View history
│   ├── modules/         # SAP modules
│   ├── processes/       # Business processes
│   ├── roles/           # SAP roles
│   ├── admin/           # Admin panel
│   └── analytics/       # Analytics tracking
├── common/              # Shared utilities
│   ├── decorators/      # Custom decorators
│   ├── filters/         # Exception filters
│   ├── guards/          # Auth guards
│   ├── interceptors/    # Request/response interceptors
│   └── pipes/           # Validation pipes
└── types/               # TypeScript types
```

## 🔐 Authentication

### JWT Tokens
- Access Token: 15 minutes
- Refresh Token: 7 days
- Stored in HTTP-only cookies

### OAuth Providers
- Google OAuth 2.0
- Microsoft OAuth 2.0

## 🛡️ Security

- Helmet.js for security headers
- CORS configuration
- Rate limiting (100 req/min)
- Input validation with class-validator
- SQL injection protection (TypeORM)
- XSS protection

## 📊 Monitoring

- Winston logger
- Request/response logging
- Error tracking
- Performance metrics

## 🔄 Database Migrations

```bash
# Create migration
pnpm migration:create src/database/migrations/MigrationName

# Generate migration from entities
pnpm migration:generate src/database/migrations/MigrationName

# Run migrations
pnpm migration:run

# Revert migration
pnpm migration:revert
```

## 🚢 Deployment

### Docker
```bash
docker build -t ulhn-backend .
docker run -p 4000:4000 ulhn-backend
```

### Manual
```bash
pnpm build
NODE_ENV=production pnpm start:prod
```

## 📝 Environment Variables

See `.env.example` for all available environment variables.

Key variables:
- `NODE_ENV`: Environment (development, production)
- `PORT`: API port (default: 4000)
- `DB_*`: Database configuration
- `JWT_SECRET`: JWT signing secret
- `GOOGLE_*`: Google OAuth credentials
- `MICROSOFT_*`: Microsoft OAuth credentials
- `REDIS_*`: Redis configuration
- `MEILISEARCH_*`: Meilisearch configuration

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Add tests
4. Submit a pull request

## 📄 License

MIT
