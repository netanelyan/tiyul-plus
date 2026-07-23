import type { Destination, Place, PlaceCategory, PlaceTag } from '@/lib/types';
import type { Trip, TripDay, TripPreferences, WizardPrefs } from './types';
import { newId } from './types';

/**
 * האשף החכם: לוגיקת דירוג ואריזת ימים - צד לקוח בלבד, בלי AI ובלי עלות.
 * ציון לכל מקום לפי סוג הטיול והעדפות, ואז אריזה גיאוגרפית לימים
 * לפי תקציב זמן. הפלט הוא Trip רגיל שאפשר לערוך.
 * מ-Phase 2: הציון קורא גם את Trip.preferences - תגיות שתואמות תחומי עניין
 * והרכב נוסעים מקבלות דחיפה, ותקציב נמוך מעניש מקומות יקרים (priceLevel).
 */

type Weights = Partial<Record<PlaceCategory, number>>;

const TYPE_WEIGHTS: Record<WizardPrefs['tripType'], Weights> = {
  city: { attraction: 3, museum: 3, cafe: 2, shopping: 2.5, viewpoint: 1.5, nature: 0.7 },
  nature: { nature: 3.5, viewpoint: 3, attraction: 1.2, museum: 0.6, cafe: 1, shopping: 0.4 },
  combined: { attraction: 2.2, museum: 2, nature: 2.2, viewpoint: 2.2, cafe: 1.3, shopping: 1.3 },
};

// תחומי עניין בעברית חופשית → תגיות מהסט הסגור
const INTEREST_TAGS: [RegExp, PlaceTag][] = [
  [/טבע|פארק|ירוק|הליכות/, 'outdoors'],
  [/היסטוריה|עתיק|מורשת/, 'history'],
  [/אמנות|מוזיאונ|גלריה/, 'art'],
  [/אוכל|קולינר|שוק|גלידה/, 'foodie'],
  [/רומנטי/, 'romantic'],
  [/ילדים|משפחה/, 'families'],
  [/לילה|בילוי|מסיבות|ברים/, 'nightlife'],
];

/** גוזר תגיות יעד מהעדפות הטיול (הרכב נוסעים + תחומי עניין) */
export function targetTagsFromPreferences(preferences?: TripPreferences): Set<PlaceTag> {
  const target = new Set<PlaceTag>();
  if (!preferences) return target;
  if (preferences.party === 'family') target.add('families');
  if (preferences.party === 'couple') target.add('romantic');
  for (const interest of preferences.interests ?? []) {
    for (const [re, tag] of INTEREST_TAGS) {
      if (re.test(interest)) target.add(tag);
    }
  }
  return target;
}

function score(
  place: Place,
  prefs: WizardPrefs,
  targetTags: Set<PlaceTag>,
  budget?: TripPreferences['budget'],
): number {
  if (place.category.startsWith('kosher')) return 0; // אוכל כשר משובץ בנפרד
  let w = TYPE_WEIGHTS[prefs.tripType][place.category] ?? 1;
  if (place.category === 'shopping') {
    if (prefs.shopping === 'more') w = 4;
    if (prefs.shopping === 'less') return 0;
  }
  // התאמת תגיות להעדפות - כל תגית תואמת מוסיפה דחיפה
  if (targetTags.size > 0 && place.tags) {
    const matches = place.tags.filter((t) => targetTags.has(t)).length;
    w *= 1 + 0.35 * matches;
  }
  // תקציב מול רמת מחיר
  if (budget === 'low') {
    if (place.priceLevel === 3) w *= 0.45;
    else if (place.priceLevel !== undefined && place.priceLevel <= 1) w *= 1.15;
  } else if (budget === 'medium' && place.priceLevel === 3) {
    w *= 0.75;
  }
  if (place.mustSee) w *= 1.25;
  return w * (place.rating ?? 3.5);
}

