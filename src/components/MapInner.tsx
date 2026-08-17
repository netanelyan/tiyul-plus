'use client';

import { outboundAttrs, outboundTarget, placeMapUrl } from '@/lib/outbound';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { Place } from '@/lib/types';
import type { TripPinKind } from '@/lib/trip/types';
import { categoryMeta } from '@/lib/categories';
import PlaceThumb from '@/components/PlaceThumb';
import KosherBadge from '@/components/KosherBadge';
import KosherNote from '@/components/KosherNote';

/**
 * From this zoom level and up we show a small photo above the pin - at
 * city zoom there is room on screen and the photos help identify the
 * stops; at country zoom they would hide one another, so only the pins
 * remain.
 */
const PHOTO_PIN_ZOOM = 13;

/** Place photo above the pin; if the image fails to load - it disappears quietly, the pin stays */
function photoHtml(photo: string | undefined): string {
  if (!photo) return '';
  return `<img class="pin-photo" src="${photo}" alt="" loading="lazy" onerror="this.remove()" />`;
}

/**
 * One day's group of stops in the whole-trip view - each day in its own
 * color, and the badge (the day number) shown inside the pin instead of
 * the category emoji.
 */
export interface MapGroup {
  /** What is shown inside the pin - usually the day number */
  badge: string;
  /** The day's pin color (from dayColors) */
  color: string;
  places: Place[];
}

/**
 * A pin belonging to the traveler themself (a hotel they booked, a
 * restaurant where they reserved a table) - not a catalog stop and not
 * part of the route, so it does not join the route line and is not
 * numbered. Only pins that have a location are shown: an unverified pin
 * is handled by the surrounding UI.
 */
export interface MapPin {
  id: string;
  kind: TripPinKind;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  note?: string;
}

const PIN_STYLE: Record<TripPinKind, { emoji: string; color: string }> = {
  stay: { emoji: '🏨', color: '#241b4d' },
  reservation: { emoji: '🍽️', color: '#ff5941' },
  other: { emoji: '📍', color: '#0d9488' },
};

export interface MapProps {
  center: { lat: number; lng: number };
  zoom: number;
  places: Place[];
  /** Traveler pins that already have a location */
  pins?: MapPin[];
  /** Dragging a pin to the right spot - the traveler fixes a wrong geocode or places manually */
  onPinMove?: (id: string, lat: number, lng: number) => void;
  /**
   * The id of the pin awaiting manual placement. While it is set, a click
   * on the map fixes its location - this is the path for a pin the
   * automatic geocoder could not find.
   */
  placingPinId?: string | null;
  /** Numbering the stops (for a daily route) - index by array order */
  numbered?: boolean;
  /** Draw a line between the stops in order */
  showRoute?: boolean;
  highlightId?: string | null;
  className?: string;
  /**
   * Whole-trip view: when passed, it is what determines the pins and the
   * line - all days' stops together, each day in its own color and badge.
   * `places` is ignored.
   */
  groups?: MapGroup[];
}

function makeIcon(
  place: Place,
  index: number,
  numbered: boolean,
  highlighted: boolean,
  withPhoto = false,
) {
  const meta = categoryMeta[place.category];
  const scale = highlighted ? 'scale(1.15)' : 'scale(1)';
  const content = numbered
    ? `<span class="pin-index">${index + 1}</span>`
    : `<span>${meta.emoji}</span>`;
  const photo = withPhoto ? photoHtml(place.photo) : '';
  return L.divIcon({
    className: 'pin-marker',
    iconSize: photo ? [46, 82] : [28, 36],
    iconAnchor: photo ? [23, 80] : [14, 34],
    popupAnchor: photo ? [0, -76] : [0, -30],
    html: `<div class="pin-stack" style="transform:${scale}">
             ${photo}
             <div class="pin">
               <div class="pin-drop" style="background:${meta.color}"></div>
               <div class="pin-content">${content}</div>
             </div>
           </div>`,
  });
}

