# Handoff - 2026-08-17, session ended mid-flight (PC shutdown)

Everything below is COMMITTED AND PUSHED to main. Nothing is lost.
A /teleport attempt earlier wiped uncommitted work once - it was fully
recreated from conversation context and re-verified (tsc + 618 tests)
before the final push. Lesson: commit before any teleport.

## What shipped this session (all on main)

1. **ספר הטיול (free)** - print export upgraded: place descriptions per
   stop + Shabbat annex + kosher annex (opt-in). Shared computation in
   `src/lib/trip/shabbatRows.ts` (panel + print read one source).
2. **סיפור הטיול (premium)** - trip becomes a public story page:
   `supabase-stories.sql`, `lib/server/stories.ts`, `/api/story`,
   `/story/[slug]` (+StoryView), `TripStoryPanel` in TripWorkspace.
   Creation premium, viewing free. Photos via Supabase Storage bucket
   `story-photos`, server-side upload with strict data-URL validation.
3. **טיול משותף (premium)** - invite link `/join/<code>`, friends join
   free, see the live trip (server-built snapshot), vote 👍/👎 per stop;
   organizer sees tallies in `TripGroupPanel`. `supabase-group-trips.sql`,
   `lib/server/groupTrips.ts` (+4 tests), `/api/group`, `JoinClient`.
4. Earlier same session: PayPal premium subscription wiring
   (`paypalSubs.ts`, checkout route, webhook handling,
   `supabase-paypal-subs.sql`), performance audit fixes, zmanim
   catalog-wide guarantee (all 166 destinations resolve a timezone).

## Pricing decisions made (Netanel said "price to your liking")
- Premium stays ₪19.90/month; story + group are its content.
- Story/group creation = premium-only; viewing/joining = free (viral).
- Pre-departure check unchanged (₪29.90 standalone, included in premium).

## IMMEDIATE next steps (in order)

1. **Run `npm run build` + `npx eslint` on the group-trips files.** The
   final commit was verified with tsc + full test suite (618 pass) but
   the PC shut down before a full build/lint run on it. Files:
   groupTrips.ts/.test.ts, api/group/route.ts, join/[code]/*,
   TripGroupPanel.tsx, supabaseAdmin.ts (adminDelete), stories.ts (id
   field on StoryStop).
2. **Netanel must run 3 SQL files** in Supabase SQL Editor (all safe to
   re-run; supabase-check.sql verifies all of them):
   - `supabase-paypal-subs.sql` (premium subscription activation fails
     silently on old plan_source constraint without it)
   - `supabase-stories.sql` (stories table + get_trip_story + bucket)
   - `supabase-group-trips.sql` (3 group tables)
3. **Live verification** (none of the 3 premium features has run against
   real Supabase yet - only mocks): create story + upload photo + publish
   + open /story/<slug>; create invite + join from second account + vote;
   PayPal sandbox subscription end-to-end (subscribe, webhook activates,
   cancel downgrades). Browser/RTL check of the new panels + /join +
   /story pages at 390px is also owed.
4. **Premium page rebundle NOT DONE** - /premium still shows the old
   feature list. It should now sell: story, group trips, pre-departure
   check included, guaranteed lane + quotas. This was the last planned
   step of the "do everything" directive and was not started.
5. Update CLAUDE.md session log with a proper entry for this session
   (hard rule 8) - this handoff file is the raw material.

## Standing items (unchanged)
- `PAYPAL_ALLOW_SANDBOX_LIVE_DOMAIN=true` is still set in Vercel -
  remove it + redeploy once sandbox testing is done. PAYPAL_MODE is
  still `sandbox`; live keys not yet created.
- Production PayPal webhook (when created) MUST use
  https://www.tiyulplus.com/... (with www) - non-www 308-redirects and
  PayPal drops the delivery. This burned an hour in sandbox.
- Netanel's account: owner + permanent premium grant (plan_source
  'grant') - good for testing premium features; the subscribe button
  will say "already premium", use another account to test checkout.
