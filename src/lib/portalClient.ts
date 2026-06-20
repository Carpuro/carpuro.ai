// Browser-side Supabase client for the client portal.
//
// Security model: this uses the PUBLIC (publishable/anon) key, which is safe to
// ship to the browser. Row-Level Security in Postgres is the real boundary — a
// signed-in client can only read their own rows; an un-authenticated visitor
// (anon, no JWT) reads nothing. See supabase/ migrations: profiles, projects,
// project_updates, project_links policies scope on auth.uid() / private.is_admin().
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getPortalClient(): SupabaseClient {
  if (_client) return _client;

  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'Portal is not configured: missing PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  _client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // consume magic-link / OAuth code on /portal/callback
      flowType: 'pkce',
    },
  });
  return _client;
}
