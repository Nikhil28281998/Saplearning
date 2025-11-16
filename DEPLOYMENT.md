# SAP ULHN Deployment Guide

## 🚀 Deployment Architecture

This project uses a split deployment approach:
- **Frontend (Next.js):** Cloudflare Pages
- **Backend (NestJS):** Railway
- **Database (PostgreSQL):** Railway
- **Redis & Meilisearch:** Railway

---

## 📋 Prerequisites

1. **GitHub Account** - For code repository
2. **Cloudflare Account** - For frontend hosting
3. **Railway Account** - For backend, database, and services
4. **Domain (Optional)** - For custom domain setup

---

## 🔧 Step 1: GitHub Repository Setup

### 1.1 Initialize Git Repository (Local)

```bash
# Navigate to project root
cd c:\Users\14754\SAP

# Initialize git (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: SAP ULHN project with auth system"
```

### 1.2 Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `sap-ulhn` (or your preferred name)
3. Description: "SAP Unified Learning Hub Navigator - Enterprise learning resource aggregation platform"
4. Visibility: **Private** (recommended for production app)
5. **Do NOT** initialize with README, .gitignore, or license
6. Click "Create repository"

### 1.3 Push to GitHub

```bash
# Add remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/sap-ulhn.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

---

## 🛤️ Step 2: Railway Setup (Backend + Database)

### 2.1 Create Railway Project

1. Go to https://railway.app/
2. Click "New Project"
3. Choose "Deploy from GitHub repo"
4. Select your `sap-ulhn` repository
5. Project name: `sap-ulhn-backend`

### 2.2 Add PostgreSQL Database

1. In Railway project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway will provision a PostgreSQL instance
4. Note the connection details (auto-provided as environment variables)

### 2.3 Add Redis

1. In Railway project, click "New"
2. Select "Database" → "Redis"
3. Railway will provision a Redis instance

### 2.4 Add Meilisearch (Optional - using Docker)

1. In Railway project, click "New"
2. Select "Empty Service"
3. Name it "meilisearch"
4. Go to Settings → Deploy
5. Add Docker image: `getmeili/meilisearch:v1.5`
6. Add environment variable:
   - `MEILI_MASTER_KEY`: Generate a secure key (32+ characters)

### 2.5 Configure Backend Service

1. In Railway project, select the main service (sap-ulhn)
2. Go to Settings → Build
   - **Root Directory**: `apps/backend`
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm start:prod`

3. Go to Settings → Environment Variables
   - Click "Add Variable Reference" for each database:
     - `DATABASE_HOST` → PostgreSQL service → `PGHOST`
     - `DATABASE_PORT` → PostgreSQL service → `PGPORT`
     - `DATABASE_USERNAME` → PostgreSQL service → `PGUSER`
     - `DATABASE_PASSWORD` → PostgreSQL service → `PGPASSWORD`
     - `DATABASE_NAME` → PostgreSQL service → `PGDATABASE`
     - `REDIS_HOST` → Redis service → `REDIS_HOST`
     - `REDIS_PORT` → Redis service → `REDIS_PORT`
     - `MEILISEARCH_HOST` → Meilisearch service → `MEILISEARCH_HOST`

4. Add custom environment variables:
   ```
   NODE_ENV=production
   PORT=4000
   
   # JWT Secrets (generate secure random strings)
   JWT_SECRET=your-super-secret-jwt-key-min-32-chars
   JWT_EXPIRES_IN=1h
   JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
   JWT_REFRESH_EXPIRES_IN=7d
   
   # Frontend URL (will be your Cloudflare Pages URL)
   FRONTEND_URL=https://your-app.pages.dev
   CORS_ORIGIN=https://your-app.pages.dev
   
   # OAuth (Optional - add later)
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_CALLBACK_URL=https://your-railway-url/auth/google/callback
   
   MICROSOFT_CLIENT_ID=your-microsoft-client-id
   MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
   MICROSOFT_CALLBACK_URL=https://your-railway-url/auth/microsoft/callback
   ```

5. Deploy the service
   - Railway will automatically deploy on push to main branch

### 2.6 Get Backend URL

1. In Railway backend service, go to Settings → Networking
2. Click "Generate Domain"
3. Copy the Railway domain (e.g., `sap-ulhn-backend.up.railway.app`)
4. Note this URL - you'll need it for frontend configuration

