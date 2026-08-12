import AskClient from './AskClient';

export const metadata = {
  title: 'שאל את הסוכן | טיול+',
  description:
    'שאלות על יעדים בעברית, בלי לפתוח טיול ובלי להתחבר - אותו סוכן, אותם כללי כנות. ואם ירקם טיול, אפשר לבנות אותו בלחיצה אחת.',
};

export default function AskPage() {
  return <AskClient />;
}
