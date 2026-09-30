import { afterEach, describe, expect, test } from "vitest";
import { isObservabilityAdmin } from "./observability-admin";

const original = process.env.BRAINFROST_ADMIN_EMAILS;

afterEach(() => {
  if (original === undefined) delete process.env.BRAINFROST_ADMIN_EMAILS;
  else process.env.BRAINFROST_ADMIN_EMAILS = original;
});

describe("isObservabilityAdmin", () => {
  test("bloqueia por padrão", () => {
    delete process.env.BRAINFROST_ADMIN_EMAILS;
    expect(isObservabilityAdmin("owner@example.com")).toBe(false);
  });

  test("aceita somente e-mails explicitamente configurados", () => {
    process.env.BRAINFROST_ADMIN_EMAILS = "owner@example.com, outro@example.com";
    expect(isObservabilityAdmin("OWNER@example.com")).toBe(true);
    expect(isObservabilityAdmin("user@example.com")).toBe(false);
  });
});
