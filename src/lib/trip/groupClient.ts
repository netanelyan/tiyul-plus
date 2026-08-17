'use client';

import { useCallback, useEffect, useState } from 'react';
import { authHeader } from '@/lib/auth/client';
import type { VoteTally } from '@/lib/server/groupTrips';
import type { EnrichedSnapshot } from '@/lib/server/tripSnapshot';

/**
 * The shared-trip client: one fetch, one poster, used by BOTH sides.
 *
 * The friend's page (`/join/<code>`) and the organiser's panel read exactly the
 * same payload and call exactly the same actions - the only difference is whether
 * they identify the trip by invite code or by trip id. Writing that twice is how
 * the two sides drift, so it lives here once.
 *
 * Every write returns the WHOLE planning payload, so a comment, a vote and an
 * RSVP all leave the client holding the same truth without a second round trip.
 */

export interface GroupComment {
  id: string;
  member_id: string;
  place_id: string | null;
  body: string;
  created_at: string;
  author: string;
  mine: boolean;
}
export interface GroupSuggestion {
  id: string;
  member_id: string;
  place_id: string;
  city_slug: string;
  note: string | null;
  status: 'pending' | 'accepted' | 'dismissed';
  created_at: string;
  author: string;
  name: string;
  photo?: string;
  description?: string;
}
export interface GroupDateVote {
  member_id: string;
  day: string;
  ok: boolean;
}
export interface GroupRsvp {
  member_id: string;
  status: 'going' | 'maybe' | 'no';
  author: string;
}

export interface GroupPayload {
  trip?: EnrichedSnapshot;
  votes: VoteTally[];
  comments: GroupComment[];
  suggestions: GroupSuggestion[];
  dateOptions: string[];
  dateVotes: GroupDateVote[];
  rsvp: GroupRsvp[];
  memberIds: string[];
  members?: number;
  code?: string;
  isOwner?: boolean;
}

const EMPTY: GroupPayload = {
  votes: [],
  comments: [],
  suggestions: [],
  dateOptions: [],
  dateVotes: [],
  rsvp: [],
  memberIds: [],
};

export type GroupAction = Record<string, unknown>;

export function useGroup(target: { code?: string; tripId?: string }, enabled: boolean) {
  const [data, setData] = useState<GroupPayload>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const key = target.code ?? target.tripId ?? '';

  const load = useCallback(async () => {
    if (!enabled || !key) return;
    const qs = target.code
      ? `code=${encodeURIComponent(target.code)}`
      : `tripId=${encodeURIComponent(target.tripId ?? '')}`;
    try {
      const res = await fetch(`/api/group?${qs}`, { headers: await authHeader() });
      const json = (await res.json().catch(() => null)) as Partial<GroupPayload> | null;
      if (!json || (json as { error?: string }).error) {
        setError((json as { error?: string } | null)?.error ?? 'load-failed');
      } else {
        setData({ ...EMPTY, ...json });
        setError(null);
      }
    } catch {
      setError('load-failed');
    } finally {
      setLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key]);

  useEffect(() => {
    // Fetch on open, and again whenever the target changes.
    void (async () => {
      await load();
    })();
  }, [load]);

  /**
   * Send an action. The reply is the full payload, so it replaces state wholesale
   * - except the votes, which the caller may be holding optimistically; those are
   * merged by the caller that owns them.
   */
  const send = useCallback(
    async (action: string, extra: GroupAction = {}): Promise<{ ok: boolean; error?: string }> => {
      setBusy(true);
      try {
        const res = await fetch('/api/group', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
          body: JSON.stringify({
            action,
            ...(target.code ? { code: target.code } : { tripId: target.tripId }),
            ...extra,
          }),
        });
        const json = (await res.json().catch(() => null)) as
          | (Partial<GroupPayload> & { ok?: boolean; error?: string })
          | null;
        if (json?.ok) {
          setData((cur) => ({ ...cur, ...json }));
          return { ok: true };
        }
        return { ok: false, error: json?.error ?? 'failed' };
      } catch {
        return { ok: false, error: 'failed' };
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  return { data, loaded, error, busy, send, reload: load };
}

/** Comments for one stop, or for the general thread when placeId is null. */
export const commentsFor = (all: GroupComment[], placeId: string | null) =>
  all.filter((c) => (placeId === null ? c.place_id === null : c.place_id === placeId));
