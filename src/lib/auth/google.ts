/**
 * Sign in with Google, through Google Identity Services (GIS) and an ID token.
 *
 * ## Why GIS + signInWithIdToken and not signInWithOAuth
 *
 * `signInWithOAuth` redirects through `<project>.supabase.co/auth/v1/callback`,
 * so Google's consent screen names the supabase.co domain - a stranger's domain,
 * on the one screen where a person decides whether to trust us with their
 * account. GIS runs on our own origin: the button and One Tap say tiyulplus.com,
 * Google hands the page an ID token, and Supabase verifies that token and opens
 * a session. No redirect, so the page stays alive and a pending login intent
 * resumes exactly as it does after a typed email code.
 *
 * ## The nonce
 *
 * Google is given the SHA-256 of a random value and writes it into the ID token;
 * Supabase is given the raw value, hashes it and compares. A token lifted from
 * somewhere else carries someone else's nonce and is refused. Supabase documents
 * this exact split (hashed to Google, raw to `signInWithIdToken`).
 *
 * ## Loaded only when the login modal opens
 *
 * The script, its iframe and One Tap can read and write cookies, and /cookies
 * promises that ordinary browsing sets none. So nothing here runs on page load:
 * `loadGis()` is called from the login modal only, and a test fails if the GIS
 * script URL appears anywhere else in `src/`.
 *
 * Off unless `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set. Leave it unset on Vercel
 * preview deployments: Google does not accept wildcard origins, so a preview URL
 * would show a button that can only fail.
 */

export const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

export function googleClientId(): string | null {
  const id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? '';
  return /^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(id) ? id : null;
}

// ---------- The nonce ----------

/** Lowercase hex SHA-256 of a string - the form Google expects for `nonce`. */
export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** A fresh nonce pair: `raw` goes to Supabase, `hashed` goes to Google. */
export async function makeNonce(): Promise<{ raw: string; hashed: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const raw = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return { raw, hashed: await sha256Hex(raw) };
}

// ---------- The script ----------

/** The part of `google.accounts.id` this site uses. */
export interface GisId {
  initialize(config: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
    nonce: string;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    context?: 'signin' | 'signup' | 'use';
    ux_mode?: 'popup' | 'redirect';
    itp_support?: boolean;
    use_fedcm_for_prompt?: boolean;
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      type?: 'standard' | 'icon';
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      logo_alignment?: 'left' | 'center';
      width?: number;
      locale?: string;
    },
  ): void;
  prompt(): void;
  cancel(): void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GisId } };
  }
}

let loading: Promise<GisId | null> | null = null;

/**
 * Loads the GIS script once per page and resolves with `google.accounts.id`, or
 * null if it cannot load (blocked by an extension, offline). Never rejects: the
 * caller hides the Google option and the email code keeps working.
 */
export function loadGis(): Promise<GisId | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (loading) return loading;
  loading = new Promise<GisId | null>((resolve) => {
    const script = document.createElement('script');
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(window.google?.accounts?.id ?? null);
    script.onerror = () => {
      // A later modal open may succeed (it was a network blip), so do not cache the failure.
      loading = null;
      script.remove();
      resolve(null);
    };
    document.head.appendChild(script);
  });
  return loading;
}
