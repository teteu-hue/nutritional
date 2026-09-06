"use client";

export const PRODUCTION_API_BASE_URL = "https://nutricaoia.vercel.app";
const DEFAULT_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? PRODUCTION_API_BASE_URL;

type ApiOptions = RequestInit & {
  baseUrl?: string;
  skipRedirect?: boolean;
};

export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

function isAbsoluteUrl(path: string): boolean {
  return /^[a-z][a-z\d+\-.]*:\/\//i.test(path);
}

export function resolveApiUrl(path: string, baseUrl = DEFAULT_API_BASE_URL): string {
  if (isAbsoluteUrl(path)) return path;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  if (!normalizedBaseUrl) return normalizedPath;

  return `${normalizedBaseUrl}${normalizedPath}`;
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { baseUrl, headers, skipRedirect, ...fetchOptions } = options;

  const response = await fetch(resolveApiUrl(path, baseUrl), {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    credentials: fetchOptions.credentials ?? "include",
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401 && !skipRedirect && typeof window !== "undefined") {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
    throw new ApiClientError(401, "Não autorizado");
  }

  if (
    response.status === 409 &&
    data.code === "onboarding_required" &&
    typeof window !== "undefined"
  ) {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/onboarding";
    throw new ApiClientError(409, data.error ?? "Onboarding necessário", "onboarding_required");
  }

  if (!response.ok) {
    throw new ApiClientError(response.status, data.error ?? "Erro na requisição", data.code);
  }

  return data as T;
}
