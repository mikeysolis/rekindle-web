export type SupabaseEnv = {
  url: string;
  anonKey: string;
};

let cachedEnv: SupabaseEnv | null = null;

export function getSupabaseEnv(): SupabaseEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  cachedEnv = { url, anonKey };
  return cachedEnv;
}
