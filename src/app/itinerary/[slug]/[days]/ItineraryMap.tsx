'use client';

import PlacesMap from '@/components/PlacesMap';
import type { Place } from '@/lib/types';

/**
 * The map of exactly the stops on THIS itinerary.
 *
 * A thin client wrapper so the page itself stays a server component - the itinerary
 * page is the crawlable surface, and Leaflet must not drag the whole page into the
 * client bundle to render a map inside it.
 *
 * The height lives on the PARENT, not here: `PlacesMap` renders its container as
 * `h-full w-full`, so passing a height class down produces two competing height
 * utilities of equal specificity and the winner is whichever Tailwind emits last.
 * That is a real bug this project already shipped once - the story page's map
 * measured 288x0 on a phone, i.e. invisible on the device most visitors use.
 */
export default function ItineraryMap({
  places,
  center,
  zoom,
}: {
  places: Place[];
  center: { lat: number; lng: number };
  zoom: number;
}) {
  return <PlacesMap places={places} center={center} zoom={zoom} />;
}
