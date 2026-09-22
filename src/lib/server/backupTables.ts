/**
 * What gets backed up, and - just as deliberately - what does not.
 *
 * ## The honest framing, before the list
 *
 * This is the **second** line of recovery, not the first. Supabase takes its
 * own backups of the whole database; those restore schema, functions, policies
 * and `auth.users` together, and they are the right tool for "the database is
 * gone". What they do not give you is a copy **you hold**, readable without a
 * dashboard, from which one accidentally-deleted table can be put back without
 * rolling the entire project back to last night.
 *
 * That is the gap this fills, and its limits are stated where they bite:
 * `auth.users` cannot be restored from here (see `IDENTITY_EXPORT_NOTE`).
 *
 * ## Why a table is in or out
 *
 * `keep: 'content'` - somebody's own work or a record we promised to hold. If
 * it is lost it is lost for good, and no amount of recomputation brings it
 * back. These are the reason the script exists.
 *
 * `keep: 'operational'` - small, changes rarely, and losing it changes
 * behaviour rather than losing history: a spend ceiling that resets, a feature
 * flag that reverts to its default. Cheap to carry, so it is carried.
 *
 * `keep: 'skip'` - telemetry that is either rebuildable or whose loss costs a
 * gap in a chart. Backing these up would multiply the dump size by the busiest
 * tables in the database for the least valuable rows in it.
 */

export type KeepReason = 'content' | 'operational' | 'skip';

export interface BackupTable {
  table: string;
  /** Primary key columns - what a restore upserts on. */
  pk: string[];
  keep: KeepReason;
  /** Why this table is treated the way it is. Read during an incident. */
  why: string;
  /** Column to page by. Must be unique-ish and sortable. */
  order?: string;
}

