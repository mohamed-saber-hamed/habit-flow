# Habit Flow

A responsive personal habit and task tracker focused on gentle routines, visible progress, and private user data.

## Live deployment

[Open Habit Flow](https://habit-flow-mohamed-7522.vercel.app)

## Included

- Email/password sign-up, sign-in, and email-confirmation callback (when Supabase is configured).
- Habit create, edit, archive, complete, delete, scheduling, and optional reminder time.
- Daily check-ins with schedule-aware current and longest streaks.
- Weekly dashboard, 12-week activity heatmap, line chart, search and status filters.
- Task capture, completion, and deletion.
- CSV export and print-to-PDF report layout.
- Light/dark themes and browser reminders while the site is open.
- Supabase-backed API routes with per-user Row Level Security (RLS).

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Without Supabase environment variables, Habit Flow runs in a browser-local preview with sample data saved in that browser. Preview data is not account-protected and does not sync between devices.

## Enable accounts and cloud sync

1. Create a Supabase project.
2. Run [`supabase/migrations/001_habit_flow.sql`](supabase/migrations/001_habit_flow.sql) in that project's SQL editor.
3. Set these values in `.env.local` for local development and in the Vercel project's environment variables for deployments:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable/anon key only; never use a service-role key in the browser)
4. Add the local and deployed `/auth/callback` URLs to Supabase Auth's allowed redirect URLs. Configure email delivery and confirmation policy in Supabase Auth.

When the variables are absent, the app intentionally stays in preview mode. The SQL migration enables RLS on all data tables and scopes rows to the signed-in user.

## Quality checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

PDF export uses the browser's print dialog. Browser reminders are checked while Habit Flow is open; they are not background push notifications. Email reminders require a separate mail provider and are not included.
