import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const fetchHelpRequestsMock = vi.fn();
const fetchUsersMock = vi.fn();
const createHelpRequestMock = vi.fn();

vi.mock("../src/app/auth/AuthContext", () => ({
  useAuth: () => ({
    accessToken: "token-123",
    isGardenAdmin: false,
    user: { id: 7, email: "member@example.com" },
  }),
}));

vi.mock("../src/app/hooks/usePlots", () => ({
  usePlots: () => ({
    plots: [
      {
        id: 1,
        garden: 10,
        garden_name: "Garden A",
        plot_number: "1",
        is_mine: false,
        is_active: true,
      },
      {
        id: 2,
        garden: 10,
        garden_name: "Garden A",
        plot_number: "2",
        is_mine: true,
        is_active: true,
      },
    ],
  }),
  invalidatePlotsCache: vi.fn(),
}));

vi.mock("../src/lib/helpRequestsApi", () => ({
  fetchHelpRequests: (...args: unknown[]) => fetchHelpRequestsMock(...args),
  fetchUsers: (...args: unknown[]) => fetchUsersMock(...args),
  createHelpRequest: (...args: unknown[]) => createHelpRequestMock(...args),
  claimHelpRequest: vi.fn(),
  unclaimHelpRequest: vi.fn(),
  completeHelpRequest: vi.fn(),
  updateHelpRequest: vi.fn(),
  deleteHelpRequest: vi.fn(),
}));

import { TaskScreen } from "../src/app/screens/TaskScreen";

describe("TaskScreen", () => {
  beforeEach(() => {
    fetchHelpRequestsMock.mockReset();
    fetchUsersMock.mockReset();
    createHelpRequestMock.mockReset();

    fetchHelpRequestsMock.mockResolvedValue([]);
    fetchUsersMock.mockResolvedValue([]);
    createHelpRequestMock.mockResolvedValue({
      id: 42,
      title: "Water beds",
      description: "Before noon",
      status: "active",
      priority: "medium",
      category: "other",
      garden: 10,
      plot: 2,
      assigned_to: null,
      created_by: 7,
      due_date: null,
    });
  });

  it("auto-selects the active owned plot and omits assigned_to in new task payload", async () => {
    const user = userEvent.setup();
    render(<TaskScreen />);

    await waitFor(() => {
      expect(fetchHelpRequestsMock).toHaveBeenCalledWith("token-123");
      expect(fetchUsersMock).toHaveBeenCalledWith("token-123");
    });

    const openNewTaskButton = screen.getAllByRole("button")[0];
    await user.click(openNewTaskButton);

    await user.type(screen.getByPlaceholderText("Task title"), "Water beds");
    await user.type(screen.getByPlaceholderText("Description..."), "Before noon");

    await user.click(screen.getByRole("button", { name: "Create Help Request" }));

    await waitFor(() => {
      expect(createHelpRequestMock).toHaveBeenCalledTimes(1);
    });

    const [, payload] = createHelpRequestMock.mock.calls[0];
    expect(payload.assigned_to).toBeNull();
    expect(payload).toMatchObject({
      title: "Water beds",
      description: "Before noon",
      garden: 10,
      plot: 2,
      priority: "medium",
      category: "other",
      due_date: null,
    });
  });
});
