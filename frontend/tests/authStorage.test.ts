import { beforeEach, describe, expect, it } from "vitest";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "@/lib/authStorage";

describe("authStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores and reads access and refresh tokens", () => {
    setTokens({ access: "access-token", refresh: "refresh-token" });

    expect(getAccessToken()).toBe("access-token");
    expect(getRefreshToken()).toBe("refresh-token");
  });

  it("clears both tokens", () => {
    setTokens({ access: "access-token", refresh: "refresh-token" });
    clearTokens();

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});
