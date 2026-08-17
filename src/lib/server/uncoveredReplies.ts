/**
 * A deterministic safety net for quick-reply buttons, for the
 * uncovered-destination scenario.
 *
 * ## Why this exists
 *
 * agentPrefix.ts already instructs the model to attach suggest_quick_replies
 * when it offers to explore an uncovered destination ("yes, explore" /
 * "another destination"). Live testing showed this is not enforced reliably -
 * exactly two turns out of five lacked buttons entirely, despite a message
 * that explicitly offers "want me to try exploring, or would you prefer a
 * different destination?". Same conclusion already written for priceGuard:
 * when the model ignores a rule, do not phrase it harder - move it somewhere
 * that is not a choice.
 *
 * ## Why this is not priceGuard
 *
 * priceGuard **cuts** unbacked claims - a failure there is safe (better to
 * omit a fact than invent one). Here it is the opposite: the addition is only
 * an **addition** of buttons when they are missing, never a removal of
 * content. A false positive in this case is redundant buttons someone can
 * simply ignore - not wrong information going out to a traveller. That is
 * what allows a reasonably loose detection pattern without extreme care
 * about false positives, unlike content cutting.
 *
 * ## When it intervenes
 *
 * Only when the reply already mentions both "not covered / in the catalog"
 * and "explore" (a sign the model is *already* in the process of offering
 * the auto-exploration, not some other general question about coverage), and
 * when the model itself attached no quick replies. It never overrides
 * replies the model did supply.
 */

const NOT_COVERED =
  /(לא|אינ[הו]|אין)\s.{0,25}(בקטלוג|במאגר|ברשימת\s*היעדים|היעדים\s*המכוסים|היעדים\s*המאומתים)/;
const OFFERS_EXPLORE = /לחקור/;

/** The default - matches in tone and phrasing what the model itself tends to offer */
export const FALLBACK_UNCOVERED_REPLIES = ['כן, לנסות לחקור', 'יעד אחר', 'רק שאלתי'];

/**
 * Returns default buttons when the reply looks like an exploration offer for
 * an uncovered destination without the model attaching suggest_quick_replies
 * itself, otherwise null.
 */
export function fallbackUncoveredQuickReplies(fullText: string): string[] | null {
  if (!NOT_COVERED.test(fullText) || !OFFERS_EXPLORE.test(fullText)) return null;
  return FALLBACK_UNCOVERED_REPLIES;
}
