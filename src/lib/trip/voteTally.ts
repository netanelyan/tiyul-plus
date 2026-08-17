import type { VoteTally } from '@/lib/server/groupTrips';

/**
 * The optimistic vote arithmetic for a group trip.
 *
 * **Why this is a file and not three lines inside the component.** Voting used
 * to await the POST before touching any state, so on the join page the count sat
 * unchanged until the request came back and the whole thing felt broken. Painting
 * first means predicting what the server will say - and a prediction that drifts
 * from the server is worse than the lag it replaced, because the number on screen
 * would simply be wrong. So the arithmetic is here, where it can be tested against
 * the same rules `castVote` applies.
 *
 * The rules, matching the server: a member has at most one vote per place;
 * clicking the side you already chose removes your vote; clicking the other side
 * moves it. Everyone else's votes are untouched, which is why the server's reply
 * still replaces this guess rather than merely confirming it.
 */
export function applyVote(
  t: VoteTally | undefined,
  placeId: string,
  next: 1 | -1 | 0,
): VoteTally {
  const prev = t?.mine ?? 0;
  let up = t?.up ?? 0;
  let down = t?.down ?? 0;
  if (prev === 1) up -= 1;
  if (prev === -1) down -= 1;
  if (next === 1) up += 1;
  if (next === -1) down += 1;
  return {
    placeId,
    // Clamped: a tally that arrived stale must not be able to render a negative count
    up: Math.max(0, up),
    down: Math.max(0, down),
    ...(next !== 0 ? { mine: next } : {}),
  };
}

/** What a click on `dir` means for a place you have already voted on. */
export const nextVote = (current: 1 | -1 | undefined, dir: 1 | -1): 1 | -1 | 0 =>
  current === dir ? 0 : dir;