function distKm(a: Place, b: Place): number {
  // קירוב שטוח - מספיק לאשכול עצירות בתוך עיר
  const dx = (a.lng - b.lng) * 111 * Math.cos((a.lat * Math.PI) / 180);
  const dy = (a.lat - b.lat) * 111;
  return Math.sqrt(dx * dx + dy * dy);
}

/** חלוקת ימים בין ערים: בסיס שווה, שארית לערים הראשונות */
function allocateDays(totalDays: number, cities: string[]): Map<string, number> {
  const alloc = new Map<string, number>();
  const base = Math.max(1, Math.floor(totalDays / cities.length));
  let left = totalDays - base * cities.length;
  for (const c of cities) {
    alloc.set(c, base + (left > 0 ? 1 : 0));
    if (left > 0) left--;
  }
  return alloc;
}

export function generateTrip(
  prefs: WizardPrefs,
  destinations: Destination[],
  name: string,
  preferences?: TripPreferences,
): Trip {
  const timeBudget = prefs.pace === 'relaxed' ? 300 : 480; // דקות ליום
  const days: TripDay[] = [];
  const alloc = allocateDays(prefs.totalDays, prefs.citySlugs);
  const targetTags = targetTagsFromPreferences(preferences);

  for (const slug of prefs.citySlugs) {
    const dest = destinations.find((d) => d.slug === slug);
    if (!dest) continue;
    const dayCount = alloc.get(slug) ?? 1;

    const scored = dest.places
      .map((p) => ({ place: p, s: score(p, prefs, targetTags, preferences?.budget) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s);
    const kosherSpots = prefs.kosherOnly
      ? dest.places.filter((p) => p.category === 'kosher-food')
      : [];

    const used = new Set<string>();

    for (let d = 0; d < dayCount; d++) {
      const placeIds: string[] = [];
      let minutes = 0;

      // עוגן: המקום עם הציון הגבוה ביותר שעוד לא בשימוש
      const seed = scored.find((x) => !used.has(x.place.id));
      if (seed) {
        placeIds.push(seed.place.id);
        used.add(seed.place.id);
        minutes += seed.place.durationMin ?? 60;

        // ממשיכים גיאוגרפית: הקרוב הבא עם ציון טוב, עד גמר תקציב הזמן
        let cursor = seed.place;
        while (minutes < timeBudget) {
          const candidates = scored.filter(
            (x) => !used.has(x.place.id) && minutes + (x.place.durationMin ?? 60) <= timeBudget,
          );
          if (candidates.length === 0) break;
          candidates.sort(
            (a, b) =>
              distKm(cursor, a.place) / a.s - distKm(cursor, b.place) / b.s,
          );
          const next = candidates[0];
          placeIds.push(next.place.id);
          used.add(next.place.id);
          minutes += next.place.durationMin ?? 60;
          cursor = next.place;
        }
      }

      // שיבוץ ארוחה כשרה: הקרובה ביותר לעצירה האחרונה
      if (prefs.kosherOnly && kosherSpots.length > 0 && placeIds.length > 0) {
        const last = dest.places.find((p) => p.id === placeIds[placeIds.length - 1]);
        const available = kosherSpots.filter((k) => !placeIds.includes(k.id));
        if (last && available.length > 0) {
          available.sort((a, b) => distKm(last, a) - distKm(last, b));
          placeIds.push(available[0].id);
        }
      }

      days.push({ id: newId(), citySlug: slug, placeIds });
    }
  }

  return {
    id: newId(),
    name,
    citySlugs: [...prefs.citySlugs],
    days,
    createdAt: Date.now(),
    ...(preferences && Object.keys(preferences).length > 0 ? { preferences } : {}),
  };
}

/** יצירת טיול מתבנית מסלול מוכן של יעד */
export function tripFromTemplate(dest: Destination): Trip {
  return {
    id: newId(),
    name: `טיול ל${dest.name}`,
    citySlugs: [dest.slug],
    days: dest.itinerary.map((d) => ({
      id: newId(),
      citySlug: dest.slug,
      placeIds: [...d.placeIds],
      notes: d.notes,
    })),
    createdAt: Date.now(),
  };
}
