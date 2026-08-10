import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";

describe("apiFetch FormData uploads", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("sends FormData without forcing Content-Type application/json", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 1 }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const body = new FormData();
    body.append("plot", "3");
    body.append(
      "image",
      new File(["bytes"], "plot.jpg", { type: "image/jpeg" }),
    );

    await apiFetch("/api/plot-photos/", {
      method: "POST",
      token: "access-token",
      body,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [, init] = vi.mocked(fetch).mock.calls[0] as [
      string,
      RequestInit,
    ];

    expect(init.method).toBe("POST");
    expect(init.body).toBe(body);

    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer access-token");
    expect(headers.get("Accept")).toBe("application/json");
    // Browser must set multipart boundary itself.
    expect(headers.get("Content-Type")).toBeNull();
  });
});
