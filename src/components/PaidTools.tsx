'use client';

import { useState, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { planAtLeast } from '@/lib/plans';

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
 * layer. So a traveller scrolling their own free trip screen met an
 * advertisement halfway down, and the free tools around it read as the free
 * tier of something rather than as the product.
 *
 * ## Why it is at the top, collapsed
 *
 * It first went to the bottom, which fixed the interleaving and created a new
 * problem: *"instead of it being under everything, where people are less likely
 * to scroll, have a collapsed section in the top?"* - a thing nobody scrolls to
 * is not placed, it is buried.
 *
 * Collapsed is what makes the top position honest. One bar costs one row, so
 * the free tools underneath are not pushed down by something the traveller did
 * not ask for, and it is still the first thing they can choose to open.
 * Open-by-default here would be the original complaint again in a new position.
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
 * ## Same bar for a subscriber
 *
 * A premium traveller sees the identical bar in the identical position - only
 * the sub-line changes. A block that moves depending on who is looking is a
 * block nobody can learn.
 */
export default function PaidTools({ children }: { children: ReactNode }) {
  const auth = useAuth();
  // Ordinal: every paid plan gets the paid tools, not only the one named 'premium'
  const isPremium = planAtLeast(auth.profile?.plan ?? 'free', 'premium');
  const [open, setOpen] = useState(false);

  return (
    <section aria-labelledby="paid-tools-heading" className="mt-4">
      {/*
        A night bar, not a grey box - the first version got this backwards. It
        used a 3% night tint, which separated the section from the free stack
        correctly and then read as *duller* than everything above it. Netanel:
        "still, those are premium. also the gray feel is not it". Making the
        paid tools the quietest thing on the screen says they matter least,
        which is the opposite of what they are.

        Night + cream is the treatment this site already uses for its own good
        moments - the destinations band on the homepage, the closing card on a
        shared trip, the star card on /premium - and it is deliberately NOT the
        shell bar the free panels use, because this is a different kind of
        object and should not be mistaken for one more panel.

        The caret is the same glyph and size as those panels on purpose: the
        surface differs, the "this opens" language must not.
      */}
      <button
        type="button"
        data-paid-head
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-2xl bg-night px-4 py-3 text-start text-cream ring-1 ring-night transition hover:bg-night/90 print:hidden"
      >
        <span aria-hidden className="text-base leading-none text-zest">
          ★
        </span>
        <span id="paid-tools-heading" className="shrink-0 text-sm font-bold text-cream">
          כלים מתקדמים
        </span>
        {/*
          One truncating line, so it has to FIT at 390 rather than be cut there -
          the same lesson as the two panel meta lines, where the fuller sentence
          lost half of itself on exactly the device that needed it most. Measured
          on the narrow width, not judged on the wide one.
        */}
        <span data-paid-sub className="min-w-0 flex-1 truncate text-xs font-medium text-cream/55">
          {isPremium ? 'כלולים במנוי שלכם' : 'לתכנן ביחד ולצאת רגועים'}
        </span>
        <span aria-hidden className={`text-xs text-cream/70 transition ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {/*
        `hidden print:block` rather than a conditional render, and the
        distinction is load-bearing: the pre-departure check's printable report
        lives in here, and a collapsed section that removed its children from
        the DOM would silently drop a report the traveller paid for out of their
        PDF. Collapsed hides it on screen only.
      */}
      <div className={open ? 'mt-2 space-y-2' : 'hidden print:block'}>{children}</div>
    </section>
  );
}
