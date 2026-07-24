'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { destinations } from '@/data/destinations';
import { useTrip } from '@/lib/trip/TripContext';
import { generateTrip } from '@/lib/trip/generate';
import type { TripPreferences, WizardPrefs } from '@/lib/trip/types';

/**
 * שאלון מובנה מודרך: כמה צעדים פשוטים שאוספים את בסיס הטיול לפי מודל
 * ההעדפות הקיים (WizardPrefs + TripPreferences) - ולבסוף מייצרים טיול
 * אמיתי עם generateTrip (אותה לוגיקה של האשף/planner, keyless) ונוחתים
 * בתצוגת המתכנן. כשר/שבת הן העדפות שוות ואופציונליות, לא מודגשות.
 */

type City = { slug: string; name: string; country: string };
type Party = 'couple' | 'family' | 'friends' | 'solo';

const PARTY = [
  { v: 'couple', label: 'זוג' },
  { v: 'family', label: 'משפחה' },
  { v: 'friends', label: 'חברים' },
  { v: 'solo', label: 'לבד' },
];
const VIBE: { v: WizardPrefs['tripType']; label: string; hint: string }[] = [
  { v: 'city', label: 'עירוני', hint: 'מוזיאונים, אוכל, קניות' },
  { v: 'nature', label: 'טבע', hint: 'נופים, הרים, אגמים' },
  { v: 'combined', label: 'משולב', hint: 'קצת מהכול' },
];
// ערכי העברית תואמים ל-regex של generateTrip (targetTagsFromPreferences)
const INTERESTS = ['היסטוריה', 'אמנות', 'אוכל', 'טבע', 'חיי לילה', 'רומנטי', 'משפחה'];
const BUDGET = [
  { v: 'low', label: 'חסכוני' },
  { v: 'medium', label: 'רגיל' },
  { v: 'high', label: 'מפנק' },
];
const PACE = [
  { v: 'relaxed', label: 'רגוע' },
  { v: 'packed', label: 'דחוס' },
];
const SHOPPING = [
  { v: 'less', label: 'פחות' },
  { v: 'normal', label: 'רגיל' },
  { v: 'more', label: 'יותר' },
];

const STEPS = ['לאן', 'כמה ומי', 'סוג הטיול', 'תקציב וקצב', 'העדפות'];

