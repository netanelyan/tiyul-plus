/**
 * The building blocks of the policy pages (privacy, terms, cookies, affiliates...).
 *
 * ## Why there is a `Gap` component here and why it shouts
 *
 * These pages were written out of a code review, and in a few places the review hit
 * its limit: what a third-party vendor does with data, how long a hosting provider
 * keeps logs, what was decided about a retention period. The temptation is to write
 * a plausible-sounding sentence there.
 *
 * **A plausible sentence in a privacy policy is a legal statement, and a plausible
 * sentence that is not true is a violation.** So a gap is marked and looks like a
 * gap - yellow, framed, with the exact open question inside it - and does not
 * masquerade as content. Whoever reads the page sees at once what has not been
 * decided yet, and all of these are easy to find before publishing.
 */

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-night">{title}</h2>
      <div className="mt-2 space-y-3 leading-relaxed text-night/75">{children}</div>
    </section>
  );
}

export function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="font-bold text-night/90">{title}</h3>
      <div className="mt-1 space-y-2">{children}</div>
    </div>
  );
}

/** A list - `list-inside` so the bullet stays on the correct side in RTL */
export function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-inside list-disc space-y-1.5 ps-1">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

/**
 * A known gap. `kind` determines who needs to close it:
 * - `fill`   - Netanel fills in a detail (phone, address, date).
 * - `verify` - a fact outside the code must be verified before it can be written.
 */
export function Gap({ kind = 'fill', children }: { kind?: 'fill' | 'verify'; children: React.ReactNode }) {
  const label = kind === 'fill' ? '[למילוי]' : '[לבירור]';
  return (
    <p className="rounded-xl bg-zest/10 p-3 text-sm leading-relaxed text-night/80 ring-1 ring-zest/40">
      <span className="font-bold text-night">{label}</span> {children}
    </p>
  );
}

/** The last-updated date at the bottom of every policy page */
export function Updated({ date }: { date: string }) {
  return <p className="mt-10 text-sm text-night/50">עודכן לאחרונה: {date}</p>;
}
