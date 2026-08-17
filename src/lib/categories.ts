import type { KosherStatus, Place, PlaceCategory } from './types';

export const categoryMeta: Record<
  PlaceCategory,
  { label: string; emoji: string; color: string }
> = {
  attraction: { label: 'אטרקציה', emoji: '🏛️', color: '#5c46c9' },
  museum: { label: 'מוזיאון', emoji: '🖼️', color: '#c23c6f' },
  nature: { label: 'טבע', emoji: '🌿', color: '#0f8c46' },
  viewpoint: { label: 'תצפית', emoji: '🌄', color: '#e07c1e' },
  cafe: { label: 'בית קפה', emoji: '☕', color: '#7c4f26' },
  food: { label: 'אוכל', emoji: '🍜', color: '#a8431f' },
  market: { label: 'שוק', emoji: '🧺', color: '#8a6b12' },
  shopping: { label: 'שופינג', emoji: '🛍️', color: '#b93a7c' },
  'kosher-food': { label: 'אוכל כשר', emoji: '🍽️', color: '#00897a' },
  'kosher-market': { label: 'סופר כשר', emoji: '🛒', color: '#076e66' },
};

export const isKosher = (c: PlaceCategory) => c.startsWith('kosher');

/**
 * Categories you eat at - unlike a market or a shop, where you can walk around without
 * eating. That distinction is what decides whether a traveller who set "kosher" sees the
 * place: a non-kosher restaurant is blocked, a flower market is not.
 */
const EATING: ReadonlySet<PlaceCategory> = new Set<PlaceCategory>([
  'cafe',
  'food',
  'kosher-food',
]);

export const isEating = (c: PlaceCategory) => EATING.has(c);

/**
 * The effective status. **kosher-* records return 'kosher' by derivation and not from the
 * field**, so that no existing kashrut record has to change - this feature's addition does
 * not touch them at all.
 *
 * A missing field returns 'unknown' and not 'kosher'. The default has to be the cautious
 * one: a place that was not checked is shown as unknown, not as permitted.
 */
export function kosherStatusOf(
  p: Pick<Place, 'category' | 'kosherStatus'>,
): KosherStatus {
  if (isKosher(p.category)) return 'kosher';
  return p.kosherStatus ?? 'unknown';
}

export const KOSHER_STATUS_LABEL: Record<KosherStatus, string> = {
  kosher: 'כשר',
  'not-kosher': 'לא כשר',
  unknown: 'כשרות לא ידועה',
};
