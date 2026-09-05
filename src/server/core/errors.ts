import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code, details: error.details },
      { status: error.status },
    );
  }
  if (error instanceof Error) {
    console.error(
      `[api-error] ${error.name}: ${error.message}`,
      error.stack ?? "",
    );
  } else {
    console.error("[api-error] non-Error thrown:", error);
  }
  return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
}
