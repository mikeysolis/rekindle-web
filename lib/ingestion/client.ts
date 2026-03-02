import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getIngestionEnv } from "@/lib/ingestion/env";

let cachedClient: SupabaseClient | null = null;

export function createIngestionServiceRoleClient(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const { url, serviceRoleKey } = getIngestionEnv();
  cachedClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
}
