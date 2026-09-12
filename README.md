# PostPilot

AI-powered Instagram & Facebook auto-posting SaaS.

## Stack
- **Frontend**: Next.js 14 (App Router) → Cloudflare Pages
- **Backend**: Cloudflare Workers via Next.js API routes
- **Database**: Supabase (Postgres + Auth + RLS)
- **Automation**: n8n + Make.com (webhook-triggered per user)
- **Meta API**: Instagram Graph API for publishing

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Supabase
1. Create a project at supabase.com
2. Run `supabase/schema.sql` in the SQL editor
3. Copy your project URL and keys

### 3. Set up Meta App
1. Create a Meta Developer App at developers.facebook.com
2. Add Instagram Graph API and Facebook Login products
3. Set OAuth redirect URI to: `https://yourdomain.com/api/meta/callback`

### 4. Configure environment
```bash
cp .env.local.example .env.local
# Fill in all values
```

### 5. Run locally
```bash
npm run dev
```

### 6. Deploy to Cloudflare Pages
```bash
npm run pages:build
npm run pages:deploy
```
Add all environment variables in the Cloudflare Pages dashboard.

## Phase 2 (next)
- Cloudflare Cron Workers to fire per-user schedule webhooks
- n8n webhook endpoint that pulls user context from Supabase
- AI content generation per user's business profile
- Make.com publishing workflow

## Project structure
```
src/
  app/
    page.tsx                  # Landing page
    auth/
      login/                  # Sign in
      register/               # Sign up
      onboarding/             # Business profile setup (3-step)
    dashboard/
      page.tsx                # Overview
      connect/                # Instagram OAuth
      schedule/               # Manage schedules
      posts/                  # Post history
      settings/               # Business profile
    api/
      meta/callback/          # Meta OAuth callback
  components/
    layout/Sidebar.tsx
  lib/
    supabase/client.ts        # Browser Supabase client
    supabase/server.ts        # Server Supabase client
    utils.ts                  # Helpers + constants
  types/index.ts              # All TypeScript types
  middleware.ts               # Auth protection
supabase/
  schema.sql                  # Full DB schema with RLS
```