/** A pin in the whole-trip view: the day's color + the day number inside */
function makeGroupIcon(
  badge: string,
  color: string,
  highlighted: boolean,
  photoSrc?: string,
) {
  const scale = highlighted ? 'scale(1.15)' : 'scale(1)';
  const photo = photoHtml(photoSrc);
  return L.divIcon({
    className: 'pin-marker',
    iconSize: photo ? [46, 82] : [28, 36],
    iconAnchor: photo ? [23, 80] : [14, 34],
    popupAnchor: photo ? [0, -76] : [0, -30],
    html: `<div class="pin-stack" style="transform:${scale}">
             ${photo}
             <div class="pin">
               <div class="pin-drop" style="background:${color}"></div>
               <div class="pin-content"><span class="pin-index">${badge}</span></div>
             </div>
           </div>`,
  });
}

/**
 * A traveler pin: a dashed ring around the teardrop so it looks different
 * from route stops - this is a point the traveler brought, not our
 * recommendation.
 */
function makePinIcon(kind: TripPinKind) {
  const { emoji, color } = PIN_STYLE[kind];
  return L.divIcon({
    className: 'pin-marker',
    iconSize: [28, 36],
    iconAnchor: [14, 34],
    popupAnchor: [0, -30],
    html: `<div class="pin-stack">
             <div class="pin">
               <div class="pin-drop" style="background:${color};box-shadow:0 0 0 2px #fffdf8,0 0 0 4px ${color}55"></div>
               <div class="pin-content"><span>${emoji}</span></div>
             </div>
           </div>`,
  });
}

