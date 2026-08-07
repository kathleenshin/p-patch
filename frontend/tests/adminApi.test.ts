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
  approveUser,
  fetchPendingUsers,
  fetchUsers,
  rejectUser,
} from "@/lib/adminApi";

const sampleUser = {
  id: 1,
  email: "ada@example.com",
  first_name: "Ada",
  last_name: "Lovelace",
  is_approved: true,
  is_garden_admin: false,
};

describe("adminApi", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("fetchUsers loads garden-admin users list with token", async () => {
    apiFetchMock.mockResolvedValueOnce([sampleUser]);

    const users = await fetchUsers("access-token");

    expect(apiFetchMock).toHaveBeenCalledWith("/api/auth/users/", {
      method: "GET",
      token: "access-token",
    });
    expect(users).toEqual([sampleUser]);
  });

  it("fetchPendingUsers loads pending queue with token", async () => {
    apiFetchMock.mockResolvedValueOnce([sampleUser]);

    await fetchPendingUsers("access-token");

    expect(apiFetchMock).toHaveBeenCalledWith("/api/auth/pending/", {
      method: "GET",
      token: "access-token",
    });
  });

  it("approveUser posts to pending approve endpoint", async () => {
    apiFetchMock.mockResolvedValueOnce(sampleUser);

    await approveUser("access-token", 7);

    expect(apiFetchMock).toHaveBeenCalledWith("/api/auth/pending/7/approve/", {
      method: "POST",
      token: "access-token",
    });
  });

  it("rejectUser posts to pending reject endpoint", async () => {
    apiFetchMock.mockResolvedValueOnce(undefined);

    await rejectUser("access-token", 7);

    expect(apiFetchMock).toHaveBeenCalledWith("/api/auth/pending/7/reject/", {
      method: "POST",
      token: "access-token",
    });
  });
});
