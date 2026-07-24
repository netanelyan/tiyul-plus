import { getProvider } from '@/lib/providers';
import StartClient from './StartClient';

export const metadata = {
  title: 'איך נתחיל? | טיול+',
  description: 'שלוש דרכים להתחיל טיול: שיחה חופשית עם הסוכן, שאלון מובנה, או קישור מרשת חברתית.',
};

export default async function StartPage() {
  const dests = await getProvider().getDestinations();
  const cities = dests.map((d) => ({ slug: d.slug, name: d.name, country: d.country }));
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="display text-3xl text-night sm:text-4xl">איך בא לכם להתחיל?</h1>
      <p className="mt-3 max-w-xl leading-relaxed text-night/60">
        אותו סוכן, אותו טיול - שלוש דרכים להזין אותו. בוחרים מה שנוח.
      </p>
      <StartClient cities={cities} />
    </div>
  );
}
