import { describe, expect, it } from "vitest";
import { PRODUCTION_API_BASE_URL, resolveApiUrl } from "@/lib/helper/api-client";

describe("resolveApiUrl", () => {
  it("uses the production domain as the default baseUrl", () => {
    expect(resolveApiUrl("/api/v1/profile")).toBe(`${PRODUCTION_API_BASE_URL}/api/v1/profile`);
  });

  it("keeps same-origin paths when no baseUrl is configured", () => {
    expect(resolveApiUrl("/api/v1/profile", "")).toBe("/api/v1/profile");
  });

  it("normalizes relative paths when no baseUrl is configured", () => {
    expect(resolveApiUrl("api/v1/profile", "")).toBe("/api/v1/profile");
  });

  it("joins a baseUrl with an API path", () => {
    expect(resolveApiUrl("/api/v1/profile", "https://api.example.com/")).toBe(
      "https://api.example.com/api/v1/profile",
    );
  });

  it("does not prefix absolute URLs", () => {
    expect(resolveApiUrl("https://external.example.com/status", "https://api.example.com")).toBe(
      "https://external.example.com/status",
    );
  });
});
