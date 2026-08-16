'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { authHeader } from '@/lib/auth/client';
import PanelSection from '@/components/PanelSection';
import ThinkingIndicator from '@/components/ThinkingIndicator';
import { fileToChatImage, IMAGE_ACCEPT } from '@/lib/trip/imageAttach';
import type { Trip } from '@/lib/trip/types';

/**
 * "סיפור הטיול" - פיצ׳ר הפרימיום: הטיול הופך לעמוד סיפור ציבורי עם
 * המסלול, הימים והתמונות של המטיילים. היצירה פרימיום; הקישור שנוצר
 * פתוח לכולם - הצופים הם המשתמשים הבאים.
 *
 * ה-snapshot נבנה בשרת מהטיול השמור - "רענון" אחרי עריכת הטיול בונה
 * אותו מחדש; תמונות מועלות דחוסות (fileToChatImage, אותו צינור כמו
 * תמונות הצ׳אט) ועוברות ולידציה בשרת.
 */

interface StoryState {
  slug: string;
  title: string;
  published: boolean;
  photoCount: number;
  photos: { url: string; caption: string | null }[];
  days: number;
  stops: number;
}

export default function TripStoryPanel({ trip }: { trip: Trip }) {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [story, setStory] = useState<StoryState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isPremium = auth.profile?.plan === 'premium';

  useEffect(() => {
    if (!open || loaded || !auth.user) return;
    let alive = true;
    void (async () => {
      try {
        const headers = await authHeader();
        const res = await fetch(`/api/story?tripId=${encodeURIComponent(trip.id)}`, { headers });
        const data = (await res.json().catch(() => null)) as { story?: StoryState | null } | null;
        if (alive) {
          setStory(data?.story ?? null);
          setLoaded(true);
        }
      } catch {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, loaded, auth.user, trip.id]);

  async function call(body: Record<string, unknown>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const headers = await authHeader();
      const res = await fetch('/api/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ tripId: trip.id, ...body }),
      });
      const data = (await res.json().catch(() => null)) as
        | { story?: StoryState; error?: string }
        | null;
      if (data?.story) setStory(data.story);
      else if (data?.error === 'premium-required') setError('יצירת סיפור היא פיצ׳ר מנוי - ראו את עמוד הפרימיום.');
      else if (data?.error === 'trip-not-found-or-empty')
        setError('הטיול צריך להיות שמור בחשבון ועם עצירות כדי להפוך לסיפור.');
      else if (data?.error === 'photo-rejected') setError('התמונה לא התקבלה - נסו תמונה אחרת.');
      else if (data?.error) setError('משהו השתבש - נסו שוב עוד רגע.');
    } catch {
      setError('משהו השתבש - נסו שוב עוד רגע.');
    } finally {
      setBusy(false);
    }
  }

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    setError(null);
    const data = await fileToChatImage(file);
    if (!data) {
      setError('לא הצלחנו לקרוא את התמונה.');
      return;
    }
    await call({ action: 'photo', photo: data });
  }

  const storyUrl = story ? `${typeof window !== 'undefined' ? window.location.origin : ''}/story/${story.slug}` : '';

  return (
    <PanelSection
      panelKey="trip-story"
      icon="📖"
      title="סיפור הטיול"
      ariaLabel="סיפור הטיול"
      badge={
        story?.published ? (
          <span className="rounded-full bg-lagoon/15 px-2 py-0.5 text-[11px] font-bold text-lagoon">
            פורסם
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
            הסיפור קשור לחשבון - צריך להתחבר קודם (כפתור ההתחברות למעלה בניווט).
          </p>
        )}

        {auth.user && !isPremium && (
          <>
            <p className="text-sm font-semibold leading-relaxed text-night/75">
              אחרי הטיול - הטיול שלכם הופך לעמוד סיפור יפה לשיתוף: המסלול על מפה, הימים,
              והתמונות שלכם על המקומות שביקרתם. קישור אחד לשלוח למשפחה.
            </p>
            <a
              href="/premium"
              className="mt-3 inline-block rounded-xl bg-sunset px-4 py-2 text-sm font-bold text-cream transition hover:bg-sunset-deep"
            >
              זמין במנוי הפרימיום ←
            </a>
          </>
        )}

        {auth.user && isPremium && !loaded && open && <ThinkingIndicator label="טוען" />}

        {auth.user && isPremium && loaded && !story && (
          <>
            <p className="text-sm font-semibold leading-relaxed text-night/75">
              הופכים את הטיול לעמוד סיפור: המסלול, הימים, והתמונות שלכם - בקישור אחד
              ששולחים למשפחה ולחברים.
            </p>
            <button
              onClick={() => void call({ action: 'create' })}
              disabled={busy}
              className="mt-3 rounded-xl bg-sunset px-4 py-2 text-sm font-bold text-cream transition hover:bg-sunset-deep disabled:opacity-50"
            >
              {busy ? 'רגע…' : 'צרו את סיפור הטיול'}
            </button>
          </>
        )}

        {auth.user && isPremium && story && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-night/75">
              &quot;{story.title}&quot; · {story.days} ימים · {story.stops} עצירות ·{' '}
              {story.photoCount} תמונות
            </p>

            {story.photos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {story.photos.slice(0, 8).map((p, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={p.url}
                    alt={p.caption ?? `תמונה ${i + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="h-14 w-14 rounded-lg object-cover ring-1 ring-night/10"
                  />
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="rounded-xl bg-night px-3.5 py-2 text-xs font-bold text-cream transition hover:bg-night/85 disabled:opacity-50"
              >
                + הוספת תמונה
              </button>
              <input
                ref={fileRef}
                type="file"
                accept={IMAGE_ACCEPT}
                className="hidden"
                onChange={(e) => void pickPhoto(e.target.files?.[0])}
              />
              <button
                onClick={() => void call({ action: 'create' })}
                disabled={busy}
                title="בונה מחדש את הימים מהטיול הנוכחי - אחרי שערכתם אותו"
                className="rounded-xl bg-shell px-3.5 py-2 text-xs font-bold text-night/70 ring-1 ring-night/15 transition hover:bg-night/5 disabled:opacity-50"
              >
                רענון מהטיול
              </button>
              {story.published ? (
                <>
                  <button
                    onClick={() => {
                      void navigator.clipboard?.writeText(storyUrl).then(() => {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      });
                    }}
                    className="rounded-xl bg-sunset px-3.5 py-2 text-xs font-bold text-cream transition hover:bg-sunset-deep"
                  >
                    {copied ? '✓ הועתק' : 'העתקת קישור'}
                  </button>
                  <a
                    href={storyUrl}
                    target="_blank"
                    rel="noopener"
                    className="rounded-xl bg-shell px-3.5 py-2 text-xs font-bold text-night/70 ring-1 ring-night/15 transition hover:bg-night/5"
                  >
                    צפייה ←
                  </a>
                </>
              ) : (
                <button
                  onClick={() => void call({ action: 'publish' })}
                  disabled={busy}
                  className="rounded-xl bg-sunset px-3.5 py-2 text-xs font-bold text-cream transition hover:bg-sunset-deep disabled:opacity-50"
                >
                  פרסום הסיפור
                </button>
              )}
            </div>

            {story.published && (
              <p className="text-[11px] font-medium text-night/45">
                הסיפור ציבורי - כל מי שמקבל את הקישור יכול לראות אותו. אפשר להוריד מפרסום
                בכל רגע.
              </p>
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
