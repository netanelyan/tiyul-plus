'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { Place } from '@/lib/types';
import type { TripPinKind } from '@/lib/trip/types';
import { categoryMeta } from '@/lib/categories';
import PlaceThumb from '@/components/PlaceThumb';

/**
 * מרמת הזום הזו ומעלה מציגים תמונה קטנה מעל הסיכה - בזום עירוני יש
 * מקום על המסך והתמונות עוזרות לזהות את העצירות; בזום ארצי הן היו
 * מסתירות זו את זו, אז נשארות רק הסיכות.
 */
const PHOTO_PIN_ZOOM = 13;

/** תמונת מקום מעל הסיכה; אם התמונה לא נטענת - נעלמת בשקט, הסיכה נשארת */
function photoHtml(photo: string | undefined): string {
  if (!photo) return '';
  return `<img class="pin-photo" src="${photo}" alt="" loading="lazy" onerror="this.remove()" />`;
}

/**
 * קבוצת עצירות של יום אחד בתצוגת "כל הטיול" - כל יום בצבע משלו,
 * והתג (מספר היום) מוצג בתוך הסיכה במקום האימוג'י של הקטגוריה.
 */
export interface MapGroup {
  /** מה שמוצג בתוך הסיכה - בדרך כלל מספר היום */
  badge: string;
  /** צבע הסיכה של היום (מ-dayColors) */
  color: string;
  places: Place[];
}

/**
 * סיכה של המטייל עצמו (מלון שהזמין, מסעדה ששמר בה שולחן) - לא עצירה
 * מהקטלוג ולא חלק מהמסלול, ולכן לא נכנסת לקו המסלול ולא ממוספרת.
 * מוצגות רק סיכות שיש להן מיקום: סיכה לא מאומתת מטופלת בממשק שמסביב.
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
  /** סיכות המטייל שכבר יש להן מיקום */
  pins?: MapPin[];
  /** גרירת סיכה למקום הנכון - המטייל מתקן איתור שגוי או מניח ידנית */
  onPinMove?: (id: string, lat: number, lng: number) => void;
  /**
   * מזהה הסיכה שממתינה להנחה ידנית. כשהוא מוגדר, לחיצה על המפה
   * קובעת את מיקומה - זה המסלול של סיכה שהאיתור האוטומטי לא מצא.
   */
  placingPinId?: string | null;
  /** מספור עצירות (למסלול יומי) - אינדקס לפי הסדר במערך */
  numbered?: boolean;
  /** ציור קו בין העצירות לפי הסדר */
  showRoute?: boolean;
  highlightId?: string | null;
  className?: string;
  /**
   * תצוגת כל הטיול: כשמועבר, הוא זה שקובע את הסיכות ואת הקו -
   * העצירות של כל הימים יחד, כל יום בצבע ובתג שלו. `places` מתעלמים.
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

/** סיכה בתצוגת כל הטיול: צבע היום + מספר היום בפנים */
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
 * סיכת מטייל: טבעת מקווקוות סביב הטיפה כדי שתיראה שונה מעצירות
 * המסלול - זו נקודה שהמטייל הביא, לא המלצה שלנו.
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

/** מצב הנחה ידנית: הלחיצה הבאה על המפה קובעת את מיקום הסיכה */
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

/** עוקב אחרי רמת הזום כדי להוסיף/להסיר את תמונות הסיכות */
function ZoomTracker({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMapEvents({
    zoomend: () => onZoom(map.getZoom()),
  });
  useEffect(() => {
    onZoom(map.getZoom());
  }, [map, onZoom]);
  return null;
}

/** מרכז את המפה מחדש כשהנקודות משתנות (החלפת יום/יעד, סיכה חדשה) */
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

/** תוכן החלונית של עצירה - זהה בתצוגת יום ובתצוגת כל הטיול */
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
      {place.kosherNote && (
        <div style={{ fontSize: 12, marginTop: 4, color: '#0d9488' }}>✡️ {place.kosherNote}</div>
      )}
      {place.kosherVerification && (
        <div style={{ fontSize: 11, marginTop: 4, color: '#6b6394', fontWeight: 600 }}>
          השגחה: {place.kosherVerification.supervision} · לוודא מול המקום
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
  // בתצוגת כל הטיול הקבוצות הן מקור האמת: הן קובעות את הגבולות,
  // את קו המסלול (לפי סדר הימים) ואת הסיכות.
  const grouped = groups && groups.length > 0;
  // memo חובה: מערך חדש בכל רנדר היה מריץ את FitBounds מחדש והמפה
  // הייתה קופצת חזרה לתצוגה המלאה בכל אינטראקציה (כולל כל שינוי זום)
  const flat = useMemo(
    () => (grouped ? groups.flatMap((g) => g.places) : places),
    [grouped, groups, places],
  );

  // בזום עירוני הסיכות מקבלות תמונה קטנה מעל הטיפה
  const [zoomLevel, setZoomLevel] = useState(zoom);
  const withPhotos = zoomLevel >= PHOTO_PIN_ZOOM;

  // הגבולות כוללים גם את סיכות המטייל: מלון בפרברים הוא חלק מהטיול
  // שלו גם אם הוא לא עצירה במסלול. אותו memo, מאותה סיבה בדיוק.
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
      {/* סיכות המטייל - תמיד מעל, גרירה מתקנת מיקום שגוי */}
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
