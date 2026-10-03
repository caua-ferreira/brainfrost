export function observabilityAdminEmails() {
  return (process.env.BRAINFROST_ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isObservabilityAdmin(email: string | null | undefined) {
  const allowed = observabilityAdminEmails();
  return !!email && allowed.includes(email.toLowerCase());
}