---

## ☁️ Step 3: Cloudflare Pages Setup (Frontend)

### 3.1 Create Cloudflare Pages Project

1. Go to https://dash.cloudflare.com/
2. Navigate to "Workers & Pages"
3. Click "Create application" → "Pages"
4. Click "Connect to Git"
5. Authorize GitHub and select your `sap-ulhn` repository

### 3.2 Configure Build Settings

**Framework preset:** Next.js (Static HTML Export) or Next.js (App Router)

**Build settings:**
- **Production branch:** `main`
- **Build command:** 
  ```bash
  cd apps/frontend && pnpm install && pnpm build
  ```
- **Build output directory:** `apps/frontend/.next` or `apps/frontend/out`
- **Root directory:** `/` (leave as project root)

**Advanced settings:**
- **Node version:** `18` or `20`
- Add environment variable: `NODE_VERSION = 18`

### 3.3 Configure Environment Variables

In Cloudflare Pages project settings → Environment Variables:

**Production:**
```
NEXT_PUBLIC_API_URL=https://your-railway-backend-url.railway.app
NEXT_PUBLIC_APP_NAME=SAP ULHN
NODE_ENV=production
```

**Preview (optional):**
```
NEXT_PUBLIC_API_URL=https://your-railway-backend-url.railway.app
NEXT_PUBLIC_APP_NAME=SAP ULHN (Preview)
NODE_ENV=development
```

### 3.4 Deploy

1. Click "Save and Deploy"
2. Cloudflare will build and deploy your frontend
3. You'll get a URL like: `https://sap-ulhn.pages.dev`

### 3.5 Update Backend CORS

Go back to Railway backend environment variables and update:
```
FRONTEND_URL=https://sap-ulhn.pages.dev
CORS_ORIGIN=https://sap-ulhn.pages.dev
```

Then redeploy the backend service.

---

## 🔐 Step 4: OAuth Configuration (Optional)

### 4.1 Google OAuth

1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create OAuth 2.0 Client ID
5. Authorized redirect URIs:
   - `https://your-railway-url.railway.app/auth/google/callback`
6. Copy Client ID and Secret to Railway environment variables

### 4.2 Microsoft OAuth

1. Go to https://portal.azure.com/
2. Navigate to Azure Active Directory → App registrations
3. New registration
4. Redirect URI: `https://your-railway-url.railway.app/auth/microsoft/callback`
5. Create client secret
6. Copy Application (client) ID and secret to Railway environment variables

---

## 🗄️ Step 5: Database Setup

### 5.1 Run Migrations

Option 1: **Via Railway CLI**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migrations
railway run pnpm migration:run
```

Option 2: **TypeORM Sync (Development Only)**
- Add to Railway backend env: `TYPEORM_SYNCHRONIZE=true`
- On first deployment, entities will auto-sync
- **⚠️ Remove this in production!**

Option 3: **Manual via Railway Shell**
1. In Railway backend service → Shell
2. Run: `pnpm migration:run`

### 5.2 Seed Initial Data (Optional)

Create seed script in backend:
```bash
railway run pnpm seed
```

---

## 🌐 Step 6: Custom Domain (Optional)

### 6.1 Cloudflare Pages Custom Domain

1. In Cloudflare Pages project → Custom domains
2. Click "Set up a custom domain"
3. Enter your domain (e.g., `ulhn.yourdomain.com`)
4. Follow DNS setup instructions
5. Wait for SSL certificate provisioning

### 6.2 Railway Custom Domain

1. In Railway backend service → Settings → Networking
2. Click "Custom Domain"
3. Enter your backend subdomain (e.g., `api.ulhn.yourdomain.com`)
4. Add CNAME record to your DNS:
   ```
   CNAME api.ulhn.yourdomain.com → your-railway-url.railway.app
   ```

### 6.3 Update Environment Variables

Update all URLs in both Railway and Cloudflare to use custom domains.

---

## 🔄 Step 7: Continuous Deployment

### 7.1 Automatic Deployments

**Railway:**
- Automatically deploys on push to `main` branch
- Configure in Settings → Deploy

**Cloudflare Pages:**
- Automatically deploys on push to `main` branch
- Preview deployments for pull requests

### 7.2 Branch Deployments

**For staging environment:**
1. Create `staging` branch
2. Configure Railway to deploy `staging` branch to separate service
3. Configure Cloudflare Pages to deploy `staging` branch to preview URL

---

## 🧪 Step 8: Testing Deployment

### 8.1 Health Checks

**Backend:**
```bash
curl https://your-railway-url.railway.app/health
```

Expected response: `{"status":"ok"}`

**Frontend:**
Visit: `https://your-cloudflare-url.pages.dev`

