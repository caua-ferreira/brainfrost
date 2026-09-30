const SECRET_PATTERNS = [
  /sk-(?:or-v1-|ant-)?[a-z0-9_-]{12,}/gi,
  /AIza[a-z0-9_-]{12,}/gi,
  /Bearer\s+[a-z0-9._-]+/gi,
];

export function sanitizeTelemetryMessage(value: unknown, maxLength = 500): string {
  let message = value instanceof Error ? value.message : String(value ?? "erro desconhecido");
  for (const pattern of SECRET_PATTERNS) message = message.replace(pattern, "[REDACTED]");
  return message.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function writeErrorTelemetry(event: {
  errorId: string;
  scope: string;
  stage: string;
  message: unknown;
  userId?: string;
  importId?: string;
  provider?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}) {
  console.error("[brainfrost_error]", JSON.stringify({
    errorId: event.errorId,
    scope: event.scope,
    stage: event.stage,
    message: sanitizeTelemetryMessage(event.message),
    userId: event.userId,
    importId: event.importId,
    provider: event.provider,
    metadata: event.metadata,
    occurredAt: new Date().toISOString(),
  }));
}
