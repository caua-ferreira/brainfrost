export function isObservabilityAdmin(email: string | null | undefined) {
  const allowed = (process.env.BRAINFROST_ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return !!email && allowed.includes(email.toLowerCase());
}
