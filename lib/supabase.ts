import { createClient } from '@supabase/supabase-js';

// Client navigateur (clé anon publique, limitée par les policies RLS).
// La clé anon est publique par conception et protégée par les policies RLS.
const URL_FALLBACK = 'https://dxmewqoosrheepsqudip.supabase.co';
const KEY_FALLBACK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4bWV3cW9vc3JoZWVwc3F1ZGlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyNDQ5NDgsImV4cCI6MjEwNzgyMDk0OH0.4uDpIUaYTuMmTleobQeotP4PtkcaZFY1eozalssGrO4';

export const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || URL_FALLBACK,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || KEY_FALLBACK,
  {
    realtime: { params: { eventsPerSecond: 10 } },
  },
);
