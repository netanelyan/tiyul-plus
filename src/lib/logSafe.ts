/**
 * Flattening a value that is about to become **one line** of a log or an alert.
 *
 * ## The attack this stops
 *
 * A log line is a record, and a record whose content can contain a newline is a record
 * anybody can add a second entry to. A trip named
 *
 *   My trip
 *   [alert] budget exceeded, agent disabled
 *
 * forges an entry that reads as if the system wrote it. The same text POSTed to a
 * Slack or Discord webhook renders as a separate line in the channel, which is worse
 * than the log case: the channel is where the operator looks to decide whether
 * something is wrong, so a user can write into the operator's own diagnostics.
 *
 * Carriage returns matter as much as newlines, and so do the rest of the C0 range and
 * DEL: a terminal reading a log interprets several of them, and an escape sequence can
 * repaint or erase what is already on screen.
 *
 * ## Why it lives here rather than at each call site
 *
 * It began as a private helper in `server/errorAlert.ts` and was applied at exactly one
 * of the five `postAlert` callers - correctly, and then every later caller had to
 * remember. `postAlert` and `notifyOrganiser` now apply it themselves, so the guarantee
 * is a property of the sink instead of a convention. The same reasoning as `pgrest.ts`
 * for query strings and `CatalogImage` for photographs: put the rule where the value
 * leaves, not where it arrives.
 *
 * `errorAlert.ts` re-exports it, so its own callers and tests are unchanged.
 */

/**
 * One line, no control characters, optionally capped.
 *
 * The cap is the caller's decision rather than a fixed value, because the two sinks
 * want different ones: an error message is deduped and summarised, so 300 characters is
 * plenty, while a purchase alert is an instruction to a human and carries three uuids -
 * capping that one at 300 would cut off the part telling them what to do.
 */
export function cleanLine(value: unknown, max = 300): string {
  const text = typeof value === 'string' ? value : String(value ?? '');
  const flat = Array.from(text)
    /*
      A code-point test rather than a control-character regex, deliberately: a
      literal control character inside a character class is invisible in every
      diff and in every review, and writing one here is exactly the mistake
      this comment exists to stop the next person repeating.
    */
    .map((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code < 0x20 || code === 0x7f ? ' ' : ch;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/**
 * The cap for an alert that a person is expected to act on.
 *
 * Deliberately far above every alert this codebase sends today (the longest is a
 * purchase failure at roughly 310 characters, three uuids included) so that adding
 * the sink-level cleaning cannot silently truncate an existing message. It is here to
 * bound a hostile payload, not to shorten ours.
 */
export const ALERT_MAX_CHARS = 2000;
