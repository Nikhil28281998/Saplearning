# SAP ULHN - Frontend

Next.js 14 frontend application for the SAP Unified Learning Hub Navigator.

## 🚀 Features

- **Server-Side Rendering**: Next.js 14 with App Router
- **Modern UI**: Tailwind CSS + shadcn/ui components
- **Dark Mode**: System-aware theme switching
- **Authentication**: JWT + OAuth integration
- **State Management**: Zustand for global state
- **Form Validation**: React Hook Form + Zod
- **Responsive Design**: Mobile-first approach
- **SEO Optimized**: Meta tags, structured data
- **Type Safety**: Full TypeScript coverage

## 📋 Prerequisites

- Node.js 20+ LTS
- pnpm 8+

## 🛠️ Installation

```bash
# From project root
pnpm install

# Or from frontend directory
cd apps/frontend
pnpm install
```

## ⚙️ Configuration

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Update environment variables:
   - `NEXT_PUBLIC_API_URL`: Backend API URL
   - `NEXT_PUBLIC_APP_NAME`: Application name
   - OAuth redirect URLs

## 🚦 Running the Application

### Development
```bash
pnpm dev
```
Visit: http://localhost:3000

### Production Build
```bash
pnpm build
pnpm start
```

### Type Checking
```bash
pnpm type-check
```

### Linting
```bash
pnpm lint
```

## 📂 Project Structure

```
src/
├── app/                   # Next.js App Router
│   ├── (auth)/           # Auth pages (login, register)
│   ├── (dashboard)/      # Dashboard pages
│   ├── search/           # Search page
│   ├── resources/        # Resource pages
│   ├── modules/          # Module pages
│   ├── processes/        # Process pages
│   ├── roles/            # Role pages
│   ├── workspace/        # User workspace
│   │   ├── favorites/
│   │   ├── playlists/
│   │   ├── notes/
│   │   └── history/
│   ├── admin/            # Admin panel
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/           # React components
│   ├── ui/              # shadcn/ui components
│   ├── layout/          # Layout components
│   ├── home/            # Home page components
│   ├── search/          # Search components
│   ├── resources/       # Resource components
│   └── providers/       # Context providers
├── lib/                 # Utilities
│   ├── api-client.ts   # API client
│   ├── auth.ts         # Auth utilities
│   └── utils.ts        # Helper functions
├── hooks/              # Custom React hooks
├── store/              # Zustand stores
├── types/              # TypeScript types
└── styles/             # Global styles
```

## 🎨 UI Components

This project uses [shadcn/ui](https://ui.shadcn.com/) components:

```bash
# Add new component
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
```

Available components:
- Button, Card, Dialog, Dropdown, Input
- Table, Tabs, Toast, Tooltip
- Form, Select, Checkbox, Radio
- And more...

## 🎨 Styling

- **Tailwind CSS**: Utility-first CSS framework
- **CSS Variables**: Theme customization
- **Dark Mode**: Automatic theme switching
- **Responsive**: Mobile, tablet, desktop breakpoints

### Color Scheme
```css
/* Light Mode */
--primary: hsl(221.2 83.2% 53.3%)
--background: hsl(0 0% 100%)

/* Dark Mode */
--primary: hsl(217.2 91.2% 59.8%)
--background: hsl(222.2 84% 4.9%)
```

## 🔐 Authentication

### Pages
- `/login`: Email/password login
- `/register`: User registration
- `/auth/google`: Google OAuth callback
- `/auth/microsoft`: Microsoft OAuth callback

### Protected Routes
```tsx
// Middleware automatically protects routes
// Configure in src/middleware.ts
```

## 📱 Pages

### Public Pages
- `/`: Home page with search
- `/search`: Search results
- `/resources/:id`: Resource details
- `/modules`: SAP modules
- `/processes`: Business processes
- `/roles`: SAP roles

### Protected Pages
- `/workspace`: User dashboard
- `/workspace/favorites`: Saved favorites
- `/workspace/playlists`: Custom playlists
- `/workspace/notes`: Personal notes
- `/workspace/history`: View history
- `/profile`: User profile settings

### Admin Pages
- `/admin`: Admin dashboard
- `/admin/users`: User management
- `/admin/content`: Content management
- `/admin/crawlers`: Crawler management
- `/admin/analytics`: Analytics

## 🧪 Testing

```bash
# Unit tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage

# E2E tests (Playwright)
pnpm e2e

# E2E UI mode
pnpm e2e:ui
```

## 🌐 Internationalization

Currently supports:
- English (en)
- German (de)
- Spanish (es)
- French (fr)

Add new language:
```typescript
// src/i18n/locales/[lang].json
```

## 📊 Analytics

Supports:
- Google Analytics 4
- Google Tag Manager

Configure in `.env.local`:
```bash
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
```

## 🚀 Performance

- **Image Optimization**: Next.js Image component
- **Code Splitting**: Automatic route-based splitting
- **Lazy Loading**: Dynamic imports for heavy components
- **Caching**: SWR for data fetching
- **Bundle Analysis**: `pnpm analyze`

## 🚢 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Docker
```bash
docker build -t ulhn-frontend .
docker run -p 3000:3000 ulhn-frontend
```

### Static Export
```bash
pnpm build
# Output in .next folder
```

## 🔧 Configuration Files

- `next.config.mjs`: Next.js configuration
- `tailwind.config.js`: Tailwind CSS configuration
- `tsconfig.json`: TypeScript configuration
- `postcss.config.js`: PostCSS configuration
- `.eslintrc.json`: ESLint rules

## 📝 Environment Variables

See `.env.example` for all available variables.

Required:
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_APP_NAME`: Application name

Optional:
- `NEXT_PUBLIC_GA_ID`: Google Analytics ID
- `NEXT_PUBLIC_SENTRY_DSN`: Sentry DSN

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Add tests
4. Submit a pull request

## 📄 License

MIT
