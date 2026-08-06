/** localStorage keys for JWT access (API calls) and refresh (renew access later). */
const ACCESS_KEY = "p-patch.access";
const REFRESH_KEY = "p-patch.refresh";

/** Read the short-lived access token used as Bearer auth. */
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

/** Read the longer-lived refresh token (optional auto-refresh later). */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

/** Persist both tokens after a successful login or register. */
export function setTokens(tokens: { access: string; refresh: string }): void {
  localStorage.setItem(ACCESS_KEY, tokens.access);
  localStorage.setItem(REFRESH_KEY, tokens.refresh);
}

/** Remove tokens on logout or when a stored session is no longer valid. */
export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
