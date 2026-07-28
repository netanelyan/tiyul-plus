// המרה דו-כיוונית בין `src/data/*.ts` לבין שורות Supabase.
//
// **למה שני הכיוונים חיים במודול אחד:** כדי שאפשר יהיה להוכיח סימטריה
// בלי רשת בכלל. `scripts/catalog-roundtrip.mjs` מריץ
// files -> rows -> files ומשווה השוואה עמוקה. אם ההמרה מאבדת שדה,
// הופכת סדר או "מתקנת" ערך, הבדיקה נופלת מיד. זו ההוכחה האמיתית
// שההעברה היא העתקה טהורה; ספירת רשומות לבדה לא הייתה תופסת שדה חסר.
//
// שני כללים שקובעים כמעט הכול כאן:
//
// 1. **שדה שלא היה קיים במקור חייב לא להיות קיים אחרי החזרה.** בטיפוסים
//    שדות אופציונליים פשוט נעדרים (אין `photo: undefined`). לכן ההמרה
//    לשורה כותבת null, וההמרה חזרה **משמיטה** את המפתח. `mustSee` הוא
//    המקרה החד ביותר: הוא מופיע רק כשהוא true ולעולם לא כ-false.
// 2. **הסדר הוא תוכן.** סדר המדינות, היעדים והמקומות הוא החלטה עריכתית
//    (מה מופיע ראשון בעמוד), ולכן נשמר ב-`position` ולא מושאר לגחמת
//    ה-ORDER BY של הדאטהבייס.

/** שדות אופציונליים: null בדאטהבייס פירושו "לא קיים", לא "ריק". */
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
    kosher_verification: opt(p.kosherVerification),
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
// סדר המפתחות כאן הוא סדר השדות ב-`src/lib/types.ts`. הוא לא משפיע על
// שוויון עמוק, אבל שומר על קובץ שנוצר יציב וקריא בין הרצות.

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
  put(p, 'kosherVerification', r.kosher_verification);
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
