# Drop Board

Private owner-first web app for fast clipboard sync and quick file transfer between phone and desktop.

## Architecture summary

- Frontend: Next.js App Router + TypeScript + Tailwind CSS + custom design system in [src/app/globals.css](src/app/globals.css).
- Auth: NextAuth credentials provider (owner-only), secure cookie session strategy, login page at [src/app/login/page.tsx](src/app/login/page.tsx).
- Data: PostgreSQL with Prisma models in [prisma/schema.prisma](prisma/schema.prisma).
- Validation: Zod schemas in [src/lib/validation.ts](src/lib/validation.ts).
- Upload storage:
- Dev fallback uses local storage under public/uploads.
- Production can use Postgres-backed storage (`STORAGE_DRIVER=db`) or S3-compatible object storage.
- Cleanup workflow: cron-ready route at [src/app/api/cron/cleanup/route.ts](src/app/api/cron/cleanup/route.ts) with secret validation.

## Route map

- Login: [src/app/login/page.tsx](src/app/login/page.tsx)
- Bridge: [src/app/bridge/page.tsx](src/app/bridge/page.tsx)
- Drop: [src/app/drop/page.tsx](src/app/drop/page.tsx)
- Inbox: [src/app/inbox/page.tsx](src/app/inbox/page.tsx)
- Settings: [src/app/settings/page.tsx](src/app/settings/page.tsx)
- Public share retrieval: [src/app/s/[token]/page.tsx](src/app/s/[token]/page.tsx)

## API route handlers

- Auth route: [src/app/api/auth/[...nextauth]/route.ts](src/app/api/auth/[...nextauth]/route.ts)
- Bridge CRUD: [src/app/api/bridge/route.ts](src/app/api/bridge/route.ts), [src/app/api/bridge/[id]/route.ts](src/app/api/bridge/[id]/route.ts)
- Save bridge item as note: [src/app/api/bridge/[id]/save-note/route.ts](src/app/api/bridge/[id]/save-note/route.ts)
- Drop upload/list: [src/app/api/drop/route.ts](src/app/api/drop/route.ts)
- Drop update/delete: [src/app/api/drop/[id]/route.ts](src/app/api/drop/[id]/route.ts)
- Share link create: [src/app/api/share-links/route.ts](src/app/api/share-links/route.ts)
- Share link resolve/revoke: [src/app/api/share-links/[token]/route.ts](src/app/api/share-links/[token]/route.ts)
- Unified inbox query: [src/app/api/inbox/route.ts](src/app/api/inbox/route.ts)
- Cleanup job: [src/app/api/cron/cleanup/route.ts](src/app/api/cron/cleanup/route.ts)

## Prisma schema

Source of truth: [prisma/schema.prisma](prisma/schema.prisma)

Contains models and enums required by product scope:
- User with owner role
- BridgeItem (text/code/link/image)
- DropFile
- ShareLink
- SavedNote mapping for save-as-note action

## Folder tree

```
drop-vincent/
  prisma/
    schema.prisma
    seed.ts
  src/
    app/
      api/
        auth/[...nextauth]/route.ts
        bridge/route.ts
        bridge/[id]/route.ts
        bridge/[id]/save-note/route.ts
        drop/route.ts
        drop/[id]/route.ts
        inbox/route.ts
        share-links/route.ts
        share-links/[token]/route.ts
        cron/cleanup/route.ts
      bridge/page.tsx
      drop/page.tsx
      inbox/page.tsx
      login/page.tsx
      s/[token]/page.tsx
      settings/page.tsx
      globals.css
      layout.tsx
      page.tsx
    components/
      app-shell.tsx
      bridge-board.tsx
      drop-board.tsx
      inbox-board.tsx
      keyboard-shortcuts.tsx
      login-form.tsx
      logout-button.tsx
      settings-panel.tsx
    lib/
      dashboard-data.ts
      db.ts
      env.ts
      storage.ts
      utils.ts
      validation.ts
    auth.ts
    proxy.ts
    types/next-auth.d.ts
  .env.example
  vercel.json
```

## Setup and run commands

1. Install dependencies.

```bash
npm install
```

2. Create env file.

```bash
cp .env.example .env.local
```

3. Set required values in .env.local.

4. Generate Prisma client.

```bash
npx prisma generate
```

5. Run migrations.

```bash
npx prisma migrate dev --name init
```

6. Seed owner account.

```bash
npx prisma db seed
```

7. Start app.

```bash
npm run dev
```

8. Production build check.

```bash
npm run build
```

## Env variable checklist

Required:
- DATABASE_URL
- NEXTAUTH_SECRET
- NEXTAUTH_URL
- OWNER_EMAIL
- OWNER_PASSWORD
- CRON_SECRET

