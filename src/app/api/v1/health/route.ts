import { jsonOk } from "@/server/core/errors";

export async function GET() {
  return jsonOk({ status: "ok", version: "v1" });
}