export const BACKUP_TABLES: BackupTable[] = [
  {
    table: 'user_trips',
    pk: ['user_id', 'id'],
    keep: 'content',
    why: 'The trips themselves. For a signed-in traveller this row is the only copy that is not on one device.',
    order: 'updated_at',
  },
  {
    table: 'profiles',
    pk: ['user_id'],
    keep: 'content',
    why: 'Display name, avatar, the visited-countries passport, plan and the consent timestamp. The consent timestamp in particular is a record we told people we keep.',
    order: 'updated_at',
  },
  {
    table: 'purchases',
    pk: ['id'],
    keep: 'content',
    why: 'Money. Every paid pre-departure check and every grant. Losing a row here means a customer who paid has no proof and no report.',
    order: 'created_at',
  },
  {
    table: 'shared_trips',
    pk: ['code'],
    keep: 'content',
    why: 'Every /t/<code> link anybody has ever sent on WhatsApp. These are public URLs in other people’s chats; losing the table breaks them permanently.',
    order: 'created_at',
  },
  {
    table: 'admin_audit',
    pk: ['id'],
    keep: 'content',
    why: 'The privacy policy states that every opening of a traveller’s trip is logged and the log is retained. A right stated without its record reads worse than the record.',
    order: 'created_at',
  },
  {
    table: 'agent_leads',
    pk: ['id'],
    keep: 'content',
    why: 'A business that asked us to call them back. Nobody asks twice.',
    order: 'created_at',
  },
  {
    table: 'newsletter_signups',
    pk: ['email'],
    keep: 'content',
    why: 'Confirmed opt-in and, more importantly, unsubscribes. Losing an unsubscribe means mailing somebody who told us not to.',
    order: 'created_at',
  },
  {
    table: 'promo_codes',
    pk: ['code'],
    keep: 'content',
    why: 'Codes that are out in the world and expected to work.',
    order: 'created_at',
  },
  {
    table: 'promo_redemptions',
    pk: ['code', 'user_id'],
    keep: 'content',
    why: 'This table is what stops a code being redeemed twice. Losing it re-opens every code that was ever used.',
    order: 'redeemed_at',
  },
  {
    table: 'trip_group_invites',
    pk: ['code'],
    keep: 'content',
    why: 'Live invite links friends already hold in their chats. The code is the only way into a shared trip, and it cannot be regenerated to match one already sent.',
    order: 'created_at',
  },
  {
    table: 'trip_group_members',
    pk: ['owner_id', 'trip_id', 'member_id'],
    keep: 'content',
    why: 'Who joined. Without it every friend is locked out of a trip they were invited to.',
    order: 'joined_at',
  },
  {
    table: 'trip_group_votes',
    pk: ['owner_id', 'trip_id', 'member_id', 'place_id'],
    keep: 'content',
    why: 'The group’s own decisions about the plan.',
    order: 'updated_at',
  },
  {
    table: 'trip_group_comments',
    pk: ['id'],
    keep: 'content',
    why: 'What people actually said to each other while planning. Unrecoverable by any other means.',
    order: 'created_at',
  },
  {
    table: 'trip_group_suggestions',
    pk: ['id'],
    keep: 'content',
    why: 'Places friends proposed, and whether the organizer accepted them.',
    order: 'created_at',
  },
  {
    table: 'trip_group_dates',
    pk: ['owner_id', 'trip_id', 'member_id', 'day'],
    keep: 'content',
    why: 'The date poll. Flights get booked on this answer.',
    order: 'day',
  },
  {
    table: 'trip_group_rsvp',
    pk: ['owner_id', 'trip_id', 'member_id'],
    keep: 'content',
    why: 'Who said they are actually coming. The organizer books and pays against this number, and asking eight people again is not a recovery.',
    order: 'updated_at',
  },
  {
    table: 'app_flags',
    pk: ['key'],
    keep: 'operational',
    why: 'The live daily AI budget and the anonymous share. Losing them silently reverts the ceiling to the code default, which is a money decision made by accident.',
  },
  {
    table: 'subscriber_spend_monthly',
    pk: ['user_id', 'month'],
    keep: 'operational',
    why: 'The per-subscriber monthly cap. Losing it resets every subscriber’s spend to zero mid-month, which is real money.',
  },
  {
    table: 'usage_daily',
    pk: ['day', 'identity'],
    keep: 'skip',
    why: 'Per-identity daily quota counters. They reset every day by design, so a backup taken today is worthless tomorrow.',
  },
  {
    table: 'ai_spend',
    pk: ['id'],
    keep: 'skip',
    why: 'One row per model call, forever. The largest table in the database and the least valuable per row; the daily rollups carry the shape of the history.',
  },
  {
    table: 'ai_spend_daily',
    pk: ['day'],
    keep: 'skip',
    why: 'Recomputable from ai_spend, and the ceiling it feeds is a same-day number.',
  },
  {
    table: 'ai_spend_caller',
    pk: ['day', 'identity'],
    keep: 'skip',
    why: 'Same-day per-caller rollup. Meaningless the next morning.',
  },
  {
    table: 'app_events',
    pk: ['day', 'kind'],
    keep: 'skip',
    why: 'An anonymous per-day export counter. A gap in it is a gap in a chart.',
  },
  {
    table: 'catalog_countries',
    pk: ['slug'],
    keep: 'skip',
    why: 'An authoring mirror of src/data. The files are the source of truth and the site never reads these; catalog-push.mjs rebuilds them.',
  },
  {
    table: 'catalog_destinations',
    pk: ['slug'],
    keep: 'skip',
    why: 'An authoring mirror of src/data/destinations.ts. The TypeScript file is the source of truth, the site compiles it in rather than reading these rows, and catalog-push.mjs regenerates them from it.',
  },
  {
    table: 'catalog_places',
    pk: ['id'],
    keep: 'skip',
    why: 'An authoring mirror of the places inside src/data/destinations.ts. Same reasoning: the file is the original, these rows are the copy, and the copy is rebuilt by one script.',
  },
];

export const backedUp = (): BackupTable[] => BACKUP_TABLES.filter((t) => t.keep !== 'skip');

export const tableNames = (): string[] => BACKUP_TABLES.map((t) => t.table);

export function findTable(name: string): BackupTable | undefined {
  return BACKUP_TABLES.find((t) => t.table === name);
}

/**
 * The limit that matters most, written where a restore script has to read it.
 *
 * `auth.users` lives in GoTrue's own schema and is not reachable through
 * PostgREST. The admin API can **list** it, so the dump carries id, email and
 * creation date - enough to know whose rows are whose, and enough to contact
 * people.
 *
 * It is **not** enough to restore it. GoTrue's admin create-user does not let
 * you choose the uuid, and every table above keys on that uuid - so recreating
 * the accounts produces new ids and orphans every trip, profile and purchase.
 *
 * Therefore: if accounts themselves are lost, the recovery path is Supabase's
 * own database backup, not this script. This export is a reference, and saying
 * so plainly here is more useful than a restore that appears to work and
 * silently reassigns everybody's data.
 */
export const IDENTITY_EXPORT_NOTE =
  'auth.users is exported for reference only (id, email, created_at). It cannot be restored by this tool - ' +
  'GoTrue assigns new uuids and every table here keys on the old ones. Restore accounts from a Supabase database backup.';
