import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/database/server";
import {
  hasStudioRoleAtLeast,
  normalizeStudioRole,
  type StudioRole,
} from "@/lib/studio/roles";

export type StudioUserContext = {
  userId: string;
  email: string | null;
  role: StudioRole;
};

type AuthUser = {
  id: string;
  email: string | null;
};

async function getAuthUserOrNull(
  supabase: SupabaseClient,
): Promise<AuthUser | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(`Failed to read auth user: ${error.message}`);
  }

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
  };
}

async function getStudioRoleForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<StudioRole | null> {
  const { data, error } = await supabase
    .from("studio_users")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read studio_users: ${error.message}`);
  }

  return normalizeStudioRole(data?.role ?? null);
}

export async function getStudioUserOrNull(
  minRole: StudioRole = "viewer",
  existingSupabase?: SupabaseClient,
): Promise<StudioUserContext | null> {
  const supabase = existingSupabase ?? (await createSupabaseServerClient());
  const authUser = await getAuthUserOrNull(supabase);

  if (!authUser) {
    return null;
  }

  const role = await getStudioRoleForUser(supabase, authUser.id);

  if (!role) {
    return null;
  }

  if (!hasStudioRoleAtLeast(role, minRole)) {
    return null;
  }

  return {
    userId: authUser.id,
    email: authUser.email,
    role,
  };
}

export async function requireStudioUser(
  minRole: StudioRole = "viewer",
): Promise<StudioUserContext> {
  const supabase = await createSupabaseServerClient();
  const authUser = await getAuthUserOrNull(supabase);

  if (!authUser) {
    redirect("/studio/login");
  }

  const role = await getStudioRoleForUser(supabase, authUser.id);

  if (!role || !hasStudioRoleAtLeast(role, minRole)) {
    redirect("/studio/access-denied");
  }

  return {
    userId: authUser.id,
    email: authUser.email,
    role,
  };
}
