import { describe, expect, test } from "vitest";
import { hasActiveGrant, hasProAccess } from "./pro-entitlement";

const now = new Date("2026-10-01T12:00:00Z").getTime();

describe("pro entitlement", () => {
  test("aceita assinatura Stripe ativa", () => {
    expect(hasProAccess("active", null, now)).toBe(true);
    expect(hasProAccess("trialing", null, now)).toBe(true);
  });

  test("aceita concessão vigente ou vitalícia", () => {
    expect(hasActiveGrant({ expires_at: "2026-11-01T00:00:00Z", revoked_at: null }, now)).toBe(true);
    expect(hasActiveGrant({ expires_at: null, revoked_at: null }, now)).toBe(true);
  });

  test("recusa concessão expirada ou revogada", () => {
    expect(hasActiveGrant({ expires_at: "2026-09-01T00:00:00Z", revoked_at: null }, now)).toBe(false);
    expect(hasActiveGrant({ expires_at: null, revoked_at: "2026-09-01T00:00:00Z" }, now)).toBe(false);
  });
});
