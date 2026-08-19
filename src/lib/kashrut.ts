/**
 * The kashrut layer's single set of rules.
 *
 * Everything that reads a `KashrutRecord` - the badge, the filter, the
 * grounding sent to the agent, the pre-departure check - goes through here, so
 * that "what may we say about this place" is answered in one place and cannot
 * drift between surfaces. That is the same discipline `KosherBadge` and
 * `KosherNote` already enforce for rendering.
 *
 * ## The rule this file exists to hold
 *
 * **We report what the certification is. We never rule on whether it is
 * sufficient.** Whether a local rabbinate's supervision is acceptable is a
 * decision for the traveler and their rabbi, not for a travel site - and an
 * Israeli audience contains people who would answer that question in
 * genuinely different ways. So there is no "reliable"/"mehadrin-only" ranking
 * anywhere in this file, no sort order that implies one, and no boolean that
 * collapses a named body back into a yes/no. `describeCertifications` returns
 * names; it never returns a verdict.
 */
import type {
  KashrutDiet,
  KashrutKnowledge,
  KashrutRecord,
  KashrutSourceType,
} from './types';

/**
 * Sent with every kashrut record handed to the model. It rides with the DATA
 * rather than living only in the system prompt, which is the same "give it the
 * fact instead of the rule" pattern that fixed the invented walking distances:
 * a rule at the top of a long prompt gets swallowed, a field attached to the
 * thing being described does not.
 */
const MAY_NOT_JUDGE =
  'Report the certifying body by name. NEVER say a certification is sufficient, reliable, strict enough, or not enough - that judgement belongs to the traveler.';

export const KASHRUT_KNOWLEDGE_LABEL: Record<KashrutKnowledge, string> = {
  certified: 'יש השגחה',
  'none-found': 'לא נמצאה השגחה',
  unknown: 'לא בדקנו',
};

export const KASHRUT_DIET_LABEL: Record<KashrutDiet, string> = {
  meat: 'בשרי',
  dairy: 'חלבי',
  parve: 'פרווה',
  'meat-and-dairy': 'בשרי וחלבי בהפרדה',
};

export const KASHRUT_SOURCE_LABEL: Record<KashrutSourceType, string> = {
  certifier: 'רשימת גוף ההשגחה',
  venue: 'אתר המקום',
  community: 'רשימת הקהילה',
  directory: 'מדריך כשרות',
  'legacy-unverified': 'דיווח קודם, ללא תאריך',
};

/**
 * A record is shippable when all three parts of its provenance are present:
 * what it is, where it came from, and when it was read.
 *
 * The 53 records migrated from the old model return **false** here, and that
 * is the honest answer rather than a defect: no date was ever recorded for any
 * of them (`lastChecked` was the literal string "pending-review" in 53 of 53),
 * so there is nothing to migrate a date from and inventing one is forbidden.
 * The UI shows an unshippable record as a report we have not confirmed - which
 * is what it already said in prose - instead of dressing it as verified.
 */
export function kashrutIsShippable(k: KashrutRecord | undefined): boolean {
  if (!k) return false;
  const p = k.provenance;
  return Boolean(p?.source) && Boolean(p?.checked) && p.sourceType !== 'legacy-unverified';
}

/**
 * The certifying bodies as a plain list of names, for display.
 *
 * Deliberately a join of names and nothing else: no ordering by perceived
 * standard, no "the most reliable is...", no filtering out bodies we might
 * think less of. A traveler who recognises one name in the list has what they
 * need; one who recognises none is better served by seeing all of them than by
 * seeing our pick.
 */
export function describeCertifications(k: KashrutRecord | undefined): string {
  const certs = k?.certifications ?? [];
  if (certs.length === 0) return '';
  return certs
    .map((c) => {
      const desc = c.descriptors?.length ? ` (${c.descriptors.join(', ')})` : '';
      return `${c.body}${desc}`;
    })
    .join(' · ');
}

/** Every certifying-body name in a record, for search and for the agent's allowlist. */
export function certificationNames(k: KashrutRecord | undefined): string[] {
  const out: string[] = [];
  for (const c of k?.certifications ?? []) {
    out.push(c.body);
    if (c.bodyLatin) out.push(c.bodyLatin);
  }
  return out;
}

