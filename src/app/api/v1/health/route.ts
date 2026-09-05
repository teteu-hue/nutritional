import { jsonOk } from "@/server/core/errors";
import { NextResponse } from "next/server";
import { prisma } from "@/server/core/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const checkDb = url.searchParams.get("db") === "1";

  if (!checkDb) return jsonOk({ status: "ok", version: "v1" });

  const started = Date.now();
  try {
    await prisma.$queryRawUnsafe<Array<{ ok: number }>>("SELECT 1 AS ok");
    return jsonOk({
      status: "ok",
      version: "v1",
      db: { ok: true, latencyMs: Date.now() - started },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const name = error instanceof Error ? error.name : "UnknownError";
    if (error instanceof Error) {
      console.error(`[health.db] ${name}: ${message}`, error.stack ?? "");
    }
    return NextResponse.json(
      {
        status: "degraded",
        version: "v1",
        db: {
          ok: false,
          error: name,
          message,
          latencyMs: Date.now() - started,
        },
      },
      { status: 503 },
    );
  }
}
