import type { Metadata } from 'next';
import AskClient from './AskClient';
import { pageMetadata } from '@/lib/seo/site';

export const metadata: Metadata = pageMetadata({
  path: '/ask',
  title: 'שאל את הסוכן | טיול+',
  description:
    'שאלות על יעדים בעברית, בלי לפתוח טיול ובלי להתחבר - אותו סוכן, אותם כללי כנות. ואם ירקם טיול, אפשר לבנות אותו בלחיצה אחת.',
  noindex: true,
});

export default function AskPage() {
  return <AskClient />;
}
