import { jsonOk } from "@/server/core/errors";
import { NextResponse } from "next/server";
import { prisma } from "@/server/core/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const checkDb = url.searchParams.get("db") === "1";

  if (!checkDb) return jsonOk({ status: "ok", version: "v1" });

  const started = Date.now();
  const checks: Record<
    string,
    { ok: boolean; latencyMs: number; error?: string; message?: string; result?: unknown }
  > = {};

  async function run(name: string, fn: () => Promise<unknown>) {
    const t = Date.now();
    try {
      const result = await fn();
      checks[name] = { ok: true, latencyMs: Date.now() - t, result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const errName = error instanceof Error ? error.name : "UnknownError";
      if (error instanceof Error) {
        console.error(`[health.${name}] ${errName}: ${message}`, error.stack ?? "");
      }
      checks[name] = {
        ok: false,
        latencyMs: Date.now() - t,
        error: errName,
        message,
      };
    }
  }

  await run("select1", () =>
    prisma.$queryRawUnsafe<Array<{ ok: number }>>("SELECT 1 AS ok"),
  );
  await run("usersCount", () => prisma.user.count());
  await run("prismaVersion", () =>
    prisma.$queryRawUnsafe<Array<{ version: string }>>("SELECT version() AS version"),
  );

  const allOk = Object.values(checks).every((c) => c.ok);
  const status = allOk ? 200 : 503;
  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      version: "v1",
      db: { ok: allOk, latencyMs: Date.now() - started, checks },
    },
    { status },
  );
}
