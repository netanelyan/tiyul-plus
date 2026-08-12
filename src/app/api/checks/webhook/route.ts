import { NextResponse } from 'next/server';
import { processCheckWebhook } from '@/lib/server/processCheckWebhook';
import type { WebhookHeaders } from '@/lib/server/paypal';

/**
 * עטיפת `NextResponse` דקה בלבד - כל הלוגיקה ב-`processCheckWebhook.ts`,
 * כדי שהיא תהיה ניתנת לבדיקה בלי לייבא את `next/server`. ראו שם.
 */

function headersFrom(req: Request): WebhookHeaders {
  return {
    authAlgo: req.headers.get('paypal-auth-algo'),
    certUrl: req.headers.get('paypal-cert-url'),
    transmissionId: req.headers.get('paypal-transmission-id'),
    transmissionSig: req.headers.get('paypal-transmission-sig'),
    transmissionTime: req.headers.get('paypal-transmission-time'),
  };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const result = await processCheckWebhook(rawBody, headersFrom(request));
  return NextResponse.json(result.body, { status: result.status });
}
