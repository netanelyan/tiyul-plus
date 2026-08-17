'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { authHeader } from '@/lib/auth/client';
import PanelSection from '@/components/PanelSection';
import GroupComments from '@/components/group/GroupComments';
import GroupDates from '@/components/group/GroupDates';
import GroupRsvp from '@/components/group/GroupRsvp';
import PlaceThumb from '@/components/PlaceThumb';
import { useGroup, commentsFor } from '@/lib/trip/groupClient';
import { useTrip } from '@/lib/trip/TripContext';
import { todayISO } from '@/lib/trip/dates';
import type { Destination } from '@/lib/types';
import type { Trip } from '@/lib/trip/types';

/**
 * The organizer's side of a group trip: the invitation link (premium), and then
 * everything the group did with it - who is coming, which days work, what they
 * suggested, what they said and how they voted.
 *
 * The friends' page and this panel read the SAME payload from the same route
 * (`useGroup`), so a field can never mean one thing on one side and something
 * else on the other. The only real asymmetry is the two organizer-only actions,
 * and those are enforced on the server against `invite.owner_id` - this panel
 * merely does not draw the buttons.
 */
export default function TripGroupPanel({
  trip,
  destOf,
}: {
  trip: Trip;
  destOf: (slug: string) => Destination | undefined;
}) {
  const auth = useAuth();
  const tripApi = useTrip();
  const [open, setOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newDay, setNewDay] = useState('');

  const isPremium = auth.profile?.plan === 'premium';
  const group = useGroup({ tripId: trip.id }, open && !!auth.user);
  const myId = auth.user?.id ?? null;

  // A link the organizer created earlier survives a reload: the GET hands the
  // existing code back, so the panel shows it instead of minting a second one.
  const url =
    inviteUrl ?? (group.data.code ? `${typeof window === 'undefined' ? '' : window.location.origin}/join/${group.data.code}` : null);

  async function makeInvite() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ action: 'invite', tripId: trip.id }),
      });
      const data = (await res.json().catch(() => null)) as { code?: string; error?: string } | null;
      if (data?.code) {
        setInviteUrl(`${window.location.origin}/join/${data.code}`);
        void group.reload();
      } else if (data?.error === 'premium-required') {
        setError('הזמנת חברים לטיול היא פיצ׳ר מנוי.');
      } else if (data?.error === 'trip-not-found') {
        setError('הטיול צריך להיות שמור בחשבון קודם (מתחברים והוא נשמר לבד).');
      } else {
        setError('משהו השתבש - נסו שוב עוד רגע.');
      }
    } catch {
      setError('משהו השתבש - נסו שוב עוד רגע.');
    } finally {
      setBusy(false);
    }
  }

  /** A real stop name for a result - a vote with no name is not displayed */
  function placeName(placeId: string): string | null {
    for (const d of trip.days) {
      if (!d.placeIds.includes(placeId)) continue;
      const p = destOf(d.citySlug)?.places.find((x) => x.id === placeId);
      if (p) return p.name;
    }
    return null;
  }

  const namedVotes = useMemo(
    () =>
      group.data.votes
        .map((v) => ({ ...v, name: placeName(v.placeId) }))
        .filter((v): v is (typeof group.data.votes)[number] & { name: string } => v.name !== null)
        .sort((a, b) => b.up - b.down - (a.up - a.down)),
    // placeName reads trip.days, so the trip is the real dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [group.data.votes, trip.days],
  );

  const pending = group.data.suggestions.filter((s) => s.status === 'pending');
  const accepted = group.data.suggestions.filter((s) => s.status === 'accepted');
  const generalComments = commentsFor(group.data.comments, null);
  const stopComments = group.data.comments.length - generalComments.length;

  /**
   * Accepting actually ADDS the place to the trip, it does not just relabel the
   * suggestion. A friend whose idea is "accepted" and then never appears in the
   * plan has been told yes and given nothing.
   */
  async function decide(id: string, citySlug: string, placeId: string, accept: boolean) {
    if (accept) tripApi.addPlace(citySlug, placeId);
    await group.send('decide', { suggestionId: id, status: accept ? 'accepted' : 'dismissed' });
  }

  function addDay() {
    const day = newDay.trim();
    if (!day) return;
    const days = [...new Set([...group.data.dateOptions, day])].sort();
    setNewDay('');
    void group.send('dates', { days });
  }

  function removeDay(day: string) {
    void group.send('dates', { days: group.data.dateOptions.filter((d) => d !== day) });
  }

  const members = group.data.members ?? null;

  return (
    <PanelSection
      panelKey="trip-group"
      icon="🤝"
      title="טיול משותף"
      // Same reason as the story panel, and the same length limit - see there.
      meta="תכנון עם חברים"
      ariaLabel="טיול משותף - חברים מצטרפים בקישור, מצביעים, מגיבים ומציעים מקומות"
      badge={
        pending.length > 0 ? (
          <span className="rounded-full bg-zest/25 px-2 py-0.5 text-[11px] font-bold text-night">
            {pending.length} הצעות חדשות
          </span>
        ) : members !== null && members > 0 ? (
          <span className="rounded-full bg-lagoon/15 px-2 py-0.5 text-[11px] font-bold text-lagoon">
            {members} חברים
          </span>
        ) : (
          <span className="rounded-full bg-sunset/15 px-2 py-0.5 text-[11px] font-bold text-sunset-deep">
            פרימיום ★
          </span>
        )
      }
      open={open}
      onToggle={() => setOpen((v) => !v)}
      className="print:hidden"
    >
      <div className="rounded-2xl bg-shell p-4 ring-1 ring-night/10">
        {!auth.user && (
          <p className="text-sm font-semibold text-night/70">
            הטיול המשותף קשור לחשבון - צריך להתחבר קודם (למעלה בניווט).
          </p>
        )}

        {auth.user && !isPremium && (
          <>
            <p className="text-sm font-semibold leading-relaxed text-night/75">
              מתכננים עם עוד אנשים? שולחים קישור אחד, והם רואים את הטיול חי: מצביעים 👍/👎
              על כל עצירה, כותבים למה, מציעים מקומות משלהם, מסמנים אילו תאריכים מתאימים
              להם ואם הם מגיעים. הכול במקום אחד, במקום צילומי מסך בוואטסאפ.
            </p>
            <a
              href="/premium"
              className="mt-3 inline-block rounded-xl bg-sunset px-4 py-2 text-sm font-bold text-cream transition hover:bg-sunset-deep"
            >
              זמין במנוי הפרימיום ←
            </a>
          </>
        )}

        {auth.user && isPremium && (
          <div className="space-y-4">
            {!url ? (
              <>
                <p className="text-sm font-semibold leading-relaxed text-night/75">
                  קישור אחד למשפחה או לחברים: הם רואים את הטיול (גם אחרי שתערכו אותו),
                  מצביעים, מגיבים, מציעים מקומות ומסמנים תאריכים. ההצטרפות אצלם בחינם.
                </p>
                <button
                  onClick={() => void makeInvite()}
                  disabled={busy}
                  className="rounded-xl bg-sunset px-4 py-2 text-sm font-bold text-cream transition hover:bg-sunset-deep disabled:opacity-50"
                >
                  {busy ? 'רגע…' : 'יצירת קישור הזמנה'}
                </button>
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <code
                  className="min-w-0 flex-1 truncate rounded-lg bg-cream px-3 py-2 text-xs text-night/70"
                  dir="ltr"
                >
                  {url}
                </code>
                <button
                  onClick={() => {
                    void navigator.clipboard?.writeText(url).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    });
                  }}
                  className="rounded-xl bg-sunset px-3.5 py-2 text-xs font-bold text-cream transition hover:bg-sunset-deep"
                >
                  {copied ? '✓ הועתק' : 'העתקה'}
                </button>
              </div>
            )}

            {url && (
              <>
                {/* Suggestions first: they are the only thing here that is waiting
                    on the organizer, and burying a decision under results is how it
                    goes unanswered. */}
                {pending.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-night/55">מחכה להחלטה שלכם:</p>
                    <ul className="mt-1.5 space-y-2">
                      {pending.map((s) => (
                        <li
                          key={s.id}
                          className="flex items-start gap-2.5 rounded-xl bg-cream/70 p-2 ring-1 ring-night/10"
                        >
                          <PlaceThumb
                            place={{
                              id: s.place_id,
                              name: s.name,
                              nameLocal: s.name,
                              category: 'attraction',
                              lat: 0,
                              lng: 0,
                              description: s.description ?? '',
                              ...(s.photo ? { photo: s.photo } : {}),
                            }}
                            className="h-12 w-12 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-night">{s.name}</p>
                            <p className="text-[11px] font-medium text-night/50">
                              הציע/ה {s.author}
                              {s.note && ` · ${s.note}`}
                            </p>
                            <div className="mt-1.5 flex gap-1.5">
                              <button
                                onClick={() => void decide(s.id, s.city_slug, s.place_id, true)}
                                className="min-h-[36px] rounded-full bg-lagoon px-3 text-xs font-bold text-cream transition hover:opacity-90"
                              >
                                הוספה לטיול
                              </button>
                              <button
                                onClick={() => void decide(s.id, s.city_slug, s.place_id, false)}
                                className="min-h-[36px] rounded-full bg-shell px-3 text-xs font-bold text-night/60 ring-1 ring-night/15 transition hover:bg-night/5"
                              >
                                לא הפעם
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {accepted.length > 0 && (
                  <p className="text-[11px] font-semibold text-night/45">
                    ✓ נוספו מהצעות של חברים: {accepted.map((s) => s.name).join(' · ')}
                  </p>
                )}

                {/* Who is coming */}
                <div className="border-t border-night/10 pt-3">
                  <p className="text-xs font-bold text-night/55">מי מגיע:</p>
                  <div className="mt-1.5">
                    <GroupRsvp
                      rsvp={group.data.rsvp}
                      myId={myId}
                      onSet={(status) => void group.send('rsvp', { status })}
                    />
                  </div>
                </div>

                {/* Candidate days. Only the organizer sets them - a poll everyone can
                    edit is not a poll. */}
                <div className="border-t border-night/10 pt-3">
                  <p className="text-xs font-bold text-night/55">תאריכים אפשריים:</p>
                  {group.data.dateOptions.length > 0 ? (
                    <div className="mt-1.5">
                      <GroupDates
                        options={group.data.dateOptions}
                        votes={group.data.dateVotes}
                        memberIds={group.data.memberIds}
                        myId={myId}
                        onMark={(day, ok) => void group.send('available', { day, ok })}
                      />
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {group.data.dateOptions.map((d) => (
                          <button
                            key={d}
                            onClick={() => removeDay(d)}
                            className="rounded-full bg-night/5 px-2 py-0.5 text-[11px] font-medium text-night/50 transition hover:bg-sunset/15 hover:text-night"
                            aria-label={`הסרת ${d} מהאפשרויות`}
                          >
                            {d} ✕
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs font-medium text-night/45">
                      הציעו כמה תאריכים וכל אחד יסמן מה מתאים לו.
                    </p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <input
                      type="date"
                      value={newDay}
                      min={todayISO()}
                      onChange={(e) => setNewDay(e.target.value)}
                      // 16px on mobile or iOS zooms the page on focus (session log, entry n)
                      className="min-h-[40px] flex-1 rounded-lg border border-night/15 bg-cream px-3 text-base text-night outline-none focus:ring-4 focus:ring-sunset/15 sm:text-sm"
                    />
                    <button
                      onClick={addDay}
                      disabled={!newDay || group.busy}
                      className="min-h-[40px] rounded-lg bg-night px-3.5 text-xs font-bold text-cream transition hover:opacity-90 disabled:opacity-40"
                    >
                      הוספת תאריך
                    </button>
                  </div>
                </div>

                {/* Vote results */}
                {namedVotes.length > 0 && (
                  <div className="border-t border-night/10 pt-3">
                    <p className="text-xs font-bold text-night/55">מה החברים חושבים:</p>
                    <ul className="mt-1.5 space-y-1">
                      {namedVotes.map((v) => (
                        <li key={v.placeId} className="flex items-center gap-2 text-sm">
                          <span className="min-w-0 flex-1 truncate text-night/80">{v.name}</span>
                          <span className="whitespace-nowrap text-xs font-bold text-night/60">
                            👍 {v.up} · 👎 {v.down}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {stopComments > 0 && (
                      <p className="mt-1.5 text-[11px] font-medium text-night/45">
                        💬 {stopComments} תגובות על עצירות - נקראות בקישור ההזמנה
                      </p>
                    )}
                  </div>
                )}

                {/* The general thread */}
                <div className="border-t border-night/10 pt-3">
                  <p className="text-xs font-bold text-night/55">שיחה כללית:</p>
                  <GroupComments
                    placeId={null}
                    comments={group.data.comments}
                    compact={false}
                    onAdd={(bodyText, placeId) => group.send('comment', { body: bodyText, placeId })}
                    onDelete={(id) => void group.send('uncomment', { commentId: id })}
                  />
                </div>

                {members === 0 && (
                  <p className="text-xs font-medium text-night/45">
                    עוד לא הצטרף אף אחד - שלחו את הקישור בוואטסאפ.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {error && (
          <p className="mt-2 rounded-xl bg-sunset/10 px-3 py-2 text-xs font-bold text-sunset-deep">
            {error}
          </p>
        )}
      </div>
    </PanelSection>
  );
}
