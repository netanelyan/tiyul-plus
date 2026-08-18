'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';

/**
 * The one place on the trip screen where things cost money.
 *
 * ## Why this exists
 *
 * Netanel: *"I don't think the premium features should be on top of the free
 * ones (which are very important). They should just be in a different place."*
 *
 * He is describing what the stack actually looked like. Nine blocks sat under
 * the plan, and the paid ones were sitting at positions three and four - a
 * locked "shared trip" panel wedged between the Shabbat times and the booking
 * layer, with a padlock's worth of copy inside it. So a traveller scrolling
 * their own free trip screen met an advertisement halfway down, and the free
 * tools around it read as the free tier of something rather than as the
 * product.
 *
 * The fix is placement, not wording. Everything above this section is free and
 * uninterrupted; everything that costs money is here, once, below it, on its
 * own ground.
 *
 * ## Why it is labelled rather than hidden
 *
 * The honest version of "these cost money" is to say so, and the subtitle does
 * the more useful half of the job: **it tells a free traveller that nothing
 * else on the screen costs anything.** That sentence is only true because of
 * where this section sits, which is the point - the layout is the claim, and
 * the copy just reads it out.
 *
 * The claim is scoped to this screen on purpose. It does NOT say "everything
 * else on the site is free" - the free tier has daily quotas, and a sentence
 * that overshoots by one word is the kind this project keeps having to correct.
 *
 * ## Same place for a subscriber
 *
 * A premium traveller sees the identical section in the identical position -
 * only the subtitle changes, from a price statement to "included in your
 * subscription". A block that moves depending on who is looking is a block
 * nobody can learn, and the tools in here (create an invite link, run the
 * pre-departure check) are once-per-trip actions, not things you reach for
 * while arranging a day.
 */
export default function PaidTools({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const isPremium = auth.profile?.plan === 'premium';

  return (
    <section
      aria-labelledby="paid-tools-heading"
      /*
        A ground of its own, and a quiet one. `bg-shell` was not an option: the
        panel bars inside are themselves bg-shell on a cream page - three colour
        values apart - so a shell container would have smeared into one mass,
        exactly as recorded when PanelSection was built. A night tint at 3% is
        the smallest step that still reads as "a different surface".
      */
      /*
        NOT `print:hidden` on the section, and that is deliberate: the
        pre-departure check deliberately prints once it has a real result
        (`phase.kind === 'result'`), because a report somebody paid for belongs
        in the PDF they hand around. Hiding the whole section would have taken
        that with it - a regression invisible on screen and only findable in an
        export. So the section stays printable and only loses its own chrome,
        while each child keeps deciding for itself (the group panel is
        print:hidden on its own).
      */
      className="mt-6 rounded-2xl bg-night/[0.03] p-4 ring-1 ring-night/10 print:mt-0 print:bg-transparent print:p-0 print:ring-0"
    >
      {/* The label is a shop sign - it has no business in a printed itinerary */}
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 print:hidden">
        <h2 id="paid-tools-heading" className="text-sm font-bold text-night">
          כלים בתשלום
        </h2>
        <p className="text-xs font-medium text-night/50">
          {isPremium
            ? 'כלולים במנוי שלכם - בלי תשלום נוסף'
            : 'רק אלה. כל שאר הכלים במסך הזה חינם.'}
        </p>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
