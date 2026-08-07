import { describe, expect, it, vi, beforeEach } from "vitest";
import { ApiError, apiFetch } from "@/lib/api";

describe("apiFetch error messages", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(),
    );
  });

  it("uses string detail when present", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Please confirm your email." }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      apiFetch("/api/auth/login/", { method: "POST", body: {} }),
    ).rejects.toMatchObject({
      message: "Please confirm your email.",
      status: 403,
    } satisfies Partial<ApiError>);
  });

  it("flattens field validation errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          email: ["A user with this email already exists."],
          password: ["Ensure this field has at least 8 characters."],
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await expect(
      apiFetch("/api/auth/register/", { method: "POST", body: {} }),
    ).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("email:"),
    });
  });
});
