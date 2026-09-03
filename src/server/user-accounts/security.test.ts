import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/server/user-accounts/security";

describe("security", () => {
  it("hashes and verifies password", async () => {
    const hash = await hashPassword("senha12345");
    expect(await verifyPassword("senha12345", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});
