import type { Destination } from '@/lib/types';
import { isExploredSlug } from './adapter';

/**
 * Client side: explored destinations (as full Destination objects, exactly as the server
 * streamed them in the {type:'explored'} event) are stored locally and are also sent back to the
 * server on every conversation turn, so the agent keeps validating against them for trips built
 * on them. When accounts arrive, this file is replaced by a server-backed one exactly like
 * trip/storage.ts.
 */

const KEY = 'tiyul-plus:explored:v2';
const MAX = 6; // also the server's ceiling (sanitizeExploredDestinations)

export function loadExplored(): Destination[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as Destination[]) : [];
    return Array.isArray(arr) ? arr.filter((d) => d && isExploredSlug(String(d.slug))) : [];
  } catch {
    return [];
  }
}

export function saveExplored(dest: Destination): Destination[] {
  if (typeof window === 'undefined') return [];
  const next = [dest, ...loadExplored().filter((d) => d.slug !== dest.slug)].slice(0, MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full - stay with whatever is in memory */
  }
  return next;
}
