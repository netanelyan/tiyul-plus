import { getProvider } from '@/lib/providers';
import PlannerClient from './PlannerClient';

export const metadata = { title: 'מתכנן מסלולים | טיול+' };

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ dest?: string }>;
}) {
  const { dest } = await searchParams;
  const provider = getProvider();
  // **תקצירים, לא יעדים מלאים.** קודם נשלפו כאן כל 166 היעדים במלואם
  // והועברו כ-props - כלומר הקטלוג כולו נסרל אל תוך ה-HTML של הדף:
  // 555kB, ו-TTFB של ~200ms מול 10-20ms בשאר הדפים. הוא ממילא מגיע
  // ללקוח פעם שנייה כ-JS דרך TripWorkspace, כך שזו הייתה מסירה כפולה
  // של אותה דאטה. הבחירה והתבניות צריכות שם, דגל ומספר ימים בלבד.
  // רשימת המדינות המלאה נשלפה כאן ולא נקראה בכלל בצד הלקוח - ירדה.
  const summaries = await provider.getDestinations();
  const initial = summaries.find((d) => d.slug === dest)?.slug ?? summaries[0]?.slug ?? '';
  return <PlannerClient summaries={summaries} initialSlug={initial} />;
}
