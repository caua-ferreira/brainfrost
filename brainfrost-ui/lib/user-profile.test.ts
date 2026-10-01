import { describe, expect, it } from "vitest";
import { userDisplayName, userNeedsName } from "./user-profile";

describe("user profile", () => {
  it("prioritizes the display name saved by the user", () => {
    expect(userDisplayName({
      user_metadata: { display_name: " Cauã ", full_name: "Outro nome" },
      identities: [{ identity_data: { full_name: "Nome do provedor" } }],
    })).toBe("Cauã");
  });

  it("uses the provider identity when metadata has no name", () => {
    expect(userDisplayName({
      identities: [{ identity_data: { name: "Pessoa Microsoft" } }],
    })).toBe("Pessoa Microsoft");
  });

  it("requires a name when neither metadata nor provider supplied one", () => {
    expect(userNeedsName({ user_metadata: {}, identities: [] })).toBe(true);
    expect(userNeedsName({ user_metadata: { name: "  " } })).toBe(true);
  });

  it("does not require onboarding when a name exists", () => {
    expect(userNeedsName({ user_metadata: { full_name: "Maria" } })).toBe(false);
  });
});
