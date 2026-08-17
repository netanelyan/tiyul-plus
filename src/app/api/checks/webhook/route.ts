import { NextResponse } from 'next/server';
import { processCheckWebhook } from '@/lib/server/processCheckWebhook';
import type { WebhookHeaders } from '@/lib/server/paypal';

/**
 * A thin `NextResponse` wrapper only - all the logic is in `processCheckWebhook.ts`, so that it can
 * be tested without importing `next/server`. See there.
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
