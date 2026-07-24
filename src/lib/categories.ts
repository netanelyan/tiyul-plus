import type { PlaceCategory } from './types';

export const categoryMeta: Record<
  PlaceCategory,
  { label: string; emoji: string; color: string }
> = {
  attraction: { label: 'אטרקציה', emoji: '🏛️', color: '#5c46c9' },
  museum: { label: 'מוזיאון', emoji: '🖼️', color: '#c23c6f' },
  nature: { label: 'טבע', emoji: '🌿', color: '#0f8c46' },
  viewpoint: { label: 'תצפית', emoji: '🌄', color: '#e07c1e' },
  cafe: { label: 'בית קפה', emoji: '☕', color: '#7c4f26' },
  shopping: { label: 'שופינג', emoji: '🛍️', color: '#b93a7c' },
  'kosher-food': { label: 'אוכל כשר', emoji: '🍽️', color: '#00897a' },
  'kosher-market': { label: 'סופר כשר', emoji: '🛒', color: '#076e66' },
};

export const isKosher = (c: PlaceCategory) => c.startsWith('kosher');
