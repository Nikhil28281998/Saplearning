# System Requirements Specification (SRS)
## SAP Unified Learning Hub Navigator (ULHN)

**Document Version:** 1.0  
**Date:** November 16, 2025  
**Status:** Draft  
**Confidentiality:** Internal

---

## Table of Contents
1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [System Architecture](#3-system-architecture)
4. [Technology Stack](#4-technology-stack)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Security Requirements](#6-security-requirements)
7. [Data Requirements](#7-data-requirements)
8. [Interface Requirements](#8-interface-requirements)
9. [System Constraints](#9-system-constraints)
10. [Quality Attributes](#10-quality-attributes)

---

## 1. Introduction

### 1.1 Purpose
This System Requirements Specification (SRS) document provides a complete technical specification for the SAP Unified Learning Hub Navigator (ULHN). It defines the system architecture, technology stack, non-functional requirements, and technical constraints.

### 1.2 Intended Audience
- Software Architects
- Backend Developers
- Frontend Developers
- DevOps Engineers
- QA Engineers
- Security Auditors
- System Administrators

### 1.3 Scope
This document covers:
- System architecture and design patterns
- Technology stack and framework choices
- Non-functional requirements (performance, scalability, reliability)
- Security architecture and requirements
- Data storage and management
- API specifications
- Infrastructure requirements
- Development and deployment processes

### 1.4 Definitions and Acronyms

| Term | Definition |
|------|------------|
| API | Application Programming Interface |
| AWS | Amazon Web Services |
| CDN | Content Delivery Network |
| CORS | Cross-Origin Resource Sharing |
| CRUD | Create, Read, Update, Delete |
| DTO | Data Transfer Object |
| GDPR | General Data Protection Regulation |
| JWT | JSON Web Token |
| MFA | Multi-Factor Authentication |
| ORM | Object-Relational Mapping |
| RBAC | Role-Based Access Control |
| REST | Representational State Transfer |
| SPA | Single Page Application |
| SQL | Structured Query Language |
| SSL/TLS | Secure Sockets Layer / Transport Layer Security |
| SSO | Single Sign-On |
| XSS | Cross-Site Scripting |

---

## 2. Overall Description

### 2.1 Product Perspective
ULHN is a standalone web application that aggregates metadata from external SAP learning sources. The system consists of:
- **Frontend Application**: Next.js SPA with SSR
- **Backend API**: NestJS RESTful API
- **Database**: PostgreSQL for persistent data
- **Search Engine**: Meilisearch for full-text search
- **Cache Layer**: Redis for performance optimization
- **Background Jobs**: Crawler services for content aggregation

### 2.2 System Context Diagram

```
                    ┌─────────────────────────────────────┐
                    │      External SAP Sources           │
                    │  - SAP Learning Hub                 │
                    │  - SAP Enable Now                   │
                    │  - SAP Help Portal                  │
                    │  - SAP Fiori Apps Library           │
                    │  - SAP Community                    │
                    │  - SAP YouTube                      │
                    │  - SAP Developers                   │
                    └──────────────┬──────────────────────┘
                                   │ HTTPS
                    ┌──────────────▼──────────────────────┐
                    │     Crawler Services (Lambda)       │
                    │  - Metadata Extraction              │
                    │  - Link Validation                  │
                    │  - Scheduled Jobs                   │
                    └──────────────┬──────────────────────┘
                                   │ Internal API
┌──────────────┐    ┌─────────────▼──────────────────────────────┐
│   End Users  │    │         ULHN Backend (NestJS)              │
│   Browsers   │◄───┤  ┌──────────────────────────────────────┐  │
└──────────────┘    │  │        API Gateway                   │  │
       │            │  │  - Authentication Middleware         │  │
       │ HTTPS      │  │  - Rate Limiting                     │  │
       │            │  │  - Request Validation                │  │
       │            │  └──────────────┬───────────────────────┘  │
       │            │                 │                           │
       │            │  ┌──────────────▼───────────────────────┐  │
       │            │  │      Application Services            │  │
       │            │  │  - User Service                      │  │
       │            │  │  - Content Service                   │  │
       │            │  │  - Search Service                    │  │
       │            │  │  - Personalization Service           │  │
       │            │  │  - Admin Service                     │  │
       │            │  └──────────────┬───────────────────────┘  │
       │            │                 │                           │
       │            │  ┌──────────────▼───────────────────────┐  │
       │            │  │       Data Access Layer              │  │
       │            │  │  - TypeORM Repositories              │  │
       │            │  │  - Database Queries                  │  │
       │            │  └──────────────┬───────────────────────┘  │
       │            └─────────────────┼───────────────────────────┘
       │                              │
       │            ┌─────────────────┼───────────────────────────┐
       │            │                 │                           │
       │            │  ┌──────────────▼──────────┐               │
       │            │  │   PostgreSQL Database   │               │
       │            │  │  - User Data            │               │
       │            │  │  - Content Metadata     │               │
       │            │  │  - Bookmarks/Notes      │               │
       │            │  └─────────────────────────┘               │
       │            │                                            │
       │            │  ┌─────────────────────────┐               │
       │            │  │  Meilisearch Engine     │               │
       │            │  │  - Indexed Content      │               │
       │            │  │  - Search Queries       │               │
       │            │  └─────────────────────────┘               │
       │            │                                            │
       │            │  ┌─────────────────────────┐               │
       │            │  │   Redis Cache           │               │
       │            │  │  - Session Data         │               │
       │            │  │  - Search Results       │               │
       │            │  └─────────────────────────┘               │
       │            │                                            │
       │            └────────────────────────────────────────────┘
       │                           Data Layer
       │
       │            ┌────────────────────────────────────────────┐
       └────────────►     Frontend (Next.js)                     │
                    │  - Server-Side Rendering                   │
                    │  - Static Site Generation                  │
                    │  - Client-Side Hydration                   │
                    │  - API Client                              │
                    └────────────────────────────────────────────┘
```

### 2.3 User Classes and Characteristics

| User Class | Technical Proficiency | Expected Usage Pattern | Priority |
|------------|----------------------|------------------------|----------|
| Anonymous Users | Low-Medium | Occasional browsing | High |
| Registered Users | Medium | Regular usage (weekly) | Critical |
| Premium Users | Medium-High | Frequent usage (daily) | High |
| Admin Users | High | Administrative tasks | High |
| Super Admin | Very High | System management | Medium |

---

## 3. System Architecture

### 3.1 Architectural Style
**Layered Architecture with Microservices-Ready Design**

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  - Next.js Frontend (React Components)                       │
│  - Server-Side Rendering                                     │
│  - Client-Side State Management                              │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS / REST API
┌────────────────────────▼────────────────────────────────────┐
│                     API Gateway Layer                        │
│  - Request Routing                                           │
│  - Authentication/Authorization                              │
│  - Rate Limiting                                             │
│  - Request/Response Transformation                           │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   Business Logic Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ User Module  │  │Content Module│  │Search Module │      │
│  │  - Auth      │  │  - CRUD      │  │  - Indexing  │      │
│  │  - Profile   │  │  - Crawlers  │  │  - Querying  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │Personal Mod  │  │  Admin Mod   │  │Analytics Mod │      │
│  │  - Favorites │  │  - Users     │  │  - Metrics   │      │
│  │  - Playlists │  │  - Content   │  │  - Reports   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   Data Access Layer                          │
│  - TypeORM Entities                                          │
│  - Repository Pattern                                        │
│  - Query Builder                                             │
│  - Transactions                                              │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                     Data Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │ Meilisearch  │  │    Redis     │      │
│  │  (Primary)   │  │   (Search)   │  │   (Cache)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Design Patterns

#### 3.2.1 Backend Design Patterns
1. **Repository Pattern**: Data access abstraction
2. **Service Layer Pattern**: Business logic encapsulation
3. **Dependency Injection**: Loose coupling via NestJS DI
4. **DTO Pattern**: Data transfer and validation
5. **Factory Pattern**: Object creation (e.g., crawler factories)
6. **Observer Pattern**: Event-driven architecture
7. **Strategy Pattern**: Multiple crawler strategies
8. **Singleton Pattern**: Configuration management

#### 3.2.2 Frontend Design Patterns
1. **Component-Based Architecture**: React components
2. **Container/Presenter Pattern**: Smart/Dumb components
3. **HOC Pattern**: Higher-order components for auth, etc.
4. **Custom Hooks**: Reusable React hooks
5. **Context API**: Global state management
6. **Atomic Design**: Component hierarchy (atoms, molecules, organisms)

### 3.3 Module Breakdown

#### 3.3.1 Backend Modules (NestJS)

```
apps/backend/src/
├── main.ts                          # Application entry point
├── app.module.ts                    # Root module
├── config/                          # Configuration
│   ├── database.config.ts
│   ├── jwt.config.ts
│   ├── search.config.ts
│   └── aws.config.ts
├── common/                          # Shared utilities
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   └── pipes/
├── modules/
│   ├── auth/                        # Authentication module
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   ├── google.strategy.ts
│   │   │   └── microsoft.strategy.ts
│   │   └── dto/
│   ├── users/                       # User management
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── entities/user.entity.ts
│   │   └── dto/
│   ├── content/                     # Content aggregation
│   │   ├── content.module.ts
│   │   ├── content.controller.ts
│   │   ├── content.service.ts
│   │   ├── entities/
│   │   │   ├── resource.entity.ts
│   │   │   ├── module.entity.ts
│   │   │   ├── process.entity.ts
│   │   │   └── role.entity.ts
│   │   └── dto/
│   ├── search/                      # Search functionality
│   │   ├── search.module.ts
│   │   ├── search.controller.ts
│   │   ├── search.service.ts
│   │   └── meilisearch.service.ts
│   ├── personalization/             # User personalization
│   │   ├── personalization.module.ts
│   │   ├── favorites/
│   │   ├── playlists/
│   │   ├── notes/
│   │   └── history/
│   ├── crawlers/                    # Content crawlers
│   │   ├── crawlers.module.ts
│   │   ├── crawler.service.ts
│   │   ├── strategies/
│   │   │   ├── sap-learning.crawler.ts
│   │   │   ├── enable-now.crawler.ts
│   │   │   ├── fiori-apps.crawler.ts
│   │   │   └── help-portal.crawler.ts
│   │   └── validators/
│   ├── admin/                       # Admin functionality
│   │   ├── admin.module.ts
│   │   ├── admin.controller.ts
│   │   ├── admin.service.ts
│   │   └── dto/
│   └── analytics/                   # Analytics & reporting
│       ├── analytics.module.ts
│       ├── analytics.controller.ts
│       └── analytics.service.ts
└── database/
    ├── migrations/
    └── seeds/
```

#### 3.3.2 Frontend Modules (Next.js)

```
apps/frontend/
├── src/
│   ├── app/                         # Next.js 14 App Router
│   │   ├── layout.tsx               # Root layout
│   │   ├── page.tsx                 # Home page
│   │   ├── (auth)/                  # Auth pages group
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── search/                  # Search pages
│   │   ├── modules/                 # Module pages
│   │   ├── roles/                   # Role dashboards
│   │   ├── processes/               # Process navigator
│   │   ├── resources/[id]/          # Resource detail
│   │   ├── workspace/               # User workspace
│   │   │   ├── favorites/
│   │   │   ├── playlists/
│   │   │   ├── notes/
│   │   │   └── history/
│   │   └── admin/                   # Admin panel
│   ├── components/                  # React components
│   │   ├── ui/                      # Base UI components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   └── ...
│   │   ├── layout/                  # Layout components
│   │   │   ├── header.tsx
│   │   │   ├── footer.tsx
│   │   │   └── sidebar.tsx
│   │   ├── search/                  # Search components
│   │   ├── resources/               # Resource components
│   │   └── admin/                   # Admin components
│   ├── lib/                         # Utilities
│   │   ├── api.ts                   # API client
│   │   ├── auth.ts                  # Auth helpers
│   │   └── utils.ts                 # General utilities
│   ├── hooks/                       # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useSearch.ts
│   │   └── useFavorites.ts
│   ├── store/                       # State management
│   │   ├── authStore.ts
│   │   └── searchStore.ts
│   ├── types/                       # TypeScript types
│   └── styles/                      # Global styles
└── public/                          # Static assets
```

### 3.4 Communication Patterns

#### 3.4.1 Client-Server Communication
- **Protocol**: HTTPS (TLS 1.3)
- **Format**: JSON (application/json)
- **Pattern**: RESTful API
- **Authentication**: JWT Bearer tokens
- **Error Handling**: Standard HTTP status codes

#### 3.4.2 Internal Service Communication
- **Synchronous**: Direct method calls (monolithic for MVP)
- **Asynchronous**: Event emitters (for future microservices)
- **Message Queue**: (Future) RabbitMQ/SQS for crawler jobs

---

## 4. Technology Stack

### 4.1 Frontend Technologies

| Component | Technology | Version | Justification |
|-----------|-----------|---------|---------------|
| **Framework** | Next.js | 14.x | SSR, SSG, excellent SEO, React Server Components |
| **Language** | TypeScript | 5.3+ | Type safety, better DX, fewer runtime errors |
| **UI Library** | React | 18.x | Component-based, large ecosystem, team expertise |
| **Styling** | Tailwind CSS | 3.4+ | Utility-first, fast development, small bundle |
| **Component Library** | shadcn/ui | Latest | Accessible, customizable, Radix UI primitives |
| **State Management** | Zustand | 4.x | Lightweight, simple API, TypeScript support |
| **Forms** | React Hook Form | 7.x | Performance, minimal re-renders, validation |
| **Validation** | Zod | 3.x | TypeScript-first schema validation |
| **HTTP Client** | Axios | 1.6+ | Interceptors, request cancellation, retries |
| **Date Handling** | date-fns | 3.x | Modular, tree-shakeable, immutable |
| **Icons** | Lucide React | Latest | Consistent, customizable, tree-shakeable |
| **Animations** | Framer Motion | 10.x | Declarative animations, gestures |
| **SEO** | Next SEO | 6.x | Metadata management, structured data |
| **Analytics** | Vercel Analytics | Latest | Core Web Vitals, performance monitoring |

### 4.2 Backend Technologies

| Component | Technology | Version | Justification |
|-----------|-----------|---------|---------------|
| **Framework** | NestJS | 10.x | Modular, TypeScript, enterprise-ready, DI |
| **Language** | TypeScript | 5.3+ | Type safety, better maintainability |
| **Runtime** | Node.js | 20.x LTS | Stable, long-term support, performance |
| **ORM** | TypeORM | 0.3.x | TypeScript support, migrations, relations |
| **Validation** | class-validator | 0.14+ | Decorator-based, DTO validation |
| **Transformation** | class-transformer | 0.5+ | DTO transformation, serialization |
| **Authentication** | Passport.js | 0.7+ | Multiple strategies, well-tested |
| **JWT** | @nestjs/jwt | 10.x | Token generation, verification |
| **Hashing** | bcrypt | 5.x | Secure password hashing |
| **HTTP Client** | Axios | 1.6+ | External API calls (crawlers) |
| **Caching** | cache-manager | 5.x | Multi-store caching abstraction |
| **Rate Limiting** | @nestjs/throttler | 5.x | DDoS protection, API limiting |
| **Logging** | Winston | 3.x | Structured logging, multiple transports |
| **Validation** | Joi | 17.x | Configuration validation |
| **Documentation** | Swagger/OpenAPI | 7.x | API documentation, client generation |

### 4.3 Database & Storage

| Component | Technology | Version | Justification |
|-----------|-----------|---------|---------------|
| **Primary Database** | PostgreSQL | 16.x | ACID, relational integrity, JSON support, proven |
| **Search Engine** | Meilisearch | 1.5+ | Fast, typo-tolerant, easy setup, open-source |
| **Cache** | Redis | 7.x | In-memory, pub/sub, session storage, fast |
| **Object Storage** | AWS S3 | - | Scalable, durable, CDN integration |
| **CDN** | CloudFront | - | Global distribution, HTTPS, caching |

### 4.4 DevOps & Infrastructure

| Component | Technology | Version | Justification |
|-----------|-----------|---------|---------------|
| **Containerization** | Docker | 24.x | Consistent environments, portability |
| **Orchestration** | Kubernetes (EKS) | 1.28+ | Scaling, self-healing, rolling deployments |
| **CI/CD** | GitHub Actions | - | Native GitHub integration, free for public repos |
| **IaC** | Terraform | 1.6+ | Multi-cloud, declarative, state management |
| **Monitoring** | CloudWatch | - | AWS native, logs, metrics, alarms |
| **APM** | AWS X-Ray | - | Distributed tracing, performance insights |
| **Error Tracking** | Sentry | Latest | Real-time error tracking, release tracking |
| **Uptime Monitoring** | UptimeRobot | - | External monitoring, alerting |

### 4.5 Development Tools

| Tool | Purpose |
|------|---------|
| **pnpm** | Package manager (faster, disk-efficient) |
| **ESLint** | Code linting |
| **Prettier** | Code formatting |
| **Husky** | Git hooks |
| **lint-staged** | Run linters on staged files |
| **Turbo** | Monorepo build system |
| **Jest** | Unit testing |
| **Supertest** | API testing |
| **Playwright** | E2E testing |
| **Storybook** | Component documentation |

---

## 5. Non-Functional Requirements

### 5.1 Performance Requirements

#### 5.1.1 Response Time
| Operation | Target (p95) | Maximum (p99) |
|-----------|--------------|---------------|
| Page Load (First Paint) | <1.5s | <2.5s |
| Page Load (Interactive) | <2.5s | <4s |
| Search Query | <500ms | <1s |
| API Request (Simple) | <100ms | <200ms |
| API Request (Complex) | <500ms | <1s |
| Database Query | <50ms | <100ms |
| Cache Hit | <10ms | <20ms |

#### 5.1.2 Throughput
- **Concurrent Users**: 10,000 (MVP), 100,000 (Production)
- **Requests per Second**: 5,000 (peak)
- **Search Queries per Second**: 1,000 (peak)
- **Database Connections**: 100 (pooled)

#### 5.1.3 Resource Utilization
- **Frontend Bundle Size**: <500KB (gzipped)
- **API Memory Usage**: <512MB per instance
- **CPU Usage**: <70% under normal load
- **Database Size**: <100GB (Year 1)

### 5.2 Scalability Requirements

#### 5.2.1 Horizontal Scaling
- **Frontend**: Auto-scaling (2-20 instances)
- **Backend**: Auto-scaling (2-50 instances)
- **Database**: Read replicas (1-5)
- **Cache**: Redis cluster (3-9 nodes)
- **Search**: Meilisearch cluster (3+ nodes)

#### 5.2.2 Vertical Scaling
- **Database**: Upgradeable to 32 vCPU, 128GB RAM
- **Backend**: Upgradeable to 8 vCPU, 16GB RAM per instance
- **Cache**: Upgradeable to 16GB memory per node

#### 5.2.3 Data Scaling
- **Content Growth**: 50,000 resources per year
- **User Growth**: 100,000 users per year
- **Storage Growth**: 50GB per year

### 5.3 Reliability Requirements

#### 5.3.1 Availability
- **Uptime Target**: 99.9% (8.76 hours downtime/year)
- **Planned Maintenance Window**: 2 hours/month (off-peak)
- **Recovery Time Objective (RTO)**: <1 hour
- **Recovery Point Objective (RPO)**: <5 minutes

#### 5.3.2 Fault Tolerance
- **Database**: Master-replica replication, automated failover
- **Backend**: Multi-AZ deployment, health checks
- **Frontend**: CDN redundancy, multiple regions
- **Search**: Clustered deployment, replica sets

#### 5.3.3 Backup & Recovery
- **Database Backups**: Daily full, hourly incremental
- **Retention Period**: 30 days (daily), 7 days (hourly)
- **Backup Testing**: Monthly restore tests
- **Disaster Recovery**: Multi-region backup replication

### 5.4 Maintainability Requirements

#### 5.4.1 Code Quality
- **Code Coverage**: >80% (unit tests)
- **Technical Debt Ratio**: <5%
- **Cyclomatic Complexity**: <10 per function
- **Code Duplication**: <3%

#### 5.4.2 Documentation
- **API Documentation**: 100% coverage (Swagger)
- **Code Comments**: Inline for complex logic
- **Architecture Docs**: Updated quarterly
- **Runbooks**: For common operations

#### 5.4.3 Monitoring & Logging
- **Application Logs**: Structured JSON logs
- **Log Retention**: 30 days (hot), 90 days (cold)
- **Metrics Collection**: Every 1 minute
- **Alerting**: Critical alerts <5 minutes

### 5.5 Usability Requirements

#### 5.5.1 User Interface
- **Responsive Design**: Mobile, tablet, desktop
- **Browser Support**: Chrome, Firefox, Safari, Edge (last 2 versions)
- **Accessibility**: WCAG 2.1 Level AA compliance
- **Internationalization**: 4 languages (Phase 1)

#### 5.5.2 User Experience
- **Learning Curve**: <5 minutes for basic features
- **Error Messages**: Clear, actionable, user-friendly
- **Help System**: Contextual tooltips, FAQ, video tutorials
- **Keyboard Navigation**: Full keyboard accessibility

### 5.6 Portability Requirements

#### 5.6.1 Platform Independence
- **Frontend**: Browser-based (no platform restrictions)
- **Backend**: Containerized (Docker), cloud-agnostic design
- **Database**: Standard PostgreSQL (portable)

#### 5.6.2 Cloud Portability
- **Primary Cloud**: AWS
- **Alternative Clouds**: GCP, Azure (with minimal changes)
- **On-Premise**: Docker Compose for local/on-prem deployment

---

## 6. Security Requirements

### 6.1 Authentication & Authorization

#### 6.1.1 Authentication Methods
1. **Email/Password**
   - Minimum password length: 8 characters
   - Password complexity: 1 uppercase, 1 lowercase, 1 number, 1 special char
   - Password hashing: bcrypt (cost factor 12)
   - Failed login attempts: Max 5 (15-minute lockout)
   - Session timeout: 1 hour (activity-based)

2. **OAuth 2.0**
   - Google OAuth
   - Microsoft OAuth
   - PKCE flow for public clients
   - Token refresh every 1 hour

3. **JWT Tokens**
   - Algorithm: RS256 (asymmetric)
   - Access token expiry: 1 hour
   - Refresh token expiry: 7 days
   - Token rotation on refresh
   - Blacklist for revoked tokens

#### 6.1.2 Authorization (RBAC)
- **Role Hierarchy**: Super Admin > Admin > Premium > Registered > Anonymous
- **Permission Enforcement**: Backend + Frontend
- **API Protection**: Guards on all protected endpoints
- **Resource Ownership**: Users can only access own data

### 6.2 Data Security

#### 6.2.1 Data Encryption
- **In Transit**: TLS 1.3, HTTPS only, HSTS enabled
- **At Rest**: 
  - Database: AES-256 encryption (AWS RDS encryption)
  - Backups: Encrypted (AWS S3 SSE)
  - Passwords: bcrypt hashed (never plaintext)
  - Sensitive fields: Application-level encryption

#### 6.2.2 Data Privacy (GDPR Compliance)
- **User Consent**: Explicit opt-in for data collection
- **Right to Access**: Users can export all their data
- **Right to Deletion**: Users can delete accounts (30-day grace)
- **Data Minimization**: Only collect necessary data
- **Purpose Limitation**: Data used only for stated purposes
- **Anonymization**: Analytics data anonymized

#### 6.2.3 Data Retention
- **User Data**: Retained until account deletion
- **Logs**: 30 days (application), 90 days (audit)
- **Deleted Accounts**: 30-day soft delete, then permanent
- **Backups**: 30-day retention

### 6.3 Application Security

#### 6.3.1 Input Validation
- **All Inputs Validated**: Backend (critical), Frontend (UX)
- **Validation Library**: class-validator (DTO validation)
- **Sanitization**: HTML sanitization for user content
- **SQL Injection Prevention**: ORM (TypeORM), parameterized queries
- **XSS Prevention**: React auto-escaping, CSP headers

#### 6.3.2 API Security
- **Rate Limiting**: 
  - Anonymous: 10 req/min
  - Registered: 100 req/min
  - Admin: 500 req/min
- **CORS**: Whitelist allowed origins
- **CSRF Protection**: SameSite cookies, CSRF tokens
- **Request Size Limits**: 10MB max (uploads), 1MB (API)
- **API Versioning**: `/api/v1/...`

#### 6.3.3 Security Headers
```typescript
// Security headers configuration
{
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Content-Security-Policy": "default-src 'self'; ...",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
}
```

### 6.4 Infrastructure Security

#### 6.4.1 Network Security
- **VPC**: Private subnets for backend/database
- **Security Groups**: Principle of least privilege
- **Firewall**: WAF (Web Application Firewall)
- **DDoS Protection**: AWS Shield Standard
- **Network Segmentation**: Public/Private/Database tiers

#### 6.4.2 Access Control
- **SSH Keys**: No password authentication
- **Bastion Host**: Jump server for database access
- **IAM Roles**: AWS IAM for service access (no keys)
- **Secrets Management**: AWS Secrets Manager / Vault
- **MFA**: Required for admin accounts

#### 6.4.3 Container Security
- **Base Images**: Official, minimal images
- **Image Scanning**: Trivy/Snyk for vulnerabilities
- **No Root**: Run containers as non-root user
- **Read-Only FS**: Where possible
- **Resource Limits**: CPU/memory limits set

### 6.5 Audit & Compliance

#### 6.5.1 Audit Logging
- **All Actions Logged**: User actions, admin actions, system events
- **Log Format**: Structured JSON
- **Log Fields**: User ID, action, timestamp, IP, user agent, result
- **Tamper-Proof**: Write-only logs, external storage
- **Retention**: 3 years (audit logs)

#### 6.5.2 Security Monitoring
- **Intrusion Detection**: AWS GuardDuty
- **Vulnerability Scanning**: Weekly automated scans
- **Dependency Scanning**: Dependabot, npm audit
- **Penetration Testing**: Annual third-party testing
- **Security Audits**: Quarterly internal audits

#### 6.5.3 Incident Response
- **Incident Response Plan**: Documented procedures
- **Security Team**: On-call rotation
- **Breach Notification**: <72 hours (GDPR requirement)
- **Post-Mortem**: After every incident

---

## 7. Data Requirements

### 7.1 Data Model Overview

#### 7.1.1 Core Entities
1. **User**: User accounts and profiles
2. **Resource**: Aggregated learning resources
3. **Module**: SAP modules (FI, MM, SD, etc.)
4. **Process**: Business processes (P2P, O2C, etc.)
5. **Role**: SAP user roles
6. **Favorite**: User favorites
7. **Playlist**: User-created playlists
8. **Note**: User notes
9. **History**: User view history
10. **Crawler**: Crawler configurations
11. **Analytics**: Usage metrics

#### 7.1.2 Entity Relationships

```
User (1) ──< (N) Favorite >── (1) Resource
User (1) ──< (N) Playlist
User (1) ──< (N) Note >── (1) Resource
User (1) ──< (N) History >── (1) Resource
Playlist (1) ──< (N) PlaylistItem >── (1) Resource

Resource (N) ──> (N) Module
Resource (N) ──> (N) Process
Resource (N) ──> (N) Role
Resource (1) ──< (N) Tag
```

### 7.2 Data Storage Requirements

#### 7.2.1 Data Volume Estimates

| Entity | Year 1 | Year 2 | Year 3 |
|--------|--------|--------|--------|
| Users | 10,000 | 50,000 | 150,000 |
| Resources | 15,000 | 30,000 | 50,000 |
| Favorites | 100,000 | 750,000 | 3,000,000 |
| Playlists | 5,000 | 25,000 | 75,000 |
| Notes | 20,000 | 100,000 | 300,000 |
| History Records | 1M | 10M | 50M |
| Analytics Events | 10M | 100M | 500M |

#### 7.2.2 Storage Capacity

| Storage Type | Year 1 | Year 2 | Year 3 |
|--------------|--------|--------|--------|
| PostgreSQL | 50GB | 150GB | 300GB |
| Meilisearch | 10GB | 20GB | 40GB |
| Redis | 5GB | 10GB | 20GB |
| S3 (Backups) | 100GB | 300GB | 600GB |
| CloudWatch Logs | 50GB | 100GB | 200GB |

### 7.3 Data Quality Requirements

#### 7.3.1 Data Accuracy
- **Resource Metadata**: 95% accuracy (auto-categorization)
- **Link Validity**: 98% active links
- **User Data**: 100% accuracy (user-provided)
- **Duplicate Detection**: <1% duplicates

#### 7.3.2 Data Consistency
- **ACID Compliance**: All critical transactions
- **Referential Integrity**: Foreign key constraints enforced
- **Data Validation**: Backend validation on all writes
- **Eventual Consistency**: Search index (refresh every 1 minute)

#### 7.3.3 Data Freshness
- **Resource Metadata**: Updated weekly
- **Link Validation**: Daily checks
- **User Data**: Real-time updates
- **Analytics**: Near real-time (5-minute delay)

---

## 8. Interface Requirements

### 8.1 User Interfaces

#### 8.1.1 Web Interface
- **Technology**: Next.js + React
- **Responsive Breakpoints**: 
  - Mobile: 320px - 767px
  - Tablet: 768px - 1023px
  - Desktop: 1024px+
- **Accessibility**: WCAG 2.1 Level AA
- **Browser Compatibility**: Chrome, Firefox, Safari, Edge (last 2 versions)

#### 8.1.2 Admin Interface
- **Technology**: Same as user interface (Next.js)
- **Authentication**: Admin role required
- **Features**: User management, content management, analytics, crawler management

### 8.2 API Interfaces

#### 8.2.1 RESTful API
- **Base URL**: `https://api.ulhn.com/v1`
- **Format**: JSON (application/json)
- **Authentication**: Bearer JWT tokens
- **Versioning**: URL path versioning (`/v1`, `/v2`)
- **Documentation**: OpenAPI 3.0 (Swagger UI)

**Example Endpoints:**
```
GET    /api/v1/resources           # List resources
GET    /api/v1/resources/:id       # Get resource
POST   /api/v1/search              # Search resources
GET    /api/v1/users/me            # Get current user
POST   /api/v1/favorites           # Add favorite
GET    /api/v1/playlists           # List playlists
POST   /api/v1/playlists           # Create playlist
```

#### 8.2.2 WebSocket (Future)
- **Use Case**: Real-time notifications
- **Protocol**: WebSocket (WSS)
- **Library**: Socket.io
- **Events**: New content, playlist updates, etc.

### 8.3 External Interfaces

#### 8.3.1 SAP Learning Sources (Read-Only)
- **Protocol**: HTTPS
- **Rate Limit**: 1 request/second per source
- **Authentication**: None (public resources)
- **Error Handling**: Retry with exponential backoff

#### 8.3.2 OAuth Providers
- **Google**: OAuth 2.0 (openid, profile, email scopes)
- **Microsoft**: OAuth 2.0 (openid, profile, email scopes)
- **Redirect URI**: `https://ulhn.com/auth/callback/{provider}`

#### 8.3.3 Email Service
- **Provider**: AWS SES / SendGrid
- **Use Cases**: Verification, password reset, notifications
- **Rate Limit**: 10,000 emails/day (initial)

#### 8.3.4 Analytics & Monitoring
- **CloudWatch**: Logs, metrics, alarms
- **Sentry**: Error tracking
- **Google Analytics**: User behavior (optional, with consent)

---

## 9. System Constraints

### 9.1 Technical Constraints

1. **Browser Constraints**
   - Must support modern browsers (ES6+)
   - No support for IE11
   - Minimum screen size: 320px

2. **Network Constraints**
   - Assume minimum 1 Mbps bandwidth
   - Optimize for high-latency networks (>200ms)
   - Progressive enhancement

3. **Legal Constraints**
   - No hosting of SAP proprietary content
   - Deep-linking only
   - Respect robots.txt
   - GDPR compliance (EU users)

4. **Third-Party Dependencies**
   - Cannot guarantee SAP website availability
   - OAuth provider uptime dependency
   - Search engine performance dependency

### 9.2 Business Constraints

1. **Budget Constraints**
   - Infrastructure: $3,000/month (Year 1)
   - Development: Fixed budget per phase
   - Support: Limited 24/7 support (business hours only initially)

2. **Timeline Constraints**
   - MVP: 12 weeks
   - Production: 21-23 weeks
   - No scope creep without re-estimation

3. **Resource Constraints**
   - Team size: 4-6 developers
   - No dedicated security team (use consultants)
   - Limited QA resources (2 QA engineers)

### 9.3 Regulatory Constraints

1. **Data Protection**
   - GDPR (EU)
   - CCPA (California)
   - Data residency requirements

2. **Accessibility**
   - Section 508 (US government)
   - WCAG 2.1 Level AA
   - ADA compliance

3. **Copyright**
   - Fair use doctrine
   - Deep-linking legality
   - SAP trademark usage

---

## 10. Quality Attributes

### 10.1 Performance

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Page Load (FCP) | <1.5s | Lighthouse, Core Web Vitals |
| Time to Interactive | <2.5s | Lighthouse |
| API Response (p95) | <200ms | APM (CloudWatch) |
| Search Response (p95) | <500ms | Application metrics |
| Database Query (p95) | <50ms | Slow query log |

### 10.2 Scalability

| Dimension | Current | Year 1 Target | Year 3 Target |
|-----------|---------|---------------|---------------|
| Concurrent Users | 1,000 | 10,000 | 100,000 |
| Daily Active Users | 500 | 5,000 | 50,000 |
| Requests/Second | 100 | 1,000 | 10,000 |
| Data Volume | 10GB | 100GB | 1TB |

### 10.3 Reliability

| Metric | Target | Measurement |
|--------|--------|-------------|
| Uptime | 99.9% | External monitoring |
| MTBF (Mean Time Between Failures) | >720 hours | Incident tracking |
| MTTR (Mean Time To Recover) | <1 hour | Incident tracking |
| Data Loss | 0% (RPO <5 min) | Backup tests |

### 10.4 Security

| Control | Implementation | Validation |
|---------|----------------|------------|
| Authentication | JWT + OAuth | Penetration testing |
| Authorization | RBAC | Automated tests |
| Encryption (Transit) | TLS 1.3 | SSL Labs scan |
| Encryption (Rest) | AES-256 | Compliance audit |
| Vulnerability Scanning | Weekly | Automated scans |

### 10.5 Maintainability

| Metric | Target | Tool |
|--------|--------|------|
| Code Coverage | >80% | Jest |
| Technical Debt Ratio | <5% | SonarQube |
| Code Duplication | <3% | SonarQube |
| Documentation Coverage | 100% (APIs) | Swagger |
| Cyclomatic Complexity | <10 | ESLint |

### 10.6 Usability

| Metric | Target | Measurement |
|--------|--------|-------------|
| Task Success Rate | >90% | User testing |
| Time to Competency | <5 minutes | User studies |
| Error Rate | <5% | Analytics |
| User Satisfaction | NPS >50 | Surveys |
| Accessibility Score | >90 | Lighthouse |

---

## Document Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| System Architect | | | |
| Technical Lead | | | |
| Security Architect | | | |
| DevOps Lead | | | |
| QA Lead | | | |

---

**Document Control:**
- **Created**: November 16, 2025
- **Last Modified**: November 16, 2025
- **Version**: 1.0
- **Status**: Draft for Review
- **Next Review Date**: November 30, 2025
