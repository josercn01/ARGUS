const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function fetchRest(table: string, query = '') {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Credenciais do Supabase ausentes.');
  }

  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ''}`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro API ${res.status}: ${text}`);
  }

  return res.json();
}
