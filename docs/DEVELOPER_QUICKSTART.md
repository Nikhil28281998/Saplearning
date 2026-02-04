# Developer Quickstart — SAP Courses

> Get the UI5 application running locally in 5 minutes

---

## Quick Setup (5 min)

### 1. Prerequisites

Install once:
```powershell
# Node.js & npm
choco install nodejs  # Or download from nodejs.org

# UI5 CLI
npm install -g @ui5/cli
```

### 2. Install & Start

```bash
cd ui/z.sap.courses/

# Install dependencies (first time only, ~2 min)
npm ci

# Start local server
npm run start
```

**Result**: Browser opens http://localhost:8080 with the UI5 app

---

## Development Workflow

### Edit Source Code

**Main files to edit:**
```
webapp/
├── Component.js              ← App initialization & role logic
├── manifest.json             ← App metadata & backend URLs
├── ext/                      ← Controller extensions
└── services/
    └── UserContext.js        ← Authorization adapter (DO NOT EDIT)
```

### Build for Testing

```bash
npm run build
# Creates: dist/ folder with minified bundle
```

### View Built App

```bash
# Serve the dist folder
ui5 serve --config ui5.yaml dist/

# Or: use the built-in server after npm run build
npm run start  # Automatically serves dist if available
```

---

## S/4 Deployment Setup (Optional)

### 1. Create `.env` File

Copy template:
```bash
cp .env.example .env
```

Edit `.env` with your S/4 details:
```env
S4_HOST=https://your-s4-system.example.com:44300
S4_CLIENT=100
S4_USER=DEPLOYMENT_USER
S4_PASSWORD=your_password
```

**⚠️ SECURITY**: Never commit `.env` to Git. It's in `.gitignore`.

### 2. Deploy to S/4

```bash
npm run deploy
```

This:
1. Builds the app
2. Zips the dist folder  
3. Uploads to S/4 via HTTP deployment
4. Stores in ABAP HTML5 repository

> Requires S/4 HTTP deployment enabled + user with deployment role

---

## Local Testing Against S/4

### Proxy Configuration

If you want to test OData calls to S/4 during local development:

**Option 1: Use Local Proxy (Recommended)**

Edit `ui5.yaml`:
```yaml
server:
  customMiddleware:
    - name: fiori-tools-proxy
      configuration:
        backend:
          - path: /sap
            url: https://your-s4-system.example.com:44300
            # Add basic auth if needed:
            # auth:
            #   username: S4_USER
            #   password: S4_PASSWORD
```

Then:
```bash
npm run start
```

Local UI calls to `/sap/opu/odata/...` are proxied to S/4.

**Option 2: Use HTTPS Certificate (Advanced)**

If S/4 uses self-signed certificate:
```yaml
server:
  customMiddleware:
    - name: fiori-tools-proxy
      configuration:
        ignoreCertErrors: true  # Only for dev!
```

---

## Troubleshooting

### "npm: command not found"
→ Install Node.js from nodejs.org or `choco install nodejs`

### "ui5: command not found"
→ Install UI5 CLI: `npm install -g @ui5/cli`

### "Cannot find module 'xyz'"
→ Run `npm ci` in the app directory

### "Port 8080 already in use"
→ Change port: `ui5 serve --port 9000`

### Service returns 404 on startup
→ Normal in development mode (S/4 not connected)  
→ Add proxy config (see above) to test against real S/4

---

## Code Quality

### Lint (if configured)

```bash
npm run lint  # Check code style
```

### Tests (if configured)

```bash
npm run test  # Run unit tests
```

---

## Project Structure

```
ui/z.sap.courses/
├── webapp/
│   ├── index.html                    ← Entry point
│   ├── Component.js                  ← App bootstrap
│   ├── manifest.json                 ← App metadata
│   ├── Component-preload.json         ← Auto-generated: component cache
│   ├── ext/
│   │   ├── main/Main.controller.js   ← Main view controller
│   │   ├── TrainingsListExtension.js ← Training list extension
│   │   └── training/                 ← Training-specific extensions
│   ├── services/
│   │   └── UserContext.js            ← S/4 authorization service
│   ├── css/
│   │   └── style.css                 ← Custom styles
│   ├── i18n/
│   │   └── i18n.properties           ← Translatable strings
│   └── test/
│       └── testsuite.qunit.html      ← Unit test runner
├── dist/                             ← Built output (git-ignored)
│   ├── index.html
│   ├── Component.js (minified)
│   ├── resources/
│   └── manifest.json
├── package.json
├── ui5.yaml                          ← UI5 build config
├── ui5-deploy.yaml                   ← S/4 deployment config
├── .env.example                      ← Credentials template
└── .eslintrc.json (optional)          ← Linting rules
```

---

## Key npm Scripts

| Script | Purpose |
|---|---|
| `npm run start` | Start UI5 dev server (http://localhost:8080) |
| `npm run build` | Create production bundle in dist/ |
| `npm run deploy` | Deploy to S/4 (requires .env + S/4 access) |
| `npm run lint` | Check code style (if configured) |
| `npm run test` | Run unit tests (if configured) |

---

## Common Tasks

### Add a New Extension
1. Create file under `webapp/ext/`
2. Declare in `manifest.json` under `sap.ui5.extends.extensions`
3. Restart `npm run start`

### Update OData URL
1. Edit `webapp/manifest.json` → `sap.app.dataSources.mainService.uri`
2. Rebuild: `npm run build`

### Test Different User Roles (Dev Only)
1. Open browser console
2. Run: `localStorage.setItem('saplc-role', 'Admin')`  ← 'Admin', 'Manager', or 'User'
3. Reload page

### Clear UserContext Cache
1. Open browser console
2. Run: `sap.ui.getCore().getComponent()._userContext.clearCache()`

---

## Next Steps

1. **For Features**: Edit `webapp/ext/` and `Component.js`
2. **For Backend URLs**: Update `manifest.json` dataSources
3. **For Styling**: Edit `webapp/css/style.css`
4. **For Deployment**: See EMBEDDED_S4_MIGRATION.md

---

## Support & References

- **UI5 Docs**: https://openui5.org/docs
- **S/4 OData**: SPRO → `/IWBEP/`
- **Fiori Best Practices**: https://experience.sap.com/fiori
- **Migration Guide**: See `docs/EMBEDDED_S4_MIGRATION.md`

---

**Happy Coding!** 🚀
