'use client';

import dynamic from 'next/dynamic';
import type { MapProps } from './MapInner';
import ThinkingIndicator from './ThinkingIndicator';

// Leaflet touches window, so it is loaded client-side only.
const MapInner = dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
      <ThinkingIndicator label="טוען מפה" />
    </div>
  ),
});

export default function PlacesMap(props: MapProps) {
  return <MapInner {...props} />;
}
