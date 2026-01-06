# SkillForge Training Platform - Production Environment Configuration

## Resource Allocation (Optimized for Production)

### Approuter
- **Memory**: 1024M (up from 512M)
- **Disk**: 2048M (up from 1024M)
- **Rationale**: Handles static file serving, session management, XSUAA authentication

### CAP Backend (skillforge-srv)
- **Memory**: 1024M (up from default 256M)
- **Disk**: 2048M 
- **Rationale**: OData processing, authorization handlers, database connection pooling

### HDI Deployer (skillforge-db-deployer)
- **Memory**: 512M
- **Disk**: 1024M
- **Rationale**: Schema deployment, data initialization

## Key SAP BTP Best Practices Applied

### 1. **Health Check Endpoints**
- Approuter: HTTP health check on `/`
- Backend: Custom health endpoint at `/health` with database connectivity check
- Benefits: Automated recovery, proper load balancer integration

### 2. **Security Configuration**
- Fixed xsappname mismatch: `skillforge-training-app` (consistent across xs-security.json and mta.yaml)
- OAuth2 configuration with token validity: 1h access, 12h refresh
- Wildcard redirect URIs for multi-region deployment
- CSRF protection on all service routes

### 3. **Performance Optimizations**
- Compression enabled (2KB threshold)
- Static asset caching (1 year max-age for UI5 resources)
- HANA connection pooling (1-50 connections)
- npm ci for reproducible builds

### 4. **Node.js Version Standardization**
- Node 20 LTS (current SAP recommendation)
- Consistent across all modules
- Engine-strict disabled for SAP package compatibility

### 5. **CORS Configuration**
- Configured for cross-origin service calls
- Proper header exposure for CSRF tokens
- Wildcard CF domain support

### 6. **CDS Configuration (.cdsrc.json)**
- Production logging levels (warn for cds, info for app)
- OData v4 with x4 flavor
- Assert integrity for database

### 7. **NPM Registry Configuration**
- @sap scope points to npm.sap.com
- Consistent across root and app folders
- Audit enabled for security scanning

## Deployment Structure

```
skillforge-training-platform.mtar (15-20 MiB)
├── skillforge-approuter (Entry point)
│   ├── Static UI files (saplearningcenter.saplearningcenter/webapp/)
│   ├── Authentication (XSUAA)
│   └── Routing (xs-app.json)
├── skillforge-srv (CAP Backend)
│   ├── OData V4 Service
│   ├── Authorization handlers
│   └── Health check endpoint
└── skillforge-db-deployer (HANA HDI)
    ├── Schema artifacts
    └── Initial data
```

## Services Bound

1. **skillforge-auth** (XSUAA)
   - Application authentication
   - Role-based access control
   
2. **skillforge-db** (HANA HDI Container)
   - Database persistence
   - Schema versioning

3. **skillforge-destination** (Destination Service)
   - Backend connectivity
   - Token forwarding

## Monitoring & Operations

- **Health Check URLs**:
  - Approuter: `https://<app-url>/`
  - Backend: `https://<app-url>/service/SkillForgeService/health`

- **Log Levels**:
  - Development: info
  - Production: warn (CDS), info (app)

- **Session Timeout**: 30 minutes

## Scaling Recommendations

With 200GB space available in your BTP quota:

### Current Allocation
- Approuter: 2GB disk
- Backend: 2GB disk
- DB Deployer: 1GB disk
- **Total**: ~5GB per deployment

### Horizontal Scaling
Can safely run:
- **5 instances** of approuter (load balanced)
- **3 instances** of backend (connection pooling)
- **1 instance** of db-deployer (transient)

This gives you high availability within your quota.

## Next Steps After Deployment

1. **Assign Role Collections** in BTP Cockpit:
   - `SkillForge_Admin_build_work_zone`
   - `SkillForge_Manager_build_work_zone`
   - `SkillForge_User_build_work_zone`

2. **Monitor Application**:
   - CF CLI: `cf logs skillforge-srv --recent`
   - BTP Cockpit: Application logs tab
   
3. **Test Health Endpoints**:
   ```bash
   curl https://<approuter-url>/
   curl https://<approuter-url>/service/SkillForgeService/health
   ```

4. **Performance Testing**:
   - Use SAP Cloud ALM or JMeter
   - Target: 100 concurrent users
   - Monitor memory/CPU in BTP Cockpit
