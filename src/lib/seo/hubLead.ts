/**
 * The photograph that fronts each collection card on `/collections`.
 *
 * Lives here rather than in the page because the selection has real rules, and
 * rules that can be got wrong deserve a test - `hubLead.test.ts` asserts against
 * the actual catalog that every themed collection gets a photo of the right kind
 * of place, which is the whole claim.
 */
import type { PlaceCategory, PlaceTag } from '@/lib/types';
import { HUBS, hubMembers, type HubMember } from './hubs';

/**
 * Place categories that make a photograph look like the collection it fronts.
 *
 * This is the point of the whole thing. A destination's own hero photo is a
 * cityscape, so choosing hero photos meant the food collection was fronted by
 * the Sagrada Familia - a real photo of a real member, and a picture of a church
 * on a card about eating.
 *
 * A hub's members carry hundreds of places between them, and those places have
 * photographs too. So the lead comes from a place that IS the theme: a market
 * for food, a lake for nature, a museum for art. Still verified, still from a
 * real member, and now it describes the card.
 *
 * Hubs absent from both maps are not thematic in a way one photograph can show -
 * a continent, a trip length, a season - and keep the destination hero, which
 * for them is exactly right.
 */
export const LEAD_CATEGORIES: Record<string, PlaceCategory[]> = {
  food: ['market', 'food', 'cafe'],
  nature: ['nature', 'viewpoint'],
  art: ['museum'],
  history: ['historic'],
  kosher: ['kosher-food', 'kosher-market'],
};

/** Place tags that stand in where a category cannot express the theme */
export const LEAD_TAGS: Record<string, PlaceTag[]> = {
  family: ['families'],
  romantic: ['romantic'],
};

export const isThemedHub = (slug: string) => !!LEAD_CATEGORIES[slug] || !!LEAD_TAGS[slug];

/**
 * One lead photograph per collection, a DIFFERENT one for each, and one that
 * looks like the thing.
 *
 * Taking each hub's first member with a photo is the obvious implementation and
 * it looks broken: Vienna is the first member of most hubs, so eight of the
 * twelve cards came back with the same cathedral - the page passed a count of
 * "twelve pictures" while showing three. So a photo already used is skipped.
 *
 * `HUBS` has a fixed order and `hubMembers` is deterministic, so the assignment
 * is stable between builds rather than shuffling on each deploy. A `mustSee`
 * place is preferred, because that flag is the catalog's own judgement about
 * which places are worth looking at.
 *
 * If nothing thematic is left it falls back to the destination hero and then to
 * a repeat - a repeat beats an empty card, and across the current hubs and
 * promoted destinations it does not arise.
 */
export function leadPhotos(members: HubMember[]): Map<string, string | undefined> {
  const used = new Set<string>();
  const lead = new Map<string, string | undefined>();

  /*
    Thematic hubs choose first, and that ordering is load-bearing rather than
    tidy. Run in plain `HUBS` order the generic hubs - a season, a continent, a
    trip length - consumed photos a themed hub needed, and the nature collection
    ended up on a destination hero while an earlier card held the lake. A hub
    with no theme can use any photograph; one with a theme cannot, so the
    constrained ones pick while there is still something to pick.
  */
  const order = [...HUBS.filter((h) => isThemedHub(h.slug)), ...HUBS.filter((h) => !isThemedHub(h.slug))];

  for (const hub of order) {
    const inHub = hubMembers(hub, members);
    const cats = LEAD_CATEGORIES[hub.slug];
    const tags = LEAD_TAGS[hub.slug];

    let photo: string | undefined;
    if (cats || tags) {
      const candidates = inHub
        .flatMap((m) => m.dest.places)
        .filter((p) => {
          if (!p.photo) return false;
          if (cats && !cats.includes(p.category)) return false;
          if (tags && !(p.tags ?? []).some((t) => tags.includes(t))) return false;
          return true;
        })
        // mustSee first, otherwise the catalog's own order - deterministic either way
        .sort((a, b) => Number(!!b.mustSee) - Number(!!a.mustSee));
      photo = candidates.find((p) => !used.has(p.photo as string))?.photo;
    }
    // Fall back to the destination hero, then to a repeat.
    photo ??= inHub.find((m) => m.card.photo && !used.has(m.card.photo))?.card.photo;
    photo ??= inHub.find((m) => m.card.photo)?.card.photo;

    if (photo) used.add(photo);
    lead.set(hub.slug, photo);
  }
  return lead;
}
