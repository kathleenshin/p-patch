import { apiFetch } from "./api";
import { clearTokens, setTokens } from "./authStorage";

/** User shape returned by /api/auth/login|me (and admin pending list). */
export type AuthUser = {
  id: number;
  email: string;
  /** Set while a confirm-before-switch email change is outstanding. */
  pending_email?: string | null;
  first_name: string;
  last_name: string;
  is_approved: boolean;
  is_garden_admin: boolean;
  /** ISO timestamp; used on Admin pending list. */
  date_joined?: string;
};

/** Successful login / confirm-email payload: JWTs + user profile. */
export type AuthResponse = {
  access: string;
  refresh: string;
  user: AuthUser;
};

/** Successful register payload — no tokens until email is confirmed. */
export type RegisterResponse = {
  detail: string;
  email: string;
};

/** POST /api/auth/login/ — store tokens on success. */
export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>("/api/auth/login/", {
    method: "POST",
    body: { email, password },
  });
  setTokens({ access: data.access, refresh: data.refresh });
  return data;
}

/** POST /api/auth/register/ — create inactive account and send confirmation email. */
export async function register(
  email: string,
  password: string,
  fullName = "",
): Promise<RegisterResponse> {
  return apiFetch<RegisterResponse>("/api/auth/register/", {
    method: "POST",
    body: {
      email,
      password,
      full_name: fullName,
    },
  });
}

/** POST /api/auth/confirm-email/ — activate account and store tokens. */
export async function confirmEmail(
  uid: string,
  token: string,
): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>("/api/auth/confirm-email/", {
    method: "POST",
    body: { uid, token },
  });
  setTokens({ access: data.access, refresh: data.refresh });
  return data;
}

/** POST /api/auth/resend-confirmation/ — send another verify link. */
export async function resendConfirmation(
  email: string,
): Promise<{ detail: string }> {
  return apiFetch<{ detail: string }>("/api/auth/resend-confirmation/", {
    method: "POST",
    body: { email },
  });
}

/** GET /api/auth/me/ — load the current user with a Bearer access token. */
export async function fetchMe(accessToken: string): Promise<AuthUser> {
  return apiFetch<AuthUser>("/api/auth/me/", {
    method: "GET",
    token: accessToken,
  });
}

/** POST /api/auth/change-password/ — requires current password. */
export async function changePassword(
  accessToken: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ detail: string }> {
  return apiFetch<{ detail: string }>("/api/auth/change-password/", {
    method: "POST",
    token: accessToken,
    body: {
      current_password: currentPassword,
      new_password: newPassword,
    },
  });
}

/** POST /api/auth/change-email/ — password + confirm-before-switch. */
export async function changeEmail(
  accessToken: string,
  newEmail: string,
  currentPassword: string,
): Promise<{ detail: string; pending_email: string }> {
  return apiFetch<{ detail: string; pending_email: string }>(
    "/api/auth/change-email/",
    {
      method: "POST",
      token: accessToken,
      body: {
        new_email: newEmail,
        current_password: currentPassword,
      },
    },
  );
}

/** POST /api/auth/confirm-email-change/ — apply pending email from link tokens. */
export async function confirmEmailChange(
  uid: string,
  token: string,
): Promise<{ detail: string; user: AuthUser }> {
  return apiFetch<{ detail: string; user: AuthUser }>(
    "/api/auth/confirm-email-change/",
    {
      method: "POST",
      body: { uid, token },
    },
  );
}

/** POST /api/auth/refresh/ — exchange refresh token for a new access token.
 * Stored for later use; not wired into auto-retry yet.
 */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ access: string }> {
  return apiFetch<{ access: string }>("/api/auth/refresh/", {
    method: "POST",
    body: { refresh: refreshToken },
  });
}

/** Clear stored JWTs (client-side logout). */
export function logout(): void {
  clearTokens();
}
