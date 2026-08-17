/**
 * The terms version shown to the user at consent time (login/signup) and
 * saved next to them on the profile (see supabase-consent.sql). A single
 * date, shared by three places - the "last updated" tag on the /terms page,
 * the notice next to the login button, and the value written to the
 * database - so they cannot split into three different versions of "when
 * were the terms updated".
 *
 * Update both values together whenever the content of /terms changes
 * materially.
 */
export const TERMS_VERSION = '2026-08-15';
export const TERMS_UPDATED_LABEL = '15 באוגוסט 2026';
