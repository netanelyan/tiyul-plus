'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTrip } from '@/lib/trip/TripContext';
import { NEW_CHAT_EVENT } from '@/components/SiteNav';
import HeroPrompt from '@/components/HeroPrompt';
import TripWorkspace from '@/components/TripWorkspace';
import ResumeTrips from '@/components/ResumeTrips';

/**
 * The agent experience - the star of the site.
 *
 * Two states only:
 * 1. landing - one big input field centered on the screen + suggestion chips.
 *    Deliberately minimalist, and now also a "or continue an existing trip"
 *    row.
 * 2. The unified view (TripWorkspace) - one screen with the itinerary, the map
 *    and the conversation together. There is no longer a "chat tab" separate
 *    from a "plan tab": /planner renders exactly the same component, on the
 *    same Trip object.
 *
 * ## **The open trip lives in the URL, not in storage**
 *
 * This is a fix for a bug that touched every user: `currentId` was saved in
 * localStorage and never cleared, and the screen was chosen by it - so every
 * entry to /chat, from anywhere, fell into the previous trip. A question about
 * Norway was answered inside a Slovakia trip, because that trip was sent to
 * the server as context and edits were written into it.
 *
 * The rule now: a bare `/chat` is **always a new conversation** - and on such
 * an entry `currentId` is reset, so nothing gets dragged along.
 * `/chat?trip=<id>` is the only thing that opens an existing trip, and the
 * parameter **stays in the URL**, so a refresh stays in the same place. It
 * also follows that "continue" is always a link somebody clicked.
 */
/**
 * Writing the open trip to the URL, via the History API and not the router.
 *
 * `router.replace` is a soft navigation: when called only to drop a parameter
 * on the same page it did not actually update the URL (measured - the
 * parameter stayed). This screen reads its params from `window.location` and
 * not `useSearchParams` anyway, so there is no router state here that can get
 * out of sync.
 */
function writeTripParam(id: string | null) {
  if (typeof window === 'undefined') return;
  const url = id ? `/chat?trip=${encodeURIComponent(id)}` : '/chat';
  if (window.location.pathname + window.location.search !== url)
    window.history.replaceState(null, '', url);
}

