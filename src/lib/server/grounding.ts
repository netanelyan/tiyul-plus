import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';
import { isEating, isKosher, kosherStatusOf } from '@/lib/categories';
import { certificationNames, kashrutForModel } from '@/lib/kashrut';
import type { Destination } from '@/lib/types';
import type { Trip } from '@/lib/trip/types';
import type { ChatMessage } from '@/lib/server/chatMessages';

/**
 * The grounding is built in two layers, because the catalog grew to 47 cities
 * and 500+ places:
 *
 * 1. INDEX - constant and identical on every call, and therefore carries
 *    cache_control: every city with all of its places at the
 *    id/name/category/tags level. This is what the model must have to build
 *    and validate an itinerary, and to never invent an id.
 * 2. DETAIL - only for the cities relevant to the current turn (the trip's
 *    cities + cities mentioned in the conversation): place descriptions, the
 *    curated itinerary, practical info and the country info. This block is
 *    small and changing, so it sits after the cache breakpoint.
 *
 * Before the split, ~118k tokens were sent on every call - and a trip build
 * makes 5 sequential calls, so this was the dominant time factor.
 *
 * **This file lives in lib and not inside the route** for two reasons: a
 * route handler cannot export helpers (Next fails on the route types), and
 * without an export there is no way to write a test - which is exactly what
 * happened to sanitizeMessages in the past.
 */

/**
 * The kosher gate.
 *
 * "Kosher is an option, never an assumption" is a product principle, but
 * until now it was enforced only on the **tools** (`filterKosherUnlessOptedIn`
 * in agent.ts) - i.e. on what enters the trip. The prose remained exposed,
 * and Netanel reported exactly that: an innocent question about a restaurant
 * in Rome came back as a full answer about the Jewish Ghetto, with two names
 * that are precisely Rome's two kosher entries in the catalog.
 *
 * Three rounds of prompt wording have already failed on this kind of problem
 * (see the session log, entry (h)), and the lesson recorded there is: **do
 * not write the rule harder - move it closer to the moment of generation, or
 * replace it with a computed fact.** So this is not another rule but
 * structure: when kosher is off, the kosher entries simply are not present
 * in the data the model receives. You cannot recommend what you never saw.
 */
