# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server on localhost:3000
npm run build      # Production build
npm run start      # Start production server
npm run lint       # Run ESLint

# Pre-commit validation (audit: security, lint, schema, tests, UX, SEO)
python .agent/scripts/checklist.py .

# Full pre-deploy verification (+ Lighthouse, Playwright, bundle analysis)
python .agent/scripts/verify_all.py . --url http://localhost:3000
```

No test runner is configured yet (no Jest/Vitest setup).

## Architecture

**Frisierbar** is a hairdresser appointment-booking app with a public customer-facing chat and a private staff dashboard.

### Tech Stack

- **Next.js 16** (App Router, `src/app/`) with TypeScript and Tailwind CSS v4
- **Supabase** — auth (anonymous for customers, email/password for staff), PostgreSQL database, Realtime subscriptions
- **Groq** (`llama-3.3-70b-versatile`) — powers the customer-facing AI chatbot (streaming) and appointment extraction; uses the OpenAI SDK with a custom `baseURL`
- **Google Calendar API** — creates calendar events via a Service Account JWT when a booking is confirmed

### Pages & Routes

| Path | Description |
|---|---|
| `/` | Public landing page with CTA to `/chat` |
| `/chat` | Customer chat with AI bot (anonymous Supabase auth) |
| `/dashboard` | Staff-only inbox — requires `role = 'staff'` in the `profiles` table |
| `POST /api/chat` | Groq streaming endpoint powering the AI chatbot |
| `POST /api/extract-appointment` | Calls Groq to parse appointment info from a message array |
| `POST /api/book-appointment` | Creates a Google Calendar event for a confirmed appointment |

### Data Flow

```
Customer (/chat)
  → signs in anonymously via Supabase
  → creates/joins a conversation
  → sends message → saved to Supabase
  → POST /api/chat (Groq streaming) → AI response streamed to UI
  → completed AI response saved to Supabase (sender_id: null)

Staff (/dashboard)
  → logs in with email/password
  → sees all conversations (customer + AI messages) via realtime
  → clicks "KI ANALYSE" → POST /api/extract-appointment (Groq extraction)
  → clicks "BESTÄTIGEN" → POST /api/book-appointment (Google Calendar event)
  → can also manually enter date/time/service
```

AI messages in the `messages` table have `sender_id: null` to distinguish them from customer and staff messages.

### Database Schema (Supabase)

Four tables in `supabase/schema.sql`:

- **`profiles`** — linked to `auth.users`; `role` is `'customer'` (default) or `'staff'`
- **`conversations`** — one per customer session; `status` is `pending → active → closed`; `last_message_sender_id` drives the unread indicator
- **`messages`** — chat history; triggers update `conversations.last_message_at` and `last_message_sender_id`
- **`appointments`** — confirmed bookings (currently not written by the app — only Google Calendar is updated on booking)

A DB trigger `on_auth_user_created` auto-creates a `profiles` row on signup.

### Promoting a User to Staff

The dashboard shows the required SQL when a logged-in user lacks the `staff` role:

```sql
UPDATE profiles SET role = 'staff' WHERE id = '<user-uuid>';
```

### Shared Lib (`src/lib/`)

- [supabase.ts](src/lib/supabase.ts) — singleton Supabase client + shared TypeScript types (`Profile`, `Conversation`, `Message`, `Appointment`)
- [calendar.ts](src/lib/calendar.ts) — Google Calendar `createCalendarEvent()` using Service Account JWT; timezone is hardcoded to `Europe/Berlin`; default duration is 60 minutes
- [business-hours.ts](src/lib/business-hours.ts) — `BUSINESS_HOURS` config (Mon/Wed/Sun closed), `formatBusinessHoursForPrompt()` for AI injection, `isWithinBusinessHours()` for booking validation
- [utils.ts](src/lib/utils.ts) — `cn()` helper (clsx + tailwind-merge)

### Required Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
GROQ_API_KEY
GOOGLE_CALENDAR_ID
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY   # multi-line PEM — use \\n escaping in .env.local
```

## Agent Toolkit (`.agent/`)

The `.agent/` directory contains the "Antigravity Kit" — 20 specialist agent personas, 36 skill modules, and 11 workflow slash commands documented in [.agent/ARCHITECTURE.md](.agent/ARCHITECTURE.md). The global AI behavior rules are in [.agent/rules/GEMINI.md](.agent/rules/GEMINI.md).

Key workflows invocable as slash commands: `/create`, `/debug`, `/enhance`, `/plan`, `/orchestrate`, `/ui-ux-pro-max`.
