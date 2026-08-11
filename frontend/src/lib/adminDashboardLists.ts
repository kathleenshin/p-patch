/**
 * Pure list filters for Admin top-card counts and popup bodies.
 * Keep filtering here so AdminScreen stays presentational and tests stay cheap.
 */
import type { PlotRecord } from "@/api/plots";
import type { AuthUser } from "./authApi";
import {
  isUnclaimedUrgentHelpRequest,
  type HelpRequest,
} from "./helpRequestsApi";

/** Approved Members card/popup — garden members from GET /api/auth/users/. */
export function filterApprovedMembers(users: AuthUser[]): AuthUser[] {
  return users.filter((user) => user.is_approved);
}

/**
 * Unassigned Plots card/popup — active plots with no PlotOwnership rows
 * (owners[] empty on GET /api/plots/).
 */
export function filterUnassignedPlots(plots: PlotRecord[]): PlotRecord[] {
  return plots.filter((plot) => plot.is_active && plot.owners.length === 0);
}

/**
 * Unclaimed Tasks card/popup — unclaimed AND high urgency only.
 * API priority "high" matches notify_urgent_help_request (not medium/low).
 */
export function filterUnclaimedUrgentHelpRequests(
  requests: HelpRequest[],
): HelpRequest[] {
  return requests.filter(isUnclaimedUrgentHelpRequest);
}
