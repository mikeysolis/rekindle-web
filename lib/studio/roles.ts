export type StudioRole = "viewer" | "editor" | "admin";

const ROLE_RANK: Record<StudioRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
};

export function normalizeStudioRole(value: unknown): StudioRole | null {
  if (value === "viewer" || value === "editor" || value === "admin") {
    return value;
  }

  return null;
}

export function hasStudioRoleAtLeast(
  role: StudioRole,
  minRole: StudioRole,
): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}