const KOSHER_ASK =
  /כשר(ו|י|ה|ות)?|מהדרין|גלאט|בד["״'׳]?ץ|הכשר|השגחה|חב["״'׳]?ד|בית חב|kosher|chabad|glatt|hechsher/i;

/**
 * Whether a single sentence sounds like a kashrut question - the shared
 * version of `KOSHER_ASK`, for use anywhere a decision must be made about
 * **one message** rather than a conversation window (e.g.: whether to hand
 * the agent a live search tool this turn - see `webLookup.ts`).
 * Kashrut is the one topic it must never search the web for under any
 * circumstances.
 */
export function kosherIntentText(text: string): boolean {
  return KOSHER_ASK.test(text ?? '');
}

export function kosherAllowed(
  trip: Trip | null,
  messages: ChatMessage[],
  kosherHint = false,
): boolean {
  if (kosherHint) return true;
  if (trip?.preferences?.kosher === true) return true;
  if (trip?.preferences?.shabbatAware === true) return true;
  // **User messages only.** If we scanned the agent's replies too, its
  // having mentioned kosher once would be enough to keep the gate open
  // forever - i.e. the mechanism would grant itself exactly what it exists
  // to prevent.
  const text = messages
    .filter((m) => m.role === 'user')
    .slice(-6)
    .map((m) => m.content)
    .join(' ');
  return kosherIntentText(text);
}

/**
 * The `priceGuard.ts` allowlist for kashrut claims: names of kosher places
 * and names of cities that have a real `kosherOverview`, **only among the
 * cities actually sent this turn** (`citySlugs`). This is not a list of
 * "what exists in the catalog" - it is a list of "what the model really saw
 * just now", and the difference is exactly the gap that caused the bug: the
 * general gate is open (`kosherOk`), but the specific city being asked about
 * appears nowhere in the data that was sent - and then any claim about it
 * comes from memory.
 */
export function kosherAllowedNames(citySlugs: string[], kosherOk: boolean): string[] {
  if (!kosherOk) return [];
  const cities = destinations.filter((d) => citySlugs.includes(d.slug));
  const names: string[] = [];
  for (const d of cities) {
    if (d.practical.kosherOverview) {
      if (d.name) names.push(d.name);
      if (d.nameLocal) names.push(d.nameLocal);
    }
    for (const p of d.places) {
      // A certifying body named in the data may be named in the reply, for
      // any place that was sent - including a NON-kosher place whose record
      // says so. Without this the guard would strip the very sentence the
      // richer model exists to enable ("Shalom is under the Chief Rabbinate
      // of Prague"), because the body name is not a place name and the
      // sentence would look like an unbacked kashrut claim.
      //
      // This widens what may be SAID, not what may be recommended: the tool
      // layer still decides what can enter a trip, and `mayNotJudge` still
      // forbids ruling on any of these names.
      for (const n of certificationNames(p.kashrut)) names.push(n);
      if (!isKosher(p.category)) continue;
      if (p.name) names.push(p.name);
      if (p.nameLocal) names.push(p.nameLocal);
    }
  }
  return names.filter((n) => n.trim().length > 0);
}

/** Large index (~218k chars) - built once per variant, not on every model call */
const INDEX_CACHE = new Map<boolean, string>();

export function buildGroundingIndex(kosherOk: boolean): string {
  const cached = INDEX_CACHE.get(kosherOk);
  if (cached) return cached;
  const json = JSON.stringify({
    note: kosherOk
      ? 'INDEX of every city and place. Use these ids verbatim. Detail for the relevant cities follows in the next block.'
      : 'INDEX of every city and place. Use these ids verbatim. Detail for the relevant cities follows in the next block. Kosher venues are deliberately not listed here - see the kosher policy in the next block.',
    // The real numbers, because the model invented them in live testing
    // ("50 destinations in 40 countries" when the reality was 139 and 74).
    // It counts a long list badly, and there is no reason to let it guess a
    // figure that can simply be handed to it.
    coverage: { cities: destinations.length, countries: countries.length },
    cities: destinations.map((d) => ({
      slug: d.slug,
      name: d.name,
      countrySlug: d.countrySlug,
      places: d.places
        .filter((p) => kosherOk || !isKosher(p.category))
        .map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          ...(p.tags?.length ? { tags: p.tags } : {}),
          ...(p.priceLevel !== undefined ? { priceLevel: p.priceLevel } : {}),
          ...(p.mustSee ? { mustSee: true } : {}),
          ...(p.durationMin ? { durationMin: p.durationMin } : {}),
        })),
    })),
    countries: countries.map((c) => ({ slug: c.slug, name: c.name })),
  });
  INDEX_CACHE.set(kosherOk, json);
  return json;
}

/** Cities the conversation touches: the active trip + a mention by city/country/local name */
export function relevantCitySlugs(messages: ChatMessage[], trip: Trip | null): string[] {
  const slugs = new Set<string>(trip?.citySlugs ?? []);
  const text = messages
    .slice(-6)
    .map((m) => m.content)
    .join(' ')
    .toLowerCase();
  for (const d of destinations) {
    const country = countries.find((c) => c.slug === d.countrySlug);
    const needles = [d.name, d.nameLocal, d.slug, country?.name].filter(Boolean) as string[];
    if (needles.some((n) => text.includes(n.toLowerCase()))) slugs.add(d.slug);
  }
  // No hint at all - give detail on a small sample so the first answer is not barren
  if (slugs.size === 0) return destinations.slice(0, 6).map((d) => d.slug);

  // A hard cap on the number of cities in the detail block.
  //
  // Without this cap the block was unbounded, and that broke real
  // conversations: the scan adds every destination whose name, Latin name,
  // slug **or country name** appears in the last six messages - and the
  // agent's own messages mention plenty of city and country names.
  // Measured against the real catalog: ~6,500 chars per city, 45% of it
  // Hebrew, i.e. roughly 3,800 tokens per city. 20 cities = ~65k tokens,
  // 40 cities = ~120k, and the whole catalog (139 destinations) = ~370k
  // tokens in a single block. Together with the index and the history this
  // exceeded the 200k context window.
  //
  // The problem also grows with the conversation **and with the catalog**:
  // every new destination added widens the match space. Hence a cap, not
  // merely an optimization.
  //
  // Priority order: the trip's own cities first - they are the context that
  // cannot be given up - and then what was mentioned in the conversation,
  // up to the cap. What gets cut is still in the index with all the ids and
  // names, so the model can still build with it; it just does not get the
  // prose.
  const MAX_DETAIL_CITIES = 6;
  const tripFirst = (trip?.citySlugs ?? []).filter((s) => slugs.has(s));
  const rest = [...slugs].filter((s) => !tripFirst.includes(s));
  return [...tripFirst, ...rest].slice(0, MAX_DETAIL_CITIES);
}

