'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Place } from '@/lib/types';
import { categoryMeta } from '@/lib/categories';

export interface MapProps {
  center: { lat: number; lng: number };
  zoom: number;
  places: Place[];
  /** מספור עצירות (למסלול יומי) - אינדקס לפי הסדר במערך */
  numbered?: boolean;
  /** ציור קו בין העצירות לפי הסדר */
  showRoute?: boolean;
  highlightId?: string | null;
  className?: string;
}

function makeIcon(place: Place, index: number, numbered: boolean, highlighted: boolean) {
  const meta = categoryMeta[place.category];
  const scale = highlighted ? 'scale(1.15)' : 'scale(1)';
  const content = numbered
    ? `<span class="pin-index">${index + 1}</span>`
    : `<span>${meta.emoji}</span>`;
  return L.divIcon({
    className: 'pin-marker',
    iconSize: [28, 36],
    iconAnchor: [14, 34],
    popupAnchor: [0, -30],
    html: `<div class="pin" style="transform:${scale}">
             <div class="pin-drop" style="background:${meta.color}"></div>
             <div class="pin-content">${content}</div>
           </div>`,
  });
}

/** מרכז את המפה מחדש כשהמקומות משתנים (החלפת יום/יעד) */
function FitBounds({ places }: { places: Place[] }) {
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

export default function MapInner({
  center,
  zoom,
  places,
  numbered = false,
  showRoute = false,
  highlightId = null,
  className = '',
}: MapProps) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      scrollWheelZoom
      className={`h-full w-full ${className}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        detectRetina
      />
      <FitBounds places={places} />
      {showRoute && places.length > 1 && (
        <Polyline
          positions={places.map((p) => [p.lat, p.lng] as [number, number])}
          pathOptions={{ color: '#0f172a', weight: 3, dashArray: '8 8', opacity: 0.6 }}
        />
      )}
      {places.map((place, i) => (
        <Marker
          key={place.id}
          position={[place.lat, place.lng]}
          icon={makeIcon(place, i, numbered, highlightId === place.id)}
        >
          <Popup>
            <div style={{ minWidth: 180, maxWidth: 220 }}>
              {place.photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={place.photo}
                  alt={place.name}
                  style={{
                    width: '100%',
                    height: 90,
                    objectFit: 'cover',
                    borderRadius: 8,
                    marginBottom: 6,
                  }}
                />
              )}
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {place.mustSee ? <span style={{ color: '#ffc531' }}>★ </span> : null}
                {numbered ? `${i + 1}. ` : ''}
                {place.name}
              </div>
              <div style={{ color: '#6b6394', fontSize: 12 }}>{place.nameLocal}</div>
              <div style={{ fontSize: 12, marginTop: 4, display: 'flex', gap: 8 }}>
                {place.rating && <span>⭐ {place.rating.toFixed(1)}</span>}
                {place.priceLevel !== undefined && (
                  <span>{place.priceLevel === 0 ? 'חינם' : '₪'.repeat(place.priceLevel)}</span>
                )}
              </div>
              {place.kosherNote && (
                <div style={{ fontSize: 12, marginTop: 4, color: '#0d9488' }}>
                  ✡️ {place.kosherNote}
                </div>
              )}
              {place.kosherVerification?.lastChecked === 'pending-review' && (
                <div style={{ fontSize: 11, marginTop: 3, color: '#8a7a2f' }}>
                  לאמת לפני נסיעה · {place.kosherVerification.supervision}
                </div>
              )}
              {place.externalUrl && (
                <a
                  href={place.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 12, color: '#e03e27', fontWeight: 700 }}
                >
                  פתיחה ב-Google Maps ↗
                </a>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
