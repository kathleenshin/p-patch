import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginScreen } from "../src/app/screens/LoginScreen";

const loginMock = vi.fn();
const registerMock = vi.fn();
const confirmEmailMock = vi.fn();
const resendConfirmationMock = vi.fn();

vi.mock("../src/app/auth/AuthContext", () => ({
  useAuth: () => ({
    login: loginMock,
    register: registerMock,
    confirmEmail: confirmEmailMock,
    resendConfirmation: resendConfirmationMock,
  }),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status = 400) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("../src/app/data/gardenFacts", () => ({
  gardenFacts: ["Test garden fact for login overlay."],
}));

describe("LoginScreen", () => {
  const onLogin = vi.fn();

  beforeEach(() => {
    loginMock.mockReset();
    registerMock.mockReset();
    confirmEmailMock.mockReset();
    resendConfirmationMock.mockReset();
    onLogin.mockReset();
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    cleanup();
  });

  it("shows the site name as text over the hero photo", () => {
    render(<LoginScreen onLogin={onLogin} />);

    const hero = document.querySelector(".login-hero");
    expect(hero).toBeTruthy();
    expect(within(hero as HTMLElement).getByText("Judkins Park P-Patch")).toBeInTheDocument();
  });

  it("does not show a logo image in the auth form", () => {
    render(<LoginScreen onLogin={onLogin} />);

    const form = document.querySelector(".login-form");
    expect(form).toBeTruthy();
    expect(within(form as HTMLElement).queryAllByRole("img")).toHaveLength(0);
  });

  it("renders Welcome back with the form subtitle", () => {
    render(<LoginScreen onLogin={onLogin} />);

    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(screen.getByText("Sign in to your garden account")).toBeInTheDocument();
  });

  it("shows a garden fact on the hero overlay", () => {
    render(<LoginScreen onLogin={onLogin} />);

    expect(screen.getByText(/Test garden fact for login overlay/)).toBeInTheDocument();
  });

  it("switches to the register tab and shows the name field", async () => {
    const user = userEvent.setup();
    render(<LoginScreen onLogin={onLogin} />);

    // Tab control (not the secondary "No account? Register" link)
    await user.click(screen.getAllByRole("button", { name: "Register" })[0]);

    expect(screen.getByPlaceholderText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Account →" })).toBeInTheDocument();
  });

  it("logs in and calls onLogin", async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValueOnce(undefined);
    render(<LoginScreen onLogin={onLogin} />);

    await user.type(screen.getByPlaceholderText("email@example.com"), "ada@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "password1");
    await user.click(screen.getByRole("button", { name: "Login →" }));

    expect(loginMock).toHaveBeenCalledWith("ada@example.com", "password1");
    expect(onLogin).toHaveBeenCalled();
  });

  it("registers and shows the confirmation message with resend", async () => {
    const user = userEvent.setup();
    registerMock.mockResolvedValueOnce({
      email: "ada@example.com",
      detail: "Check your inbox to confirm.",
    });
    render(<LoginScreen onLogin={onLogin} />);

    await user.click(screen.getAllByRole("button", { name: "Register" })[0]);
    await user.type(screen.getByPlaceholderText("Jane Smith"), "Ada Lovelace");
    await user.type(screen.getByPlaceholderText("email@example.com"), "ada@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "password1");
    await user.click(screen.getByRole("button", { name: "Create Account →" }));

    expect(registerMock).toHaveBeenCalledWith(
      "ada@example.com",
      "password1",
      "Ada Lovelace",
    );
    expect(await screen.findByText("Check your inbox to confirm.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Resend available in \d+s/ })).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
  });
});
