# Requirements source and implementation notes

## Source

The primary source is the user-provided file `/home/ubuntu/upload/personal.pdf`, *Personal Productivity & Habit Tracking System – Habit Flow*.

Relevant sections: objectives and scope (PDF pp. 3–4), technology/hosting assumptions (p. 7), streak-calculation risk (p. 18), functional and non-functional requirements (pp. 23–24), ERD mapping (pp. 28–31), and GUI design (p. 32).

No third-party image from web search was included in the product. The visuals are custom CSS shapes, typography, and Lucide icons.

## Requirement coverage

- Account registration and login: Supabase Auth integration is implemented; it becomes active when the deployment receives Supabase URL/key settings.
- Password reset: email reset request and recovery password page are implemented.
- Habits: create, edit, archive, restore, delete, schedule by weekdays, optional reminder time, and daily completion logs.
- Metrics: schedule-aware current/longest streaks, weekly dashboard, completion rate, and an aligned 12-week heatmap.
- Reports: weekly trend line, CSV download, and print-to-PDF layout.
- Tasks: add, complete, and delete.
- Search/status filters, light/dark theme, responsive layout, and quick-add interactions.
- Browser reminders are checked while the page is open and permission is granted; background push/email delivery is not configured.
- Supabase schema and per-user RLS are defined in `supabase/migrations/001_habit_flow.sql`.

## Deployment boundary

This deployment is in preview mode until a Supabase project is selected and its public URL and anon/publishable key are added to Vercel. Preview data is kept in the current browser only; it does not provide cross-device persistence or production account storage. The app never embeds a Supabase service-role key.
