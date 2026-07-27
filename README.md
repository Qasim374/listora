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

## Architecture notes

**Auth is currently skipped.** `SKIP_AUTH=true` makes `getCurrentAgent()` resolve to the
seeded dev agent. Crucially, `listings.agent_id` exists and every query is scoped by it
already — so adding NextAuth later means editing one function
(`lib/auth/current-agent.ts`) plus a login page and middleware. No migration, no query
rewrites.

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

## Not built yet

Steps 5–9 of the plan: AI generation UI with preview/edit + publish, public gallery
carousel, view counting, dashboard edit/delete, Stripe billing, full marketing page.

Known gaps in what exists: the "Generate copy" button on a draft is disabled, drafts have no
publish action, and image reordering is drop-order only (cover is selectable, position is
not).