export default function AgentWorkspace() {
  const trip = useTrip();
  const [started, setStarted] = useState(false);
  // The first request waiting to be sent inside the unified view (arriving from the homepage)
  const [pending, setPending] = useState<{ q?: string; kosher?: boolean }>({});
  const [pendingTripId, setPendingTripId] = useState<string | null>(null);
  const paramsHandled = useRef(false);
  /** We arrived with ?trip= - i.e. an explicit choice, not a new conversation */
  const resuming = useRef(false);
  /**
   * Whether this entry's trip has been decided (or that there is none).
   *
   * **This must block the workspace from rendering, not merely be a flag.** Child
   * effects run before parent effects, so `TripProvider` loads from storage only
   * after this screen has already mounted - meaning that without this block the
   * workspace would briefly load with the old trip and send the first question
   * along with it. Exactly the bug, in a fast version.
   */
  const [entryResolved, setEntryResolved] = useState(false);

  // Arriving from the homepage / from a trip tab in the nav: /chat?q=...&kosher=1
  // or /chat?trip=<id>. window.location rather than useSearchParams, so prerender
  // does not require a Suspense boundary.
  useEffect(() => {
    if (paramsHandled.current) return;
    paramsHandled.current = true;
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    const kosher = params.get('kosher') === '1';
    const tripId = params.get('trip');
    // ?q= and ?kosher= are dropped from the URL; ?trip= stays, it is what holds the screen
    if (q || kosher) writeTripParam(tripId);
    if (tripId) {
      resuming.current = true;
      setPendingTripId(tripId);
      setStarted(true);
    }
    if (q && q.trim()) {
      setPending({ q: q.trim(), kosher });
      setStarted(true);
    } else if (kosher) {
      setPending({ kosher });
    }
     
  }, []);

  // ?trip= is applied only after TripProvider has hydrated - otherwise the load
  // from storage (which runs after the children's effects) would overwrite the choice.
  useEffect(() => {
    if (!trip.hydrated) return;
    if (pendingTripId) {
      if (pendingTripId !== trip.currentId) trip.setCurrentId(pendingTripId);
      setPendingTripId(null);
      setEntryResolved(true);
      return;
    }
    /*
      **A clean entry = a clean conversation.** The trip that survived in storage was
      not chosen by anyone during this entry, so it is neither opened nor sent as
      context. It is not lost - it is in the "continue an existing trip" list and in
      the nav tabs.
    */
    if (!resuming.current && trip.currentId) trip.setCurrentId(null);
    setEntryResolved(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.hydrated, pendingTripId]);

  /*
    A trip created during the conversation goes into the URL. Without this, a refresh
    mid-planning would return to the landing screen - the URL is what holds the
    screen, so it has to know.
  */
  useEffect(() => {
    if (!trip.hydrated || !trip.currentId || pendingTripId) return;
    const now = new URLSearchParams(window.location.search).get('trip');
    if (now !== trip.currentId) {
      resuming.current = true;
      writeTripParam(trip.currentId);
    }
     
  }, [trip.hydrated, trip.currentId, pendingTripId]);

  /** Start a new conversation without abandoning the existing trip - it stays as a tab in SiteNav */
  function startNewTrip() {
    resuming.current = false;
    trip.setCurrentId(null);
    setPending({});
    setStarted(false);
    writeTripParam(null);
  }

  /*
    Navigating to the same route does not remount: "plan a trip" from within
    /chat?trip=X changes the URL to /chat but the component stays - and the screen
    would have remained on the previous trip. SiteNav emits NEW_CHAT_EVENT for
    exactly this case; popstate covers the same gap for browser back/forward. The
    functions are called through a ref so the listeners register once and always
    see the current state.
  */
  const startNewTripRef = useRef(startNewTrip);
  useEffect(() => {
    startNewTripRef.current = startNewTrip;
  });
  useEffect(() => {
    const onNewChat = () => startNewTripRef.current();
    const onPop = () => {
      const tripId = new URLSearchParams(window.location.search).get('trip');
      if (tripId) {
        resuming.current = true;
        setPendingTripId(tripId);
        setStarted(true);
      } else {
        startNewTripRef.current();
      }
    };
    window.addEventListener(NEW_CHAT_EVENT, onNewChat);
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener(NEW_CHAT_EVENT, onNewChat);
      window.removeEventListener('popstate', onPop);
    };
  }, []);

  /*
    **`trip.currentTrip` no longer decides the screen.** That was the bug: a value
    saved from a previous time determined where you landed. Now only an action in
    this entry opens a screen - a question that was sent, or a ?trip= someone clicked.
  */
  const showWorkspace = started;

  // At most one frame, until hydration has decided what this entry's trip is
  if (showWorkspace && !entryResolved) return null;

  if (!showWorkspace) {
    return (
      <div className="flex min-h-[calc(100vh-230px)] flex-col items-center justify-center py-10">
        <h1 className="display rise-in text-center text-4xl text-night sm:text-6xl">
          לאן טסים הפעם?
        </h1>
        <p className="rise-in mt-4 max-w-xl text-center leading-relaxed text-night/60">
          מספרים לי מה מדמיינים - ואני בונה טיול אמיתי, יום-אחרי-יום, על מפה. בעברית.
        </p>

        {/* Shared input + chips - a chip fills the field for editing, submitting starts the conversation */}
        <HeroPrompt
          onSubmit={(text, kosher) => {
            setPending({ q: text, kosher });
            setStarted(true);
          }}
        />

        <ResumeTrips className="rise-in-late mt-8" />

        <div className="rise-in-late mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-semibold text-night/40">
          <Link href="/countries" className="transition hover:text-sunset-deep">
            או גולשים בקטלוג היעדים ←
          </Link>
          <Link href="/planner" className="transition hover:text-sunset-deep">
            מעדיפים לבנות עם כפתורים? למתכנן ←
          </Link>
        </div>
      </div>
    );
  }

  return (
    <TripWorkspace
      onNewTrip={startNewTrip}
      initialQuery={pending.q}
      initialKosher={pending.kosher}
    />
  );
}
