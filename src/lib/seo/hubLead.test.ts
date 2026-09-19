/**
 * The collection cards' lead photographs, against the real catalog.
 *
 * The claim being tested is the one the feature exists for: a themed collection
 * is fronted by a photograph OF THAT THEME. Before this, the lead was the first
 * member with an unused photo, which put the Sagrada Familia on the food
 * collection - a real photo of a real member, and a church on a card about
 * eating. That is not catchable by a type or a count, only by asking what kind of
 * place the photo belongs to.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUBS } from './hubs.ts';
import { promotedMembers } from './hubData.ts';
import { LEAD_CATEGORIES, LEAD_TAGS, isThemedHub, leadPhotos } from './hubLead.ts';
import { destinations } from '@/data/destinations';

const members = promotedMembers();
const lead = leadPhotos(members);

/** Every place in the catalog that owns a given photo URL. */
function placesWithPhoto(url: string) {
  return destinations.flatMap((d) => d.places.filter((p) => p.photo === url));
}

test('every collection gets a photograph', () => {
  for (const hub of HUBS) {
    assert.ok(lead.get(hub.slug), `${hub.slug} has no lead photo - the card renders a gradient`);
  }
});

test('no two collections share a photograph', () => {
  const used = HUBS.map((h) => lead.get(h.slug));
  assert.equal(
    new Set(used).size,
    used.length,
    'two collections lead with the same picture - the page looks broken',
  );
});

test('a themed collection leads with a photo of that kind of place', () => {
  /*
    The assertion that would have caught the church on the food card. The photo
    URL is looked up back through the catalog: it has to belong to a place whose
    category or tag is one the collection is about.

    Note a landmark photo can share a URL with a place photo - the catalog's
    landmark images were copied from already-verified place photos - so matching
    on "some place with this URL qualifies" is the correct test rather than a
    loose one.
  */
  for (const hub of HUBS) {
    if (!isThemedHub(hub.slug)) continue;
    const url = lead.get(hub.slug);
    assert.ok(url, `${hub.slug}: no photo`);
    const owners = placesWithPhoto(url as string);
    assert.ok(owners.length > 0, `${hub.slug}: the lead photo belongs to no place at all`);
    const cats = LEAD_CATEGORIES[hub.slug];
    const tags = LEAD_TAGS[hub.slug];
    const fits = owners.some((p) => {
      if (cats) return cats.includes(p.category);
      if (tags) return (p.tags ?? []).some((t) => tags.includes(t));
      return false;
    });
    assert.ok(
      fits,
      `${hub.slug}: leads with ${owners[0].name} [${owners[0].category}], which is not ` +
        `${cats ? cats.join('/') : (tags ?? []).join('/')}`,
    );
  }
});

test('the assignment is stable - the same build twice gives the same cards', () => {
  // Otherwise every deploy reshuffles the page for no reason, and a cached card
  // disagrees with the page it links to.
  const again = leadPhotos(promotedMembers());
  for (const hub of HUBS) assert.equal(again.get(hub.slug), lead.get(hub.slug), hub.slug);
});

test('every themed collection has real candidates, not just a lucky fallback', () => {
  /*
    The test above would also pass if a themed hub happened to fall back to a
    hero photo that coincidentally belonged to a matching place. This asserts the
    supply directly, so a future hub added to LEAD_CATEGORIES with nothing behind
    it fails here and says so.
  */
  for (const hub of HUBS) {
    if (!isThemedHub(hub.slug)) continue;
    const cats = LEAD_CATEGORIES[hub.slug];
    const tags = LEAD_TAGS[hub.slug];
    const supply = members
      .filter((m) => hub.match(m.card, m.dest))
      .flatMap((m) => m.dest.places)
      .filter((p) => {
        if (!p.photo) return false;
        if (cats && !cats.includes(p.category)) return false;
        if (tags && !(p.tags ?? []).some((t) => tags.includes(t))) return false;
        return true;
      });
    assert.ok(supply.length > 0, `${hub.slug}: no member has a photographed place of its theme`);
  }
});
