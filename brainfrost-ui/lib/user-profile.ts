type IdentityLike = { identity_data?: Record<string, unknown> };

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function userDisplayName(user: {
  user_metadata?: Record<string, unknown>;
  identities?: IdentityLike[] | null;
}) {
  const metadata = user.user_metadata ?? {};
  const identity = user.identities?.find((item) => item.identity_data)?.identity_data ?? {};
  return firstText(
    metadata.display_name,
    metadata.full_name,
    metadata.name,
    identity.full_name,
    identity.name
  );
}

export function userNeedsName(user: {
  user_metadata?: Record<string, unknown>;
  identities?: IdentityLike[] | null;
}) {
  return !userDisplayName(user);
}

