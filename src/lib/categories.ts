import type { PlaceCategory } from './types';

export const categoryMeta: Record<
  PlaceCategory,
  { label: string; emoji: string; color: string }
> = {
  attraction: { label: 'אטרקציה', emoji: '🏛️', color: '#6c4df6' },
  museum: { label: 'מוזיאון', emoji: '🖼️', color: '#e0417f' },
  nature: { label: 'טבע', emoji: '🌿', color: '#12a150' },
  viewpoint: { label: 'תצפית', emoji: '🌄', color: '#ff8a1e' },
  cafe: { label: 'בית קפה', emoji: '☕', color: '#8d5a2b' },
  shopping: { label: 'שופינג', emoji: '🛍️', color: '#d4408f' },
  'kosher-food': { label: 'אוכל כשר', emoji: '🍽️', color: '#00a896' },
  'kosher-market': { label: 'סופר כשר', emoji: '🛒', color: '#007f76' },
};

export const isKosher = (c: PlaceCategory) => c.startsWith('kosher');
