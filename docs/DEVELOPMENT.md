# Development Setup Guide
## SAP Unified Learning Hub Navigator (ULHN)

**Version:** 1.0  
**Date:** November 16, 2025  

---

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Initial Setup](#2-initial-setup)
3. [Environment Configuration](#3-environment-configuration)
4. [Database Setup](#4-database-setup)
5. [Running the Application](#5-running-the-application)
6. [Development Workflow](#6-development-workflow)
7. [Testing](#7-testing)
8. [Deployment](#8-deployment)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Prerequisites

### Required Software

| Software | Version | Purpose | Installation |
|----------|---------|---------|--------------|
| **Node.js** | >= 20.x LTS | JavaScript runtime | [nodejs.org](https://nodejs.org) |
| **pnpm** | >= 8.x | Package manager | `npm install -g pnpm` |
| **Docker** | >= 24.x | Containerization | [docker.com](https://docker.com) |
| **Docker Compose** | >= 2.x | Multi-container orchestration | Included with Docker Desktop |
| **Git** | >= 2.x | Version control | [git-scm.com](https://git-scm.com) |
| **PostgreSQL** | >= 16.x | Database (optional, can use Docker) | [postgresql.org](https://postgresql.org) |
| **Redis** | >= 7.x | Cache (optional, can use Docker) | [redis.io](https://redis.io) |

### Optional Tools

- **VSCode** - Recommended IDE with extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
  - Docker
  - PostgreSQL
- **Postman** or **Insomnia** - API testing
- **pgAdmin** or **TablePlus** - Database management
- **Redis Commander** - Redis management

---

## 2. Initial Setup

### 2.1 Clone Repository

```bash
git clone <repository-url>
cd SAP
```

### 2.2 Install Dependencies

```bash
# Install all dependencies for monorepo
pnpm install
```

This will install dependencies for:
- Root workspace
- Backend (NestJS)
- Frontend (Next.js)
- Shared packages

### 2.3 Verify Installation

```bash
# Check Node version
node --version  # Should be >= 20.x

# Check pnpm version
pnpm --version  # Should be >= 8.x

# Check Docker
docker --version
docker-compose --version
```

---

## 3. Environment Configuration

### 3.1 Backend Environment

Create `apps/backend/.env` file:

```bash
cd apps/backend
cp .env.example .env
```

**apps/backend/.env.example:**
```env
# Application
NODE_ENV=development
PORT=4000
API_PREFIX=api/v1

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=ulhn_db
DATABASE_USER=ulhn_user
DATABASE_PASSWORD=ulhn_password
DATABASE_SSL=false
DATABASE_SYNCHRONIZE=false  # Never true in production

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Meilisearch
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=masterKey123456789

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_REFRESH_EXPIRES_IN=7d

# OAuth - Google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:4000/api/v1/auth/google/callback

# OAuth - Microsoft
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_CALLBACK_URL=http://localhost:4000/api/v1/auth/microsoft/callback

# Email (AWS SES / SendGrid)
EMAIL_FROM=noreply@ulhn.com
EMAIL_PROVIDER=sendgrid  # or 'ses'
SENDGRID_API_KEY=your-sendgrid-api-key
# OR for AWS SES
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key

# Frontend URL (for CORS and email links)
FRONTEND_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# Crawlers
CRAWLER_RATE_LIMIT=1  # requests per second
CRAWLER_USER_AGENT=ULHN-Bot/1.0

# Logging
LOG_LEVEL=debug  # error, warn, info, debug
LOG_FILE_PATH=logs/app.log

# Sentry (Error Tracking)
SENTRY_DSN=your-sentry-dsn

# AWS (for S3, CloudWatch, etc.)
AWS_REGION=us-east-1
AWS_S3_BUCKET=ulhn-assets
```

### 3.2 Frontend Environment

Create `apps/frontend/.env.local` file:

```bash
cd apps/frontend
cp .env.example .env.local
```

**apps/frontend/.env.example:**
```env
# API
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_API_TIMEOUT=30000

# Application
NEXT_PUBLIC_APP_NAME=SAP ULHN
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=your-microsoft-client-id

# Analytics
NEXT_PUBLIC_GA_TRACKING_ID=G-XXXXXXXXXX

# Sentry
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_SOCIAL_SHARE=true

# Environment
NEXT_PUBLIC_ENV=development
```

---

## 4. Database Setup

### 4.1 Using Docker (Recommended)

```bash
# Start all infrastructure services
docker-compose up -d

# Verify services are running
docker-compose ps

# Expected output:
# - ulhn-postgres (port 5432)
# - ulhn-redis (port 6379)
# - ulhn-meilisearch (port 7700)
# - ulhn-pgadmin (port 5050)
```

### 4.2 Manual Database Setup (Optional)

If not using Docker:

```bash
# Install PostgreSQL
# Create database and user
psql -U postgres

CREATE DATABASE ulhn_db;
CREATE USER ulhn_user WITH ENCRYPTED PASSWORD 'ulhn_password';
GRANT ALL PRIVILEGES ON DATABASE ulhn_db TO ulhn_user;
\q
```

### 4.3 Run Migrations

```bash
cd apps/backend

# Generate migration (if needed)
pnpm migration:generate -- -n InitialSchema

# Run migrations
pnpm migration:run

# Seed database
pnpm seed
```

### 4.4 Verify Database

```bash
# Connect to database
psql -U ulhn_user -d ulhn_db -h localhost

# List tables
\dt

# Expected tables:
# users, resources, modules, processes, roles, favorites, playlists, etc.
```

### 4.5 Access pgAdmin (Optional)

If using Docker:

1. Open http://localhost:5050
2. Login:
   - Email: admin@ulhn.com
   - Password: admin123
3. Add server:
   - Host: ulhn-postgres (or localhost if not using Docker network)
   - Port: 5432
   - Database: ulhn_db
   - Username: ulhn_user
   - Password: ulhn_password

---

## 5. Running the Application

### 5.1 Development Mode (All Services)

```bash
# From root directory
pnpm dev
```

This will start:
- Backend API: http://localhost:4000
- Frontend: http://localhost:3000
- API Docs (Swagger): http://localhost:4000/api/docs

### 5.2 Individual Services

#### Backend Only
```bash
cd apps/backend
pnpm dev
```

#### Frontend Only
```bash
cd apps/frontend
pnpm dev
```

### 5.3 Production Build

```bash
# Build all
pnpm build

# Run production
pnpm start
```

---

## 6. Development Workflow

### 6.1 Code Style & Linting

```bash
# Lint all code
pnpm lint

# Fix linting issues
pnpm lint --fix

# Format code
pnpm format

# Type check
pnpm type-check
```

### 6.2 Git Hooks

Husky is configured to run on:
- **pre-commit**: Lint and format staged files
- **pre-push**: Run type checking

### 6.3 Creating New Features

#### Backend Module

```bash
cd apps/backend

# Generate new module
nest g module features/my-feature
nest g controller features/my-feature
nest g service features/my-feature

# Create entity
nest g class features/my-feature/entities/my-feature.entity --no-spec

# Create DTOs
nest g class features/my-feature/dto/create-my-feature.dto --no-spec
nest g class features/my-feature/dto/update-my-feature.dto --no-spec
```

#### Frontend Component

```bash
cd apps/frontend/src/components

# Create component directory
mkdir my-component

# Create component files
touch my-component/index.tsx
touch my-component/styles.module.css
```

### 6.4 Database Changes

```bash
cd apps/backend

# Create migration
pnpm migration:create -- -n AddNewTable

# Edit migration file in src/database/migrations/

# Run migration
pnpm migration:run

# Rollback if needed
pnpm migration:revert
```

---

## 7. Testing

### 7.1 Backend Tests

```bash
cd apps/backend

# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:cov

# Run specific test file
pnpm test src/modules/auth/auth.service.spec.ts

# Run e2e tests
pnpm test:e2e
```

### 7.2 Frontend Tests

```bash
cd apps/frontend

# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:cov

# Run e2e tests (Playwright)
pnpm test:e2e

# Open Playwright UI
pnpm test:e2e:ui
```

### 7.3 Test Structure

**Backend Test Example:**
```typescript
// auth.service.spec.ts
describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      // Test implementation
    });
  });
});
```

**Frontend Test Example:**
```typescript
// Button.test.tsx
import { render, screen, fireEvent } from '@testing/library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

---

## 8. Deployment

### 8.1 Build for Production

```bash
# Build all services
pnpm build

# This creates:
# - apps/backend/dist/
# - apps/frontend/.next/
```

### 8.2 Docker Build

```bash
# Build backend image
docker build -t ulhn-backend:latest -f apps/backend/Dockerfile .

# Build frontend image
docker build -t ulhn-frontend:latest -f apps/frontend/Dockerfile .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### 8.3 Environment Variables (Production)

Ensure all production environment variables are set:
- Change all secrets (JWT, database passwords, etc.)
- Use strong passwords
- Enable SSL/TLS for database
- Set NODE_ENV=production
- Configure proper CORS origins
- Set up proper logging
- Configure Sentry for error tracking

### 8.4 Health Checks

**Backend Health Check:**
```bash
curl http://localhost:4000/api/v1/health

# Expected response:
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" },
    "meilisearch": { "status": "up" }
  }
}
```

### 8.5 Deployment Checklist

- [ ] All environment variables set
- [ ] Database migrations run
- [ ] Database seeded (if needed)
- [ ] SSL certificates configured
- [ ] CDN configured for frontend assets
- [ ] Monitoring and logging set up
- [ ] Backup strategy implemented
- [ ] Load balancers configured
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] CORS properly configured
- [ ] Error tracking (Sentry) enabled

---

## 9. Troubleshooting

### 9.1 Common Issues

#### Port Already in Use

```bash
# Find process using port
# Windows PowerShell:
netstat -ano | findstr :4000

# Kill process (replace PID)
taskkill /PID <PID> /F

# Or change port in .env
PORT=4001
```

#### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker-compose ps

# Check connection
psql -U ulhn_user -d ulhn_db -h localhost

# If using Docker, ensure network is correct
docker network ls
```

#### Module Not Found

```bash
# Clear node_modules and reinstall
rm -rf node_modules
pnpm install

# Clear pnpm cache
pnpm store prune
```

#### Type Errors After Update

```bash
# Rebuild TypeScript
pnpm build

# Or restart TypeScript server in VSCode
# CMD/CTRL + Shift + P -> TypeScript: Restart TS Server
```

### 9.2 Debugging

#### Backend Debugging (VSCode)

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["dev"],
      "cwd": "${workspaceFolder}/apps/backend",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

#### Frontend Debugging

- Chrome DevTools
- React Developer Tools extension
- Redux DevTools (if using Redux)

#### Database Queries

Enable query logging in `apps/backend/src/config/database.config.ts`:
```typescript
logging: process.env.NODE_ENV === 'development' ? 'all' : ['error'],
```

### 9.3 Performance Issues

#### Slow API Responses

```bash
# Check database query performance
# In psql:
EXPLAIN ANALYZE SELECT * FROM resources WHERE ...;

# Add indexes if needed
CREATE INDEX idx_resources_title ON resources(title);
```

#### High Memory Usage

```bash
# Check Node.js memory
node --max-old-space-size=4096 apps/backend/dist/main.js

# Monitor with PM2
pm2 start ecosystem.config.js
pm2 monit
```

### 9.4 Getting Help

- Check documentation: `/docs` folder
- Search issues: GitHub Issues
- API documentation: http://localhost:4000/api/docs
- Database schema: `/docs/DATABASE.md`
- Contact team: [team email]

---

## Quick Reference

### Common Commands

```bash
# Development
pnpm dev                    # Start all services
pnpm dev:backend            # Backend only
pnpm dev:frontend           # Frontend only

# Building
pnpm build                  # Build all
pnpm build:backend          # Backend only
pnpm build:frontend         # Frontend only

# Testing
pnpm test                   # Run all tests
pnpm test:watch             # Watch mode
pnpm test:cov               # With coverage

# Linting & Formatting
pnpm lint                   # Lint code
pnpm lint:fix               # Fix issues
pnpm format                 # Format code

# Database
pnpm migration:generate     # Create migration
pnpm migration:run          # Run migrations
pnpm migration:revert       # Rollback
pnpm seed                   # Seed database

# Docker
docker-compose up -d        # Start services
docker-compose down         # Stop services
docker-compose logs -f      # View logs
docker-compose ps           # List services
```

### Useful URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **API Docs (Swagger)**: http://localhost:4000/api/docs
- **pgAdmin**: http://localhost:5050
- **Meilisearch**: http://localhost:7700

---

## Next Steps

After setup is complete:

1. **Explore the codebase**:
   - Read `/docs/BRD.md` for business context
   - Read `/docs/FRD.md` for features
   - Read `/docs/SRS.md` for technical architecture

2. **Set up your IDE**:
   - Install recommended extensions
   - Configure ESLint and Prettier
   - Set up debugging

3. **Make your first contribution**:
   - Pick an issue from the backlog
   - Create a feature branch
   - Write tests
   - Submit a pull request

4. **Learn the stack**:
   - NestJS documentation: https://docs.nestjs.com
   - Next.js documentation: https://nextjs.org/docs
   - PostgreSQL documentation: https://www.postgresql.org/docs
   - TypeORM documentation: https://typeorm.io

---

**Last Updated**: November 16, 2025  
**Version**: 1.0  
**Maintained By**: ULHN Development Team