/** Separate grounding block for auto-explored destinations - unambiguously marked as unverified */
export function buildExploredGrounding(explored: Destination[]): string {
  if (explored.length === 0) return '';
  return `\n\nAUTO-EXPLORED (unverified, from public sources - label as such to the user):\n${JSON.stringify(
    explored.map((d) => ({
      slug: d.slug,
      name: d.name,
      summary: d.summary.slice(0, 200),
      places: d.places.map((p) => ({ id: p.id, name: p.name, category: p.category })),
    })),
  )}`;
}

/**
 * The kosher policy is delivered as a **fact inside the data**, not as a
 * rule in the prompt, and is worded so the model does not fix one lie with
 * another: it may not recommend, and it also may not say the city has no
 * kosher food - it simply was not given that layer.
 */
const KOSHER_POLICY_OFF =
  'The traveler has NOT asked for kosher and the kosher preference is OFF, so every kosher restaurant, kosher market and kashrut overview is intentionally omitted from this data. Do not mention, recommend or hint at kosher options in your reply. Do NOT say the city has no kosher food - you were simply not given that layer; if the user asks, say the site has a kosher layer and they can switch on "אוכל כשר" (or just ask), and then you will have it.';

/**
 * The other side of that same gate, and no less important.
 *
 * Since the `food`/`market` categories were added, the catalog contains
 * eating places that are **not** kosher (Café Central, Katz's, Les Deux
 * Magots). The tool layer already blocks them for whoever chose kosher -
 * but the prose, again, does not. The solution here is delivering the
 * computed fact (`kosherStatus` on every eating place) rather than hiding:
 * a kosher-keeping traveler who reads "Katz's is a New York institution,
 * and it is not kosher" got exactly what they needed; deleting the entry
 * would have left them without the warning.
 */
const KOSHER_POLICY_ON =
  'The traveler keeps kosher. Every eating place carries kosherStatus. Recommend ONLY kosherStatus="kosher". A place marked "not-kosher" or "unknown" may be mentioned only to say plainly that it is not kosher (or that we could not confirm it) - never as a suggestion of where to eat, and never in the plan. "unknown" is not "probably fine". Always add the usual reminder to confirm kashrut and hours with the venue itself. ' +
  // The half that is new, and it is the point of the richer model: the
  // traveler decides, so they need the NAME and we must not pre-empt them.
  'Many places also carry a `kashrut` object. When you mention such a place, NAME the certifying body from kashrut.certifications[].body, and state kashrut.checked as the date we read the source (or say plainly that we have no check date when it is null). ' +
  'You must NEVER characterise a certification as sufficient, reliable, strict, lenient, "good enough", better or worse than another, and never rank two places by their supervision. Israeli travelers hold genuinely different standards and that judgement is theirs and their rabbi\'s, not ours. Report the name; let them decide. ' +
  'kashrut.knowledge distinguishes three states and they are NOT interchangeable: "certified" (there is supervision), "none-found" (we looked and found none) and "unknown" (we have not established it). Never present "unknown" as "none-found" or the reverse. ' +
  'If certifications is empty on a "certified" record, the source lists the place as kosher WITHOUT naming the supervising body - say exactly that, and do not fill in a body name. ' +
  'Where kashrut.diet is present, mention it (meat / dairy / parve): it changes what the traveler can do for the rest of the day.';

