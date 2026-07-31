import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "@/app/auth/AuthContext";

const fetchMeMock = vi.fn();
const apiLoginMock = vi.fn();
const apiRegisterMock = vi.fn();
const apiLogoutMock = vi.fn();

vi.mock("@/lib/authApi", () => ({
  fetchMe: (...args: unknown[]) => fetchMeMock(...args),
  login: (...args: unknown[]) => apiLoginMock(...args),
  register: (...args: unknown[]) => apiRegisterMock(...args),
  logout: (...args: unknown[]) => apiLogoutMock(...args),
}));

const sampleUser = {
  id: 1,
  email: "ada@example.com",
  first_name: "Ada",
  last_name: "Lovelace",
  is_approved: true,
  is_garden_admin: false,
};

function AuthProbe() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();

  if (isLoading) {
    return <div>Loading…</div>;
  }

  return (
    <div>
      <div data-testid="auth-state">
        {isAuthenticated ? `in:${user?.email}` : "out"}
      </div>
      <button type="button" onClick={() => void login("ada@example.com", "password1")}>
        Sign in
      </button>
      <button type="button" onClick={() => logout()}>
        Sign out
      </button>
    </div>
  );
}

describe("AuthProvider", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  beforeEach(() => {
    fetchMeMock.mockReset();
    apiLoginMock.mockReset();
    apiRegisterMock.mockReset();
    apiLogoutMock.mockReset();
    localStorage.clear();
  });

  it("starts logged out when there is no stored token", async () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(await screen.findByTestId("auth-state")).toHaveTextContent("out");
    expect(fetchMeMock).not.toHaveBeenCalled();
  });

  it("restores the session from a stored access token", async () => {
    localStorage.setItem("p-patch.access", "access-abc");
    fetchMeMock.mockResolvedValueOnce(sampleUser);

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(await screen.findByTestId("auth-state")).toHaveTextContent(
      "in:ada@example.com",
    );
    expect(fetchMeMock).toHaveBeenCalledWith("access-abc");
  });

  it("clears tokens when /me fails during restore", async () => {
    localStorage.setItem("p-patch.access", "stale-token");
    fetchMeMock.mockRejectedValueOnce(new Error("unauthorized"));

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(await screen.findByTestId("auth-state")).toHaveTextContent("out");
    expect(localStorage.getItem("p-patch.access")).toBeNull();
  });

  it("login updates authenticated state", async () => {
    const user = userEvent.setup();
    apiLoginMock.mockResolvedValueOnce({
      access: "access-abc",
      refresh: "refresh-xyz",
      user: sampleUser,
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await screen.findByTestId("auth-state");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByTestId("auth-state")).toHaveTextContent(
        "in:ada@example.com",
      );
    });
  });

  it("logout clears auth state", async () => {
    const user = userEvent.setup();
    localStorage.setItem("p-patch.access", "access-abc");
    fetchMeMock.mockResolvedValueOnce(sampleUser);

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await screen.findByText("in:ada@example.com");
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(apiLogoutMock).toHaveBeenCalled();
    expect(screen.getByTestId("auth-state")).toHaveTextContent("out");
  });
});