Storage required for production:
- Option A (Postgres only):
- STORAGE_DRIVER=db
- Option B (S3-compatible):
- STORAGE_DRIVER=s3
- S3_BUCKET
- S3_REGION
- S3_ACCESS_KEY_ID
- S3_SECRET_ACCESS_KEY
- S3_PUBLIC_BASE_URL
- S3_ENDPOINT only if using non-AWS S3-compatible provider

## Security checklist

- Owner-only credentials auth with no public registration.
- All protected routes require session and redirect to login.
- Public link route is retrieval-only by token.
- Login attempts are rate-limited in auth flow.
- Zod validation on bridge/drop/share inputs.
- File MIME and max size checks.
- Session secret required in production.
- Cron cleanup endpoint protected with secret.
- Expiry and revocation checked before share retrieval.
- Password is hashed with bcrypt before persistence.

## Manual test checklist

1. Login flow:
1. Open /login and verify valid owner login works.
2. Verify invalid credentials fail.
3. Verify non-authenticated visit to /bridge redirects to /login.

2. Bridge:
1. Create text, code, link item.
2. Create image bridge item.
3. Use copy/open/save as note actions.
4. Verify item appears on another device after polling.

3. Drop:
1. Upload file from desktop via drag-and-drop.
2. Upload file from mobile browser camera/gallery picker.
3. Copy generated share link and open /s/[token].
4. Revoke file and verify link no longer resolves.

4. Inbox:
1. Confirm bridge and drop records appear in one timeline.
2. Use chips: text, links, images, files, code, pinned, expiring-soon.
3. Run bulk delete, extend expiry, copy all links.

5. Cleanup:
1. Mark files as expired.
2. Call /api/cron/cleanup with x-cron-secret header.
3. Verify expired rows and links are removed.

## Deployment steps (Vercel + custom subdomain)

### A. Vercel project setup

1. Push repository to GitHub.
2. Import repository into Vercel.
3. Set framework to Next.js (auto-detected).
4. Add all env vars from checklist for Production and Preview as needed.
5. Set build command as npm run build (default works).
6. Deploy.

### B. Postgres setup

1. Create Postgres instance (Neon, Supabase, Railway, RDS, etc.).
2. Set DATABASE_URL in Vercel.
3. Run migrations with Vercel build hook or locally:

```bash
npx prisma migrate deploy
```

4. Seed owner account once:

```bash
npx prisma db seed
```

### C. Object storage setup

1. If you want Postgres-only storage, set `STORAGE_DRIVER=db` and skip object storage.
2. If you want object storage, create bucket on an S3-compatible provider.
3. Configure public base URL or CDN URL.
4. Set `STORAGE_DRIVER=s3` and all S3 env vars in Vercel.
5. Verify upload and public URL retrieval on /drop.

### D. Cron setup

1. Keep [vercel.json](vercel.json) committed.
2. Ensure CRON_SECRET exists in Vercel env.
3. Configure Vercel cron to hit /api/cron/cleanup with x-cron-secret via Vercel managed cron request headers or external scheduler.
4. Validate cleanup by checking response counts.

### E. Namecheap DNS for drop.vincentrj.me

1. In Vercel project, add domain drop.vincentrj.me.
2. In Namecheap DNS for vincentrj.me:
3. Add CNAME record:
- Host: drop
- Value: cname.vercel-dns.com
- TTL: Automatic
4. Remove conflicting A/CNAME records for host drop if present.
5. Wait for DNS propagation and verify in Vercel domain panel.
6. Confirm TLS certificate is issued and active.

## Full implementation code

All implementation files are in this repository and referenced above.
Core entry points:
- Auth config: [src/auth.ts](src/auth.ts)
- Data schema: [prisma/schema.prisma](prisma/schema.prisma)
- Protected shell: [src/components/app-shell.tsx](src/components/app-shell.tsx)
- Bridge UI/API: [src/components/bridge-board.tsx](src/components/bridge-board.tsx), [src/app/api/bridge/route.ts](src/app/api/bridge/route.ts)
- Drop UI/API: [src/components/drop-board.tsx](src/components/drop-board.tsx), [src/app/api/drop/route.ts](src/app/api/drop/route.ts)
- Inbox UI/API: [src/components/inbox-board.tsx](src/components/inbox-board.tsx), [src/app/api/inbox/route.ts](src/app/api/inbox/route.ts)
- Share retrieval: [src/app/s/[token]/page.tsx](src/app/s/[token]/page.tsx), [src/app/api/share-links/[token]/route.ts](src/app/api/share-links/[token]/route.ts)
- Cleanup cron route: [src/app/api/cron/cleanup/route.ts](src/app/api/cron/cleanup/route.ts)
