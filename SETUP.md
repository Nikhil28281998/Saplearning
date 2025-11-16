# SAP ULHN - Setup Guide

## 🚀 Quick Start (Automated)

### Windows (PowerShell)
```powershell
# Install dependencies
pnpm install

# Start infrastructure (Docker)
docker-compose up -d

# Wait for services to be ready (30 seconds)
Start-Sleep -Seconds 30

# Copy environment files
Copy-Item apps\backend\.env.example apps\backend\.env
Copy-Item apps\frontend\.env.example apps\frontend\.env.local

# Build shared packages
cd packages\types ; pnpm build ; cd ..\..

# Run database migrations (when implemented)
# cd apps\backend ; pnpm migration:run ; cd ..\..

Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Update environment variables in apps/backend/.env" -ForegroundColor Yellow
Write-Host "2. Update environment variables in apps/frontend/.env.local" -ForegroundColor Yellow
Write-Host "3. Start backend: cd apps/backend && pnpm dev" -ForegroundColor Yellow
Write-Host "4. Start frontend: cd apps/frontend && pnpm dev" -ForegroundColor Yellow
```

### Linux/Mac (Bash)
```bash
#!/bin/bash

# Install dependencies
pnpm install

# Start infrastructure (Docker)
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Copy environment files
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local

# Build shared packages
cd packages/types && pnpm build && cd ../..

# Run database migrations (when implemented)
# cd apps/backend && pnpm migration:run && cd ../..

echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update environment variables in apps/backend/.env"
echo "2. Update environment variables in apps/frontend/.env.local"
echo "3. Start backend: cd apps/backend && pnpm dev"
echo "4. Start frontend: cd apps/frontend && pnpm dev"
```

---

## 📋 Manual Setup

### Step 1: Prerequisites

Ensure you have the following installed:

