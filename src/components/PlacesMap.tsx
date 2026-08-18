'use client';

import dynamic from 'next/dynamic';
import type { MapProps } from './MapInner';
import { Skeleton } from './Skeleton';

/*
  Leaflet touches window, so it is loaded client-side only.

  The placeholder is the map's own rectangle rather than a spinner in a grey
  box: the map has a fixed height in every one of its callers, so the shape is
  known exactly and the page does not reflow when the tiles arrive. It also
  drops the one hardcoded slate colour that was left on this screen - the
  skeleton class is built from the palette tokens, so high-contrast mode
  reaches it.
*/
const MapInner = dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: () => (
    <div role="status" aria-busy="true" aria-label="טוענים את המפה" className="h-full w-full">
      <Skeleton className="h-full w-full rounded-2xl" />
    </div>
  ),
});

export default function PlacesMap(props: MapProps) {
  return <MapInner {...props} />;
}
