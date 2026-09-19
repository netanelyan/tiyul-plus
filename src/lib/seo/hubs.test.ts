/**
 * Hubs must stay viable and their linking must stay bidirectional.
 *
 * Two failure modes are worth a test here, and neither would break a build:
 *
 * 1. **A hub that returns almost nothing.** A "romantic destinations" page
 *    listing two cities is a thin page, and thin pages are the specific risk
 *    this whole layer is shaped around. Membership is derived from catalog
 *    attributes, so an unrelated data session can shrink one silently.
 * 2. **A hub that returns nearly everything.** A list containing 29 of 30 is
 *    not a category, it is the catalog with a different heading - which is the
 *    exact lesson `VIBE_TOP_SHARE` was tuned on when "nature" matched 139 of
 *    150 destinations.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HUBS, MIN_HUB_MEMBERS, hubBySlug, hubMembers, hubsForDestination } from './hubs';
import { promotedMembers } from './hubData';
import { SEO_DESTINATION_SLUGS } from './selection';

const members = promotedMembers();

describe('hubs', () => {
  it('assembles a card and a destination for every promoted slug', () => {
    assert.equal(members.length, SEO_DESTINATION_SLUGS.length);
    for (const m of members) assert.equal(m.card.slug, m.dest.slug);
  });

  it('has fourteen hubs with unique slugs', () => {
    // Twelve until the two seasonal hubs (Pesach, winter) became possible - see
    // the note at the top of hubs.ts for why they could not exist before.
    assert.equal(HUBS.length, 14);
    assert.equal(new Set(HUBS.map((h) => h.slug)).size, 14);
  });

  it('uses url-safe ascii slugs', () => {
    // A Hebrew path percent-encodes into an unreadable string the moment
    // somebody pastes it into WhatsApp, which is this audience's main sharing
    // surface.
    for (const h of HUBS) assert.match(h.slug, /^[a-z][a-z0-9-]*$/, h.slug);
  });

  it('every hub has enough members to be worth a page', () => {
    for (const h of HUBS) {
      const n = hubMembers(h, members).length;
      assert.ok(n >= MIN_HUB_MEMBERS, `${h.slug}: only ${n} members, floor is ${MIN_HUB_MEMBERS}`);
    }
  });

  it('no hub is just the whole catalog with a heading on it', () => {
    for (const h of HUBS) {
      const n = hubMembers(h, members).length;
      assert.ok(n < members.length, `${h.slug}: matches all ${n} promoted destinations`);
    }
  });

  it('every member of a hub is a promoted destination', () => {
    const promoted = new Set<string>(SEO_DESTINATION_SLUGS);
    for (const h of HUBS) {
      for (const m of hubMembers(h, members)) {
        assert.ok(promoted.has(m.card.slug), `${h.slug} lists un-promoted ${m.card.slug}`);
      }
    }
  });

  it('linking is bidirectional: a hub lists X only if X links back to that hub', () => {
    // The guide's back-links and the hub's list are computed from the same
    // predicate, so this asserts the property rather than the implementation -
    // if either side is ever given its own logic, this fails.
    for (const h of HUBS) {
      for (const m of hubMembers(h, members)) {
        const back = hubsForDestination(m.card, m.dest).map((x) => x.slug);
        assert.ok(back.includes(h.slug), `${m.card.slug} is on ${h.slug} but does not link back`);
      }
    }
  });

  it('every promoted destination belongs to at least one hub', () => {
    // A destination in no hub has no internal links pointing at it beyond the
    // sitemap, which is the weakest possible position for a page we are
    // actively promoting.
    for (const m of members) {
      const hubs = hubsForDestination(m.card, m.dest);
      assert.ok(hubs.length > 0, `${m.card.slug} belongs to no hub`);
    }
  });

  it('hubBySlug resolves every hub and rejects an unknown one', () => {
    for (const h of HUBS) assert.equal(hubBySlug(h.slug)?.slug, h.slug);
    assert.equal(hubBySlug('not-a-hub'), undefined);
  });

  it('every hub has a Hebrew title and a non-trivial intro', () => {
    for (const h of HUBS) {
      assert.match(h.title, /[֐-׿]/, `${h.slug}: title is not Hebrew`);
      assert.ok(h.intro.length > 40, `${h.slug}: intro too short to be useful`);
      assert.ok(h.emoji.length > 0, `${h.slug}: no emoji`);
    }
  });

  it('the kosher hub contains only destinations that really have kosher places', () => {
    // The claim this page makes is the one the site is most careful about
    // everywhere else, so it is asserted directly rather than trusted to the
    // predicate reading correctly.
    const hub = hubBySlug('kosher')!;
    for (const m of hubMembers(hub, members)) {
      assert.ok(
        m.dest.places.some((p) => p.category.startsWith('kosher')),
        `${m.dest.slug} is on the kosher hub with no kosher place`,
      );
    }
    // And the converse: nothing with kosher places is left off it.
    for (const m of members) {
      if (m.dest.places.some((p) => p.category.startsWith('kosher'))) {
        assert.ok(hub.match(m.card, m.dest), `${m.dest.slug} has kosher places but is not listed`);
      }
    }
  });

  it('short-break and long-trip hubs cannot both contain the same destination', () => {
    const short = hubMembers(hubBySlug('short-breaks')!, members).map((m) => m.card.slug);
    const long = hubMembers(hubBySlug('long-trips')!, members).map((m) => m.card.slug);
    const both = short.filter((s) => long.includes(s));
    assert.deepEqual(both, [], `contradictory membership: ${both.join(', ')}`);
  });
});
