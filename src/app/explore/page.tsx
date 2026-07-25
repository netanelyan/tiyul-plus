import type { Metadata } from 'next';
import ExploreClient from './ExploreClient';

export const metadata: Metadata = {
  title: 'חקירת יעד חדש | טיול+',
  description:
    'יעד שעוד לא בקטלוג? ה-AI Explorer מאתר אתרים אמיתיים מוויקיפדיה בזמן אמת - עם מפה, תמונות ותקצירים.',
};

export default function ExplorePage() {
  return (
    <div>
      <h1 className="display text-3xl text-night sm:text-4xl">חקירת יעד חדש</h1>
      <p className="mt-2 max-w-2xl leading-relaxed text-night/60">
        היעד שלכם עוד לא בקטלוג האוצר שלנו? מקלידים עיר - וה-Explorer מאתר אתרים
        אמיתיים סביבה ממקורות ציבוריים, עם מפה ותקצירים. זה מידע גולמי שלא עבר את
        הבדיקה שלנו - ומסומן ככזה.
      </p>
      <ExploreClient />
    </div>
  );
}
