import { describe, expect, it } from "vitest";

import type { PlotRecord } from "@/api/plots";
import type { AuthUser } from "@/lib/authApi";
import type { HelpRequest } from "@/lib/helpRequestsApi";
import {
  filterApprovedMembers,
  filterUnassignedPlots,
  filterUnclaimedUrgentHelpRequests,
} from "@/lib/adminDashboardLists";

function sampleUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 1,
    email: "ada@example.com",
    first_name: "Ada",
    last_name: "Lovelace",
    is_approved: true,
    is_garden_admin: false,
    ...overrides,
  };
}

function samplePlot(overrides: Partial<PlotRecord> = {}): PlotRecord {
  return {
    id: 10,
    garden: 1,
    garden_name: "Judkins",
    plot_number: "A1",
    is_active: true,
    owners: [],
    has_open_help_request: false,
    help_status: null,
    is_mine: false,
    ...overrides,
  };
}

function sampleRequest(overrides: Partial<HelpRequest> = {}): HelpRequest {
  return {
    id: 1,
    title: "Water beds",
    description: "Before noon.",
    status: "active",
    priority: "medium",
    category: "other",
    garden: 1,
    plot: null,
    assigned_to: null,
    created_by: 2,
    due_date: null,
    ...overrides,
  };
}

describe("adminDashboardLists", () => {
  it("filterApprovedMembers keeps only approved garden members", () => {
    const approved = sampleUser({ id: 1, is_approved: true });
    const pending = sampleUser({
      id: 2,
      email: "pending@example.com",
      is_approved: false,
    });

    expect(filterApprovedMembers([approved, pending])).toEqual([approved]);
  });

  it("filterUnassignedPlots keeps active plots with no owners", () => {
    const unassigned = samplePlot({ id: 1, plot_number: "A1" });
    const assigned = samplePlot({
      id: 2,
      plot_number: "B2",
      owners: [
        {
          id: 9,
          name: "Ada",
          is_primary: true,
          start_date: "2026-01-01",
        },
      ],
    });
    const inactiveEmpty = samplePlot({
      id: 3,
      plot_number: "C3",
      is_active: false,
    });

    expect(
      filterUnassignedPlots([unassigned, assigned, inactiveEmpty]).map(
        (plot) => plot.id,
      ),
    ).toEqual([1]);
  });

  it("filterUnclaimedUrgentHelpRequests keeps only unclaimed high-priority tasks", () => {
    const urgentUnclaimed = sampleRequest({
      id: 1,
      title: "Fix fence",
      priority: "high",
    });
    const mediumUnclaimed = sampleRequest({
      id: 2,
      title: "Weed path",
      priority: "medium",
    });
    const urgentClaimed = sampleRequest({
      id: 3,
      title: "Claimed urgent",
      priority: "high",
      assigned_to: 4,
    });
    const urgentDone = sampleRequest({
      id: 4,
      title: "Done urgent",
      priority: "high",
      status: "done",
    });

    expect(
      filterUnclaimedUrgentHelpRequests([
        urgentUnclaimed,
        mediumUnclaimed,
        urgentClaimed,
        urgentDone,
      ]).map((request) => request.id),
    ).toEqual([1]);
  });
});
