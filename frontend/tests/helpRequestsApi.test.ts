import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    apiFetch: (...args: unknown[]) => apiFetchMock(...args),
  };
});

import {
  fetchHelpRequests,
  isUnclaimedHelpRequest,
  resendHelpRequestClaim,
  type HelpRequest,
} from "@/lib/helpRequestsApi";

function sampleRequest(overrides: Partial<HelpRequest> = {}): HelpRequest {
  return {
    id: 1,
    title: "Water beds",
    description: "Before noon.",
    status: "active",
    priority: "medium",
    category: "other",
    assigned_to: null,
    created_by: 2,
    due_date: null,
    ...overrides,
  };
}

describe("helpRequestsApi", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("fetchHelpRequests lists with JWT", async () => {
    const rows = [sampleRequest()];
    apiFetchMock.mockResolvedValueOnce(rows);

    const result = await fetchHelpRequests("access-token");

    expect(apiFetchMock).toHaveBeenCalledWith("/api/help-requests/", {
      token: "access-token",
    });
    expect(result).toEqual(rows);
  });

  it("resendHelpRequestClaim posts to resend-claim with token", async () => {
    apiFetchMock.mockResolvedValueOnce({ detail: "Claim email resent.", recipients: 3 });

    const result = await resendHelpRequestClaim("access-token", 9);

    expect(apiFetchMock).toHaveBeenCalledWith("/api/help-requests/9/resend-claim/", {
      method: "POST",
      token: "access-token",
    });
    expect(result.recipients).toBe(3);
  });

  it("isUnclaimedHelpRequest keeps open unassigned tasks only", () => {
    expect(isUnclaimedHelpRequest(sampleRequest())).toBe(true);
    expect(isUnclaimedHelpRequest(sampleRequest({ status: "pending" }))).toBe(true);
    expect(
      isUnclaimedHelpRequest(sampleRequest({ assigned_to: 4, status: "pending" })),
    ).toBe(false);
    expect(isUnclaimedHelpRequest(sampleRequest({ status: "done" }))).toBe(false);
  });
});
