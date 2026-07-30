# Listora

Upload property photos and rough notes; get a polished, shareable listing page.

Next.js 15 (App Router) · TypeScript · Tailwind · Drizzle + Neon Postgres · Groq (swappable to Claude) · Vercel Blob

## Setup

```bash
npm install
cp .env.example .env.local
```

Then, in order:

1. **Create a Neon project** and paste the **pooled** connection string (host contains
   `-pooler`) into `DATABASE_URL` in `.env.local`.

2. **Push the schema:**
   ```bash
   npm run db:push
   ```

3. **Seed the dev agent** and copy the printed id into `DEV_AGENT_ID`:
   ```bash
   npm run db:seed
   ```

4. **Add your Groq key** to `GROQ_API_KEY` (from https://console.groq.com — keys start with
   `gsk_`). Verify the model with `npm run ai:test`.

   > **Groq, not Grok.** GroqCloud (`api.groq.com`, `gsk_` keys) serves open-weight models.
   > xAI's Grok is a different product (`api.x.ai`, `xai-` keys). They are easy to confuse.

5. **Optional — photo uploads.** Create a Blob store in your Vercel project
   (Storage → Blob) and put its token in `BLOB_READ_WRITE_TOKEN`. Without it the listing form
   still works, minus photos.

6. **Run it:**
   ```bash
   npm run dev
   ```

`/` is the marketing page, `/dashboard` is the agent view, `/listing/<slug>` is a public page.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:push` | Push schema to Neon (no migration files) |
| `npm run db:generate` | Generate SQL migrations into `drizzle/` |
| `npm run db:studio` | Drizzle Studio |
| `npm run db:seed` | Create/print the dev agent |
| `npm run db:demo` | Insert a demo listing (`-- --remove` to delete it) |
| `npm run ai:test` | Generate copy for a sample listing; pass model ids to compare |
| `npm run check:validation` | Smoke-check the listing form schema |
| `npm run check:e2e` | draft → generate → publish → fetch public page (needs `npm run dev` running; cleans up after itself) |

Use `db:push` while iterating on the schema. Switch to `db:generate` + committed migrations
before you have real customer data.

**Always read what `db:push` says it will execute.** Neon runs PostgreSQL 18, which catalogues
NOT NULL constraints in `pg_constraint` (a PG17 change). `drizzle-kit` 0.30 did not understand
`contype = 'n'` and generated `DROP CONSTRAINT "listings_..._not_null"` for every one of them —
i.e. a push that would have silently stripped NOT NULL off the whole table. Fixed by upgrading
to `drizzle-kit` 0.31+, which reports "No changes detected" correctly. If you ever downgrade,
or see unexplained `DROP CONSTRAINT` lines, stop and check the tool version against the server
version.

Note also that `drizzle-kit generate` in this repo produces a full `CREATE TABLE` baseline,
because the tables were created with `push` and there is no migration history in `drizzle/`.
Don't apply that blindly against the live database.

## Architecture notes

**Auth is email + password, with no auth library.** Node's built-in `scrypt` hashes
passwords (`lib/auth/password.ts`) and an HMAC-signed cookie carries the session
(`lib/auth/session.ts`). No `next-auth`, no `bcrypt`, no sessions table — a signed stateless
token means no database lookup per request, which matters on serverless.

`AUTH_SECRET` (32+ chars) is **required in every environment**. Changing it signs everyone
out at once, which is the intended emergency lever.

`getCurrentAgent()` remains the single place the app asks who is signed in. `SKIP_AUTH` still
skips the login screen, but is now **ignored unless `NODE_ENV=development`** — a deployed app
always uses real sessions, so there is no flag to get wrong in production.

**Middleware is not the security boundary.** `middleware.ts` only checks that a session
cookie *exists*, because the Edge runtime cannot load `node:crypto` to verify the signature.
Real verification happens in `getCurrentAgent()`, and the dashboard layout redirects to
`/login` when it returns null. A forged cookie therefore gets past middleware and then
resolves to no agent. For the same reason `SESSION_COOKIE` lives in
`lib/auth/constants.ts` — importing it from `session.ts` pulls `node:crypto` into the edge
bundle and fails the build.

Run `npm run check:auth` (hashing and token forgery) and `npm run check:tenants`
(one agent cannot read or edit another's listings) after touching any of this.

**AI provider is swappable.** The app only ever calls `generateListingCopy()` from
`lib/ai`. Groq is implemented; `lib/ai/claude.ts` is a documented stub. Switching is
`AI_PROVIDER=claude` plus implementing that one file. Provider output is always validated
against a Zod schema, so a malformed response fails loudly instead of reaching the UI.

Of the models reachable on Groq's free tier, only `llama-3.3-70b-versatile` reliably
returns valid JSON — `openai/gpt-oss-120b` and `qwen/qwen3.6-27b` both fail JSON mode,
even with the looser `json_object` fallback. Its prose is serviceable but noticeably
generic; see the note in `lib/ai/claude.ts` for the upgrade path.

**Never put concrete property details in the system prompt, even as style examples.**
An early version illustrated "be concrete and sensory" with a phrase about morning light on
a kitchen island. The model lifted it verbatim into a listing whose notes never mentioned a
kitchen — i.e. it published an invented feature to buyers. `lib/ai/prompt.ts` now describes
the principle without examples and explicitly forbids reusing its own wording. Re-check this
with `npm run check:e2e` after any prompt change; it's how the bug was found.

**Uploads bypass our compute.** `components/listing-form.tsx` uploads browser → Vercel Blob
directly, with `app/api/blob/upload/route.ts` only issuing short-lived tokens. Routing image
bytes through a serverless function would hit Vercel's ~4.5 MB request-body cap after two or
three phone photos.

**Quotas are counted, not stored.** There is no `listings_used` column — `lib/quota.ts`
counts listings created since the agent's current billing-period start. A stored counter
would drift from Stripe on the first renewal and needs a reset job; this cannot.

**Neon HTTP driver.** `lib/db/index.ts` uses `drizzle-orm/neon-http`, which is stateless
and works in every Vercel runtime including Edge. It does not support interactive
transactions — if a route needs one, that route switches to `neon-serverless` on the Node
runtime.

**Agent contact details are fetched, not rendered.** `/api/listings/[slug]/contact` serves the
agent's name, email and phone only for **published** listings, and the public page requests it
on click. Rendering an email into the HTML of a page designed to be shared widely hands it to
every crawler that indexes it. Drafts return 404 so an unpublished listing leaks nothing.

## Not built yet

Steps 7–9 of the plan: dashboard edit/delete of listings, image reordering, Stripe billing,
and the marketing landing page (still a placeholder hero).

Known gaps in what exists: listings can be created and published but not edited or deleted
afterwards, image order is upload-order only (the cover is selectable, position is not), and
the AI cannot see uploaded photos — copy comes from the agent's typed notes alone, because no
vision-capable model is available on the Groq key.

**View counts filter bots.** `/api/listings/[slug]/view` is POSTed by the browser after the
page renders — not incremented during render, which would freeze under caching and
double-count under Strict Mode. It rejects known crawler user-agents and any agent shorter
than 16 characters. That last rule exists because Node's own `fetch` user-agent was being
counted as a buyer; WhatsApp, Facebook and Google each fetch a shared link to build a preview
card, so without filtering one shared message reads as three views.
