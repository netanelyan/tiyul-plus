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
 * ## The name of this file is not the name on the screen
 *
 * Internally this is the paid section, and it is called that so nobody editing
 * it is in any doubt about what lives here. On screen it is headed by what the
 * tools DO, because a price on the outside of a box is a reason to scroll past
 * it before ever finding out what is inside.
 *
 * The line that is not crossed: **the price is on the button that acts.** Not
 * leading with it is marketing; hiding it until somebody has committed is a
 * dark pattern. Nobody here can spend money, or put work into a feature, before
 * seeing what it costs.
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
        A night band, not a grey box - and the first version got this backwards.
        It used a 3% night tint, which separated the section from the free stack
        correctly and then read as *duller* than everything above it. Netanel:
        "still, those are premium. also the gray feel is not it". He is right:
        making the paid tools the quietest thing on the screen says they matter
        least, which is the opposite of what they are.

        Night + cream is the treatment this site already uses for its own good
        moments - the destinations band on the homepage, the closing card on a
        shared trip, the star card on /premium. The panel bars inside are
        `bg-shell`, so on night they lift off the page instead of smearing into
        it, exactly as those homepage cards do.

        NOT `print:hidden`, deliberately: the pre-departure check prints once it
        has a real result, because a report somebody paid for belongs in the PDF
        they hand around. So the band stays in the flow and drops its own paint
        for print - a dark rectangle across an A4 page would be worse than the
        problem it solves.
      */
      className="mt-6 rounded-3xl bg-night p-5 text-cream ring-1 ring-night print:mt-0 print:bg-transparent print:p-0 print:text-night print:ring-0"
    >
      {/*
        The heading names what these DO, not what they cost - and that was a
        correction. The first version led with "the only two things here that
        cost money", which is honest and, as Netanel put it, "if it already is
        labeled as a paid feature, most might skip it": a price tag on the
        outside is a reason to scroll past before ever seeing what the thing is.

        Where the line sits, because there is one. Not leading with the price is
        ordinary product marketing; hiding it until someone has committed is a
        dark pattern, and this does not do that. Each tool explains itself, and
        the **price is on the button that acts** - the check's button carries its
        price, the shared trip's carries the subscription. Nobody can spend
        money, or invest work into a feature, without having seen the cost
        first. The section label is the shop window, not the receipt.

        It is also print-hidden: a shop window has no business in a printed
        itinerary.
      */}
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 print:hidden">
        <h2 id="paid-tools-heading" className="text-base font-black text-cream">
          <span aria-hidden className="me-1.5 text-zest">
            ★
          </span>
          כלים מתקדמים
        </h2>
        <p className="text-xs font-medium text-cream/60">
          {isPremium
            ? 'כלולים במנוי שלכם'
            : 'לתכנן ביחד עם אחרים, ולצאת לדרך בראש שקט'}
        </p>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
