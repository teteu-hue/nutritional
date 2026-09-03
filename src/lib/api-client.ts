"use client";

type ApiOptions = RequestInit & { skipRedirect?: boolean };

export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401 && !options.skipRedirect && typeof window !== "undefined") {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
    throw new ApiClientError(401, "Não autorizado");
  }

  if (response.status === 409 && data.code === "onboarding_required" && typeof window !== "undefined") {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/onboarding";
    throw new ApiClientError(409, data.error ?? "Onboarding necessário", "onboarding_required");
  }

  if (!response.ok) {
    throw new ApiClientError(response.status, data.error ?? "Erro na requisição", data.code);
  }

  return data as T;
}
