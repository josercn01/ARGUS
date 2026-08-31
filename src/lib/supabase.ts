import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://uwryfadjkscmxlsbpqas.supabase.co';

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3cnlmYWRqa3NjbXhsc2JwcWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1OTM5NzEsImV4cCI6MjEwMzE2OTk3MX0.1g6-eFtk-QAWG-q34NZiCmmvDo76hm4YSZGOaSM96RY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
