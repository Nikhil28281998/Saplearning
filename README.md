# SAP Unified Learning Hub Navigator (ULHN)

## 🎯 Overview

A central web platform that aggregates all publicly available SAP learning resources into one searchable, categorized, role-based, and user-personalized workspace.

**Core Value Proposition**: One platform to access all SAP learning content with personalized workspaces, intelligent search, and role-based dashboards.

## 🚀 Key Features

### 1. Aggregated Learning Hub
- SAP Learning Courses
- SAP Enable Now simulations
- SAP Help Portal PDFs & Guides
- SAP Fiori App Reference Library
- SAP Community pages
- SAP YouTube Playlists
- SAP Developer Tutorials

### 2. Unified Global Search Engine
- Sub-second search across all content
- Search by Fiori app ID, T-code, role, module, process
- Intelligent ranking and grouping

### 3. Role-Based Dashboards
- Curated learning paths for specific roles
- AP Specialist, MM Buyer, SD Billing, PP Planner, etc.
- All relevant content in one dashboard

### 4. Module-Based Learning Spaces
- FI/CO, MM, SD, PP, EWM, Basis, ABAP, Analytics
- Organized portals for each SAP module

### 5. Business Process Navigator
- P2P, O2C, R2R, MTS, Hire-to-Retire
- Step-by-step process flows with linked resources

### 6. Personalized Workspace
- ⭐ Favorites & Bookmarks
- 📝 Personal Notes
- 📚 Custom Learning Playlists
- 📊 Progress Tracking
- 🕒 Learning History

### 7. Admin Panel
- Content management
- User management
- Analytics dashboard
- Link health monitoring
- Automated crawler management

### 8. Automatic Content Updaters
- Weekly metadata crawlers
- Link validation
- Automatic updates from SAP sources

### 9. Security & Compliance
- Deep-link compliance (no content hosting)
- GDPR compliant
- JWT authentication
- RBAC authorization
- Rate limiting

## 🏗 Technical Architecture

### Frontend
- **Framework**: Next.js 14+ with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand / React Context
- **UI Components**: Shadcn/ui
- **SEO**: Server-side rendering, meta tags, sitemaps

### Backend
- **Framework**: NestJS (Node.js + TypeScript)
- **Architecture**: Microservices-ready modular design
- **API**: RESTful + GraphQL (optional)
- **Authentication**: JWT + OAuth (Google, Microsoft)
- **Validation**: class-validator + class-transformer

### Database
- **Primary DB**: PostgreSQL (metadata, users, bookmarks, notes)
- **Search Engine**: Elasticsearch / Meilisearch
- **Cache**: Redis

### Infrastructure (AWS)
- **Compute**: ECS / EKS (Kubernetes)
- **Database**: RDS PostgreSQL
- **Search**: OpenSearch / Self-hosted Meilisearch
- **Storage**: S3
- **CDN**: CloudFront
- **Functions**: Lambda (crawlers)
- **Monitoring**: CloudWatch

### DevOps
- **CI/CD**: GitHub Actions / GitLab CI
- **Containerization**: Docker + Docker Compose
- **Orchestration**: Kubernetes
- **IaC**: Terraform / AWS CDK

## 📁 Project Structure

```
sap-ulhn/
├── apps/
│   ├── frontend/          # Next.js application
│   ├── backend/           # NestJS API
│   └── crawler/           # Content aggregation service
├── packages/
│   ├── types/             # Shared TypeScript types
│   ├── ui/                # Shared UI components
│   └── utils/             # Shared utilities
├── docs/
│   ├── BRD.md             # Business Requirements
│   ├── FRD.md             # Functional Requirements
│   ├── SRS.md             # System Requirements
│   ├── HLD.md             # High-Level Design
│   ├── LLD.md             # Low-Level Design
│   ├── API.md             # API Documentation
│   └── DATABASE.md        # Database Schema
├── infrastructure/
│   ├── docker/            # Docker configurations
│   ├── kubernetes/        # K8s manifests
│   └── terraform/         # IaC scripts
├── scripts/               # Utility scripts
├── .github/               # GitHub Actions workflows
├── package.json           # Root package.json (monorepo)
├── pnpm-workspace.yaml    # PNPM workspace config
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.x
- pnpm >= 8.x
- PostgreSQL >= 14.x
- Redis >= 7.x
- Docker & Docker Compose (optional)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd SAP

# Install dependencies
pnpm install

# Set up environment variables
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env

# Start infrastructure (PostgreSQL, Redis, Meilisearch)
docker-compose up -d

# Run database migrations
cd apps/backend
pnpm migration:run

# Start development servers
pnpm dev
```

### Development URLs
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **API Docs**: http://localhost:4000/api

## 🚢 Deployment

This project is configured for deployment on:
- **Frontend**: Cloudflare Pages
- **Backend**: Railway
- **Database**: Railway (PostgreSQL, Redis, Meilisearch)

### Quick Deploy

```bash
# Run the deployment script (Windows)
.\deploy.ps1

# Or manually:
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/sap-ulhn.git
git push -u origin main
```

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

### Deployment Checklist
- [ ] Create GitHub repository
- [ ] Push code to GitHub
- [ ] Set up Railway project (backend + databases)
- [ ] Set up Cloudflare Pages (frontend)
- [ ] Configure environment variables
- [ ] Set up OAuth providers (optional)
- [ ] Configure custom domain (optional)
- [ ] Test deployment

## 📅 Development Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Discovery & Design | 3 weeks | SRS, BRD, UI/UX, architecture |
| Backend Setup | 4 weeks | DB, APIs, indexing engine |
| Frontend Development | 5 weeks | Full UI, search, roles, dashboards |
| Aggregators & Crawlers | 4 weeks | Metadata updates, link checker |
| Integration & Testing | 3 weeks | QA, automation tests, load tests |
| Deployment & Optimization | 2 weeks | CI/CD, scaling, monitoring |
| **Total** | **21-23 weeks** | **Production Go-Live** |

## 📊 Key Metrics

- **Search Response Time**: <1 second
- **API Response Time**: <200ms (p95)
- **Uptime**: 99.9%
- **Concurrent Users**: 10,000+
- **Content Sources**: 8+ aggregated platforms
- **Supported Languages**: 4 (English, Hindi, Tamil, Telugu)

## 🔒 Security & Compliance

- ✅ No SAP content hosting (deep-links only)
- ✅ GDPR compliant user data handling
- ✅ JWT-based authentication
- ✅ Role-based access control (RBAC)
- ✅ Rate limiting on all APIs
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ CORS configuration
- ✅ Audit logging

## 🤝 Contributing

This is a production-grade enterprise project. Contribution guidelines will be established during the development phase.

## 📝 License

Proprietary - All rights reserved

## � Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment guide for Railway & Cloudflare
- [PROGRESS_SUMMARY.md](./PROGRESS_SUMMARY.md) - Current implementation progress
- [SESSION_SUMMARY.md](./SESSION_SUMMARY.md) - Latest development session details
- [docs/BRD.md](./docs/BRD.md) - Business Requirements Document
- [docs/SRS.md](./docs/SRS.md) - System Requirements Specification
- [docs/DATABASE.md](./docs/DATABASE.md) - Database schema and design
- [docs/API.md](./docs/API.md) - API documentation

## �📧 Contact

For inquiries, please contact the development team.

---

**Status**: 🚧 In Active Development (59% Complete)  
**Version**: 0.2.0  
**Last Updated**: November 16, 2025  
**Authentication**: ✅ Complete  
**Next Milestone**: Core Modules (Users, Resources, Search)
