export type SupabaseEnv = {
  url: string;
  anonKey: string;
};

const ENV_CONTRACT_DOC_PATH = "docs/specs/ingestion/14_environment_and_secrets_contract.md";

let cachedEnv: SupabaseEnv | null = null;

export function getSupabaseEnv(): SupabaseEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Forbidden env var NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY is set. Service role keys must never be public. Remove it and keep service keys server-only. See " +
        ENV_CONTRACT_DOC_PATH +
        ".",
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. See " +
        ENV_CONTRACT_DOC_PATH +
        ".",
    );
  }

  cachedEnv = { url, anonKey };
  return cachedEnv;
}