/** Manual placement mode: the next click on the map fixes the pin's location */
function PlacementCatcher({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  const map = useMapEvents({
    click: (e) => onPick(e.latlng.lat, e.latlng.lng),
  });
  useEffect(() => {
    const el = map.getContainer();
    const prev = el.style.cursor;
    el.style.cursor = 'crosshair';
    return () => {
      el.style.cursor = prev;
    };
  }, [map]);
  return null;
}

/** Tracks the zoom level so pin photos can be added/removed */
function ZoomTracker({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMapEvents({
    zoomend: () => onZoom(map.getZoom()),
  });
  useEffect(() => {
    onZoom(map.getZoom());
  }, [map, onZoom]);
  return null;
}

/** Re-centers the map when the points change (day/destination switch, new pin) */
function FitBounds({ places }: { places: { lat: number; lng: number }[] }) {
  const map = useMap();
  useEffect(() => {
    if (places.length === 0) return;
    if (places.length === 1) {
      map.setView([places[0].lat, places[0].lng], 14);
      return;
    }
    const bounds = L.latLngBounds(places.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, places]);
  return null;
}

/** A stop's popup content - identical in the day view and the whole-trip view */
function PlacePopup({ place, prefix = '' }: { place: Place; prefix?: string }) {
  return (
    <div style={{ minWidth: 180, maxWidth: 220 }}>
      <PlaceThumb place={place} className="mb-1.5 h-[90px] w-full" rounded="rounded-lg" />
      <div style={{ fontWeight: 700, fontSize: 14 }}>
        {place.mustSee ? <span style={{ color: '#ffc531' }}>★ </span> : null}
        {prefix}
        {place.name}
      </div>
      <div style={{ color: '#6b6394', fontSize: 12 }}>{place.nameLocal}</div>
      <div style={{ fontSize: 12, marginTop: 4, display: 'flex', gap: 8 }}>
        {place.rating && <span>⭐ {place.rating.toFixed(1)}</span>}
        {place.priceLevel !== undefined && (
          <span>{place.priceLevel === 0 ? 'חינם' : '₪'.repeat(place.priceLevel)}</span>
        )}
      </div>
      {/*
        There used to be a different green here (#0d9488) with no padding,
        so the same kosher note looked completely different in the map
        popup than in the card beside it. Now it is the same component.
      */}
      <KosherNote note={place.kosherNote} className="mt-1" />
      {place.kosherVerification && (
        /*
          The badge itself, not a copy of it. The wording and the
          "verify with the venue" caveat must be identical everywhere
          supervision is displayed - a second copy would quietly go stale
          the moment somebody changed the policy in one place.
        */
        <div style={{ marginTop: 4 }}>
          <KosherBadge verification={place.kosherVerification} />
        </div>
      )}
      {/*
        The label is derived from what the link actually opens. An
        auto-explored place carries a Wikipedia article, and the popup used
        to call it "Google Maps" because it rendered `externalUrl` blindly.
      */}
      {placeMapUrl(place) ? (
        <a
          href={placeMapUrl(place)!}
          {...outboundAttrs()}
          style={{ fontSize: 12, color: 'var(--color-sunset-deep)', fontWeight: 700 }}
        >
          {outboundTarget(placeMapUrl(place)) === 'wikipedia'
            ? 'פתיחה בוויקיפדיה ↗'
            : 'פתיחה ב-Google Maps ↗'}
        </a>
      ) : (
        <span style={{ fontSize: 12, color: '#6b6394', fontWeight: 600 }}>מיקום לא אומת</span>
      )}
    </div>
  );
}

export default function MapInner({
  center,
  zoom,
  places,
  numbered = false,
  showRoute = false,
  highlightId = null,
  className = '',
  groups,
  pins,
  onPinMove,
  placingPinId = null,
}: MapProps) {
  // In the whole-trip view the groups are the source of truth: they
  // determine the bounds, the route line (by day order) and the pins.
  const grouped = groups && groups.length > 0;
  // memo is mandatory: a new array on every render would re-run FitBounds
  // and the map would snap back to the full view on every interaction
  // (including every zoom change)
  const flat = useMemo(
    () => (grouped ? groups.flatMap((g) => g.places) : places),
    [grouped, groups, places],
  );

  // At city zoom the pins get a small photo above the teardrop
  const [zoomLevel, setZoomLevel] = useState(zoom);
  const withPhotos = zoomLevel >= PHOTO_PIN_ZOOM;

  // The bounds also include the traveler's pins: a hotel in the suburbs is
  // part of their trip even if it is not a route stop. Same memo, for the
  // exact same reason.
  const bounds = useMemo(
    () => [...flat, ...(pins ?? []).map((p) => ({ lat: p.lat, lng: p.lng }))],
    [flat, pins],
  );

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      scrollWheelZoom
      className={`h-full w-full ${className}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        detectRetina
      />
      <FitBounds places={bounds} />
      <ZoomTracker onZoom={setZoomLevel} />
      {placingPinId && onPinMove && (
        <PlacementCatcher onPick={(lat, lng) => onPinMove(placingPinId, lat, lng)} />
      )}
      {(showRoute || grouped) && flat.length > 1 && (
        <Polyline
          positions={flat.map((p) => [p.lat, p.lng] as [number, number])}
          pathOptions={{
            color: '#0f172a',
            weight: grouped ? 2 : 3,
            dashArray: '8 8',
            opacity: grouped ? 0.35 : 0.6,
          }}
        />
      )}
      {grouped &&
        groups.map((g) =>
          g.places.map((place) => (
            <Marker
              key={`${g.badge}-${place.id}`}
              position={[place.lat, place.lng]}
              icon={makeGroupIcon(
                g.badge,
                g.color,
                highlightId === place.id,
                withPhotos ? place.photo : undefined,
              )}
            >
              <Popup>
                <PlacePopup place={place} prefix={`יום ${g.badge} · `} />
              </Popup>
            </Marker>
          )),
        )}
      {!grouped &&
        places.map((place, i) => (
          <Marker
            key={place.id}
            position={[place.lat, place.lng]}
            icon={makeIcon(place, i, numbered, highlightId === place.id, withPhotos)}
          >
            <Popup>
              <PlacePopup place={place} prefix={numbered ? `${i + 1}. ` : ''} />
            </Popup>
          </Marker>
        ))}
      {/* The traveler's pins - always on top, dragging fixes a wrong location */}
      {(pins ?? []).map((pin) => (
        <Marker
          key={pin.id}
          position={[pin.lat, pin.lng]}
          icon={makePinIcon(pin.kind)}
          draggable={Boolean(onPinMove)}
          eventHandlers={
            onPinMove
              ? {
                  dragend: (e) => {
                    const { lat, lng } = (e.target as L.Marker).getLatLng();
                    onPinMove(pin.id, lat, lng);
                  },
                }
              : undefined
          }
        >
          <Popup>
            <div style={{ minWidth: 160, maxWidth: 220 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {PIN_STYLE[pin.kind].emoji} {pin.name}
              </div>
              {pin.address && (
                <div style={{ color: '#6b6394', fontSize: 12, marginTop: 2 }}>{pin.address}</div>
              )}
              {pin.note && <div style={{ fontSize: 12, marginTop: 4 }}>{pin.note}</div>}
              {onPinMove && (
                <div style={{ fontSize: 11, marginTop: 6, color: '#6b6394', fontWeight: 600 }}>
                  אפשר לגרור את הסיכה למקום המדויק
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
