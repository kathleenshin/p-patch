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

/** Turn DRF error JSON (`detail` or field maps) into one user-facing string. */
function messageFromApiErrorBody(data: unknown, status: number): string {
  if (typeof data === "string" && data.trim()) return data;
  if (typeof data !== "object" || data === null) {
    return `Request failed with status ${status}`;
  }

  const record = data as Record<string, unknown>;

  if (typeof record.detail === "string") return record.detail;
  if (Array.isArray(record.detail)) {
    return record.detail.map(String).join(" ");
  }

  const fieldMessages: string[] = [];
  for (const [field, value] of Object.entries(record)) {
    if (field === "detail") continue;
    if (Array.isArray(value)) {
      fieldMessages.push(`${field}: ${value.map(String).join(" ")}`);
    } else if (typeof value === "string") {
      fieldMessages.push(`${field}: ${value}`);
    }
  }
  if (fieldMessages.length > 0) return fieldMessages.join(" ");

  return `Request failed with status ${status}`;
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

  if (!response.ok) {
    throw new ApiError(messageFromApiErrorBody(data, response.status), response.status, data);
  }

  return data as T;
}
