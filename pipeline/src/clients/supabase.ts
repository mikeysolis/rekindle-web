import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export type GenericSupabaseClient = SupabaseClient<any, "public", any>

export const createServiceRoleClient = (
  url: string,
  serviceRoleKey: string
): GenericSupabaseClient =>
  createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
