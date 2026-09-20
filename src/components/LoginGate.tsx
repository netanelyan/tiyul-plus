'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import LoginModal from '@/components/LoginModal';

/**
 * One mounted login modal for the whole site, plus the two functions that let
 * any surface open it and pick up where the user left off.
 *
 * ## Why an event and not a prop
 *
 * The callers are scattered - the pricing page, two panels inside the trip
 * screen - and threading a callback from the layout down to each of them would
 * mean a prop through every component in between. A window event is the idiom
 * this codebase already uses for exactly this shape of problem (see
 * NEW_CHAT_EVENT in SiteNav), and it keeps the callers ignorant of where the
 * modal is mounted.
 *
 * ## Why the intent is in sessionStorage and not in state
 *
 * There are two ways to finish a login and only one of them keeps the page
 * alive. Typing the six-digit code resolves in place; clicking the link in the
 * email reloads the whole document, and any intent held in React state dies
 * with it. So the intent is written down before the modal opens and read back
 * after the user turns up signed in, which works on both paths.
 *
 * sessionStorage rather than localStorage deliberately: an intent is about
 * this tab and this moment. Surviving into a tab someone opens next week would
 * mean a stray redirect to PayPal that nobody asked for.
 */
export const LOGIN_REQUEST_EVENT = 'tiyul:login-request';

const PENDING_KEY = 'tiyul-plus:pending-login-intent';

/**
 * What the user was trying to do when we asked them to sign in. A closed set
 * rather than a free string, so a caller cannot wait forever on an intent that
 * a typo means nobody will ever set.
 */
export type LoginIntent = 'checkout:premium' | 'checkout:pro' | 'group' | 'predeparture';

/** Open the login modal, remembering what to resume afterwards. */
export function requestLogin(intent: LoginIntent) {
  try {
    sessionStorage.setItem(PENDING_KEY, intent);
  } catch {
    // No storage: the modal still opens and login still works. Only the
    // automatic resume is lost, and the user is left looking at a screen they
    // can act on by hand - which is the state they were in before all this.
  }
  window.dispatchEvent(new Event(LOGIN_REQUEST_EVENT));
}

/**
 * True exactly once, for the caller whose intent is pending. Consuming it
 * clears it, so a resume can never run twice.
 */
export function takePendingLogin(intent: LoginIntent): boolean {
  try {
    if (sessionStorage.getItem(PENDING_KEY) !== intent) return false;
    sessionStorage.removeItem(PENDING_KEY);
    return true;
  } catch {
    return false;
  }
}

function clearPendingLogin() {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* nothing to clear */
  }
}

export default function LoginGate() {
  const auth = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onRequest = () => setOpen(true);
    window.addEventListener(LOGIN_REQUEST_EVENT, onRequest);
    return () => window.removeEventListener(LOGIN_REQUEST_EVENT, onRequest);
  }, []);

  if (!open || !auth.enabled) return null;

  return (
    <LoginModal
      onClose={() => {
        // Closing without signing in abandons the intent. Leaving it behind
        // would mean an unrelated login through the nav, minutes later,
        // silently firing a checkout the user had already walked away from.
        if (!auth.user) clearPendingLogin();
        setOpen(false);
      }}
    />
  );
}
