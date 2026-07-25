'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * לקוח Supabase לדפדפן - חשבונות משתמש וסנכרון טיולים.
 * בלי שני משתני ה-NEXT_PUBLIC (ראו .env.example) הפיצ'ר כבוי בשקט:
 * getSupabase() מחזיר null, כפתור ההתחברות לא מוצג, והאתר ממשיך לעבוד
 * על localStorage בלבד - אותה שיטת דעיכה חיננית כמו קישורי השיתוף.
 */

let client: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createClient(url, key) : null;
  return client;
}