- **Node.js 20+ LTS**: [Download](https://nodejs.org/)
- **pnpm 8+**: `npm install -g pnpm`
- **Docker Desktop**: [Download](https://www.docker.com/products/docker-desktop/)
- **Git**: [Download](https://git-scm.com/)

Verify installations:
```powershell
node --version    # Should be v20.x.x or higher
pnpm --version    # Should be 8.x.x or higher
docker --version  # Should be 24.x.x or higher
```

### Step 2: Clone & Install

```powershell
# Clone repository (if not already done)
# git clone <repository-url>
# cd SAP

# Install all dependencies
pnpm install
```

This will install dependencies for:
- Root workspace
- Backend (NestJS)
- Frontend (Next.js)
- Shared types package

### Step 3: Start Infrastructure

```powershell
# Start Docker containers
docker-compose up -d

# Verify services are running
docker-compose ps
```

Services started:
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **Meilisearch**: localhost:7700
- **pgAdmin**: localhost:5050

Access pgAdmin:
1. Open: http://localhost:5050
2. Login: admin@ulhn.com / admin
3. Add server:
   - Host: postgres
   - Port: 5432
   - Database: ulhn_db
   - Username: ulhn_user
   - Password: ulhn_password

### Step 4: Configure Environment

#### Backend Configuration

```powershell
# Copy example environment file
Copy-Item apps\backend\.env.example apps\backend\.env

# Edit apps\backend\.env and update:
# - JWT_SECRET (generate a secure random string)
# - JWT_REFRESH_SECRET (generate a secure random string)
# - GOOGLE_CLIENT_ID (from Google Cloud Console)
# - GOOGLE_CLIENT_SECRET (from Google Cloud Console)
# - MICROSOFT_CLIENT_ID (from Azure Portal)
# - MICROSOFT_CLIENT_SECRET (from Azure Portal)
```

**Required Changes:**
```env
# Generate secrets with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-generated-secret-here
JWT_REFRESH_SECRET=your-generated-refresh-secret-here
```

**Optional (OAuth):**
- Google OAuth: https://console.cloud.google.com/
- Microsoft OAuth: https://portal.azure.com/

#### Frontend Configuration

```powershell
# Copy example environment file
Copy-Item apps\frontend\.env.example apps\frontend\.env.local

# Edit apps\frontend\.env.local
# Usually no changes needed for local development
```

### Step 5: Build Shared Packages

```powershell
# Build TypeScript types package
cd packages\types
pnpm build
cd ..\..
```

This creates the shared types that both backend and frontend use.

### Step 6: Database Setup

```powershell
# Navigate to backend
cd apps\backend

# Run migrations (creates all tables)
pnpm migration:run

# Optional: Seed initial data
# pnpm seed

cd ..\..
```

### Step 7: Start Applications

#### Option A: Run Both Simultaneously

**Terminal 1 - Backend:**
```powershell
cd apps\backend
pnpm dev
```
Backend will start on: http://localhost:4000

**Terminal 2 - Frontend:**
```powershell
cd apps\frontend
pnpm dev
```
Frontend will start on: http://localhost:3000

#### Option B: Use Turbo (from root)

```powershell
# Start both in parallel
pnpm dev
```

### Step 8: Verify Installation

Open your browser and check:

1. **Frontend**: http://localhost:3000
   - Should show the home page

2. **Backend API**: http://localhost:4000/api
   - Should return JSON status

3. **API Documentation**: http://localhost:4000/api/docs
   - Should show Swagger UI

4. **Backend Health**: http://localhost:4000/api/health
   - Should return health status

---

## 🔧 Development Workflow

### Starting Work

```powershell
# Pull latest changes
git pull

# Install any new dependencies
pnpm install

# Start infrastructure
docker-compose up -d

# Start development servers
pnpm dev
```

### Making Changes

```powershell
# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes...

# Run linting
pnpm lint

# Run tests
pnpm test

# Commit changes
git add .
git commit -m "feat: your feature description"

# Push changes
git push origin feature/your-feature-name
```

### Stopping Services

```powershell
# Stop development servers
# Ctrl+C in each terminal

# Stop Docker services
docker-compose down

# Stop Docker and remove volumes (clean slate)
docker-compose down -v
```

---

## 🐛 Troubleshooting

### Port Already in Use

```powershell
# Windows - Find and kill process
netstat -ano | findstr :4000
taskkill /PID <process-id> /F

# Or change port in .env
PORT=4001
```

### Docker Services Not Starting

```powershell
# Check Docker is running
docker ps

# Restart Docker Desktop
# Or restart services
docker-compose restart

# Check logs
docker-compose logs postgres
docker-compose logs redis
docker-compose logs meilisearch
```

### Database Connection Error

```powershell
# Ensure PostgreSQL is running
docker-compose ps postgres

# Check connection
docker-compose exec postgres psql -U ulhn_user -d ulhn_db

# Reset database
docker-compose down -v
docker-compose up -d postgres
# Wait 10 seconds, then run migrations
```

### Module Not Found Errors

```powershell
# Clean install
Remove-Item -Recurse -Force node_modules
Remove-Item pnpm-lock.yaml
pnpm install

# Rebuild types package
cd packages\types
Remove-Item -Recurse -Force dist
pnpm build
cd ..\..
```

### Frontend Won't Start

```powershell
# Clear Next.js cache
cd apps\frontend
Remove-Item -Recurse -Force .next
pnpm build
pnpm dev
```

### Backend Won't Start

```powershell
# Clear NestJS cache
cd apps\backend
Remove-Item -Recurse -Force dist
pnpm build
pnpm dev
```

---

## 📊 Useful Commands

### Database

```powershell
# Access PostgreSQL
docker-compose exec postgres psql -U ulhn_user -d ulhn_db

# Backup database
docker-compose exec postgres pg_dump -U ulhn_user ulhn_db > backup.sql

# Restore database
Get-Content backup.sql | docker-compose exec -T postgres psql -U ulhn_user ulhn_db

# Reset database
cd apps\backend
pnpm migration:revert
pnpm migration:run
```

### Docker

```powershell
# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f postgres

# Restart specific service
docker-compose restart postgres

# Stop all services
docker-compose down

# Remove volumes (clean slate)
docker-compose down -v
```

### Development

```powershell
# Run all tests
pnpm test

# Run specific app tests
cd apps\backend
pnpm test

# Run linting
pnpm lint

# Format code
pnpm format

# Build everything
pnpm build

# Type check
pnpm type-check
```

---

## 🚀 Next Steps After Setup

1. **Review Documentation**
   - Read `docs/BRD.md` for business requirements
   - Read `docs/FRD.md` for functional requirements
   - Read `docs/API.md` for API documentation
   - Read `docs/DATABASE.md` for database schema

2. **Explore the Code**
   - Backend: `apps/backend/src`
   - Frontend: `apps/frontend/src`
   - Shared types: `packages/types/src`

3. **Test the APIs**
   - Use Swagger UI: http://localhost:4000/api/docs
   - Test authentication endpoints
   - Test resource endpoints

4. **Start Building**
   - Implement remaining modules
   - Add new features
   - Write tests

---

## 📞 Need Help?

- Check `README.md` in project root
- Check `apps/backend/README.md` for backend help
- Check `apps/frontend/README.md` for frontend help
- Review documentation in `docs/` folder

---

**Happy Coding! 🎉**