### 8.2 API Testing

```bash
# Register user
curl -X POST https://your-railway-url.railway.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}'

# Login
curl -X POST https://your-railway-url.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}'
```

### 8.3 Frontend Flow

1. Visit frontend URL
2. Click "Sign up"
3. Create account
4. Verify redirect to dashboard
5. Test OAuth (if configured)

---

## 📊 Step 9: Monitoring & Logs

### 9.1 Railway Monitoring

- Railway Dashboard → Your Service → Deployments
- View logs in real-time
- Monitor CPU/Memory usage
- Set up alerts

### 9.2 Cloudflare Analytics

- Cloudflare Pages → Your Project → Analytics
- View page views, requests, bandwidth
- Monitor build times

### 9.3 Error Tracking (Recommended)

Consider adding:
- **Sentry** for error tracking
- **LogRocket** for session replay
- **Datadog** for APM

---

## 🔒 Security Checklist

- [ ] Generate strong JWT secrets (32+ characters)
- [ ] Enable HTTPS only (Railway & Cloudflare auto-provide SSL)
- [ ] Configure CORS to only allow your frontend domain
- [ ] Set `NODE_ENV=production` in Railway
- [ ] Remove `TYPEORM_SYNCHRONIZE=true` after initial setup
- [ ] Use environment variables for all secrets
- [ ] Enable Railway's built-in DDoS protection
- [ ] Set up rate limiting in backend
- [ ] Configure OAuth redirect URIs correctly
- [ ] Use strong database passwords (Railway auto-generates)

---

## 💰 Cost Estimates

### Railway (Backend + Database)
- **Hobby Plan:** $5/month (500 hours)
- **Developer Plan:** $10/month (unlimited)
- **Team Plan:** $20/month/member
- Includes: PostgreSQL, Redis, compute resources

### Cloudflare Pages (Frontend)
- **Free Plan:** Unlimited requests, 500 builds/month
- **Pro Plan:** $20/month (advanced features)
- Includes: CDN, DDoS protection, SSL

**Total estimated cost:** $5-15/month for hobby project

---

## 🚨 Troubleshooting

### Build Failures

**Railway:**
- Check build logs
- Verify `pnpm install` runs successfully
- Ensure all dependencies are in `package.json`

**Cloudflare:**
- Check build command path
- Verify Next.js build succeeds locally
- Check Node version compatibility

### CORS Errors

- Verify `CORS_ORIGIN` in Railway matches Cloudflare URL
- Check backend CORS configuration in `main.ts`
- Ensure no trailing slashes in URLs

### Database Connection Issues

- Verify Railway database is running
- Check environment variables are correctly linked
- Test connection in Railway shell

### OAuth Issues

- Verify redirect URIs match exactly
- Check client IDs and secrets
- Ensure OAuth apps are enabled

---

## 📚 Useful Commands

```bash
# Railway CLI
railway login
railway link
railway logs
railway run [command]
railway shell

# Git
git add .
git commit -m "Your message"
git push origin main

# Local testing before deploy
pnpm build
pnpm start:prod
```

---

## 🎯 Next Steps After Deployment

1. ✅ Test all authentication flows
2. ✅ Verify database connectivity
3. ✅ Check API endpoints via Swagger
4. ✅ Test frontend → backend communication
5. ✅ Configure OAuth providers
6. ✅ Set up monitoring and alerts
7. ✅ Add custom domain (optional)
8. ✅ Configure backup strategy
9. ✅ Set up staging environment
10. ✅ Document deployment process for team

---

## 📞 Support Resources

- **Railway:** https://docs.railway.app/
- **Cloudflare Pages:** https://developers.cloudflare.com/pages/
- **NestJS Deployment:** https://docs.nestjs.com/deployment
- **Next.js Deployment:** https://nextjs.org/docs/deployment

---

**Deployment Status:** Ready to deploy ✅
**Estimated Deployment Time:** 30-45 minutes
**Difficulty Level:** Intermediate
