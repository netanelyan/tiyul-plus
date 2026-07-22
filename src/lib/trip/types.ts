// ---------- מודל הטיול ----------
// "טיול" הוא האובייקט המרכזי של האתר: רשימת ערים לפי סדר,
// וימים שכל אחד שייך לעיר ומחזיק עצירות מסודרות.

export interface TripDay {
  id: string;
  citySlug: string; // לאיזו עיר שייך היום
  placeIds: string[]; // עצירות לפי סדר
  notes?: string;
}

export interface Trip {
  id: string;
  name: string;
  citySlugs: string[]; // סדר הערים בטיול
  days: TripDay[];
  createdAt: number;
}

// העדפות האשף החכם
export interface WizardPrefs {
  citySlugs: string[];
  totalDays: number;
  pace: 'relaxed' | 'packed';
  tripType: 'city' | 'nature' | 'combined';
  shopping: 'more' | 'normal' | 'less';
  kosherOnly: boolean;
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}
