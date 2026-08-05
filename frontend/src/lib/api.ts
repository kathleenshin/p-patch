/** Django API origin from Vite env (no trailing slash). */
const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export { API_BASE_URL };

/**
 * Typed HTTP error from the API so callers can branch on status
 * (e.g. 403 pending approval vs 401 bad credentials).
 */
export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/** fetch options plus optional Bearer token and JSON body helpers. */
type ApiFetchOptions = Omit<RequestInit, "body"> & {
  token?: string | null;
  body?: unknown;
};

/**
 * Shared fetch wrapper for the Django API.
 * - Builds URL from VITE_API_URL
 * - Sends JSON when `body` is set
 * - Attaches `Authorization: Bearer <token>` when `token` is set
 * - Throws ApiError on non-OK responses
 */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  // Fail fast if the frontend was started without an API base URL.
  if (!API_BASE_URL) {
    throw new Error(
      "VITE_API_URL is not set. Copy frontend/.env.example to frontend/.env and restart the dev server.",
    );
  }

  const { token, body, headers, ...rest } = options;
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  // Call the backend with JSON + optional JWT header.
  const response = await fetch(url, {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Parse JSON when possible; keep raw text otherwise.
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  // Prefer DRF's `detail` string when present.
  if (!response.ok) {
    const detail =
      typeof data === "object" &&
      data !== null &&
      "detail" in data &&
      typeof (data as { detail: unknown }).detail === "string"
        ? (data as { detail: string }).detail
        : `Request failed with status ${response.status}`;
    throw new ApiError(detail, response.status, data);
  }

  return data as T;
}
