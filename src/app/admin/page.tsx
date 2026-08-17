import type { Metadata } from 'next';
import AdminClient from './AdminClient';

/**
 * The admin area. There is deliberately no server-side Next gate here - this page is static and
 * carries no information at all: everything is loaded from the /api/admin/* routes, and each of
 * them verifies the role against the database itself. Anyone without permission sees a "not found"
 * screen and receives not a single byte of data.
 */
export const metadata: Metadata = {
  title: 'ניהול | טיול+',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminClient />;
}