/**
 * The light route's grounding - **the absolute minimum a mechanical edit needs**.
 *
 * Measured: the full detail for two cities is ~34 thousand tokens, because
 * it carries country summaries, practical info, the recommended itinerary
 * and a description for every place. A mechanical edit touches none of
 * them: it moves a day, removes a stop, or adds a place **from a city
 * already in the trip**. What remains necessary is an `id|name` pair for
 * every place in those cities, and nothing more.
 *
 * The format is lines rather than JSON: the same information, without the
 * keys repeating on every record - the same consideration documented in the
 * index-budget section of CLAUDE.md.
 *
 * Kosher is filtered exactly as in the full detail. There is no back door here.
 */
export function buildLightGrounding(citySlugs: string[], kosherOk: boolean): string {
  const cities = destinations.filter((d) => citySlugs.includes(d.slug));
  const lines = cities.map((d) => {
    const places = d.places
      .filter((p) => kosherOk || !isKosher(p.category))
      .map((p) => `${p.id}|${p.name}`)
      .join('\n');
    return `## ${d.slug} (${d.name})\n${places}`;
  });
  return [
    'PLACES available in the cities of this trip - id|name, one per line.',
    'These are the only place ids you may use. There is no other catalog in this turn:',
    'if the traveller asks for somewhere that is not listed here, say so in one sentence and call no tool.',
    '',
    ...lines,
  ].join('\n');
}

export function buildGroundingDetail(citySlugs: string[], kosherOk: boolean): string {
  const cities = destinations.filter((d) => citySlugs.includes(d.slug));
  const countrySlugs = new Set(cities.map((d) => d.countrySlug));
  const kosherIds = new Set(
    cities.flatMap((d) => d.places.filter((p) => isKosher(p.category)).map((p) => p.id)),
  );
  return JSON.stringify({
    note: 'DETAIL for the cities this conversation touches. Other cities: use the INDEX above, and say plainly if you need specifics we did not load.',
    kosherPolicy: kosherOk ? KOSHER_POLICY_ON : KOSHER_POLICY_OFF,
    countries: countries
      .filter((c) => countrySlugs.has(c.slug))
      .map((c) => ({ slug: c.slug, name: c.name, summary: c.summary, practical: c.practical })),
    cities: cities.map((d) => ({
      slug: d.slug,
      name: d.name,
      summary: d.summary,
      // Flights, transit, kosher - at the city level. `kosherOverview` is
      // the city's kashrut overview, so it goes down along with the entries
      // themselves; the other fields are unrelated and stay.
      // (JSON.stringify omits undefined, so the field is simply not sent)
      practical: kosherOk ? d.practical : { ...d.practical, kosherOverview: undefined },
      // The curated itinerary refers to place ids; without this filter a
      // kosher id would reach the model through the itinerary's back door.
      itinerary: kosherOk
        ? d.itinerary
        : d.itinerary.map((day) => ({
            ...day,
            placeIds: day.placeIds.filter((id) => !kosherIds.has(id)),
          })),
      places: d.places
        .filter((p) => kosherOk || !isKosher(p.category))
        .map((p) => ({
          id: p.id,
          name: p.name,
          nameLocal: p.nameLocal,
          category: p.category,
          description: p.description.length > 90 ? `${p.description.slice(0, 90)}…` : p.description,
          // A computed fact, not a model guess based on the name. Sent only
          // when kosher is on, because when it is off it has no business
          // being in the reply at all.
          ...(kosherOk && isEating(p.category)
            ? { kosherStatus: kosherStatusOf(p) }
            : {}),
          // The structured record, so the model can tell a traveller WHICH
          // supervision a place is under and let them judge. Before this it
          // received only the three-value status plus a prose note, so it
          // could not say "this one is KLBD, that one is a local rabbinate"
          // even when the catalog knew - the information existed but only
          // inside a string it is forbidden to assert from.
          //
          // `kashrutForModel` carries its own `mayNotJudge` line with every
          // record: report the body, never rule on whether it is sufficient.
          // Attaching that to the data rather than to the system prompt is
          // the same "give it the fact instead of the rule" pattern that
          // fixed the invented walking distances.
          ...(kosherOk && p.kashrut ? { kashrut: kashrutForModel(p.kashrut) } : {}),
          // A `kosherNote` on a place that is **not** kosher is usually a
          // warning (along the lines of "this famous restaurant is not
          // kosher") - hiding it would be harmful, not cautious.
          kosherNote: p.kosherNote,
        })),
    })),
  });
}
