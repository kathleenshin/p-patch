import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";

const apiFetchMock = vi.fn();

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    apiFetch: (...args: unknown[]) => apiFetchMock(...args),
  };
});

import {
  changeEmail,
  changePassword,
  confirmEmail,
  confirmEmailChange,
  fetchMe,
  login,
  logout,
  refreshAccessToken,
  register,
  resendConfirmation,
} from "@/lib/authApi";
import { getAccessToken, getRefreshToken } from "@/lib/authStorage";

const sampleUser = {
  id: 1,
  email: "ada@example.com",
  first_name: "Ada",
  last_name: "Lovelace",
  is_approved: true,
  is_garden_admin: false,
};

const sampleAuthResponse = {
  access: "access-abc",
  refresh: "refresh-xyz",
  user: sampleUser,
};

describe("authApi", () => {
  beforeEach(() => {
    localStorage.clear();
    apiFetchMock.mockReset();
  });

  it("login posts credentials, stores tokens, and returns auth payload", async () => {
    apiFetchMock.mockResolvedValueOnce(sampleAuthResponse);

    const result = await login("ada@example.com", "password1");

    expect(apiFetchMock).toHaveBeenCalledWith("/api/auth/login/", {
      method: "POST",
      body: { email: "ada@example.com", password: "password1" },
    });
    expect(result).toEqual(sampleAuthResponse);
    expect(getAccessToken()).toBe("access-abc");
    expect(getRefreshToken()).toBe("refresh-xyz");
  });

  it("register posts full_name and does not store tokens", async () => {
    apiFetchMock.mockResolvedValueOnce({
      detail: "Account created. Check your email.",
      email: "ada@example.com",
    });

    const result = await register("ada@example.com", "password1", "Ada Lovelace");

    expect(apiFetchMock).toHaveBeenCalledWith("/api/auth/register/", {
      method: "POST",
      body: {
        email: "ada@example.com",
        password: "password1",
        full_name: "Ada Lovelace",
      },
    });
    expect(result.email).toBe("ada@example.com");
    expect(getAccessToken()).toBeNull();
  });

  it("confirmEmail stores tokens after activation", async () => {
    apiFetchMock.mockResolvedValueOnce(sampleAuthResponse);

    await confirmEmail("uid123", "token456");

    expect(apiFetchMock).toHaveBeenCalledWith("/api/auth/confirm-email/", {
      method: "POST",
      body: { uid: "uid123", token: "token456" },
    });
    expect(getAccessToken()).toBe("access-abc");
  });

  it("resendConfirmation posts email", async () => {
    apiFetchMock.mockResolvedValueOnce({ detail: "If an unconfirmed account exists…" });

    await resendConfirmation("ada@example.com");

    expect(apiFetchMock).toHaveBeenCalledWith("/api/auth/resend-confirmation/", {
      method: "POST",
      body: { email: "ada@example.com" },
    });
  });

  it("login surfaces ApiError from the API", async () => {
    apiFetchMock.mockRejectedValueOnce(
      new ApiError("Invalid email or password.", 401, {
        detail: "Invalid email or password.",
      }),
    );

    await expect(login("ada@example.com", "password1")).rejects.toMatchObject({
      status: 401,
      message: "Invalid email or password.",
    });
    expect(getAccessToken()).toBeNull();
  });

  it("fetchMe sends Bearer access token", async () => {
    apiFetchMock.mockResolvedValueOnce(sampleUser);

    const me = await fetchMe("access-abc");

    expect(apiFetchMock).toHaveBeenCalledWith("/api/auth/me/", {
      method: "GET",
      token: "access-abc",
    });
    expect(me.email).toBe("ada@example.com");
  });

  it("refreshAccessToken posts refresh token", async () => {
    apiFetchMock.mockResolvedValueOnce({ access: "access-new" });

    const result = await refreshAccessToken("refresh-xyz");

    expect(apiFetchMock).toHaveBeenCalledWith("/api/auth/refresh/", {
      method: "POST",
      body: { refresh: "refresh-xyz" },
    });
    expect(result.access).toBe("access-new");
  });

  it("logout clears stored tokens", () => {
    localStorage.setItem("p-patch.access", "access-abc");
    localStorage.setItem("p-patch.refresh", "refresh-xyz");

    logout();

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("changePassword posts current and new password with bearer token", async () => {
    apiFetchMock.mockResolvedValueOnce({ detail: "Password updated." });

    const result = await changePassword("access-abc", "old-pass", "new-pass-99");

    expect(apiFetchMock).toHaveBeenCalledWith("/api/auth/change-password/", {
      method: "POST",
      token: "access-abc",
      body: {
        current_password: "old-pass",
        new_password: "new-pass-99",
      },
    });
    expect(result.detail).toBe("Password updated.");
  });

  it("changeEmail posts new email and password with bearer token", async () => {
    apiFetchMock.mockResolvedValueOnce({
      detail: "Check your inbox",
      pending_email: "ada.new@example.com",
    });

    const result = await changeEmail(
      "access-abc",
      "ada.new@example.com",
      "password1",
    );

    expect(apiFetchMock).toHaveBeenCalledWith("/api/auth/change-email/", {
      method: "POST",
      token: "access-abc",
      body: {
        new_email: "ada.new@example.com",
        current_password: "password1",
      },
    });
    expect(result.pending_email).toBe("ada.new@example.com");
  });

  it("confirmEmailChange posts uid and token without storing JWTs", async () => {
    apiFetchMock.mockResolvedValueOnce({
      detail: "Email updated.",
      user: { ...sampleUser, email: "ada.new@example.com", pending_email: null },
    });

    const result = await confirmEmailChange("uid123", "token456");

    expect(apiFetchMock).toHaveBeenCalledWith("/api/auth/confirm-email-change/", {
      method: "POST",
      body: { uid: "uid123", token: "token456" },
    });
    expect(result.user.email).toBe("ada.new@example.com");
    expect(getAccessToken()).toBeNull();
  });
});
