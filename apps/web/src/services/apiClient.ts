type ApiEnvelope<T> = {
  success?: boolean;
  data: T;
  message?: string;
  meta?: unknown;
};

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError("API base URL is not configured.", 0);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const body = (await response.json().catch(() => ({}))) as Partial<ApiEnvelope<T>>;

  if (!response.ok || body.success === false) {
    throw new ApiError(body.message ?? "GamerFolio API request failed.", response.status);
  }

  return body.data as T;
}

export const apiClient = {
  get: <T>(path: string, token?: string) => request<T>(path, { method: "GET" }, token),
  post: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(
      path,
      {
        method: "POST",
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      token,
    ),
  patch: <T>(path: string, body: unknown, token?: string) =>
    request<T>(
      path,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
      token,
    ),
  delete: <T>(path: string, token?: string) =>
    request<T>(path, { method: "DELETE" }, token),
};