function Choice({
  label,
  hint,
  active,
  onClick,
}: {
  label: string;
  hint?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-2xl px-4 py-2.5 text-sm font-semibold ring-1 transition ${
        active
          ? 'bg-sunset text-cream ring-sunset'
          : 'bg-shell text-night/65 ring-night/15 hover:ring-sunset/40'
      }`}
    >
      {label}
      {hint && (
        <span className={`mt-0.5 block text-xs font-normal ${active ? 'text-cream/80' : 'text-night/40'}`}>
          {hint}
        </span>
      )}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-sm font-bold text-night">{label}</div>
      {children}
    </div>
  );
}

function tripName(citySlugs: string[], cities: City[]): string {
  const chosen = cities.filter((c) => citySlugs.includes(c.slug));
  if (chosen.length === 0) return 'הטיול שלי';
  if (chosen.length === 1) return `טיול ל${chosen[0].name}`;
  const countries = [...new Set(chosen.map((c) => c.country))];
  if (countries.length === 1) return `טיול ל${countries[0]}`;
  return `טיול ל${chosen.map((c) => c.name).join(' + ')}`;
}

export default function QuizWizard({ cities }: { cities: City[] }) {
  const router = useRouter();
  const trip = useTrip();
  const [step, setStep] = useState(0);
  const [building, setBuilding] = useState(false);

  const [citySlugs, setCitySlugs] = useState<string[]>([]);
  const [totalDays, setTotalDays] = useState(4);
  const [party, setParty] = useState<Party | ''>('');
  const [tripType, setTripType] = useState<WizardPrefs['tripType']>('combined');
  const [interests, setInterests] = useState<string[]>([]);
  const [budget, setBudget] = useState<TripPreferences['budget'] | ''>('');
  const [pace, setPace] = useState<WizardPrefs['pace']>('relaxed');
  const [shopping, setShopping] = useState<WizardPrefs['shopping']>('normal');
  const [kosher, setKosher] = useState(false);
  const [shabbat, setShabbat] = useState(false);

  const toggleCity = (slug: string) =>
    setCitySlugs((cur) => (cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug]));
  const toggleInterest = (v: string) =>
    setInterests((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));

  const canNext = step === 0 ? citySlugs.length > 0 : true;
  const isLast = step === STEPS.length - 1;

  const finish = () => {
    setBuilding(true);
    const prefs: WizardPrefs = {
      citySlugs,
      totalDays,
      pace,
      tripType,
      shopping,
      kosherOnly: kosher,
    };
    const preferences: TripPreferences = {
      pace,
      shopping,
      ...(party ? { party } : {}),
      ...(budget ? { budget } : {}),
      ...(kosher ? { kosher: true } : {}),
      ...(shabbat ? { shabbatAware: true } : {}),
      ...(interests.length > 0 ? { interests } : {}),
    };
    const built = generateTrip(prefs, destinations, tripName(citySlugs, cities), preferences);
    trip.createTripFrom(built);
    router.push('/planner');
  };

  return (
    <div className="mt-5 rounded-2xl bg-shell p-5 ring-1 ring-night/10 sm:p-7">
      {/* פס התקדמות */}
      <div className="mb-5 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className={`h-1.5 w-full rounded-full transition ${
                i <= step ? 'bg-sunset' : 'bg-night/10'
              }`}
            />
            <span
              className={`hidden text-[11px] font-semibold sm:block ${
                i === step ? 'text-sunset-deep' : 'text-night/40'
              }`}
            >
              {s}
            </span>
          </div>
        ))}
      </div>

      <div className="min-h-[15rem]">
        {step === 0 && (
          <Field label="לאן טסים? (אפשר לבחור כמה ערים)">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {cities.map((c) => {
                const active = citySlugs.includes(c.slug);
                return (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => toggleCity(c.slug)}
                    aria-pressed={active}
                    className={`rounded-2xl p-3 text-start transition ${
                      active
                        ? 'bg-sunset/10 ring-2 ring-sunset'
                        : 'bg-night/[0.03] ring-1 ring-night/10 hover:ring-night/30'
                    }`}
                  >
                    <div className="font-bold text-night">{c.name}</div>
                    <div className="text-xs font-medium text-night/50">{c.country}</div>
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <Field label="כמה ימים?">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setTotalDays((d) => Math.max(1, d - 1))}
                  aria-label="פחות ימים"
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-night/5 text-xl font-bold text-night/70 transition hover:bg-night/10"
                >
                  −
                </button>
                <span className="w-16 text-center text-xl font-bold text-night" aria-live="polite">
                  {totalDays}
                </span>
                <button
                  type="button"
                  onClick={() => setTotalDays((d) => Math.min(21, d + 1))}
                  aria-label="עוד ימים"
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-night/5 text-xl font-bold text-night/70 transition hover:bg-night/10"
                >
                  +
                </button>
              </div>
            </Field>
            <Field label="מי נוסע?">
              <div className="flex flex-wrap gap-2">
                {PARTY.map((o) => (
                  <Choice
                    key={o.v}
                    label={o.label}
                    active={party === o.v}
                    onClick={() => setParty(party === o.v ? '' : (o.v as Party))}
                  />
                ))}
              </div>
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <Field label="איזה טיול בא לכם?">
              <div className="grid grid-cols-3 gap-2">
                {VIBE.map((o) => (
                  <Choice
                    key={o.v}
                    label={o.label}
                    hint={o.hint}
                    active={tripType === o.v}
                    onClick={() => setTripType(o.v)}
                  />
                ))}
              </div>
            </Field>
            <Field label="מה מעניין אתכם? (אפשר כמה, לא חובה)">
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((v) => (
                  <Choice key={v} label={v} active={interests.includes(v)} onClick={() => toggleInterest(v)} />
                ))}
              </div>
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <Field label="תקציב">
              <div className="flex flex-wrap gap-2">
                {BUDGET.map((o) => (
                  <Choice
                    key={o.v}
                    label={o.label}
                    active={budget === o.v}
                    onClick={() => setBudget(budget === o.v ? '' : (o.v as TripPreferences['budget']))}
                  />
                ))}
              </div>
            </Field>
            <Field label="קצב">
              <div className="flex flex-wrap gap-2">
                {PACE.map((o) => (
                  <Choice key={o.v} label={o.label} active={pace === o.v} onClick={() => setPace(o.v as WizardPrefs['pace'])} />
                ))}
              </div>
            </Field>
            <Field label="שופינג">
              <div className="flex flex-wrap gap-2">
                {SHOPPING.map((o) => (
                  <Choice
                    key={o.v}
                    label={o.label}
                    active={shopping === o.v}
                    onClick={() => setShopping(o.v as WizardPrefs['shopping'])}
                  />
                ))}
              </div>
            </Field>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <Field label="העדפות (אופציונלי)">
              <div className="flex flex-wrap gap-2">
                <Choice label="אוכל כשר" active={kosher} onClick={() => setKosher((v) => !v)} />
                <Choice label="שמירת שבת" active={shabbat} onClick={() => setShabbat((v) => !v)} />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-night/45">
                העדפות שוות ואופציונליות - נכבד אותן בבניית הטיול רק אם תבחרו בהן.
              </p>
            </Field>
            <div className="rounded-xl bg-cream p-4 text-sm leading-relaxed text-night/70">
              נבנה עכשיו טיול של <b>{totalDays} ימים</b>
              {citySlugs.length > 0 && (
                <>
                  {' '}
                  ל<b>{cities.filter((c) => citySlugs.includes(c.slug)).map((c) => c.name).join(' + ')}</b>
                </>
              )}
              , ותיפול ישר לתצוגת המתכנן - הכול ניתן לעריכה אחר כך.
            </div>
          </div>
        )}
      </div>

      {/* ניווט */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || building}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-night/60 transition hover:text-night disabled:opacity-0"
        >
          → הקודם
        </button>
        {isLast ? (
          <button
            type="button"
            onClick={finish}
            disabled={building}
            className="rounded-xl bg-sunset px-6 py-3 font-bold text-cream transition hover:bg-sunset-deep disabled:opacity-70"
          >
            {building ? 'בונים…' : 'בונים לי טיול ←'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            disabled={!canNext}
            className="rounded-xl bg-sunset px-6 py-3 font-bold text-cream transition hover:bg-sunset-deep disabled:bg-sunset/50"
          >
            הבא ←
          </button>
        )}
      </div>
    </div>
  );
}
