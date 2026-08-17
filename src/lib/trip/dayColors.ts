/**
 * A colour per day in the "whole trip" view - so the stops of different days can be
 * told apart on one map. The palette was chosen so the colours stay distinct both from
 * each other and from the site's cream background, and it starts with the brand hue
 * (sunset).
 */
export const DAY_COLORS = [
  '#ff5941', // sunset - the brand colour
  '#2563eb', // blue
  '#0d9488', // teal
  '#7c3aed', // purple
  '#e0a400', // mustard
  '#db2777', // deep pink
  '#15803d', // green
  '#0891b2', // deep cyan
  '#b45309', // brown-orange
  '#4f46e5', // indigo
];

/** The day's colour by its index in the trip (cyclic - a long trip repeats colours) */
export function dayColor(index: number): string {
  return DAY_COLORS[((index % DAY_COLORS.length) + DAY_COLORS.length) % DAY_COLORS.length];
}
