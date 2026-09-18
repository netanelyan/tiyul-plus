import SectionHead from '@/components/home/SectionHead';

/**
 * Section 9 - how it works, in four steps.
 *
 * Each step describes something the product actually does today, in the order
 * a first visitor meets it. Nothing here is aspirational: "only verified
 * places" is hard rule 2, the map is the trip screen, the share link is
 * `/t/<code>`, and the print export is the trip book. If a step ever stops
 * being true, remove it rather than soften it.
 */
const STEPS: { emoji: string; title: string; body: string }[] = [
  {
    emoji: '💬',
    title: 'מספרים לסוכן',
    body: 'לאן, כמה זמן, עם מי ומה חשוב לכם. בעברית, כמו לחבר. הוא שואל מה שחסר ולא מניח כלום.',
  },
  {
    emoji: '🗺️',
    title: 'מקבלים טיול על מפה',
    body: 'יום-אחרי-יום, עם עצירות, זמני נסיעה בין ערים ומידע מעשי לישראלים - רק ממקומות שאומתו.',
  },
  {
    emoji: '✏️',
    title: 'משנים בשיחה',
    body: '"תזיז את השוק ליום 3", "תוסיף משהו כשר ליד המלון" - הטיול מתעדכן על המסך תוך כדי.',
  },
  {
    emoji: '📤',
    title: 'משתפים ויוצאים',
    body: 'קישור לחברים, ניווט לגוגל מפות לכל יום, והדפסה של ספר הטיול. בלי חשבון, אם לא רוצים.',
  },
];

export default function HowItWorks() {
  return (
    <section className="py-10">
      <SectionHead title="איך זה עובד" subtitle="ארבעה צעדים, בלי טפסים." />

      <ol className="mt-6 grid gap-3 sm:gap-4 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <li
            key={s.title}
            className="relative rounded-2xl bg-shell p-5 ring-1 ring-night/10"
          >
            <span className="absolute end-4 top-4 text-3xl font-black text-night/10">
              {i + 1}
            </span>
            <span aria-hidden="true" className="text-3xl">
              {s.emoji}
            </span>
            <h3 className="mt-3 text-base font-extrabold text-night">{s.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-night/70">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
