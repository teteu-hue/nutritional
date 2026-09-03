import { describe, it, expect } from "vitest";
import { getPrisma } from "@/server/core/db";

describe("getPrisma", () => {
  it("returns same instance in dev", () => {
    const a = getPrisma();
    const b = getPrisma();
    expect(a).toBe(b);
  });
});
