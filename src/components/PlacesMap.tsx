'use client';

import dynamic from 'next/dynamic';
import type { MapProps } from './MapInner';

// Leaflet נוגע ב-window, לכן טוענים אותו רק בצד הלקוח.
const MapInner = dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full animate-pulse items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
      טוען מפה…
    </div>
  ),
});

export default function PlacesMap(props: MapProps) {
  return <MapInner {...props} />;
}
