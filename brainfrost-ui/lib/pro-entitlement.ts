export const PRO_STATUSES = new Set(["active", "trialing"]);

export interface ProGrantLike {
  expires_at: string | null;
  revoked_at: string | null;
}

export function hasActiveGrant(grant: ProGrantLike | null | undefined, now = Date.now()) {
  if (!grant || grant.revoked_at) return false;
  if (!grant.expires_at) return true;
  return new Date(grant.expires_at).getTime() > now;
}

export function hasProAccess(
  subscriptionStatus: string | null | undefined,
  grant: ProGrantLike | null | undefined,
  now = Date.now(),
) {
  return PRO_STATUSES.has(subscriptionStatus ?? "") || hasActiveGrant(grant, now);
}
