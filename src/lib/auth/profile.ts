'use client';

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * פרופיל המשתמש (טבלת profiles, ראו supabase-profiles.sql):
 * שם תצוגה, טלפון, תמונה (data URL מוקטן), מדינות שביקר בהן והעדפות
 * ברירת-מחדל. RLS מבטיח שכל משתמש קורא/כותב רק את השורה שלו.
 */

export interface UserProfile {
  displayName: string;
  phone: string;
  avatar: string | null;
  visited: string[]; // קודי ISO2
  prefs: { kosher?: boolean };
}

export const EMPTY_PROFILE: UserProfile = {
  displayName: '',
  phone: '',
  avatar: null,
  visited: [],
  prefs: {},
};

interface Row {
  display_name: string | null;
  phone: string | null;
  avatar: string | null;
  visited: unknown;
  prefs: unknown;
}

export async function fetchProfile(supabase: SupabaseClient): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name,phone,avatar,visited,prefs')
    .maybeSingle();
  if (error) return null;
  if (!data) return { ...EMPTY_PROFILE }; // עוד אין שורה - פרופיל ריק
  const r = data as Row;
  return {
    displayName: r.display_name ?? '',
    phone: r.phone ?? '',
    avatar: r.avatar ?? null,
    visited: Array.isArray(r.visited) ? (r.visited as string[]).filter((c) => typeof c === 'string') : [],
    prefs: r.prefs && typeof r.prefs === 'object' ? (r.prefs as UserProfile['prefs']) : {},
  };
}

export async function upsertProfile(
  supabase: SupabaseClient,
  profile: UserProfile,
): Promise<boolean> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) return false;
  const { error } = await supabase.from('profiles').upsert(
    {
      user_id: uid,
      display_name: profile.displayName.slice(0, 60) || null,
      phone: profile.phone.slice(0, 30) || null,
      avatar: profile.avatar && profile.avatar.length < 150_000 ? profile.avatar : profile.avatar === null ? null : undefined,
      visited: profile.visited.slice(0, 250),
      prefs: profile.prefs,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  return !error;
}

/**
 * הקטנת תמונת פרופיל בצד הלקוח ל-data URL קטן (ריבוע 192px, JPEG).
 * כ-10-25KB - נשמר ישירות בטבלה, בלי Storage. מחזיר null אם הקובץ
 * לא נקרא כתמונה.
 */
export function imageToAvatar(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const SIZE = 192;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      // חיתוך ריבועי ממרכז התמונה
      const side = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
