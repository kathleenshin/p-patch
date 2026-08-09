import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopNav } from "../src/app/components/TopNav";
import type { Screen } from "../src/app/types";

const logoutMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock("@/app/auth/AuthContext.tsx", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("../src/assets/judkins-park-logo.png", () => ({
  default: "judkins-park-logo.png",
}));

function renderNav(
  screenName: Screen = "dashboard",
  auth: {
    isApproved?: boolean;
    isGardenAdmin?: boolean;
    user?: { first_name?: string; email?: string } | null;
  } = {},
) {
  const setScreen = vi.fn();
  useAuthMock.mockReturnValue({
    isApproved: auth.isApproved ?? false,
    isGardenAdmin: auth.isGardenAdmin ?? false,
    logout: logoutMock,
    user: auth.user ?? { first_name: "Ada", email: "ada@example.com" },
  });

  render(<TopNav screen={screenName} setScreen={setScreen} />);
  return { setScreen };
}

describe("TopNav", () => {
  beforeEach(() => {
    logoutMock.mockReset();
    useAuthMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the park logo at 3rem tall", () => {
    renderNav();

    const logo = screen.getByRole("img", { name: "Judkins Park P-Patch" });
    expect(logo).toHaveAttribute("src", "judkins-park-logo.png");
    // Prefer inline style — jsdom computes rem as px.
    expect((logo as HTMLImageElement).style.height).toBe("3rem");
  });

  it("returns to the dashboard when the logo is clicked", async () => {
    const user = userEvent.setup();
    const { setScreen } = renderNav("tasks", { isApproved: true });

    await user.click(screen.getByRole("img", { name: "Judkins Park P-Patch" }));

    expect(setScreen).toHaveBeenCalledWith("dashboard");
  });

  it("shows only Dashboard for pending users", () => {
    renderNav("dashboard", { isApproved: false });

    expect(screen.getByRole("button", { name: /Dashboard/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Plots/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Tasks/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Inventory/i })).not.toBeInTheDocument();
    expect(screen.getByText("Pending approval")).toBeInTheDocument();
  });

  it("shows member links when approved", () => {
    renderNav("dashboard", { isApproved: true });

    expect(screen.getByRole("button", { name: /Plots/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tasks/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Inventory/i })).toBeInTheDocument();
    expect(screen.queryByText("Pending approval")).not.toBeInTheDocument();
  });

  it("shows Admin only for garden admins", () => {
    renderNav("dashboard", { isApproved: true, isGardenAdmin: true });

    expect(screen.getByRole("button", { name: /Admin/i })).toBeInTheDocument();
  });

  it("navigates when a link is clicked", async () => {
    const user = userEvent.setup();
    const { setScreen } = renderNav("dashboard", { isApproved: true });

    await user.click(screen.getByRole("button", { name: /Plots/i }));

    expect(setScreen).toHaveBeenCalledWith("plot");
  });

  it("shows the user initial and logs out", async () => {
    const user = userEvent.setup();
    renderNav("dashboard", {
      isApproved: true,
      user: { first_name: "Ada", email: "ada@example.com" },
    });

    expect(screen.getByText("A")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Logout/i }));
    expect(logoutMock).toHaveBeenCalled();
  });
});
