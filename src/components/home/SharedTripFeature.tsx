import Link from 'next/link';
import CardPhoto from '@/components/CardPhoto';
import { PREMIUM_PRICE_ILS } from '@/lib/plans';

/**
 * Section 5 - the feature block for the shared trip, the star of the
 * subscription (2026-08-17 (e)).
 *
 * The shape is a storefront's product feature: a big visual on one side, a
 * short pitch and a price on the other. The visual is a mock of the real
 * screen - three stops with thumbs-up counts and a comment - drawn in CSS on
 * top of a verified destination photo. **It is an illustration of the UI, not
 * a screenshot of a real group**, and the names on it are not real people.
 * That is why it carries no avatars and no faces.
 *
 * The one factual line - "friends pay nothing" - is the sentence that removes
 * the objection that kills this feature at the moment somebody considers it,
 * and it is true by construction: joining is gated on login, never on plan.
 */
export default function SharedTripFeature({ photo }: { photo?: string }) {
  return (
    <section className="py-10">
      <div className="grid items-center gap-6 overflow-hidden rounded-3xl bg-shell ring-1 ring-night/10 lg:grid-cols-2">
        {/* The mock, on the visual side */}
        <div className="relative min-h-[320px] lg:min-h-[420px]">
          <CardPhoto
            photo={photo}
            overlay="linear-gradient(180deg, rgba(36,27,77,0.15) 0%, rgba(36,27,77,0.75) 100%)"
            className="photo-bg absolute inset-0"
            sizes="(min-width: 1024px) 50vw, 94vw"
          />
          <div className="absolute inset-x-5 bottom-5 rounded-2xl bg-cream/95 p-4 shadow-[var(--shadow-pop)] backdrop-blur sm:inset-x-8 sm:bottom-8">
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold text-night">יום 2 · רומא</span>
              <span className="rounded-full bg-lagoon/15 px-2 py-0.5 text-xs font-bold text-lagoon-deep">
                4 חברים בטיול
              </span>
            </div>
            <ul className="mt-3 space-y-2">
              {[
                { name: 'הקולוסיאום', up: 4, down: 0 },
                { name: 'קמפו דה פיורי', up: 3, down: 1 },
                { name: 'גלריה בורגזה', up: 1, down: 2 },
              ].map((s) => (
                <li
                  key={s.name}
                  className="flex items-center justify-between rounded-xl bg-shell px-3 py-2 ring-1 ring-night/10"
                >
                  <span className="text-sm font-bold text-night">{s.name}</span>
                  <span className="flex gap-2 text-xs font-bold">
                    <span className="rounded-md bg-lagoon/15 px-1.5 py-0.5 text-lagoon-deep">
                      👍 {s.up}
                    </span>
                    <span className="rounded-md bg-night/5 px-1.5 py-0.5 text-night/55">
                      👎 {s.down}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 rounded-xl bg-sunset/10 px-3 py-2 text-xs font-semibold text-night/80">
              💬 &quot;את הגלריה אפשר להחליף בשוק? הילדים ישתעממו&quot;
            </div>
          </div>
        </div>

        {/* The pitch */}
        <div className="p-6 sm:p-8 lg:p-10">
          <span className="badge rounded-full bg-sunset/12 px-3 py-1 text-xs font-extrabold text-sunset-deep">
            הכוכב של המנוי
          </span>
          <h2 className="display mt-3 text-3xl text-night sm:text-4xl">טיול משותף</h2>
          <p className="mt-3 text-base leading-relaxed text-night/75 sm:text-lg">
            שולחים קישור אחד. החברים רואים את המסלול, מצביעים על כל עצירה, מגיבים, מציעים מקומות
            מהקטלוג ומסמנים אילו תאריכים מתאימים להם ומי בכלל מגיע. אתם רואים הכול במקום אחד -
            במקום שלושים הודעות בוואטסאפ.
          </p>
          <ul className="mt-5 grid gap-2 text-sm font-semibold text-night/80 sm:grid-cols-2">
            <li>👍 הצבעה על כל עצירה</li>
            <li>💬 תגובות לפי עצירה</li>
            <li>📍 החברים מציעים מקומות</li>
            <li>📅 סקר תאריכים ומי מגיע</li>
          </ul>
          <p className="mt-5 text-sm font-bold text-night">
            החברים לא משלמים כלום. רק מי שיוצר את הקישור - במנוי של {PREMIUM_PRICE_ILS} ₪ לחודש.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/premium"
              className="inline-flex items-center justify-center rounded-xl bg-sunset px-5 py-3 text-sm font-extrabold text-cream transition hover:bg-sunset-deep"
            >
              איך זה עובד
            </Link>
            <Link
              href="/chat"
              className="inline-flex items-center justify-center rounded-xl bg-shell px-5 py-3 text-sm font-bold text-night ring-1 ring-night/15 transition hover:ring-night/35"
            >
              קודם בונים טיול
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