/**
 * The caveat that rides with a record, and it gets MORE specific as we know
 * more rather than less. A generic "verify with the venue" on every record
 * teaches people to ignore it; a caveat that names the actual weakness does
 * not.
 *
 * Never returns an empty string. Kashrut changes - a venue can lose its
 * certificate between our reading and the traveler's visit - so there is no
 * state of knowledge in which no caveat applies, and no caller can accidentally
 * render a kashrut fact bare.
 */
export function kashrutCaveat(k: KashrutRecord | undefined): string {
  if (!k) return 'לא בדקנו את הכשרות במקום הזה. לוודא מול המקום.';

  if (k.knowledge === 'unknown') {
    return 'לא בדקנו את הכשרות במקום הזה - זה לא אומר שאין, רק שאין לנו מידע. לוודא מול המקום.';
  }
  if (k.knowledge === 'none-found') {
    const when = k.provenance.checked
      ? ` (נבדק ב-${k.provenance.checked})`
      : '';
    return `לא מצאנו השגחה במקור שבדקנו${when}. ייתכן שהשתנה מאז - לוודא מול המקום.`;
  }

  // certified
  if (!kashrutIsShippable(k)) {
    return 'ההשגחה מדווחת ממקור ציבורי ולא אומתה על ידינו, ואין לנו תאריך בדיקה. לוודא מול המקום לפני שמגיעים.';
  }
  // The canonical "verify with the venue" phrase stays in every branch on
  // purpose. It is the caveat this site has carried since the kashrut layer
  // existed,
  // travellers recognise it, and a test pins it - so added specificity is
  // additive and never replaces it. The rule is that caveats get MORE
  // specific, not that they get swapped for something new.
  return `לפי ${KASHRUT_SOURCE_LABEL[k.provenance.sourceType]}, נבדק ב-${k.provenance.checked}. השגחה יכולה להשתנות - לוודא מול המקום ולבדוק את התעודה בכניסה.`;
}

/**
 * One line naming what we know, for the places the full badge does not fit -
 * the map popup, the printed itinerary, the agent's grounding.
 */
export function kashrutSummary(k: KashrutRecord | undefined): string {
  if (!k) return KASHRUT_KNOWLEDGE_LABEL.unknown;
  if (k.knowledge === 'certified') {
    const names = describeCertifications(k);
    return names ? `השגחה: ${names}` : KASHRUT_KNOWLEDGE_LABEL.certified;
  }
  return KASHRUT_KNOWLEDGE_LABEL[k.knowledge];
}

/**
 * What the agent is given, as a plain object. Structured deliberately: the
 * agent used to receive kashrut as a three-value enum plus a prose note, so it
 * could not tell a traveler "this one is KLBD, this one is a local rabbinate,
 * decide for yourself" even when the catalog knew - the information existed but
 * only inside a string it is forbidden to assert from.
 *
 * `mayNotJudge` is sent with every record on purpose. It is the one instruction
 * that must survive prompt compaction, and attaching it to the data rather than
 * to the system prompt is the same "give it the fact instead of the rule"
 * pattern that fixed the invented walking distances.
 */
export function kashrutForModel(k: KashrutRecord | undefined) {
  // One shape always, including for a place with no record at all. Two shapes
  // would mean the model sees a different object depending on whether we
  // happen to have data, and "the field is absent" is exactly the ambiguity
  // this whole model exists to remove.
  if (!k) {
    return {
      knowledge: 'unknown' as const,
      certifications: undefined,
      verified: false,
      checked: null,
      sourceType: 'legacy-unverified' as const,
      caveat: kashrutCaveat(undefined),
      mayNotJudge: MAY_NOT_JUDGE,
    };
  }
  return {
    knowledge: k.knowledge,
    certifications: k.certifications?.map((c) => ({
      body: c.body,
      ...(c.bodyLatin ? { bodyLatin: c.bodyLatin } : {}),
      ...(c.descriptors?.length ? { descriptors: c.descriptors } : {}),
    })),
    ...(k.diet ? { diet: k.diet, dietLabel: KASHRUT_DIET_LABEL[k.diet] } : {}),
    ...(k.arrangement ? { arrangement: k.arrangement } : {}),
    verified: kashrutIsShippable(k),
    checked: k.provenance.checked,
    sourceType: k.provenance.sourceType,
    caveat: kashrutCaveat(k),
    mayNotJudge: MAY_NOT_JUDGE,
  };
}
