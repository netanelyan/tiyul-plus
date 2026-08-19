// Two-way conversion between `src/data/*.ts` and Supabase rows.
//
// **Why both directions live in one module:** so that symmetry can be proved with no
// network at all. `scripts/catalog-roundtrip.mjs` runs files -> rows -> files and does
// a deep comparison. If the conversion loses a field, reorders something or "fixes" a
// value, the check fails immediately. That is the real proof that the transfer is a
// pure copy; counting records alone would not have caught a missing field.
//
// Two rules decide almost everything here:
//
// 1. **A field that did not exist in the source must not exist after the round trip.**
//    In the types, optional fields are simply absent (there is no `photo: undefined`).
//    So the conversion to a row writes null, and the conversion back **omits** the key.
//    `mustSee` is the sharpest case: it appears only when true and never as false.
// 2. **Order is content.** The order of countries, destinations and places is an
//    editorial decision (what appears first on a page), so it is stored in `position`
//    rather than left to the database's ORDER BY whim.

/** Optional fields: null in the database means "does not exist", not "empty". */
const opt = (v) => (v === undefined ? null : v);
const put = (obj, key, val) => {
  if (val !== null && val !== undefined) obj[key] = val;
};

// ---------- files -> rows ----------

export function countryToRow(c, position) {
  return {
    slug: c.slug,
    position,
    name: c.name,
    name_local: c.nameLocal,
    flag: c.flag,
    tagline: c.tagline,
    summary: c.summary,
    photo: opt(c.photo),
    practical: c.practical,
  };
}

export function destinationToRow(d, position) {
  return {
    slug: d.slug,
    position,
    name: d.name,
    name_local: d.nameLocal,
    country_slug: d.countrySlug,
    flag: d.flag,
    center: d.center,
    zoom: d.zoom,
    tagline: d.tagline,
    summary: d.summary,
    best_season: d.bestSeason,
    photo: opt(d.photo),
    iconic_landmark: opt(d.iconicLandmark),
    editorial_rating: opt(d.editorialRating),
    itinerary: d.itinerary,
    practical: d.practical,
  };
}

export function placeToRow(p, destinationSlug, position) {
  return {
    destination_slug: destinationSlug,
    id: p.id,
    position,
    name: p.name,
    name_local: p.nameLocal,
    category: p.category,
    lat: p.lat,
    lng: p.lng,
    description: p.description,
    rating: opt(p.rating),
    duration_min: opt(p.durationMin),
    kosher_note: opt(p.kosherNote),
    kashrut: opt(p.kashrut),
    external_url: opt(p.externalUrl),
    photo: opt(p.photo),
    price_level: opt(p.priceLevel),
    tags: opt(p.tags),
    must_see: opt(p.mustSee),
  };
}

export function catalogToRows(countries, destinations) {
  const countryRows = countries.map(countryToRow);
  const destinationRows = destinations.map(destinationToRow);
  const placeRows = destinations.flatMap((d) =>
    d.places.map((p, i) => placeToRow(p, d.slug, i)),
  );
  return { countryRows, destinationRows, placeRows };
}

// ---------- rows -> files ----------
// The key order here is the field order in `src/lib/types.ts`. It does not affect deep
// equality, but it keeps a generated file stable and readable between runs.

export function rowToCountry(r) {
  const c = { slug: r.slug, name: r.name, nameLocal: r.name_local, flag: r.flag, tagline: r.tagline, summary: r.summary };
  put(c, 'photo', r.photo);
  c.practical = r.practical;
  return c;
}

export function rowToPlace(r) {
  const p = {
    id: r.id,
    name: r.name,
    nameLocal: r.name_local,
    category: r.category,
    lat: r.lat,
    lng: r.lng,
    description: r.description,
  };
  put(p, 'rating', r.rating);
  put(p, 'durationMin', r.duration_min);
  put(p, 'kosherNote', r.kosher_note);
  put(p, 'kashrut', r.kashrut);
  put(p, 'externalUrl', r.external_url);
  put(p, 'photo', r.photo);
  put(p, 'priceLevel', r.price_level);
  put(p, 'tags', r.tags);
  put(p, 'mustSee', r.must_see);
  return p;
}

export function rowToDestination(r, placeRows) {
  const d = {
    slug: r.slug,
    name: r.name,
    nameLocal: r.name_local,
    countrySlug: r.country_slug,
    flag: r.flag,
    center: r.center,
    zoom: r.zoom,
    tagline: r.tagline,
    summary: r.summary,
    bestSeason: r.best_season,
  };
  put(d, 'photo', r.photo);
  put(d, 'iconicLandmark', r.iconic_landmark);
  put(d, 'editorialRating', r.editorial_rating);
  d.places = placeRows
    .filter((p) => p.destination_slug === r.slug)
    .sort((a, b) => a.position - b.position)
    .map(rowToPlace);
  d.itinerary = r.itinerary;
  d.practical = r.practical;
  return d;
}

export function rowsToCatalog({ countryRows, destinationRows, placeRows }) {
  const countries = [...countryRows].sort((a, b) => a.position - b.position).map(rowToCountry);
  const destinations = [...destinationRows]
    .sort((a, b) => a.position - b.position)
    .map((r) => rowToDestination(r, placeRows));
  return { countries, destinations };
}
