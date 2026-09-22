# Runbook - when something goes wrong

The four operational checks: **knowing**, **what the visitor sees**, **getting
data back**, and **getting to a working version**. Written to be read while
something is on fire, so the commands are complete and there is no reasoning
to reconstruct.

---

## 1. Will I know? (alerts + monitoring)

### What already reaches you

| event | where it comes from | how often |
|---|---|---|
| any server error (route, page render, metadata) | `src/instrumentation.ts` -> `errorAlert.ts` | once per distinct failure **per hour** |
| any browser error that hits an error boundary | `app/error.tsx` -> `/api/client-error` | same |
| AI spend at 90% of the day, or one caller at 60% of their cap | `budget.ts` | once per day / per identity |
| a purchase, a subscription starting or ending | `mailEvents` / `alert.ts` | every time |

All of them POST to `PURCHASE_ALERT_WEBHOOK`, falling back to
`AI_BUDGET_ALERT_WEBHOOK`. **Without one of those set, everything above is
only a line in the Vercel log.**

The hourly dedupe is deliberate: a broken deploy fails on every request, and a
channel that receives four hundred identical messages is a channel that gets
muted. Repeats are counted, not sent.

### Confirm the channel works

`/admin` -> the AI spend card -> **"בדיקת התראה"**. It sends a real, labelled
test message and waits for the answer, so "configured" becomes "it arrived".

### Uptime

`GET https://www.tiyulplus.com/api/health`

- **200** `{"status":"ok"}` - everything configured and the database answers.
- **200** `{"status":"degraded"}` - the database is fine, something optional
  is not configured. Not an outage; do not page for it.
- **503** `{"status":"down"}` - the database is unreachable. Nobody can sign
  in, no trip syncs, no payment is recorded. **This is the one worth waking up
  for.**

Point an uptime monitor (UptimeRobot, Better Stack, Cronitor - any of them)
at that URL, alert on a non-200, check every 1-5 minutes.

For detail, send the cron secret:

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" https://www.tiyulplus.com/api/health
# {"status":"degraded","checks":{"db":"ok","ai":"ok","mail":"off","alerts":"ok"},"dbMs":88}
```

Anonymously the answer is only `{status}` - which dependency is missing is a
fact about our infrastructure and not something a stranger polls for.

The health check deliberately **never calls the model**: at the measured
$0.06-$0.45 a call, a once-a-minute monitor would be a four-figure monthly
bill for proving a key exists.

---

## 2. What does the visitor see? (error handling)

| what broke | what renders | file |
|---|---|---|
| a page or a component | Hebrew RTL page, "try again" + home, a reference code | `src/app/error.tsx` |
| the root layout itself | the same, with its own `<html>`, inline styles, zero dependencies | `src/app/global-error.tsx` |
| the URL does not exist | the 404 with real catalog counts | `src/app/not-found.tsx` |

All three say plainly that **the trip is safe** - it lives in `localStorage`
and in the account, and a failed render cannot touch either. For somebody who
has spent forty minutes planning, that is the fact that decides whether they
press "try again" or close the tab.

The reference code on screen is Next's own `digest` where there is one, so it
appears in the Vercel log next to the stack trace and in the alert. If a user
quotes it:

```
Vercel -> the project -> Logs -> paste the code into the search box
```

---

## 3. Getting data back (backups + restore)

### The honest layering, before any command

1. **Supabase's own backups** are the first line. They restore the whole
   database - schema, functions, RLS policies and `auth.users` - and they are
   the only thing that can bring accounts back. Check the retention and the
   PITR setting on the project's plan; on the free tier it is daily and short.
2. **`npm run backup`** is the second line: a copy **you hold**, readable
   without a dashboard, from which one table can be repaired without rolling
   the whole project back to last night.

**`auth.users` cannot be restored from a dump.** It is exported for reference
(id, email, created_at) so you know whose rows are whose, but GoTrue assigns a
new uuid on create and every table keys on the old one. If accounts are lost,
the answer is (1), not (2).

### Take a backup

```bash
npm run backup                 # reads .env.local, writes backups/tiyul-backup-<stamp>.json
npm run backup -- --only user_trips,profiles
```

It is read-only, pages past the 1,000-row limit, and **compares its row count
against the server's own total** - a mismatch fails the run rather than
writing a file that looks complete. `backups/` is gitignored: a dump holds
real names, phone numbers and email addresses.

Do this before every SQL migration, and keep a copy somewhere that is not this
laptop.

### Put it back

```bash
npm run restore -- backups/tiyul-backup-2026-09-22T....json                    # DRY RUN, writes nothing
npm run restore -- backups/tiyul-backup-2026-09-22T....json --confirm          # apply
npm run restore -- backups/....json --only user_trips --confirm                # one table
```

**Upsert only. There is no delete in the restore script at all** - so it can
only put rows back or overwrite them with the backed-up version, and running
it against the wrong (healthy) project cannot destroy anything.

The cost of that, stated: a restore does **not** remove rows created after the
backup. It repairs and merges; it does not rewind. Rewinding is Supabase PITR.

Verified end to end (21/21) against a PostgREST stand-in: 2,350 rows across a
page boundary, wipe, dry run writing nothing, restore, and a second dump
byte-identical to the first.

### If one table is wrong right now

1. `npm run backup` **first** - even a broken state is worth having.
2. Restore only what is wrong: `--only <table> --confirm`.
3. Check `/admin` and one real trip in the browser.

---

## 4. Getting back to a working version (rollback)

### The code - about thirty seconds

```
Vercel -> the project -> Deployments -> the last known-good one -> ... -> Promote to Production
```

Or, if you would rather do it from git:

```bash
git revert <bad-sha>   # never reset --hard on a pushed branch
git push
```

Prefer Promote when the site is down: it needs no build.

### Why that is safe here, and the one thing that would break it

**Every migration in `sql/` is additive.** Add a table, add a column, add an
index, replace a function. So the previous build always finds the columns it
expects, and rolling the code back does not need the database to roll back
with it.

That property is enforced, not remembered: `migrationSafety.test.ts` fails on
a `drop table`, a `drop column`, a type change or a rename anywhere in `sql/`.
The single exception is `supabase-retire-stories.sql`, which is opt-in, runs
on nobody's setup path, and is named in the test's allowlist.

**If you ever do need a destructive change**, split it over two deploys:

1. ship code that stops reading the column, and wait;
2. only then drop it, in its own opt-in file.

Between those two, a rollback is still safe. Without them, it is not.

### After any rollback

- `GET /api/health` should be 200.
- Open `/chat`, build a one-city trip, check the map draws.
- Check the alert channel has gone quiet.

---

## Still to do (Netanel)

- [ ] Point an uptime monitor at `/api/health` and alert on non-200.
- [ ] Run `npm run backup` once and keep the file off this laptop. A backup
      nobody has taken is not a backup.
- [ ] Confirm the Supabase plan's backup retention and whether PITR is on -
      that is the only path back for `auth.users`.
- [ ] `PURCHASE_ALERT_WEBHOOK` / `AI_BUDGET_ALERT_WEBHOOK` set in Vercel, and
      the `/admin` test button pressed against production at least once.
