export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export interface SessionSource {
  auth: {
    getSession(): Promise<{
      data: { session: { access_token: string; user: { id: string } } | null };
      error?: unknown;
    }>;
    refreshSession(): Promise<{
      data: { session: { access_token: string; user: { id: string } } | null };
      error?: unknown;
    }>;
  };
}

export function createApi(baseUrl: string, sessions: SessionSource) {
  let refreshing: ReturnType<SessionSource["auth"]["refreshSession"]> | null = null;
  async function request<T>(path: string, init: RequestInit = {}, key?: string): Promise<T> {
    if (!baseUrl)
      throw new ApiError(
        503,
        "The server address is missing. Configure VITE_API_BASE_URL and restart the app.",
      );
    const initial = await sessions.auth.getSession();
    let session = initial.data.session;
    const error = initial.error;
    if (error || !session) throw new ApiError(401, "Please sign in again.");
    const owner = session.user.id;
    for (let attempt = 0; attempt < 2; attempt++) {
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${session.access_token}`);
      if (typeof init.body === "string") headers.set("Content-Type", "application/json");
      if (key) headers.set("Idempotency-Key", key);
      const controller = new AbortController();
      const abort = () => controller.abort();
      if (init.signal?.aborted) controller.abort();
      init.signal?.addEventListener("abort", abort, { once: true });
      const timeout = setTimeout(abort, 20000);
      let response: Response;
      let data: unknown;
      try {
        response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1${path}`, {
          ...init,
          headers,
          signal: controller.signal,
        });
        const text = await response.text();
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = null;
        }
      } catch (error) {
        if (init.signal?.aborted) throw error;
        throw new ApiError(503, "Cannot reach the server. Check your connection and try again.");
      } finally {
        clearTimeout(timeout);
        init.signal?.removeEventListener("abort", abort);
      }
      if (response.status === 401 && attempt === 0) {
        refreshing ??= sessions.auth.refreshSession().finally(() => {
          refreshing = null;
        });
        const refreshed = await refreshing;
        session = refreshed.data.session;
        if (refreshed.error || !session || session.user.id !== owner)
          throw new ApiError(401, "Your session changed. Please sign in again.");
        continue;
      }
      if (!response.ok) {
        const detail = data && typeof data === "object" && "detail" in data ? data.detail : null;
        throw new ApiError(
          response.status,
          typeof detail === "string" ? detail : "The request failed. Please try again.",
        );
      }
      if (data === null && response.status !== 204)
        throw new ApiError(502, "The server returned an unexpected response.");
      return data as T;
    }
    throw new ApiError(401, "Please sign in again.");
  }
  return { request };
}
